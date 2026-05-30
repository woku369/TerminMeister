import React, { useState, useEffect } from 'react';
import { GoogleCalendarService } from '../../services/googleCalendarService';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Divider,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid
} from '@mui/material';
import { MdSettings as Settings, MdSave as Save, MdRestorePage as RestorePageSharp } from 'react-icons/md';
import { storageUtils } from '../../utils/storage';

const GOOGLE_CLIENT_ID = '669361145983-aej307lmeu65o9l8van4iha4dmfu3la9.apps.googleusercontent.com';

const SettingsDialog = ({ open, onClose }) => {
  // Google-Login Status
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);

  // Google API initialisieren (nur bei Bedarf)
  const initGoogle = async () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google Client-ID fehlt! Bitte in den Code eintragen.');
      return;
    }
    await GoogleCalendarService.initClient({ clientId: GOOGLE_CLIENT_ID });
    updateGoogleStatus();
  };

  const updateGoogleStatus = () => {
    if (window.gapi && window.gapi.auth2 && window.gapi.auth2.getAuthInstance) {
      setGoogleSignedIn(GoogleCalendarService.isSignedIn());
      setGoogleUser(GoogleCalendarService.getUser());
    }
  };

  const handleGoogleLogin = async () => {
    await initGoogle();
    await GoogleCalendarService.signIn();
    updateGoogleStatus();
  };

  const handleGoogleLogout = async () => {
    await initGoogle();
    await GoogleCalendarService.signOut();
    updateGoogleStatus();
  };
  const [settings, setSettings] = useState({
    // Allgemeine Einstellungen
    darkMode: false,
    compactView: false,
    autoSave: true,

    // Kalendar-Einstellungen
    defaultView: 'month',
    weekStartsOn: 1, // Montag
    workingHours: { start: '08:00', end: '18:00' },

    // Erinnerungs-Einstellungen
    defaultReminderTime: 30, // Minuten
    enableNotifications: true,
    enableSound: true,

    // Daten-Einstellungen
    autoBackup: true,
    backupInterval: 7, // Tage
    maxStorageSize: 50, // MB

    // NAS-Einstellungen (REST API, Port 3005)
    nasUrl: 'http://100.121.103.107:3005',
    nasApiKey: '',
    nasEnabled: false
  });

  const [originalSettings, setOriginalSettings] = useState({});

  useEffect(() => {
    loadSettings();
  }, [open]);

  const loadSettings = () => {
    const savedSettings = storageUtils.getItem('appSettings');
    if (savedSettings) {
      setSettings({ ...settings, ...savedSettings });
      setOriginalSettings({ ...settings, ...savedSettings });
    } else {
      setOriginalSettings(settings);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNestedSettingChange = (parentKey, childKey, value) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value
      }
    }));
  };

  const handleSave = () => {
    storageUtils.setItem('appSettings', settings);
    
    // Theme-Änderung anwenden (falls implementiert)
    if (settings.darkMode !== originalSettings.darkMode) {
      document.body.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
    }
    
    onClose();
  };

  const handleCancel = () => {
    setSettings(originalSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      darkMode: false,
      compactView: false,
      autoSave: true,
      defaultView: 'month',
      weekStartsOn: 1,
      workingHours: { start: '08:00', end: '18:00' },
      defaultReminderTime: 30,
      enableNotifications: true,
      enableSound: true,
      autoBackup: true,
      backupInterval: 7,
      maxStorageSize: 50
    };
    setSettings(defaultSettings);
  };

  const getStorageUsage = () => {
    try {
      const appointments = JSON.stringify(storageUtils.getItem('appointments') || []);
      const participants = JSON.stringify(storageUtils.getItem('participants') || []);
      const reminders = JSON.stringify(storageUtils.getItem('reminders') || []);
      
      const totalSize = (appointments.length + participants.length + reminders.length) / 1024; // KB
      return Math.round(totalSize * 100) / 100;
    } catch (error) {
      return 0;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings />
        Einstellungen
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Google Kalender Integration */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Google Kalender Integration
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant={googleSignedIn ? 'outlined' : 'contained'}
              color={googleSignedIn ? 'secondary' : 'primary'}
              onClick={googleSignedIn ? handleGoogleLogout : handleGoogleLogin}
            >
              {googleSignedIn ? 'Google Logout' : 'Mit Google verbinden'}
            </Button>
            {googleSignedIn && googleUser && (
              <Typography variant="body2" color="text.secondary">
                Angemeldet als: {googleUser.getBasicProfile().getEmail()}
              </Typography>
            )}
          </Box>
        </Box>
        {/* Allgemeine Einstellungen */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Allgemeine Einstellungen
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                />
              }
              label="Dunkles Design"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.compactView}
                  onChange={(e) => handleSettingChange('compactView', e.target.checked)}
                />
              }
              label="Kompakte Ansicht"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                />
              }
              label="Automatisches Speichern"
            />
          </FormGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Kalender-Einstellungen */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Kalender-Einstellungen
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <FormControl sx={{ minWidth: 180, maxWidth: 240 }}>
                <InputLabel>Standard-Ansicht</InputLabel>
                <Select
                  value={settings.defaultView}
                  onChange={(e) => handleSettingChange('defaultView', e.target.value)}
                  label="Standard-Ansicht"
                >
                  <MenuItem value="month">Monat</MenuItem>
                  <MenuItem value="week">Woche</MenuItem>
                  <MenuItem value="day">Tag</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item>
              <FormControl sx={{ minWidth: 180, maxWidth: 240 }}>
                <InputLabel>Woche beginnt am</InputLabel>
                <Select
                  value={settings.weekStartsOn}
                  onChange={(e) => handleSettingChange('weekStartsOn', e.target.value)}
                  label="Woche beginnt am"
                >
                  <MenuItem value={0}>Sonntag</MenuItem>
                  <MenuItem value={1}>Montag</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item>
              <TextField
                label="Arbeitszeit von"
                type="time"
                value={settings.workingHours.start}
                onChange={(e) => handleNestedSettingChange('workingHours', 'start', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 140, maxWidth: 180 }}
              />
            </Grid>
            <Grid item>
              <TextField
                label="Arbeitszeit bis"
                type="time"
                value={settings.workingHours.end}
                onChange={(e) => handleNestedSettingChange('workingHours', 'end', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 140, maxWidth: 180 }}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Erinnerungen */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Erinnerungen
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <TextField
                label="Standard Erinnerungszeit (Minuten)"
                type="number"
                value={settings.defaultReminderTime}
                onChange={(e) => handleSettingChange('defaultReminderTime', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 1440 }}
                sx={{ minWidth: 220, maxWidth: 260 }}
              />
            </Grid>
          </Grid>
          <FormGroup sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableNotifications}
                  onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
                />
              }
              label="Browser-Benachrichtigungen aktivieren"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableSound}
                  onChange={(e) => handleSettingChange('enableSound', e.target.checked)}
                />
              }
              label="Benachrichtigungston"
            />
          </FormGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Datenverwaltung */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Datenverwaltung
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`Speicherverbrauch: ${getStorageUsage()} KB`}
              color="info"
              variant="outlined"
            />
            <Chip 
              label={`Max. Speicher: ${settings.maxStorageSize} MB`}
              color="primary"
              variant="outlined"
            />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  />
                }
                label="Automatische Backups"
              />
            </Grid>
            {settings.autoBackup && (
            <Grid item>
              <TextField
                label="Backup-Intervall (Tage)"
                type="number"
                value={settings.backupInterval}
                onChange={(e) => handleSettingChange('backupInterval', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 30 }}
                sx={{ minWidth: 180, maxWidth: 220 }}
              />
            </Grid>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* NAS/Cloud-Speicher (Synology) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            NAS/Cloud-Speicher (Synology)
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.nasEnabled}
                  onChange={e => handleSettingChange('nasEnabled', e.target.checked)}
                />
              }
              label="NAS-Speicherung aktivieren (Synology DS124)"
            />
          </FormGroup>
          {settings.nasEnabled && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="NAS URL"
                  value={settings.nasUrl}
                  onChange={e => handleSettingChange('nasUrl', e.target.value)}
                  helperText="z.B. http://100.121.103.107:3005  (Tailscale) oder http://192.168.0.9:3005  (LAN)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API-Key (optional)"
                  value={settings.nasApiKey}
                  onChange={e => handleSettingChange('nasApiKey', e.target.value)}
                  helperText="Nur nötig wenn der NAS-Server mit API_KEY gestartet wurde"
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Button
          onClick={handleReset}
          startIcon={<RestorePageSharp />}
          color="warning"
        >
          Zurücksetzen
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<Save />}
          >
            Speichern
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
