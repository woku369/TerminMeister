// Erinnerungssystem
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Badge
} from '@mui/material';
// entfernt, da Alias-Import darunter verwendet wird
import {
  MdNotificationImportant as NotificationImportant,
  MdSchedule as Schedule,
  MdCheckCircle as CheckCircle,
  MdCancel as Cancel,
  MdEdit as Edit,
  MdDelete as Delete,
  MdAdd as Add,
  MdRefresh as Refresh,
  MdEvent as EventIcon,
} from 'react-icons/md';

// Services
import { ReminderService } from '../../services/reminderService';
import { AppointmentService } from '../../services/appointmentService';
import { DateUtils } from '../../utils/dateUtils';

function ErinnerungsSystem({ onSuccess, onError }) {
  const [reminders, setReminders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Formular-State
  const [formData, setFormData] = useState({
    appointmentId: '',
    reminderTime: 30,
    message: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
    // Alle 30 Sekunden aktualisieren
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    try {
      const allReminders = ReminderService.getAllReminders();
      const allAppointments = AppointmentService.getAllAppointments();
      const due = ReminderService.getDueReminders();
      const upcoming = ReminderService.getUpcomingReminders(24); // 24 Stunden
      const stats = ReminderService.getReminderStatistics();

      setReminders(allReminders);
      setAppointments(allAppointments);
      setDueReminders(due);
      setUpcomingReminders(upcoming);
      setStatistics(stats);
    } catch (error) {
      onError('Fehler beim Laden der Erinnerungen: ' + error.message);
    }
  };

  const handleProcessReminders = async () => {
    try {
      const result = ReminderService.processReminders();
      if (result.processed.length > 0) {
        onSuccess(`${result.processed.length} Erinnerung(en) versendet`);
      }
      if (result.failed.length > 0) {
        onError(`${result.failed.length} Erinnerung(en) konnten nicht versendet werden`);
      }
      loadData();
    } catch (error) {
      onError('Fehler beim Verarbeiten der Erinnerungen: ' + error.message);
    }
  };

  const handleCreateReminder = () => {
    setSelectedReminder(null);
    setFormData({
      appointmentId: '',
      reminderTime: 30,
      message: '',
      isActive: true
    });
    setFormDialogOpen(true);
  };

  const handleEditReminder = (reminder) => {
    setSelectedReminder(reminder);
    setFormData({
      appointmentId: reminder.appointmentId,
      reminderTime: reminder.reminderTime,
      message: reminder.message || '',
      isActive: reminder.isActive
    });
    setFormDialogOpen(true);
  };

  const handleDeleteReminder = (reminder) => {
    setSelectedReminder(reminder);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    try {
      if (selectedReminder) {
        // Erinnerung bearbeiten
        await ReminderService.updateReminder(selectedReminder.id, formData);
        onSuccess('Erinnerung wurde erfolgreich aktualisiert');
      } else {
        // Neue Erinnerung erstellen
        await ReminderService.createReminder(formData);
        onSuccess('Erinnerung wurde erfolgreich erstellt');
      }

      setFormDialogOpen(false);
      loadData();
    } catch (error) {
      onError('Fehler beim Speichern: ' + error.message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await ReminderService.deleteReminder(selectedReminder.id);
      onSuccess('Erinnerung wurde erfolgreich gelöscht');
      setDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      onError('Fehler beim Löschen: ' + error.message);
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleReminder = async (reminder) => {
    try {
      if (reminder.isActive) {
        await ReminderService.deactivateReminder(reminder.id);
        onSuccess('Erinnerung deaktiviert');
      } else {
        await ReminderService.activateReminder(reminder.id);
        onSuccess('Erinnerung aktiviert');
      }
      loadData();
    } catch (error) {
      onError('Fehler beim Ändern der Erinnerung: ' + error.message);
    }
  };

  const handleSnoozeReminder = async (reminder, minutes = 10) => {
    try {
      await ReminderService.snoozeReminder(reminder.id, minutes);
      onSuccess(`Erinnerung um ${minutes} Minuten verschoben`);
      loadData();
    } catch (error) {
      onError('Fehler beim Verschieben der Erinnerung: ' + error.message);
    }
  };

  const getAppointmentTitle = (appointmentId) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    return appointment ? appointment.title : 'Unbekannter Termin';
  };

  const getAppointmentDetails = (appointmentId) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    return appointment || null;
  };

  const getReminderTimeText = (minutes) => {
    if (minutes < 60) {
      return `${minutes} Min.`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} Std.`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} Tag(e)`;
    }
  };

  const formatTimeUntil = (timeUntilReminder) => {
    if (!timeUntilReminder) return '';
    
    const { hours, minutes } = timeUntilReminder;
    if (hours > 0) {
      return `in ${Math.floor(hours)}h ${Math.floor(minutes % 60)}min`;
    } else {
      return `in ${Math.floor(minutes)}min`;
    }
  };

  return (
    <Box>
      {/* Statistiken */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <NotificationImportant sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6">{statistics.totalReminders}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Erinnerungen gesamt
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ mr: 1, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h6">{statistics.pendingReminders}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ausstehend
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6">{statistics.sentReminders}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Versendet
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EventIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h6">{statistics.appointmentsWithReminders}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Termine mit Erinnerung
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Aktionen */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleProcessReminders}
        >
          Erinnerungen verarbeiten
        </Button>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleCreateReminder}
        >
          Neue Erinnerung
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
        >
          Aktualisieren
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Fällige Erinnerungen */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Badge badgeContent={dueReminders.length} color="error">
                <NotificationImportant color="error" />
              </Badge>
              <Typography variant="h6" sx={{ ml: 1 }}>
                Fällige Erinnerungen
              </Typography>
            </Box>

            {dueReminders.length === 0 ? (
              <Alert severity="success">
                Keine fälligen Erinnerungen
              </Alert>
            ) : (
              <List>
                {dueReminders.map((reminderData) => {
                  const appointment = getAppointmentDetails(reminderData.appointmentId);
                  return (
                    <ListItem key={reminderData.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {getAppointmentTitle(reminderData.appointmentId)}
                            </Typography>
                            <Chip 
                              size="small" 
                              label="FÄLLIG" 
                              color="error"
                              variant="filled"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            {appointment && (
                              <Typography variant="body2" color="text.secondary">
                                <AccessTime sx={{ fontSize: 14, mr: 0.5 }} />
                                {DateUtils.formatDateTime(appointment.start)}
                              </Typography>
                            )}
                            <Typography variant="body2">
                              {reminderData.message || `Erinnerung ${getReminderTimeText(reminderData.reminderTime)} vor Termin`}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => handleSnoozeReminder(reminderData, 10)}
                          title="10 Min. verschieben"
                        >
                          <Snooze />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => ReminderService.markReminderAsSent(reminderData.id).then(loadData)}
                          title="Als versendet markieren"
                        >
                          <CheckCircle />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Kommende Erinnerungen */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Badge badgeContent={upcomingReminders.length} color="warning">
                <Schedule color="warning" />
              </Badge>
              <Typography variant="h6" sx={{ ml: 1 }}>
                Kommende Erinnerungen (24h)
              </Typography>
            </Box>

            {upcomingReminders.length === 0 ? (
              <Alert severity="info">
                Keine kommenden Erinnerungen in den nächsten 24 Stunden
              </Alert>
            ) : (
              <List>
                {upcomingReminders.map((reminderData) => {
                  const appointment = getAppointmentDetails(reminderData.appointmentId);
                  return (
                    <ListItem key={reminderData.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {getAppointmentTitle(reminderData.appointmentId)}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={formatTimeUntil(reminderData.timeUntilReminder)}
                              color="warning"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            {appointment && (
                              <Typography variant="body2" color="text.secondary">
                                <AccessTime sx={{ fontSize: 14, mr: 0.5 }} />
                                {DateUtils.formatDateTime(appointment.start)}
                              </Typography>
                            )}
                            <Typography variant="body2">
                              Erinnerung: {DateUtils.formatDateTime(reminderData.reminderTime)}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => handleEditReminder(reminderData)}
                        >
                          <Edit />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Alle Erinnerungen */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Alle Erinnerungen
            </Typography>

            {reminders.length === 0 ? (
              <Alert severity="info">
                Keine Erinnerungen vorhanden
              </Alert>
            ) : (
              <List>
                {reminders.map((reminder) => {
                  const appointment = getAppointmentDetails(reminder.appointmentId);
                  return (
                    <ListItem key={reminder.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {getAppointmentTitle(reminder.appointmentId)}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={getReminderTimeText(reminder.reminderTime)}
                              color="primary"
                              variant="outlined"
                            />
                            {reminder.hasBeenSent && (
                              <Chip 
                                size="small" 
                                label="Versendet" 
                                color="success"
                                variant="filled"
                              />
                            )}
                            {!reminder.isActive && (
                              <Chip 
                                size="small" 
                                label="Inaktiv" 
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            {appointment && (
                              <Typography variant="body2" color="text.secondary">
                                <EventIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                {DateUtils.formatDateTime(appointment.start)}
                              </Typography>
                            )}
                            {reminder.message && (
                              <Typography variant="body2">
                                {reminder.message}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={reminder.isActive}
                          onChange={() => handleToggleReminder(reminder)}
                          size="small"
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleEditReminder(reminder)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteReminder(reminder)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Formular Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedReminder ? 'Erinnerung bearbeiten' : 'Neue Erinnerung'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Termin</InputLabel>
                  <Select
                    value={formData.appointmentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointmentId: e.target.value }))}
                    label="Termin"
                  >
                    {appointments.map((appointment) => (
                      <MenuItem key={appointment.id} value={appointment.id}>
                        {appointment.title} - {DateUtils.formatDateTime(appointment.start)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minuten vor Termin"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminderTime: parseInt(e.target.value) }))}
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                  }
                  label="Aktiv"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nachricht (optional)"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  multiline
                  rows={3}
                  placeholder="Optionale Nachricht für die Erinnerung..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleFormSubmit} variant="contained">
            {selectedReminder ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lösch-Bestätigung Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Erinnerung löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie diese Erinnerung löschen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ErinnerungsSystem;
