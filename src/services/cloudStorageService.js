// Cloud-Storage Service für OneDrive-Synchronisation (Browser-kompatibel)
import { storageUtils } from '../utils/storage';

// Browser-Umgebung erkennen
const isBrowser = typeof window !== 'undefined';
const isElectron = isBrowser && window.electronAPI;

class CloudStorageService {
  constructor() {
    this.isOneDriveAvailable = false;
    this.syncInterval = null;
    this.lastSync = null;
    this.oneDrivePath = null;
    this.customPath = null; // Benutzerdefinierter Pfad
    this.localBackup = true;
    this.syncFrequency = 30000; // 30 Sekunden
    this.conflictResolution = 'timestamp'; // 'timestamp', 'manual', 'merge'
    
    this.init();
  }

  async init() {
    try {
      // Lade gespeicherten benutzerdefinierten Pfad
      try {
        const savedPath = localStorage.getItem('cloudSyncCustomPath');
        if (savedPath && savedPath.trim()) {
          this.customPath = savedPath;
          this.oneDrivePath = savedPath;
          this.isOneDriveAvailable = true;
          console.log('Benutzerdefinierter OneDrive-Pfad geladen:', savedPath);
          
          if (this.isOneDriveAvailable) {
            this.startAutoSync();
          }
          return;
        }
      } catch (error) {
        console.warn('Fehler beim Laden des gespeicherten Pfades:', error);
      }
      
      if (isElectron) {
        // Electron-Modus: Echte OneDrive-Erkennung
        await this.detectOneDriveElectron();
      } else {
        // Browser-Modus: Simulation
        await this.detectOneDriveBrowser();
      }
      
      if (this.isOneDriveAvailable) {
        this.startAutoSync();
        console.log('OneDrive Cloud-Sync aktiviert');
      } else {
        console.log('OneDrive nicht verfügbar, arbeite lokal');
      }
    } catch (error) {
      console.warn('Cloud-Storage-Initialisierung fehlgeschlagen:', error);
      this.fallbackToLocal();
    }
  }

  async detectOneDriveElectron() {
    try {
      this.oneDrivePath = await window.electronAPI.getOneDrivePath();
      this.isOneDriveAvailable = !!this.oneDrivePath;
      return this.isOneDriveAvailable;
    } catch (error) {
      console.warn('Electron OneDrive-Erkennung fehlgeschlagen:', error);
      return false;
    }
  }

  async detectOneDriveBrowser() {
    // Browser-Simulation: OneDrive ist "verfügbar" für Demo-Zwecke
    this.oneDrivePath = 'Browser-Simulation';
    this.isOneDriveAvailable = true;
    console.log('Browser-Modus: OneDrive-Simulation aktiv');
    return true;
  }
  async detectOneDrive() {
    // Legacy-Methode entfernt - wird durch detectOneDriveElectron/Browser ersetzt
    return false;
  }

  getOneDrivePathFromRegistry() {
    // Nur in Electron verfügbar
    if (!isElectron) return null;
    // Registry-Zugriff würde hier implementiert werden
    return null;
  }
  getOneDrivePathFromEnvironment() {
    // Browser-sicher: Umgebungsvariablen sind im Browser nicht verfügbar
    if (typeof window !== 'undefined' && !window.electronAPI) {
      return null; // Browser-Modus
    }
    
    try {
      // Standard OneDrive-Pfade - Browser-sicher
      const userProfile = (typeof process !== 'undefined' && process.env) ? 
        (process.env.USERPROFILE || process.env.HOME) : null;
      
      if (!userProfile) return null;
      
      const oneDrivePaths = [
        `${userProfile}\\OneDrive`,
        `${userProfile}\\OneDrive - Personal`,
        `${userProfile}\\OneDrive - edrmg`, // Für das Projekt spezifisch
        `C:\\Users\\${process.env.USERNAME}\\OneDrive`
      ];
      
      return oneDrivePaths.find(path => this.pathExists(path));
    } catch (error) {
      return null;
    }
  }

  getOneDrivePathFromUserProfile() {
    // Browser-sicher: process ist im Browser nicht verfügbar
    if (typeof window !== 'undefined' && !window.electronAPI) {
      return null; // Browser-Modus
    }
    
    try {
      // Fallback: Standard-Pfad konstruieren
      const username = (typeof process !== 'undefined' && process.env) ? 
        (process.env.USERNAME || 'User') : 'User';
      return `C:\\Users\\${username}\\OneDrive`;
    } catch (error) {
      return null;
    }
  }

  async testPath(path) {
    try {
      // Simuliere Pfad-Test (in echter Electron-App würde fs verwendet)
      return path && typeof path === 'string' && path.length > 0;
    } catch (error) {
      return false;
    }
  }

