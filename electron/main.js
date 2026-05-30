const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
// __dirname ist in CommonJS automatisch verfügbar

// Entwicklungsmodus erkennen
const isDev = process.env.NODE_ENV === 'development';

class StiftGurkApp {
  constructor() {
    this.mainWindow = null;
    this.oneDrivePath = null;
    
    this.init();
  }
  
  init() {
    // App-Events
    app.whenReady().then(() => {
      this.createMainWindow();
      this.detectOneDrive();
      this.setupIPC();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });
    
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }
  
  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../resources/icon.png'),
      title: 'Stift Gurk - Terminplanung',
      show: false, // Erst zeigen wenn ready
      titleBarStyle: 'default',
      autoHideMenuBar: false
    });
    
    // Menu-Bar mit deutschen Bezeichnungen
    this.createMenu();
    
    // Load App
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      // Lokalen Express-Server starten und dann laden
      const { startStaticServer } = require('./static-server');
      const distPath = path.join(__dirname, '../dist');
      startStaticServer(distPath, 3000).then(({ port }) => {
        const url = `http://localhost:${port}`;
        console.log('[Electron] Lade URL:', url);
        this.mainWindow.loadURL(url);
        // DevTools NICHT automatisch öffnen im Produktionsmodus
      });
    }
    // Wenn DevTools geschlossen werden, Renderer zum Resize zwingen
    this.mainWindow.webContents.on('devtools-closed', () => {
      this.mainWindow.webContents.executeJavaScript('window.dispatchEvent(new Event("resize"));');
    });
    // Logging für Renderer-Fehler und Ladeevents
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[Electron] did-fail-load:', { errorCode, errorDescription, validatedURL });
    });
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Electron] did-finish-load: Renderer geladen.');
    });
    
    // Window Events
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Splash-Screen-Effekt
      if (!isDev) {
        this.mainWindow.webContents.executeJavaScript(`
          document.body.style.opacity = '0';
          document.body.style.transition = 'opacity 0.3s ease-in';
          setTimeout(() => {
            document.body.style.opacity = '1';
          }, 100);
        `);
      }
    });
    
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }
  
  createMenu() {
    const template = [
      {
        label: 'Datei',
        submenu: [
          {
            label: 'Neuer Termin',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow.webContents.send('menu-action', 'new-appointment');
            }
          },
          { type: 'separator' },
          {
            label: 'Daten exportieren',
            accelerator: 'CmdOrCtrl+E',
            click: () => {
              this.mainWindow.webContents.send('menu-action', 'export-data');
            }
          },
          {
            label: 'Daten importieren',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
              this.mainWindow.webContents.send('menu-action', 'import-data');
            }
          },
          { type: 'separator' },
          {
            label: 'Beenden',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Bearbeiten',
        submenu: [
          { role: 'undo', label: 'Rückgängig' },
          { role: 'redo', label: 'Wiederholen' },
          { type: 'separator' },
          { role: 'cut', label: 'Ausschneiden' },
          { role: 'copy', label: 'Kopieren' },
          { role: 'paste', label: 'Einfügen' },
          { role: 'selectall', label: 'Alles auswählen' }
        ]
      },
      {
        label: 'Ansicht',
        submenu: [
          { role: 'reload', label: 'Neu laden' },
          { role: 'forceReload', label: 'Erzwingen neu laden' },
          { role: 'toggleDevTools', label: 'Entwicklertools' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom zurücksetzen' },
          { role: 'zoomIn', label: 'Vergrößern' },
          { role: 'zoomOut', label: 'Verkleinern' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Vollbild' }
        ]
      },
      {
        label: 'Cloud',
        submenu: [
          {
            label: 'Jetzt synchronisieren',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.mainWindow.webContents.send('menu-action', 'sync-now');
            }
          },
          {
            label: 'OneDrive-Pfad anzeigen',
            click: () => {
              this.showOneDrivePath();
            }
          },
          {
            label: 'Backup erstellen',
            click: () => {
              this.mainWindow.webContents.send('menu-action', 'create-backup');
            }
          }
        ]
      },
      {
        label: 'Hilfe',
        submenu: [
          {
            label: 'Über Stift Gurk Terminplanung',
            click: () => {
              this.showAbout();
            }
          },
          {
            label: 'Benutzerhandbuch öffnen',
            click: () => {
              shell.openExternal('https://github.com/stift-gurk/terminplanung/blob/main/README.md');
            }
          }
        ]
      }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
  
  detectOneDrive() {
    const possiblePaths = [
      path.join(os.homedir(), 'OneDrive'),
      path.join(os.homedir(), 'OneDrive - Personal'),
      path.join(os.homedir(), 'OneDrive - edrmg'), // Für Ihre spezifische Organisation
      process.env.OneDrive,
      process.env.OneDriveConsumer,
      process.env.OneDriveCommercial
    ];

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        this.oneDrivePath = path.join(p, 'StiftGurk', 'Terminplanung');

        // Verzeichnis erstellen falls nicht vorhanden
        try {
          fs.mkdirSync(this.oneDrivePath, { recursive: true });
          console.log(`OneDrive-Pfad gefunden und konfiguriert: ${this.oneDrivePath}`);
          break;
        } catch (error) {
          console.warn(`Fehler beim Erstellen von OneDrive-Verzeichnis: ${error.message}`);
        }
      }
    }
    
    if (!this.oneDrivePath) {
      console.log('OneDrive nicht gefunden, arbeite nur lokal');
    }
  }
  
  setupIPC() {
    // OneDrive-Pfad abrufen
    ipcMain.handle('get-onedrive-path', () => {
      // Fallback: Wenn kein Pfad erkannt wurde, gib einen Standardwert zurück
      return this.oneDrivePath || process.env.OneDrive || '';
    });
    
    // Dateien lesen/schreiben
    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        const fullPath = join(this.oneDrivePath || '', filePath);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf8');
        }
        return null;
      } catch (error) {
        console.error('Fehler beim Lesen der Datei:', error);
        return null;
      }
    });
    
    ipcMain.handle('write-file', async (event, filePath, data) => {
      try {
        if (!this.oneDrivePath) return false;
        
        const fullPath = join(this.oneDrivePath, filePath);
        fs.writeFileSync(fullPath, data, 'utf8');
        return true;
      } catch (error) {
        console.error('Fehler beim Schreiben der Datei:', error);
        return false;
      }
    });
    
    // Datei-Dialog
    ipcMain.handle('show-save-dialog', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result;
    });
    
    ipcMain.handle('show-open-dialog', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });
    
    // System-Info
    ipcMain.handle('get-system-info', () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        homeDir: os.homedir(),
        tempDir: os.tmpdir()
      };
    });
  }
  
  showOneDrivePath() {
    const message = this.oneDrivePath 
      ? `OneDrive-Pfad: ${this.oneDrivePath}`
      : 'OneDrive wurde nicht gefunden. Die App arbeitet nur lokal.';
      
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'OneDrive-Konfiguration',
      message: message,
      buttons: ['OK', 'Pfad öffnen'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 1 && this.oneDrivePath && fs.existsSync(this.oneDrivePath)) {
        shell.openPath(this.oneDrivePath);
      }
    });
  }
  
  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Über Stift Gurk Terminplanung',
      message: 'Stift Gurk Terminplanungsmodul',
      detail: `Version: 1.0.0
Entwickelt für die Verwaltung von Führungen und Vor-Ort-Terminen im Stift Gurk.

Features:
• Multi-Client OneDrive-Synchronisation
• PDF/HTML-Export für Checklisten und Kalender
• Teilnehmer- und Teamverwaltung
• Wetterprognose-Integration
• Automatische Erinnerungen

© 2025 Stift Gurk`,
      buttons: ['OK']
    });
  }
}

// App starten
new StiftGurkApp();
