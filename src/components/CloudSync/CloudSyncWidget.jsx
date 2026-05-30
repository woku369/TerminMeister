// ...entfernt: doppelte Deklaration von Card und CardContent...
// Cloud-Sync Status Widget
import React, { useState, useEffect } from 'react';
import {
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  LinearProgress,
  Badge,
  Card,
  CardContent,
  Chip,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  Divider,
  Avatar
} from '@mui/material';
import {
  MdCloud as Cloud,
  MdCloudOff as CloudOff,
  MdCloudSync as CloudSync,
  MdCloudDone as CloudDone,
  MdCloudUpload as CloudUpload,
  MdCloudDownload as CloudDownload,
  MdSync as Sync,
  MdSettings as Settings,
  MdComputer as Computer,
  MdGroup as Group,
  MdWarning as Warning,
  MdCheckCircle as CheckCircle,
  MdError as Error,
  MdInfo as Info,
  MdRefresh as Refresh
} from 'react-icons/md';
import { cloudStorage } from '../../services/cloudStorageService';

const CloudSyncWidget = ({ onStatusChange }) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState(30);
  const [autoSync, setAutoSync] = useState(true);
  const [conflictResolution, setConflictResolution] = useState('timestamp');
  const [syncLog, setSyncLog] = useState([]);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  
  // Neue State für Pfadeingabe
  const [customSyncPath, setCustomSyncPath] = useState('');
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [pathError, setPathError] = useState('');
  const [isPathTesting, setIsPathTesting] = useState(false);
  const [detectedPaths, setDetectedPaths] = useState([]);
  const [useCustomPath, setUseCustomPath] = useState(false);

  useEffect(() => {
    // Initial Status laden mit Fehlerbehandlung
    try {
      const status = cloudStorage.getStatus();
      if (status) {
        setSyncStatus(status);
        setLastSync(status.lastSync);
        setSyncFrequency((status.syncFrequency || 30000) / 1000);
        setUseCustomPath(!!status.customPath);
        setCustomSyncPath(status.customPath || '');
      }
    } catch (error) {
      console.error('Fehler beim Laden des Cloud-Status:', error);
      setSyncStatus({ isOneDriveAvailable: false, lastSync: null });
    }

    // Event-Listener für Sync-Updates
    const handleSyncEvent = (event) => {
      try {
        const { type, message, timestamp } = event.detail || {};
        
        setSyncLog(prev => [
          { type, message, timestamp },
          ...prev.slice(0, 9) // Nur die letzten 10 Einträge behalten
        ]);

        if (type === 'success') {
          setLastSync(timestamp);
          setSyncStatus(prev => ({ ...prev, lastSync: timestamp }));
        }

        if (onStatusChange) {
          onStatusChange(type, message);
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten des Sync-Events:', error);
      }
    };

    // Online/Offline Status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('cloudSync', handleSyncEvent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Status-Update Timer
    const statusTimer = setInterval(() => {
      try {
        const currentStatus = cloudStorage.getStatus();
        if (currentStatus) {
          setSyncStatus(currentStatus);
        }
      } catch (error) {
        console.error('Fehler beim Status-Update:', error);
      }
    }, 5000);

    return () => {
      window.removeEventListener('cloudSync', handleSyncEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(statusTimer);
    };
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await cloudStorage.manualSync();
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Neue Funktionen für Pfadeingabe mit besserer Fehlerbehandlung
  const detectAvailablePaths = async () => {
    setIsPathTesting(true);
    try {
      const paths = await cloudStorage.detectAvailablePaths();
      setDetectedPaths(Array.isArray(paths) ? paths : []);
    } catch (error) {
      console.error('Pfaderkennung fehlgeschlagen:', error);
      setDetectedPaths([]);
      setPathError('Automatische Pfaderkennung fehlgeschlagen');
    } finally {
      setIsPathTesting(false);
    }
  };

  const testSyncPath = async (path) => {
    if (!path || typeof path !== 'string' || !path.trim()) {
      setPathError('Bitte geben Sie einen gültigen Pfad ein');
      return false;
    }

    setIsPathTesting(true);
    setPathError('');
    
    try {
      const isValid = await cloudStorage.testSyncPath(path);
      if (isValid) {
        setPathError('');
        return true;
      } else {
        setPathError('Pfad ist nicht zugänglich oder beschreibbar');
        return false;
      }
    } catch (error) {
      const errorMessage = error.message || 'Unbekannter Fehler beim Testen des Pfades';
      setPathError(`Fehler beim Testen des Pfades: ${errorMessage}`);
      return false;
    } finally {
      setIsPathTesting(false);
    }
  };

  const applySyncPath = async () => {
    if (!customSyncPath || !customSyncPath.trim()) {
      setPathError('Bitte geben Sie einen gültigen Pfad ein');
      return;
    }

    const isValid = await testSyncPath(customSyncPath);
    if (isValid) {
      try {
        await cloudStorage.setSyncPath(customSyncPath);
        setUseCustomPath(true);
        setPathDialogOpen(false);
        setPathError('');
        
        // Status aktualisieren
        const newStatus = cloudStorage.getStatus();
        if (newStatus) {
          setSyncStatus(newStatus);
        }
        
        if (onStatusChange) {
          onStatusChange('success', `Sync-Pfad geändert: ${customSyncPath}`);
        }
      } catch (error) {
        const errorMessage = error.message || 'Unbekannter Fehler';
        setPathError(`Fehler beim Setzen des Pfades: ${errorMessage}`);
      }
    }
  };

  const resetToAutoPath = async () => {
    try {
      await cloudStorage.resetToAutoPath();
      setUseCustomPath(false);
      setCustomSyncPath('');
      setPathDialogOpen(false);
      setPathError('');
      
      // Status aktualisieren
      const newStatus = cloudStorage.getStatus();
      if (newStatus) {
        setSyncStatus(newStatus);
      }
      
      if (onStatusChange) {
        onStatusChange('success', 'Automatische Pfaderkennung aktiviert');
      }
    } catch (error) {
      const errorMessage = error.message || 'Unbekannter Fehler';
      setPathError(`Fehler beim Zurücksetzen: ${errorMessage}`);
    }
  };

  const openPathDialog = () => {
    setPathDialogOpen(true);
    setPathError('');
    // Aktueller Pfad in Dialog anzeigen
    const currentStatus = cloudStorage.getStatus();
    if (currentStatus && currentStatus.customPath) {
      setCustomSyncPath(currentStatus.customPath);
      setUseCustomPath(true);
    }
    detectAvailablePaths();
  };

  const handleSettingsSave = async () => {
    try {
      cloudStorage.setSyncFrequency(syncFrequency);
      cloudStorage.setConflictResolution(conflictResolution);
      
      // Pfad setzen falls benutzerdefiniert
      if (useCustomPath && customSyncPath.trim()) {
        await cloudStorage.setSyncPath(customSyncPath.trim());
      } else if (!useCustomPath) {
        await cloudStorage.resetToAutoPath();
      }
      
      if (autoSync) {
        cloudStorage.startAutoSync();
      } else {
        cloudStorage.stopAutoSync();
      }
      
      // Status aktualisieren
      const newStatus = cloudStorage.getStatus();
      if (newStatus) {
        setSyncStatus(newStatus);
      }
      
      setSettingsOpen(false);
      
      if (onStatusChange) {
        onStatusChange('success', 'Einstellungen erfolgreich gespeichert');
      }
    } catch (error) {
      const errorMessage = error.message || 'Unbekannter Fehler';
      if (onStatusChange) {
        onStatusChange('error', `Fehler beim Speichern: ${errorMessage}`);
      }
    }
  };

  const handlePathTest = async () => {
    setPathError('');
    setIsPathTesting(true);
    try {
      const result = await cloudStorage.testPath(customSyncPath);
      if (result.success) {
        setPathError('');
        Alert.success('Pfad erfolgreich getestet: ' + customSyncPath);
      } else {
        setPathError('Pfad konnte nicht erreicht werden. Bitte überprüfen Sie die Berechtigungen und die Netzwerkverbindung.');
      }
    } catch (error) {
      setPathError('Fehler beim Testen des Pfades: ' + error.message);
    } finally {
      setIsPathTesting(false);
    }
  };

  const getSyncStatusIcon = () => {
    if (!isOnline) return <CloudOff color="disabled" />;
    if (!syncStatus?.isOneDriveAvailable) return <CloudOff color="error" />;
    if (isManualSyncing) return <CloudSync color="primary" className="rotating" />;
    if (syncStatus?.isAutoSyncing) return <CloudDone color="success" />;
    return <Cloud color="warning" />;
  };

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!syncStatus?.isOneDriveAvailable) return 'OneDrive nicht verfügbar';
    if (isManualSyncing) return 'Synchronisiert...';
    if (syncStatus?.isAutoSyncing) return 'Auto-Sync aktiv';
    return 'Nur lokal';
  };

  const getSyncStatusColor = () => {
    if (!isOnline || !syncStatus?.isOneDriveAvailable) return 'error';
    if (syncStatus?.isAutoSyncing) return 'success';
    return 'warning';
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Nie';
    const now = new Date();
    const diff = Math.floor((now - new Date(lastSync)) / 1000);
    
    if (diff < 60) return `vor ${diff}s`;
    if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
    return lastSync.toLocaleDateString('de-DE');
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getSyncStatusIcon()}
              <Typography variant="body2" fontWeight="medium">
                Cloud-Sync
              </Typography>
              <Chip 
                label={getSyncStatusText()}
                color={getSyncStatusColor()}
                size="small"
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {formatLastSync()}
              </Typography>
                <Tooltip title="Manuell synchronisieren">
                <span>
                  <IconButton 
                    size="small" 
                    onClick={handleManualSync}
                    disabled={!syncStatus?.isOneDriveAvailable || !isOnline || isManualSyncing}
                  >
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Sync-Einstellungen">
                <span>
                  <IconButton 
                    size="small" 
                    onClick={() => setSettingsOpen(true)}
                    disabled={!syncStatus?.isOneDriveAvailable}
                  >
                    <Settings />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {isManualSyncing && (
            <LinearProgress sx={{ mt: 1, height: 2 }} />
          )}
        </CardContent>
      </Card>

      {/* Einstellungen Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudSync />
          Cloud-Synchronisation Einstellungen
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Status-Übersicht */}
            <Alert 
              severity={syncStatus?.isOneDriveAvailable ? 'success' : 'warning'} 
              sx={{ mb: 3 }}
            >
              <Typography variant="subtitle2">
                {syncStatus?.isOneDriveAvailable ? 'OneDrive verfügbar' : 'OneDrive nicht gefunden'}
              </Typography>
              <Typography variant="body2">
                {syncStatus?.oneDrivePath || 'Kein OneDrive-Pfad verfügbar'}
              </Typography>
            </Alert>

            {/* Auto-Sync */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="body1">Automatische Synchronisation</Typography>
                <Typography variant="caption" color="text.secondary">
                  Daten werden regelmäßig automatisch synchronisiert
                </Typography>
              </Box>
              <Switch
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                disabled={!syncStatus?.isOneDriveAvailable}
              />
            </Box>

            {/* Sync-Frequenz */}
            <TextField
              fullWidth
              label="Sync-Intervall (Sekunden)"
              type="number"
              value={syncFrequency}
              onChange={(e) => setSyncFrequency(Number(e.target.value))}
              sx={{ mb: 2 }}
              helperText="Wie oft soll synchronisiert werden? (Minimum: 10 Sekunden)"
              inputProps={{ min: 10, max: 3600 }}
              disabled={!autoSync || !syncStatus?.isOneDriveAvailable}
            />

            {/* Konfliktauflösung */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Konfliktauflösung</InputLabel>
              <Select
                value={conflictResolution}
                onChange={(e) => setConflictResolution(e.target.value)}
                label="Konfliktauflösung"
              >
                <MenuItem value="timestamp">Nach Zeitstempel (neuster gewinnt)</MenuItem>
                <MenuItem value="merge">Daten zusammenführen</MenuItem>
                <MenuItem value="cloud">Cloud hat Priorität</MenuItem>
                <MenuItem value="local">Lokal hat Priorität</MenuItem>
              </Select>
            </FormControl>

            {/* Pfad-Einstellungen */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Speicherort der Cloud-Daten</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {useCustomPath ? 'Benutzerdefinierter Pfad' : 'Automatische Erkennung'}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={openPathDialog}
                  startIcon={<Settings />}
                >
                  Pfad ändern
                </Button>
              </Box>
              
              {syncStatus?.oneDrivePath && (
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aktueller Pfad:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {syncStatus.oneDrivePath}
                  </Typography>
                </Box>
              )}
            </Box>
              
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Empfohlener Speicherort:</strong> Lassen Sie das Feld leer, um den Standard-OneDrive-Ordner zu verwenden.
                </Typography>
              </Alert>

              <TextField
                fullWidth
                label="Benutzerdefinierter Pfad"
                value={customSyncPath}
                onChange={(e) => setCustomSyncPath(e.target.value)}
                placeholder="z.B. C:\\Users\\IhrBenutzername\\OneDrive"
                error={!!pathError}
                helperText={pathError || ' '}
                disabled={!syncStatus?.isOneDriveAvailable}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => setPathDialogOpen(true)}
                  disabled={!syncStatus?.isOneDriveAvailable}
                >
                  Pfad testen
                </Button>
              </Box>
            </Box>

            {/* Sync-Log */}
            <Typography variant="h6" sx={{ mb: 1 }}>Letzte Sync-Aktivitäten</Typography>
            <List sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {syncLog.length === 0 ? (
                <ListItem>
                  <ListItemText primary="Keine Aktivitäten" />
                </ListItem>
              ) : (
                syncLog.map((entry, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {entry.type === 'success' && <CheckCircle color="success" />}
                      {entry.type === 'error' && <Error color="error" />}
                      {entry.type === 'warning' && <Warning color="warning" />}
                      {entry.type === 'info' && <Info color="info" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={entry.message}
                      secondary={entry.timestamp.toLocaleString('de-DE')}
                    />
                  </ListItem>
                ))
              )}
            </List>

            {/* Multi-Client Info */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <Group sx={{ mr: 1, verticalAlign: 'bottom' }} />
                <strong>Multi-Client-Betrieb:</strong> Diese App kann von mehreren Computern 
                gleichzeitig verwendet werden. Änderungen werden automatisch zwischen allen 
                Geräten synchronisiert.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSettingsSave} variant="contained">
            Einstellungen speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pfad Testen Dialog */}
      <Dialog open={pathDialogOpen} onClose={() => setPathDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Pfad testen
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Sie können den eingegebenen Pfad auf Erreichbarkeit testen. Klicken Sie auf "Testen", um den Pfad zu überprüfen.
          </Typography>

          <TextField
            fullWidth
            label="Pfad"
            value={customSyncPath}
            onChange={(e) => setCustomSyncPath(e.target.value)}
            placeholder="z.B. C:\\Users\\IhrBenutzername\\OneDrive"
            error={!!pathError}
            helperText={pathError || ' '}
            disabled={isPathTesting}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button onClick={() => setPathDialogOpen(false)}>
              Schließen
            </Button>
            <Button 
              variant="contained" 
              onClick={handlePathTest}
              disabled={isPathTesting}
            >
              {isPathTesting ? 'Teste...' : 'Testen'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Pfad-Eingabe Dialog */}
      <Dialog open={pathDialogOpen} onClose={() => setPathDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings />
            Cloud-Sync Pfad konfigurieren
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Wählen Sie den Speicherort für die Cloud-Synchronisation. Dies sollte ein OneDrive-Ordner sein,
            der zwischen Ihren Geräten synchronisiert wird.
          </Typography>

          {/* Automatische vs. manuelle Pfad-Auswahl */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Pfad-Modus</Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant={!useCustomPath ? 'contained' : 'outlined'}
                onClick={resetToAutoPath}
                startIcon={<CloudSync />}
                sx={{ flex: 1 }}
              >
                Automatisch erkennen
              </Button>
              <Button
                variant={useCustomPath ? 'contained' : 'outlined'}
                onClick={() => setUseCustomPath(true)}
                startIcon={<Settings />}
                sx={{ flex: 1 }}
              >
                Manuell eingeben
              </Button>
            </Box>
          </Box>

          {/* Erkannte Pfade anzeigen */}
          {!useCustomPath && detectedPaths.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Gefundene OneDrive-Pfade:</Typography>
              <List>
                {detectedPaths.map((path, index) => (
                  <ListItem 
                    key={index} 
                    button
                    onClick={() => {
                      setCustomSyncPath(path.path);
                      setUseCustomPath(true);
                    }}
                  >
                    <ListItemIcon>
                      <Cloud color={path.accessible ? 'primary' : 'disabled'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={path.path}
                      secondary={path.accessible ? 'Verfügbar' : 'Nicht zugänglich'}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Manuelle Pfadeingabe */}
          {useCustomPath && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Benutzerdefinierter Pfad:</Typography>
              
              <TextField
                fullWidth
                label="OneDrive-Pfad"
                value={customSyncPath}
                onChange={(e) => setCustomSyncPath(e.target.value)}
                placeholder="C:\Users\IhrName\OneDrive\StiftGurk"
                helperText="Geben Sie den vollständigen Pfad zu Ihrem OneDrive-Ordner ein"
                sx={{ mb: 2 }}
                error={!!pathError}
              />

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => testSyncPath(customSyncPath)}
                  disabled={!customSyncPath.trim() || isPathTesting}
                  startIcon={isPathTesting ? <Sync className="rotating" /> : <CheckCircle />}
                >
                  {isPathTesting ? 'Teste Pfad...' : 'Pfad testen'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={detectAvailablePaths}
                  disabled={isPathTesting}
                  startIcon={<Refresh />}
                >
                  Automatisch suchen
                </Button>
              </Box>

              {/* Pfad-Beispiele */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Beispiel-Pfade:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                  C:\Users\IhrName\OneDrive\StiftGurk
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                  C:\Users\IhrName\OneDrive - edrmg\Desktop\führungen
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  D:\Cloud\OneDrive\Projekte\StiftGurk
                </Typography>
              </Box>
            </Box>
          )}

          {/* Fehlermeldung */}
          {pathError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {pathError}
            </Alert>
          )}

          {/* Pfad-Test-Anzeige */}
          {isPathTesting && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Teste Pfad-Zugriff und Schreibberechtigung...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPathDialogOpen(false)}>
            Abbrechen
          </Button>
          {useCustomPath && (
            <Button 
              onClick={applySyncPath}
              variant="contained"
              disabled={!customSyncPath.trim() || !!pathError || isPathTesting}
            >
              Pfad übernehmen
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <style>{`
        @keyframes rotating {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .rotating {
          animation: rotating 2s linear infinite;
        }
      `}</style>
    </>
  );
};

export default CloudSyncWidget;
