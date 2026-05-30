import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleCalendarService } from '../../services/googleCalendarService';
import { ParticipantService } from '../../services/participantService';
import { TeamService } from '../../services/teamService';
import { StorageService } from '../../utils/storage';
import { AppointmentService } from '../../services/appointmentService';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { FUEHRUNG_CONFIG } from '../../utils/stiftGurkConfig';
// ...weitere Imports hier...
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Autocomplete,
  FormControlLabel,
  Switch,
  Divider,
  Typography,
  Tabs,
  Tab,
  Paper,
  Checkbox,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// ...weitere Imports hier...

// ...Komponentenrumpf...


function TerminFormular({ open, appointment, initialDate, onClose, onSuccess, onError }) {
  // Ladezustände und Daten
  const [isReady, setIsReady] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [teammitglieder, setTeammitglieder] = useState([]);
  const [settings, setSettings] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherRating, setWeatherRating] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Daten parallel laden beim Mount
  useEffect(() => {
    let isMounted = true;
    setIsReady(false);
    Promise.all([
      ParticipantService.getAllParticipants(),
      TeamService.getActiveTeamMembers(),
      StorageService.getSettings()
    ]).then(([p, t, s]) => {
      if (isMounted) {
        setParticipants(p);
        setTeammitglieder(t);
        setSettings(s);
        setIsReady(true);
      }
    }).catch(err => {
      if (isMounted) onError('Fehler beim Laden der Daten: ' + err.message);
    });
    return () => { isMounted = false; };
  }, []);

  // formData initialisieren, wenn alles bereit ist und Dialog geöffnet wird
  const initialFormData = useMemo(() => {
    if (!isReady || !open) return null;
    if (appointment && appointment.id) {
      return {
        title: appointment.title || '',
        description: appointment.description || '',
        start: dayjs(appointment.start),
        end: dayjs(appointment.end),
        type: appointment.type || 'führung',
        status: appointment.status || 'geplant',
        location: appointment.location || '',
        participants: appointment.participants || [],
        hasReminder: true,
        reminderTime: 30,
        stationen: appointment.stationen || ['garten', 'mazeration', 'shop'],
        teamMitglied: Array.isArray(appointment.teamMitglied) ? appointment.teamMitglied : (appointment.teamMitglied ? [appointment.teamMitglied] : []),
        wetterRelevant: true,
        buchungsquelle: appointment.buchungsquelle || 'office_wien',
        gruppengröße: appointment.gruppengröße || 1,
        besonderheiten: appointment.besonderheiten || '',
        checklistProgress: 0,
        kontaktperson: appointment.kontaktperson || '',
        kontakttelefon: appointment.kontakttelefon || '',
        kontaktemail: appointment.kontaktemail || '',
        kontaktadresse: appointment.kontaktadresse || '',
        abgesagt: appointment.abgesagt ?? false,
        verschoben: appointment.verschoben ?? false,
        // Nachbereitung
        tatsaechlicherBesuch: appointment.tatsaechlicherBesuch ?? null,
        eintrittsgeldBrutto: appointment.eintrittsgeldBrutto ?? null,
        warenverkaufBrutto: appointment.warenverkaufBrutto ?? null,
        nachtraeglicheAnmerkungen: appointment.nachtraeglicheAnmerkungen || ''
      };
    } else {
      // Geklickte Slot-Zeit verwenden (appointment.start bei Slot-Klick ohne id), sonst initialDate oder jetzt
      const slotStart = appointment?.start ? dayjs(appointment.start) : null;
      const slotEnd = appointment?.end ? dayjs(appointment.end) : null;
      const start = slotStart && slotStart.isValid() ? slotStart : dayjs(initialDate || new Date());
      const defaultEnd = slotEnd && slotEnd.isValid()
        ? slotEnd
        : start.add(settings?.defaultAppointmentDuration || 60, 'minute');
      return {
        title: '',
        description: '',
        start: start,
        end: defaultEnd,
        type: 'führung',
        status: 'geplant',
        location: '',
        participants: [],
        hasReminder: true,
        reminderTime: settings?.defaultReminderTime || 30,
        stationen: ['garten', 'mazeration', 'shop'],
        teamMitglied: [],
        wetterRelevant: true,
        buchungsquelle: 'office_wien',
        gruppengröße: 1,
        besonderheiten: '',
        checklistProgress: 0,
        kontaktperson: '',
        kontakttelefon: '',
        kontaktemail: '',
        kontaktadresse: '',
        abgesagt: false,
        verschoben: false,
        // Nachbereitung
        tatsaechlicherBesuch: null,
        eintrittsgeldBrutto: null,
        warenverkaufBrutto: null,
        nachtraeglicheAnmerkungen: ''
      };
    }
  }, [isReady, open, appointment, initialDate, settings]);

  const [formData, setFormData] = useState(null);
  const formInitialized = useRef(false);

  // Reset-Flag wenn Dialog geschlossen wird
  useEffect(() => {
    if (!open) {
      formInitialized.current = false;
    }
  }, [open]);

  // formData NUR EINMAL pro Dialog-Öffnung initialisieren
  useEffect(() => {
    if (initialFormData && !formInitialized.current) {
      formInitialized.current = true;
      setFormData(initialFormData);
      setErrors({});
      setConflicts([]);
    }
  }, [initialFormData]);

  // Google Kalender Export
  const handleExportToGoogle = async () => {
    try {
      await GoogleCalendarService.initClient({ clientId: '669361145983-aej307lmeu65o9l8van4iha4dmfu3la9.apps.googleusercontent.com' });
      if (!GoogleCalendarService.isSignedIn()) {
        await GoogleCalendarService.signIn();
      }
      await GoogleCalendarService.createEvent({
        summary: formData.title,
        description: formData.description,
        start: formData.start.toISOString(),
        end: formData.end.toISOString(),
        location: formData.location
      });
      onSuccess && onSuccess('Termin wurde an Google Kalender übertragen!');
    } catch (e) {
      onError && onError('Google Kalender Export fehlgeschlagen: ' + (e.message || e));
    }
  };

  // Nur gezielte Feldänderungen, Kategorie-Änderung robust
  const handleChange = (field, value) => {
    if (!formData) return;
    if (field === 'type') {
      setFormData(prev => ({ ...prev, type: value }));
    } else if (field === 'start') {
      if (value && value.isValid && value.isValid()) {
        setFormData(prev => {
          const prevStart = prev.start && prev.start.isValid && prev.start.isValid() ? prev.start : null;
          const prevEnd = prev.end && prev.end.isValid && prev.end.isValid() ? prev.end : null;
          const duration = prevStart && prevEnd ? prevEnd.diff(prevStart, 'minute') : (settings?.defaultAppointmentDuration || 60);
          return { ...prev, start: value, end: value.add(duration > 0 ? duration : (settings?.defaultAppointmentDuration || 60), 'minute') };
        });
      } else if (value === null || value === undefined) {
        setFormData(prev => ({ ...prev, start: null }));
      }
      // Ungültige Zwischenwerte (während Tippen) ignorieren
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Validierung zurücksetzen
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const checkForConflicts = () => {
    try {
      const tempAppointment = {
        id: appointment?.id || 'new',
        start: formData.start.toDate(),
        end: formData.end.toDate()
      };

      const excludeIds = appointment ? [appointment.id] : [];
      const foundConflicts = AppointmentService.checkForConflicts(tempAppointment, excludeIds);
      setConflicts(foundConflicts);
      return foundConflicts;
    } catch (error) {
      console.error('Fehler bei Konfliktprüfung:', error);
      return [];
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (!formData.start) {
      newErrors.start = 'Startzeit ist erforderlich';
    }

    if (!formData.end) {
      newErrors.end = 'Endzeit ist erforderlich';
    }

    if (formData.start && formData.end) {
      if (formData.end.isBefore(formData.start)) {
        newErrors.end = 'Endzeit muss nach der Startzeit liegen';
      }

      if (formData.status !== 'abgeschlossen' && formData.start.isBefore(dayjs().subtract(1, 'hour'))) {
        newErrors.start = 'Startzeit kann nicht in der Vergangenheit liegen';
      }
    }

    if (formData.hasReminder && formData.reminderTime < 0) {
      newErrors.reminderTime = 'Erinnerungszeit muss positiv sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Konflikte prüfen
    const foundConflicts = checkForConflicts();
    let ignoreConflicts = false;
    if (foundConflicts.length > 0) {
      // Benutzer warnen, aber Speichern erlauben
      if (!window.confirm(`Es wurden ${foundConflicts.length} Terminkonflikt(e) gefunden. Trotzdem speichern?`)) {
        return;
      } else {
        ignoreConflicts = true;
      }
    }

    setIsSubmitting(true);

    try {      const appointmentData = {
        title: formData.title && formData.title.trim() ? formData.title.trim() : 'Neuer Termin',
        description: formData.description.trim(),
        start: formData.start.toDate(),
        end: formData.end.toDate(),
        type: formData.type,
        status: formData.status,
        location: formData.location.trim(),
        participants: formData.participants,
        // Stift Gurk spezifische Felder
        stationen: formData.stationen,
        teamMitglied: formData.teamMitglied,
        wetterRelevant: formData.wetterRelevant,
        buchungsquelle: formData.buchungsquelle,
        gruppengröße: formData.gruppengröße,
        besonderheiten: formData.besonderheiten,
        // Kontaktperson Felder (vereinheitlicht)
        kontaktperson: formData.kontaktperson.trim(),
        kontakttelefon: formData.kontakttelefon.trim(),
        kontaktemail: formData.kontaktemail.trim(),
        kontaktadresse: formData.kontaktadresse?.trim() || '',
        // Status-Checkboxen
        abgesagt: formData.abgesagt,
        verschoben: formData.verschoben,
        // Nachbereitung
        tatsaechlicherBesuch: formData.tatsaechlicherBesuch,
        eintrittsgeldBrutto: formData.eintrittsgeldBrutto,
        warenverkaufBrutto: formData.warenverkaufBrutto,
        nachtraeglicheAnmerkungen: formData.nachtraeglicheAnmerkungen
      };      let savedAppointment;

      if (appointment && appointment.id) {
        // Termin bearbeiten
        savedAppointment = AppointmentService.updateAppointment(appointment.id, appointmentData);
        onSuccess('Termin wurde erfolgreich aktualisiert');
      } else {
        // Neuen Termin erstellen
        try {
          savedAppointment = AppointmentService.createAppointment(appointmentData);
          onSuccess('Termin wurde erfolgreich erstellt');
        } catch (e) {
          if (ignoreConflicts) {
            // Konflikt ignorieren und trotzdem speichern (z.B. ID ändern)
            appointmentData.id = undefined; // Neue ID generieren lassen
            savedAppointment = AppointmentService.createAppointment(appointmentData);
            onSuccess('Termin wurde trotz Konflikt gespeichert');
          } else {
            throw e;
          }
        }
      }

      // Erinnerung erstellen/aktualisieren
      if (formData.hasReminder && formData.reminderTime > 0) {
        try {
          // Lösche bestehende Erinnerungen für diesen Termin
          const existingReminders = ReminderService.getRemindersByAppointment(savedAppointment.id);
          existingReminders.forEach(reminder => {
            ReminderService.deleteReminder(reminder.id);
          });

          // Neue Erinnerung erstellen
          ReminderService.createReminder({
            appointmentId: savedAppointment.id,
            reminderTime: formData.reminderTime,
            message: `Erinnerung für: ${formData.title}`
          });
        } catch (reminderError) {
          console.warn('Erinnerung konnte nicht erstellt werden:', reminderError);
        }
      }

      onClose();
    } catch (error) {
      onError('Fehler beim Speichern des Termins: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParticipantChange = (event, newParticipants) => {
    const participantIds = newParticipants.map(p => typeof p === 'string' ? p : p.id);
    handleChange('participants', participantIds);
  };

  const getParticipantOptions = () => {
    return participants.map(p => ({
      id: p.id,
      label: `${p.name} ${p.organization ? `(${p.organization})` : ''}`,
      ...p
    }));
  };

  const getSelectedParticipants = () => {
    return formData.participants
      .map(id => participants.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({
        id: p.id,
        label: `${p.name} ${p.organization ? `(${p.organization})` : ''}`,
        ...p
      }));
  };
  const handleWeatherChange = (data, rating) => {
    try {
      setWeatherData(data);
      setWeatherRating(rating);
      
      // Automatische Anpassung basierend auf Wetter
      if (rating && rating.rating === 'kritisch') {
        setFormData(prev => ({
          ...prev,
          besonderheiten: prev.besonderheiten + (prev.besonderheiten ? '\n' : '') + 
                         '⚠️ Wetter kritisch - Gartenführung verkürzen oder ins Gebäude verlegen'
        }));
      }
    } catch (error) {
      console.error('Fehler bei Wetteränderung:', error);
    }
  };

  const calculateTotalDuration = () => {
    const { ZEITEN } = FUEHRUNG_CONFIG;
    return ZEITEN.ANFAHRT + ZEITEN.VORBEREITUNG + 
           formData.stationen.reduce((sum, station) => {
             const stationConfig = FUEHRUNG_CONFIG.STATIONEN.find(s => s.id === station);
             return sum + (stationConfig?.dauer || 0);
           }, 0) + ZEITEN.NACHBEREITUNG;
  };

  const getDurationText = () => {
    if (formData.start && formData.end) {
      const duration = formData.end.diff(formData.start, 'minute');
      if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`;
      } else {
        return `${duration}min`;
      }
    }
    return '';
  };

  // Ladeanzeige oder Formular
  if (!isReady || !formData) {
    return (
      <Dialog open={open} maxWidth="xl" fullWidth>
        <DialogTitle>Lade Terminformular...</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', py: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">Lade Daten...</Typography>
            <CircularProgress color="primary" sx={{ mt: 2 }} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { 
          maxHeight: '95vh',
          minHeight: '80vh',
          minWidth: '1000px',
          width: '90vw'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {(appointment && appointment.id) ? 'Termin bearbeiten' : 'Neuen Termin planen'}
        <Typography variant="subtitle2" color="text.secondary" component="div">
          Stift Gurk - Kräutergarten und Mazerationsraum Event
        </Typography>
      </DialogTitle>
      <DialogContent 
        dividers 
        sx={{ px: 4, py: 3, minHeight: '60vh', maxHeight: '70vh', overflow: 'auto' }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Grunddaten" />
              <Tab label="Stationen & Ablauf" />
              <Tab label="Wetter & Planung" />
              <Tab label="Team & Logistik" />
              <Tab label="Checkliste" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    Nachbereitung
                    {formData.status === 'abgeschlossen' && (
                      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
                    )}
                  </Box>
                }
                sx={formData.status === 'abgeschlossen' ? { fontWeight: 'bold' } : {}}
              />
            </Tabs>
          </Box>
          {activeTab === 0 && (
            <>
              <Box sx={{ mb: 2, width: '100%' }}>
                {/* Event-Titel (volle Breite) */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Event-Titel"
                    value={formData.title}
                    onChange={e => handleChange('title', e.target.value)}
                    placeholder="z.B. Kräutergarten-Event für Gruppe ABC"
                    required
                    sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                  />
                </Box>
                {/* Kategorie-Auswahl */}
                <Box sx={{ mb: 2, maxWidth: 300 }}>
                  <FormControl fullWidth>
                    <InputLabel id="type-label">Kategorie</InputLabel>
                    <Select
                      labelId="type-label"
                      id="type-select"
                      value={formData.type}
                      label="Kategorie"
                      onChange={e => handleChange('type', e.target.value)}
                    >
                      <MenuItem value="führung">Führung</MenuItem>
                      <MenuItem value="vor-ort">Vor-Ort-Termin</MenuItem>
                      <MenuItem value="event">Event</MenuItem>
                      <MenuItem value="sonstiges">Sonstiges</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                {/* Status-Checkboxen */}
                <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.abgesagt}
                        onChange={e => handleChange('abgesagt', e.target.checked)}
                        color="error"
                      />
                    }
                    label="Abgesagt"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.verschoben}
                        onChange={e => handleChange('verschoben', e.target.checked)}
                        color="warning"
                      />
                    }
                    label="Verschoben"
                  />
                </Box>
                {/* Kontaktdaten: 4 Felder nebeneinander */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    <TextField
                      fullWidth
                      label="Name der Kontaktperson"
                      value={formData.kontaktperson}
                      onChange={e => handleChange('kontaktperson', e.target.value)}
                      placeholder="Vor- und Nachname"
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    <TextField
                      fullWidth
                      label="Telefonnummer"
                      value={formData.kontakttelefon}
                      onChange={e => handleChange('kontakttelefon', e.target.value)}
                      placeholder="+43 123 456 789"
                      type="tel"
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    <TextField
                      fullWidth
                      label="E-Mail"
                      value={formData.kontaktemail}
                      onChange={e => handleChange('kontaktemail', e.target.value)}
                      placeholder="name@beispiel.at"
                      type="email"
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    <TextField
                      fullWidth
                      label="Adresse"
                      value={formData.kontaktadresse || ''}
                      onChange={e => handleChange('kontaktadresse', e.target.value)}
                      placeholder="Straße, PLZ Ort"
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                    />
                  </Box>
                </Box>
                {/* Termindetails: 4 Felder nebeneinander */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    <DateTimePicker
                      label="Start"
                      value={formData.start}
                      onChange={newValue => handleChange('start', newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: { '& .MuiInputBase-root': { height: '56px' } }
                        }
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    <DateTimePicker
                      label="Ende"
                      value={formData.end}
                      onChange={newValue => handleChange('end', newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: { '& .MuiInputBase-root': { height: '56px' } }
                        }
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    {/* Eventtyp-Auswahl entfernt, da Kategorie-Auswahl vorhanden */}
                  </Box>
                  <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Gruppengröße (Personen)"
                      value={formData.gruppengröße}
                      onChange={e => handleChange('gruppengröße', parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 25 }}
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                    />
                  </Box>
                </Box>
                {/* ...weitere Felder und Tab-Inhalte... */}
              </Box>
            </>
          )}
          {activeTab === 1 && (
            <>
              <Box sx={{ mb: 2 }}>
                {/* ...restlicher Tab-Inhalt... */}
              </Box>
            </>
          )}
          {activeTab === 2 && (
            <>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <WetterWidget
                      date={formData.start ? (formData.start.toDate ? formData.start.toDate() : new Date(formData.start)) : new Date()}
                      onWeatherChange={handleWeatherChange}
                    />
                  </Grid>
                  <Grid item xs={12} lg={4}>
                    {weatherRating && (
                      <Alert severity={weatherRating.color} sx={{ height: 'fit-content' }} icon={weatherRating.icon}>
                        <Typography variant="subtitle2">
                          Führungsempfehlung: {weatherRating.rating.toUpperCase()}
                        </Typography>
                        <Typography variant="body2">
                          {weatherRating.rating === 'kritisch' && 'Überlegen Sie alternative Innenräume oder Verschiebung der Gartenbesichtigung.'}
                          {weatherRating.rating === 'bedingt' && 'Führung durchführbar, aber Gartenzeit eventuell verkürzen.'}
                          {weatherRating.rating === 'optimal' && 'Perfekte Bedingungen für die komplette Führung mit allen Stationen.'}
                        </Typography>
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
          {activeTab === 3 && (
            <>
              <Grid container spacing={4} sx={{ mb: 2 }}>
                {/* ...restlicher Tab-Inhalt... */}
              </Grid>
            </>
          )}
          {activeTab === 4 && (
            <>
              <Box sx={{ mb: 2 }}>
                <ChecklistenManager
                  appointmentId={appointment?.id}
                  onProgress={(percentage, completed, total) => {
                    setFormData(prev => ({
                      ...prev,
                      checklistProgress: percentage
                    }));
                  }}
                />
              </Box>
            </>
          )}
          {activeTab === 5 && (
            <>
              <Box sx={{ mb: 3 }}>
                {formData.status === 'abgeschlossen' ? (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Führung abgeschlossen – bitte tatsächliche Werte für Zeiterfassung und Statistik eintragen.
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Diese Felder können nach Abschluss der Führung ausgefüllt werden.
                  </Alert>
                )}

                {/* Besucheranzahl */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>Besucheranzahl</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Angemeldet"
                      value={formData.gruppengröße}
                      InputProps={{ readOnly: true }}
                      disabled
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                      helperText="Aus Grunddaten"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Tatsächlich erschienen"
                      value={formData.tatsaechlicherBesuch ?? formData.gruppengröße}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        handleChange('tatsaechlicherBesuch', isNaN(v) ? 0 : v);
                      }}
                      inputProps={{ min: 0, max: 500 }}
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                      helperText="Personen die tatsächlich teilgenommen haben"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 140px', minWidth: '120px' }}>
                    <TextField
                      fullWidth
                      label="Differenz"
                      value={(() => {
                        const actual = formData.tatsaechlicherBesuch ?? formData.gruppengröße;
                        const diff = actual - formData.gruppengröße;
                        return diff === 0 ? '±0' : diff > 0 ? `+${diff}` : `${diff}`;
                      })()}
                      InputProps={{ readOnly: true }}
                      disabled
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                      helperText="zu Anmeldung"
                    />
                  </Box>
                </Box>

                {/* Einnahmen */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>Einnahmen</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 220px', minWidth: '180px' }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Eintrittsgeld Brutto"
                      value={formData.eintrittsgeldBrutto ?? ''}
                      onChange={e => {
                        const v = e.target.value !== '' ? parseFloat(e.target.value) : null;
                        handleChange('eintrittsgeldBrutto', v);
                      }}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                      helperText="Kassa brutto – inkl. Rabatte, Freitickets"
                      placeholder="0.00"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 220px', minWidth: '180px' }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Warenverkauf Brutto"
                      value={formData.warenverkaufBrutto ?? ''}
                      onChange={e => {
                        const v = e.target.value !== '' ? parseFloat(e.target.value) : null;
                        handleChange('warenverkaufBrutto', v);
                      }}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                      sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                      helperText="Shop-Umsatz brutto (Destillate, Kräuter etc.)"
                      placeholder="0.00"
                    />
                  </Box>
                  {(formData.eintrittsgeldBrutto != null || formData.warenverkaufBrutto != null) && (
                    <Box sx={{ flex: '1 1 160px', minWidth: '140px' }}>
                      <TextField
                        fullWidth
                        label="Gesamtumsatz"
                        value={`€ ${((formData.eintrittsgeldBrutto || 0) + (formData.warenverkaufBrutto || 0)).toFixed(2)}`}
                        InputProps={{ readOnly: true }}
                        disabled
                        sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                        helperText="Eintrittsgeld + Warenverkauf"
                      />
                    </Box>
                  )}
                </Box>
                <Box sx={{ mb: 3 }} />

                {/* Anmerkungen */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>Interne Anmerkungen</Typography>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={5}
                    label="Anmerkungen (intern)"
                    value={formData.nachtraeglicheAnmerkungen || ''}
                    onChange={e => handleChange('nachtraeglicheAnmerkungen', e.target.value)}
                    placeholder={'z.B. Bus hatte 90min Verspätung → Führung auf 60min komprimiert, Gartenstation ausgelassen.\nReiseleiter (Hr. Maier) erhielt Freiticket.\nFür nächstes Mal: Ausweichplan für Regenfall vorbereiten.'}
                    helperText="Spontane Notizen, Besonderheiten, Verbesserungsideen für das nächste Mal"
                  />
                </Box>
              </Box>
            </>
          )}
        </LocalizationProvider>
      </DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogActions 
          sx={{ 
            px: 4, 
            py: 3, 
            gap: 2,
            justifyContent: 'space-between',
            flexWrap: 'wrap'
          }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Checklisten sind jetzt in Tab 5 verfügbar */}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={handleExportToGoogle}
              variant="outlined"
              color="primary"
              size="large"
              sx={{ minWidth: 180 }}
              type="button"
            >
              In Google Kalender eintragen
            </Button>
            <Button 
              onClick={onClose} 
              variant="outlined"
              size="large"
              sx={{ 
                minWidth: 120,
                borderColor: '#d32f2f',
                color: '#d32f2f',
                '&:hover': {
                  borderColor: '#b71c1c',
                  backgroundColor: 'rgba(211, 47, 47, 0.04)'
                }
              }}
              type="button"
            >
              Abbrechen
            </Button>
            <Button 
              variant="contained"
              disabled={!formData.title || Object.keys(errors).length > 0 || isSubmitting}
              size="large"
              sx={{ 
                minWidth: 120,
                backgroundColor: '#2e7d32',
                '&:hover': {
                  backgroundColor: '#1b5e20'
                }
              }}
              type="submit"
            >
              {(appointment && appointment.id) ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TerminFormular;
