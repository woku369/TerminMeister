// Hauptkomponente des Terminplanungsmoduls
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Fab,
  Snackbar,
  Alert
} from '@mui/material';
import {
  MdCalendarMonth as CalendarMonth,
  MdPeople as People,
  MdGroups as Groups,
  MdNotifications as Notifications,
  MdAssessment as Assessment,
  MdAdd as Add,
  MdSettings as SettingsIcon,
  MdCloud as CloudIcon
} from 'react-icons/md';

// Komponenten importieren
import KalenderAnsicht from './Calendar/KalenderAnsicht';
import TeilnehmerVerwaltung from './ParticipantManager/TeilnehmerVerwaltung';
import TeamVerwaltung from './TeamManager/TeamVerwaltung';
import ErinnerungsSystem from './Reminders/ErinnerungsSystem';
import ReportingDashboard from './Reports/ReportingDashboard';
import TerminFormular from './AppointmentForm/TerminFormular';
import SettingsDialog from './common/SettingsDialog';
import WeatherApiTest from './Weather/WeatherApiTest';
import CloudSyncWidget from './CloudSync/CloudSyncWidget';
import NasSyncWidget from './CloudSync/NasSyncWidget';
import AppSidebar from './Sidebar/AppSidebar';

// Services
import { ReminderService } from '../services/reminderService';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function TerminplanungsModul() {
  const [activeTab, setActiveTab] = useState(0);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [refreshCalendar, setRefreshCalendar] = useState(0);
  const [cloudSyncMessage, setCloudSyncMessage] = useState(null);
  // Settings werden nur im SettingsDialog verwaltet, nicht hier als State
  // Startet mit Hauptansicht (kein Dialog)
  const [sidebarSelection, setSidebarSelection] = useState('');

  // Erinnerungen initialisieren
  useEffect(() => {
    // Benachrichtigungsberechtigung anfordern
    ReminderService.requestNotificationPermission();

    // Erinnerungsüberwachung starten
    ReminderService.scheduleReminderCheck();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setIsAppointmentFormOpen(true);
  };

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentFormOpen(true);
  };

  const handleFormClose = () => {
    setIsAppointmentFormOpen(false);
    setSelectedAppointment(null);
  };
  const handleFormSuccess = (message) => {
    setSnackbar({
      open: true,
      message: message,
      severity: 'success'
    });
    // Kalender aktualisieren
    setRefreshCalendar(prev => prev + 1);
    handleFormClose();
  };

  const handleFormError = (message) => {
    setSnackbar({
      open: true,
      message: message,
      severity: 'error'
    });
  };
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCloudSyncStatus = (type, message) => {
    if (type === 'error') {
      setSnackbar({
        open: true,
        message: `Cloud-Sync: ${message}`,
        severity: 'warning'
      });
    }
    setCloudSyncMessage({ type, message });
  };
  const tabs = [
    { label: 'Kalender', icon: <CalendarMonth /> },
    { label: 'Teilnehmer', icon: <People /> },
    { label: 'Team', icon: <Groups /> },
    { label: 'Erinnerungen', icon: <Notifications /> },
    { label: 'Berichte', icon: <Assessment /> },
    { label: 'Wetter-API', icon: <CloudIcon /> }
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppSidebar selected={sidebarSelection} onSelect={setSidebarSelection} />
      <Box sx={{ flexGrow: 1, ml: '240px', p: 0 }}>
        {/* Sidebar-gesteuerter Inhalt */}
        {sidebarSelection === 'settings' && (
          <SettingsDialog open={true} onClose={() => setSidebarSelection('')} />
        )}
        {sidebarSelection === 'cloud' && (
          <CloudSyncWidget onClose={() => setSidebarSelection('')} />
        )}
        {sidebarSelection === 'nas' && (
          <NasSyncWidget settings={JSON.parse(localStorage.getItem('appSettings')) || {}} onClose={() => setSidebarSelection('')} />
        )}
        {/* Platzhalter für weitere Menüpunkte */}
        {sidebarSelection === 'syncstatus' && (
          <Box sx={{ p: 4 }}>
            <h2>Synchronisationsstatus</h2>
            {/* Hier kann später ein Status-Widget integriert werden */}
          </Box>
        )}
        {sidebarSelection === 'info' && (
          <Box sx={{ p: 4 }}>
            <h2>Info</h2>
            <p>TerminMeister – Professionelle Terminplanung für Teams.</p>
          </Box>
        )}
        {/* Hauptinhalt (z.B. Kalender, Teilnehmer, etc.) nur anzeigen, wenn kein Dialog offen ist */}
        {sidebarSelection === '' && (
          <Container maxWidth="xl" sx={{ py: 2 }}>
            <Paper elevation={1}>
              {/* App Bar */}
              <AppBar position="static" color="default" elevation={0}>
                <Toolbar>
                  <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                    Terminplanungsmodul
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Events & Vor-Ort-Termine
                  </Typography>
                  <IconButton
                    color="inherit"
                    onClick={() => setIsSettingsOpen(true)}
                    title="Einstellungen"
                  >
                    <SettingsIcon />
                  </IconButton>
                </Toolbar>
              </AppBar>

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  textColor="primary"
                  indicatorColor="primary"
                >
                  {tabs.map((tab, index) => (
                    <Tab
                      key={index}
                      icon={tab.icon}
                      label={tab.label}
                      iconPosition="start"
                      sx={{ minHeight: 64 }}
                    />
                  ))}
                </Tabs>
              </Box>
              {/* Cloud-Sync Widget */}
              <CloudSyncWidget onStatusChange={handleCloudSyncStatus} />
              {/* NAS-Sync Widget */}
              <NasSyncWidget settings={JSON.parse(localStorage.getItem('appSettings')) || {}} />

              {/* Tab Panels */}
              <TabPanel value={activeTab} index={0}>
                <KalenderAnsicht
                  onEditAppointment={handleEditAppointment}
                  onSuccess={handleFormSuccess}
                  onError={handleFormError}
                  refreshTrigger={refreshCalendar}
                />
              </TabPanel>
              <TabPanel value={activeTab} index={1}>
                <TeilnehmerVerwaltung
                  onSuccess={handleFormSuccess}
                  onError={handleFormError}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <TeamVerwaltung />
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <ErinnerungsSystem
                  onSuccess={handleFormSuccess}
                  onError={handleFormError}
                />
              </TabPanel>
              <TabPanel value={activeTab} index={4}>
                <ReportingDashboard />
              </TabPanel>

              <TabPanel value={activeTab} index={5}>
                <WeatherApiTest />
              </TabPanel>
            </Paper>
            {/* TerminFormular-Dialog */}
            {isAppointmentFormOpen && (
              <TerminFormular
                open={isAppointmentFormOpen}
                appointment={selectedAppointment}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
                onError={handleFormError}
              />
            )}
          </Container>
        )}
      </Box>
    </Box>
  );
}

export default TerminplanungsModul;
