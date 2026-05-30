// Erweiterte Cloud-Storage Service für Electron-App
class ElectronCloudStorageService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.isOneDriveAvailable = false;
    this.syncInterval = null;
    this.lastSync = null;
    this.oneDrivePath = null;
    this.localBackup = true;
    this.syncFrequency = 30000; // 30 Sekunden
    this.conflictResolution = 'timestamp';
    
    this.init();
  }

  async init() {
    try {
      if (this.isElectron) {
        // Electron-spezifische OneDrive-Erkennung
        this.oneDrivePath = await window.electronAPI.getOneDrivePath();
        this.isOneDriveAvailable = !!this.oneDrivePath;
        
        console.log(this.isOneDriveAvailable ? 
          `Electron OneDrive gefunden: ${this.oneDrivePath}` : 
          'Electron OneDrive nicht verfügbar'
        );
      } else {
        // Fallback für Web-Browser
        await this.detectOneDriveBrowser();
      }
      
      if (this.isOneDriveAvailable) {
        this.startAutoSync();
      }
    } catch (error) {
      console.warn('Cloud-Storage-Initialisierung fehlgeschlagen:', error);
      this.fallbackToLocal();
    }
  }

  async detectOneDriveBrowser() {
    // Browser-basierte OneDrive-Simulation (wie vorher)
    this.isOneDriveAvailable = false;
    console.log('Browser-Modus: OneDrive-Simulation aktiv');
  }

  async loadFromCloud(dataType) {
    if (!this.isOneDriveAvailable) return null;
    
    try {
      if (this.isElectron) {
        // Echtes Dateisystem in Electron
        const fileName = `${dataType}.json`;
        const fileContent = await window.electronAPI.readFile(fileName);
        return fileContent ? JSON.parse(fileContent) : null;
      } else {
        // Browser-Fallback
        return this.simulateCloudRead(`${this.oneDrivePath}\\${dataType}.json`);
      }
    } catch (error) {
      console.warn(`Fehler beim Laden von ${dataType} aus der Cloud:`, error);
      return null;
    }
  }

  async saveToCloud(dataType, data) {
    if (!this.isOneDriveAvailable) return false;
    
    try {
      if (this.isElectron) {
        // Echtes Dateisystem in Electron
        const fileName = `${dataType}.json`;
        const jsonData = JSON.stringify(data, null, 2);
        return await window.electronAPI.writeFile(fileName, jsonData);
      } else {
        // Browser-Fallback
        const fileName = `${dataType}.json`;
        const filePath = `${this.oneDrivePath}\\${fileName}`;
        const jsonData = JSON.stringify(data, null, 2);
        this.simulateCloudWrite(filePath, jsonData);
        return true;
      }
    } catch (error) {
      console.error(`Fehler beim Speichern von ${dataType} in die Cloud:`, error);
      return false;
    }
  }

  // Browser-Fallback-Methoden (wie vorher)
  simulateCloudRead(filePath) {
    const savedData = localStorage.getItem(`cloud_${filePath}`);
    return savedData;
  }

  simulateCloudWrite(filePath, data) {
    localStorage.setItem(`cloud_${filePath}`, data);
  }

  // Alle anderen Methoden bleiben gleich...
  async syncData() {
    if (!this.isOneDriveAvailable) return;

    try {
      const dataTypes = ['appointments', 'participants', 'reminders', 'settings'];
      
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
    const storageUtils = window.storageUtils || this.getStorageUtils();
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

  getStorageUtils() {
    // Fallback für storageUtils falls nicht verfügbar
    return {
      getItem: (key) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        } catch (error) {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error('Fehler beim Speichern:', error);
        }
      }
    };
  }

  // Export/Import für Electron
  async exportToFile() {
    if (!this.isElectron) return false;
    
    try {
      const data = {
        appointments: this.getStorageUtils().getItem('appointments') || [],
        participants: this.getStorageUtils().getItem('participants') || [],
        reminders: this.getStorageUtils().getItem('reminders') || [],
        settings: this.getStorageUtils().getItem('settings') || {},
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const result = await window.electronAPI.showSaveDialog({
        title: 'Daten exportieren',
        defaultPath: `stift-gurk-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON-Dateien', extensions: ['json'] },
          { name: 'Alle Dateien', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        await window.electronAPI.writeFile(result.filePath, JSON.stringify(data, null, 2));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Export fehlgeschlagen:', error);
      return false;
    }
  }

  async importFromFile() {
    if (!this.isElectron) return false;
    
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Daten importieren',
        filters: [
          { name: 'JSON-Dateien', extensions: ['json'] },
          { name: 'Alle Dateien', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const fileContent = await window.electronAPI.readFile(result.filePaths[0]);
        const data = JSON.parse(fileContent);
        
        const storageUtils = this.getStorageUtils();
        if (data.appointments) storageUtils.setItem('appointments', data.appointments);
        if (data.participants) storageUtils.setItem('participants', data.participants);
        if (data.reminders) storageUtils.setItem('reminders', data.reminders);
        if (data.settings) storageUtils.setItem('settings', data.settings);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Import fehlgeschlagen:', error);
      return false;
    }
  }

  // Restliche Methoden übernehmen (resolveConflicts, mergeByTimestamp, etc.)
  async resolveConflicts(localData, cloudData, dataType) {
    if (!Array.isArray(localData) || !Array.isArray(cloudData)) {
      return localData;
    }

    switch (this.conflictResolution) {
      case 'timestamp':
        return this.mergeByTimestamp(localData, cloudData);
      case 'merge':
        return this.mergeData(localData, cloudData);
      default:
        return cloudData;
    }
  }

  mergeByTimestamp(localData, cloudData) {
    const merged = new Map();
    
    localData.forEach(item => {
      if (item.id) {
        merged.set(item.id, { ...item, source: 'local' });
      }
    });
    
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
    const merged = new Map();
    
    [...localData, ...cloudData].forEach(item => {
      if (item.id && !merged.has(item.id)) {
        merged.set(item.id, item);
      }
    });
    
    return Array.from(merged.values());
  }

  isNewer(item1, item2) {
    const date1 = new Date(item1.lastModified || item1.updatedAt || item1.createdAt || 0);
    const date2 = new Date(item2.lastModified || item2.updatedAt || item2.createdAt || 0);
    return date1 > date2;
  }

  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      await this.syncData();
    }, this.syncFrequency);

    this.syncData();
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
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
    window.dispatchEvent(new CustomEvent('cloudSync', {
      detail: { type, message, timestamp: new Date() }
    }));
  }

  getStatus() {
    return {
      isOneDriveAvailable: this.isOneDriveAvailable,
      lastSync: this.lastSync,
      oneDrivePath: this.oneDrivePath,
      syncFrequency: this.syncFrequency,
      isAutoSyncing: !!this.syncInterval,
      isElectron: this.isElectron
    };
  }

  setSyncFrequency(seconds) {
    this.syncFrequency = seconds * 1000;
    if (this.syncInterval) {
      this.startAutoSync();
    }
  }

  setConflictResolution(method) {
    this.conflictResolution = method;
  }
}

// Automatisch richtige Implementation wählen
export const cloudStorage = new ElectronCloudStorageService();
export default ElectronCloudStorageService;