  pathExists(path) {
    // Simuliere Existenz-Check
    return path && path.includes('OneDrive');
  }

  async ensureDirectoryExists() {
    if (!this.oneDrivePath) return false;
    
    try {
      // In Electron würde hier fs.mkdirSync verwendet
      console.log(`OneDrive-Verzeichnis erstellt: ${this.oneDrivePath}`);
      return true;
    } catch (error) {
      console.error('Fehler beim Erstellen des OneDrive-Verzeichnisses:', error);
      return false;
    }
  }

  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      await this.syncData();
    }, this.syncFrequency);

    // Initiale Synchronisation
    this.syncData();
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncData() {
    if (!this.isOneDriveAvailable) return;

    try {
      const dataTypes = ['appointments', 'teams', 'participants', 'custom_checklist_items'];
      
      for (const dataType of dataTypes) {
        await this.syncDataType(dataType);
      }
      
      this.lastSync = new Date();
      this.notifySync('success', 'Daten erfolgreich synchronisiert');
      
    } catch (error) {
      console.error('Sync-Fehler:', error);
      this.notifySync('error', 'Synchronisation fehlgeschlagen: ' + error.message);
    }
  }

  async syncDataType(dataType) {
    const localData = storageUtils.getItem(dataType) || [];
    const cloudData = await this.loadFromCloud(dataType);
    
    if (!cloudData) {
      // Erste Synchronisation: Lokale Daten in Cloud hochladen
      await this.saveToCloud(dataType, localData);
      return;
    }

    // Konfliktauflösung
    const mergedData = await this.resolveConflicts(localData, cloudData, dataType);
    
    // Aktualisierte Daten speichern
    storageUtils.setItem(dataType, mergedData);
    await this.saveToCloud(dataType, mergedData);
  }

  async resolveConflicts(localData, cloudData, dataType) {
    if (!Array.isArray(localData) || !Array.isArray(cloudData)) {
      return localData; // Fallback zu lokalen Daten
    }

    switch (this.conflictResolution) {
      case 'timestamp':
        return this.mergeByTimestamp(localData, cloudData);
      
      case 'merge':
        return this.mergeData(localData, cloudData);
      
      default:
        return cloudData; // Cloud hat Priorität
    }
  }

  mergeByTimestamp(localData, cloudData) {
    const merged = new Map();
    
    // Alle lokalen Einträge hinzufügen
    localData.forEach(item => {
      if (item.id) {
        merged.set(item.id, { ...item, source: 'local' });
      }
    });
    
    // Cloud-Einträge hinzufügen/überschreiben basierend auf Timestamp
    cloudData.forEach(item => {
      if (item.id) {
        const existing = merged.get(item.id);
        if (!existing || this.isNewer(item, existing)) {
          merged.set(item.id, { ...item, source: 'cloud' });
        }
      }
    });
    
    return Array.from(merged.values()).map(item => {
      const { source, ...cleanItem } = item;
      return cleanItem;
    });
  }

  mergeData(localData, cloudData) {
    // Einfache Merge-Strategie: Alle eindeutigen IDs beibehalten
    const merged = new Map();
    
    [...localData, ...cloudData].forEach(item => {
      if (item.id && !merged.has(item.id)) {
        merged.set(item.id, item);
      }
    });
    
    return Array.from(merged.values());
  }

  isNewer(item1, item2) {
    const date1 = new Date(item1.lastModified || item1.createdAt || 0);
    const date2 = new Date(item2.lastModified || item2.createdAt || 0);
    return date1 > date2;
  }

  async loadFromCloud(dataType) {
    if (!this.isOneDriveAvailable) return null;
    
    try {
      const fileName = `${dataType}.json`;
      const filePath = `${this.oneDrivePath}\\${fileName}`;
      
      // In Electron würde hier fs.readFileSync verwendet
      // Für Demo-Zwecke simulieren wir das
      const cloudData = this.simulateCloudRead(filePath);
      return cloudData ? JSON.parse(cloudData) : null;
      
    } catch (error) {
      console.warn(`Fehler beim Laden von ${dataType} aus der Cloud:`, error);
      return null;
    }
  }

  async saveToCloud(dataType, data) {
    if (!this.isOneDriveAvailable) return false;
    
    try {
      const fileName = `${dataType}.json`;
      const filePath = `${this.oneDrivePath}\\${fileName}`;
      const jsonData = JSON.stringify(data, null, 2);
      
      // In Electron würde hier fs.writeFileSync verwendet
      this.simulateCloudWrite(filePath, jsonData);
      
      return true;
    } catch (error) {
      console.error(`Fehler beim Speichern von ${dataType} in die Cloud:`, error);
      return false;
    }
  }

  simulateCloudRead(filePath) {
    // Simulation für Demo - in echter App würde fs verwendet
    const savedData = localStorage.getItem(`cloud_${filePath}`);
    return savedData;
  }

  simulateCloudWrite(filePath, data) {
    // Simulation für Demo - in echter App würde fs verwendet
    localStorage.setItem(`cloud_${filePath}`, data);
  }

  async manualSync() {
    await this.syncData();
  }

  fallbackToLocal() {
    this.isOneDriveAvailable = false;
    this.stopAutoSync();
    console.log('Fallback zu lokalem Speicher');
  }

  notifySync(type, message) {
    try {
      // Event für UI-Updates mit Fallback
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('cloudSync', {
          detail: { 
            type: type || 'info', 
            message: message || 'Sync-Event', 
            timestamp: new Date() 
          }
        }));
      } else {
        console.log(`Cloud Sync [${type}]: ${message}`);
      }
    } catch (error) {
      console.error('Fehler beim Senden der Sync-Benachrichtigung:', error);
    }
  }

  getStatus() {
    try {
      return {
        isOneDriveAvailable: this.isOneDriveAvailable || false,
        lastSync: this.lastSync || null,
        oneDrivePath: this.oneDrivePath || null,
        customPath: this.customPath || null,
        syncFrequency: this.syncFrequency || 30000,
        isAutoSyncing: !!this.syncInterval
      };
    } catch (error) {
      console.error('Fehler beim Abrufen des Status:', error);
      return {
        isOneDriveAvailable: false,
        lastSync: null,
        oneDrivePath: null,
        customPath: null,
        syncFrequency: 30000,
        isAutoSyncing: false
      };
    }
  }

  setSyncFrequency(seconds) {
    try {
      this.syncFrequency = Math.max(10, Number(seconds)) * 1000; // Mindestens 10 Sekunden
      if (this.syncInterval) {
        this.startAutoSync();
      }
    } catch (error) {
      console.error('Fehler beim Setzen der Sync-Frequenz:', error);
    }
  }

  setConflictResolution(method) {
    try {
      const validMethods = ['timestamp', 'manual', 'merge', 'cloud', 'local'];
      if (validMethods.includes(method)) {
        this.conflictResolution = method;
      } else {
        console.warn('Ungültige Konfliktauflösungs-Methode:', method);
      }
    } catch (error) {
      console.error('Fehler beim Setzen der Konfliktauflösung:', error);
    }
  }

  // Neue Pfad-Management-Methoden mit besserer Fehlerbehandlung
  async detectAvailablePaths() {
    const possiblePaths = [];
    
    try {
      if (isElectron) {
        // Electron: Echte Pfad-Erkennung
        try {
          const userProfile = await window.electronAPI.getUserProfile();
          const commonPaths = [
            `${userProfile}\\OneDrive`,
            `${userProfile}\\OneDrive - Personal`,
            `${userProfile}\\OneDrive - edrmg`,
            `${userProfile}\\OneDrive\\StiftGurk`,
            `${userProfile}\\OneDrive - edrmg\\Desktop\\führungen`,
            `C:\\Cloud\\OneDrive`,
            `D:\\OneDrive`
          ];

          for (const path of commonPaths) {
            try {
              const accessible = await window.electronAPI.testPath(path);
              possiblePaths.push({ path, accessible });
            } catch (error) {
              possiblePaths.push({ path, accessible: false });
            }
          }
        } catch (error) {
          console.error('Electron-Pfaderkennung fehlgeschlagen:', error);
        }
      } else {
        // Browser: Demo-Pfade
        possiblePaths.push(
          { path: 'C:\\Users\\User\\OneDrive - edrmg\\Desktop\\führungen', accessible: true },
          { path: 'C:\\Users\\User\\OneDrive\\StiftGurk', accessible: true },
          { path: 'D:\\Cloud\\OneDrive\\Projekte', accessible: false }
        );
      }
    } catch (error) {
      console.error('Fehler bei der Pfaderkennung:', error);
    }

    return possiblePaths;
  }

  async testSyncPath(path) {
    if (!path || typeof path !== 'string' || !path.trim()) {
      throw new Error('Pfad darf nicht leer sein');
    }

    const cleanPath = path.trim();

    if (isElectron) {
      // Electron: Echte Pfad-Tests
      try {
        const exists = await window.electronAPI.testPath(cleanPath);
        if (!exists) {
          throw new Error('Pfad existiert nicht');
        }

        const writable = await window.electronAPI.testWriteAccess(cleanPath);
        if (!writable) {
          throw new Error('Keine Schreibberechtigung');
        }

        return true;
      } catch (error) {
        throw new Error(`Pfad-Test fehlgeschlagen: ${error.message}`);
      }
    } else {
      // Browser: Simulation mit besserer Validierung
      await new Promise(resolve => setTimeout(resolve, 1000)); // Lade-Simulation
      
      // Simuliere verschiedene Szenarien
      if (cleanPath.includes('nicht_existent')) {
        throw new Error('Pfad existiert nicht');
      }
      if (cleanPath.includes('readonly')) {
        throw new Error('Keine Schreibberechtigung');
      }
      if (cleanPath.length < 10) {
        throw new Error('Pfad zu kurz');
      }
      if (!cleanPath.includes('\\') && !cleanPath.includes('/')) {
        throw new Error('Ungültiger Pfad-Format');
      }
      
      return true;
    }
  }

  async setSyncPath(path) {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Ungültiger Pfad');
      }

      const cleanPath = path.trim();
      const isValid = await this.testSyncPath(cleanPath);
      if (!isValid) {
        throw new Error('Pfad ist nicht gültig');
      }

      this.customPath = cleanPath;
      this.oneDrivePath = cleanPath;
      this.isOneDriveAvailable = true;

      // Speichere benutzerdefinierten Pfad
      try {
        localStorage.setItem('cloudSyncCustomPath', cleanPath);
      } catch (error) {
        console.warn('Warnung: Pfad konnte nicht gespeichert werden:', error);
      }

      // Sync neu starten mit neuem Pfad
      this.stopAutoSync();
      this.startAutoSync();

      this.notifySync('success', `Sync-Pfad geändert: ${cleanPath}`);
      return true;
    } catch (error) {
      const errorMessage = error.message || 'Unbekannter Fehler beim Setzen des Pfades';
      this.notifySync('error', `Fehler beim Setzen des Pfades: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async resetToAutoPath() {
    try {
      this.customPath = null;
      
      try {
        localStorage.removeItem('cloudSyncCustomPath');
      } catch (error) {
        console.warn('Warnung: Gespeicherter Pfad konnte nicht entfernt werden:', error);
      }

      // Automatische Pfaderkennung erneut durchführen
      if (isElectron) {
        await this.detectOneDriveElectron();
      } else {
        await this.detectOneDriveBrowser();
      }

      // Sync neu starten
      this.stopAutoSync();
      if (this.isOneDriveAvailable) {
        this.startAutoSync();
      }

      this.notifySync('success', 'Automatische Pfaderkennung aktiviert');
      return true;
    } catch (error) {
      const errorMessage = error.message || 'Unbekannter Fehler beim Zurücksetzen';
      this.notifySync('error', `Fehler beim Zurücksetzen: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  // Initialisierung erweitern um benutzerdefinierten Pfad mit besserer Fehlerbehandlung
  async init() {
    try {
      // Lade gespeicherten benutzerdefinierten Pfad
      let savedCustomPath = null;
      try {
        savedCustomPath = localStorage.getItem('cloudSyncCustomPath');
      } catch (error) {
        console.warn('LocalStorage nicht verfügbar:', error);
      }

      if (savedCustomPath) {
        this.customPath = savedCustomPath;
        try {
          const isValid = await this.testSyncPath(savedCustomPath);
          if (isValid) {
            this.oneDrivePath = savedCustomPath;
            this.isOneDriveAvailable = true;
            this.startAutoSync();
            console.log('Benutzerdefinierter OneDrive-Pfad aktiviert:', savedCustomPath);
            return;
          }
        } catch (error) {
          console.warn('Gespeicherter Pfad nicht mehr gültig:', error.message);
          try {
            localStorage.removeItem('cloudSyncCustomPath');
          } catch (e) {
            console.warn('Konnte ungültigen Pfad nicht aus LocalStorage entfernen:', e);
          }
          this.customPath = null;
        }
      }

      // Fallback auf automatische Erkennung
      if (isElectron) {
        await this.detectOneDriveElectron();
      } else {
        await this.detectOneDriveBrowser();
      }
      
      if (this.isOneDriveAvailable) {
        this.startAutoSync();
        console.log('OneDrive Cloud-Sync aktiviert');
      } else {
        console.log('OneDrive nicht verfügbar, arbeite lokal');
      }
    } catch (error) {
      console.warn('Cloud-Storage-Initialisierung fehlgeschlagen:', error);
      this.fallbackToLocal();
    }
  }

  fallbackToLocal() {
    try {
      this.isOneDriveAvailable = false;
      this.oneDrivePath = null;
      this.customPath = null;
      this.stopAutoSync();
      console.log('Fallback zu lokalem Speicher');
      this.notifySync('warning', 'Cloud-Sync nicht verfügbar, arbeite lokal');
    } catch (error) {
      console.error('Fehler beim Fallback zu lokalem Speicher:', error);
    }
  }
}

// Singleton-Instance
export const cloudStorage = new CloudStorageService();
export default CloudStorageService;
