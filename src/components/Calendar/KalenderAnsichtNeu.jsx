// Kalenderansicht mit react-big-calendar
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de';
import {
  Box,
  Paper,
  ButtonGroup,
  Button,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { MdToday, MdChevronLeft, MdChevronRight, MdViewWeek, MdViewDay, MdViewModule, MdEvent as EventIcon, MdGroup, MdLocationOn, MdSchedule, MdPark } from 'react-icons/md';

// Services
import { AppointmentService } from '../../services/appointmentService';
import { ParticipantService } from '../../services/participantService';
import { DateUtils } from '../../utils/dateUtils';

// CSS für react-big-calendar
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Moment.js für Deutsche Lokalisierung konfigurieren
moment.locale('de');
const localizer = momentLocalizer(moment);

// Deutsche Übersetzungen für den Kalender
const messages = {
  allDay: 'Ganztägig',
  previous: 'Zurück',
  next: 'Weiter',
  today: 'Heute',
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Agenda',
  date: 'Datum',
  time: 'Zeit',
  event: 'Termin',
  noEventsInRange: 'Keine Termine in diesem Zeitraum.',
  showMore: total => `+ ${total} weitere`
};

function KalenderAnsicht({ onEditAppointment, onSuccess, onError }) {
  const [appointments, setAppointments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Daten laden
  useEffect(() => {
    loadAppointments();
    loadParticipants();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = AppointmentService.getAllAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Fehler beim Laden der Termine:', error);
      onError?.('Fehler beim Laden der Termine');
    }
  };

  const loadParticipants = async () => {
    try {
      const data = ParticipantService.getAllParticipants();
      setParticipants(data);
    } catch (error) {
      console.error('Fehler beim Laden der Teilnehmer:', error);
    }
  };

  // Termine für Kalender formatieren
  const calendarEvents = useMemo(() => {
    return appointments
      .filter(appointment => {
        // Typ-Filter
        if (filterType !== 'all' && appointment.type !== filterType) {
          return false;
        }
        // Status-Filter
        if (filterStatus !== 'all' && appointment.status !== filterStatus) {
          return false;
        }
        return true;
      })
      .map(appointment => ({
        id: appointment.id,
        title: appointment.title,
        start: new Date(appointment.start),
        end: new Date(appointment.end),
        resource: appointment,
        allDay: false
      }));
  }, [appointments, filterType, filterStatus]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
    setDetailDialogOpen(true);
  };

  const handleSelectSlot = ({ start, end }) => {
    const newAppointment = {
      start: new Date(start),
      end: new Date(end),
      title: '',
      type: 'führung'
    };
    onEditAppointment(newAppointment);
  };

  const handleNavigate = (date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    
    // Bei Saisonansicht auf April des aktuellen Jahres setzen
    if (view === 'saison') {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Wenn wir nach Oktober sind, nächstes Jahr zeigen
      const targetYear = now.getMonth() > 9 ? currentYear + 1 : currentYear;
      setCurrentDate(new Date(targetYear, 3, 1)); // April 1st
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrevious = () => {
    let newDate;
    switch (currentView) {
      case 'month':
        newDate = DateUtils.subtractDays(currentDate, 30);
        break;
      case 'week':
        newDate = DateUtils.subtractDays(currentDate, 7);
        break;
      case 'day':
        newDate = DateUtils.subtractDays(currentDate, 1);
        break;
      case 'saison':
        // Vorherige Saison (April-Oktober des Vorjahres)
        newDate = new Date(currentDate.getFullYear() - 1, 3, 1); // April des Vorjahres
        break;
      default:
        newDate = DateUtils.subtractDays(currentDate, 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    let newDate;
    switch (currentView) {
      case 'month':
        newDate = DateUtils.addDays(currentDate, 30);
        break;
      case 'week':
        newDate = DateUtils.addDays(currentDate, 7);
        break;
      case 'day':
        newDate = DateUtils.addDays(currentDate, 1);
        break;
      case 'saison':
        // Nächste Saison (April-Oktober des nächsten Jahres)
        newDate = new Date(currentDate.getFullYear() + 1, 3, 1); // April des nächsten Jahres
        break;
      default:
        newDate = DateUtils.addDays(currentDate, 1);
    }
    setCurrentDate(newDate);
  };

  const handleEditEvent = () => {
    onEditAppointment(selectedEvent);
    setDetailDialogOpen(false);
  };

  const handleDeleteEvent = async () => {
    try {
      await AppointmentService.deleteAppointment(selectedEvent.id);
      loadAppointments();
      setDetailDialogOpen(false);
      onSuccess?.('Termin wurde gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      onError?.('Fehler beim Löschen des Termins');
    }
  };

  const getParticipantNames = (participantIds) => {
    if (!participantIds || participantIds.length === 0) return 'Keine Teilnehmer';
    
    return participantIds
      .map(id => {
        const participant = participants.find(p => p.id === id);
        return participant ? participant.name : 'Unbekannt';
      })
      .join(', ');
  };

  // Event-Styling basierend auf Termintyp und Status
  const eventStyleGetter = (event) => {
    const appointment = event.resource;
    let backgroundColor = '#3174ad'; // Standard-Blau
    let borderColor = '#265985';

    // Farbe nach Typ
    switch (appointment.type) {
      case 'führung':
        backgroundColor = '#2196F3'; // Blau
        borderColor = '#1976D2';
        break;
      case 'vor-ort':
        backgroundColor = '#FF9800'; // Orange
        borderColor = '#F57C00';
        break;
    }

    // Transparenz nach Status
    let opacity = 1;
    switch (appointment.status) {
      case 'geplant':
        opacity = 0.7;
        break;
      case 'bestätigt':
        opacity = 1;
        break;
      case 'abgeschlossen':
        backgroundColor = '#4CAF50'; // Grün
        borderColor = '#388E3C';
        break;
      case 'abgesagt':
        backgroundColor = '#F44336'; // Rot
        borderColor = '#D32F2F';
        opacity = 0.6;
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        opacity,
        color: 'white',
        border: `2px solid ${borderColor}`,
        borderRadius: '4px'
      }
    };
  };

  const formatDisplayDate = () => {
    switch (currentView) {
      case 'day':
        return DateUtils.formatDate(currentDate, 'dddd, DD.MM.YYYY');
      case 'week':
        const weekStart = DateUtils.getWeekStart(currentDate);
        const weekEnd = DateUtils.getWeekEnd(currentDate);
        return `${DateUtils.formatDate(weekStart, 'DD.MM')} - ${DateUtils.formatDate(weekEnd, 'DD.MM.YYYY')}`;
      case 'month':
        return DateUtils.formatDate(currentDate, 'MMMM YYYY');
      case 'saison':
        return `Saison ${currentDate.getFullYear()} (April - Oktober)`;
      default:
        return DateUtils.formatDate(currentDate);
    }
  };

  // Saisonansicht-Komponente (April - Oktober als Kalenderblatt)
  const SaisonView = () => {
    const year = currentDate.getFullYear();
    
    // Kalender für die komplette Saison generieren (April bis Oktober)
    const generateSaisonCalendar = () => {
      const saisonMonths = [];
      for (let month = 3; month <= 9; month++) { // April (3) bis Oktober (9)
        const monthName = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Montag = 0
        
        const monthData = {
          month,
          monthName,
          daysInMonth,
          startDay,
          weeks: []
        };

        // Wochen für diesen Monat generieren
        let currentWeek = new Array(7).fill(null);
        let dayCounter = 1;

        // Erste Woche (eventuell mit leeren Feldern)
        for (let day = startDay; day < 7 && dayCounter <= daysInMonth; day++) {
          currentWeek[day] = dayCounter++;
        }
        monthData.weeks.push([...currentWeek]);

        // Weitere komplette Wochen
        while (dayCounter <= daysInMonth) {
          currentWeek = new Array(7).fill(null);
          for (let day = 0; day < 7 && dayCounter <= daysInMonth; day++) {
            currentWeek[day] = dayCounter++;
          }
          monthData.weeks.push([...currentWeek]);
        }

        saisonMonths.push(monthData);
      }
      return saisonMonths;
    };

    const saisonMonths = generateSaisonCalendar();
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    // Termine für einen bestimmten Tag abrufen
    const getAppointmentsForDay = (month, day) => {
      const date = new Date(year, month, day);
      return appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.start);
        return appointmentDate.toDateString() === date.toDateString();
      });
    };

    // Stil für Tage basierend auf Terminen
    const getDayStyle = (month, day) => {
      if (!day) return { backgroundColor: 'transparent' };
      
      const dayAppointments = getAppointmentsForDay(month, day);
      const appointmentCount = dayAppointments.length;
      
      if (appointmentCount === 0) {
        return { 
          backgroundColor: '#f5f5f5', 
          border: '1px solid #e0e0e0',
          cursor: 'pointer'
        };
      } else if (appointmentCount === 1) {
        return { 
          backgroundColor: '#e8f5e8', 
          border: '2px solid #4caf50',
          cursor: 'pointer'
        };
      } else if (appointmentCount === 2) {
        return { 
          backgroundColor: '#fff3e0', 
          border: '2px solid #ff9800',
          cursor: 'pointer'
        };
      } else {
        return { 
          backgroundColor: '#ffebee', 
          border: '2px solid #f44336',
          cursor: 'pointer'
        };
      }
    };

    const handleDayClick = (month, day) => {
      if (!day) return;
      const selectedDate = new Date(year, month, day);
      setCurrentDate(selectedDate);
      setCurrentView('day');
    };

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          🌿 Führungssaison {year} - Kalenderübersicht April bis Oktober
        </Typography>
        
        <Grid container spacing={2}>
          {saisonMonths.map((monthData) => (
            <Grid item xs={12} md={6} lg={4} key={monthData.month}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', color: 'primary.main' }}>
                  {monthData.monthName} {year}
                </Typography>
                
                {/* Wochentage Header */}
                <Grid container sx={{ mb: 1 }}>
                  {weekDays.map((day) => (
                    <Grid item xs={12/7} key={day}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold', 
                        p: 0.5,
                        backgroundColor: '#f0f0f0',
                        fontSize: '0.8rem'
                      }}>
                        {day}
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Kalender-Tage */}
                {monthData.weeks.map((week, weekIndex) => (
                  <Grid container key={weekIndex} sx={{ mb: 0.5 }}>
                    {week.map((day, dayIndex) => {
                      const dayAppointments = day ? getAppointmentsForDay(monthData.month, day) : [];
                      const dayStyle = getDayStyle(monthData.month, day);
                      
                      return (
                        <Grid item xs={12/7} key={dayIndex}>
                          <Box
                            sx={{
                              ...dayStyle,
                              height: 40,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              '&:hover': day ? {
                                backgroundColor: '#e3f2fd',
                                transform: 'scale(1.05)'
                              } : {}
                            }}
                            onClick={() => handleDayClick(monthData.month, day)}
                          >
                            {day && (
                              <>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                  {day}
                                </Typography>
                                {dayAppointments.length > 0 && (
                                  <Box sx={{ 
                                    position: 'absolute', 
                                    bottom: 2, 
                                    right: 2,
                                    backgroundColor: dayAppointments.length === 1 ? '#4caf50' : 
                                                   dayAppointments.length === 2 ? '#ff9800' : '#f44336',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: 16,
                                    height: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                  }}>
                                    {dayAppointments.length}
                                  </Box>
                                )}
                              </>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                ))}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Legende */}
        <Paper elevation={1} sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            📅 Legende
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
                <Typography variant="body2">Frei</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: '#e8f5e8', border: '2px solid #4caf50' }} />
                <Typography variant="body2">1 Termin</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }} />
                <Typography variant="body2">2 Termine</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: '#ffebee', border: '2px solid #f44336' }} />
                <Typography variant="body2">3+ Termine</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                💡 Klicken Sie auf einen Tag, um zur Tagesansicht zu wechseln
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Saisonstatistiken */}
        <Paper elevation={1} sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📊 Saisonstatistiken {year}
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main" fontWeight="bold">
                  {appointments.filter(a => {
                    const date = new Date(a.start);
                    return date.getFullYear() === year && date.getMonth() >= 3 && date.getMonth() <= 9;
                  }).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">Gesamt Termine</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="success.main" fontWeight="bold">
                  {saisonMonths.reduce((total, month) => {
                    let busyDays = 0;
                    for (let day = 1; day <= month.daysInMonth; day++) {
                      if (getAppointmentsForDay(month.month, day).length > 0) {
                        busyDays++;
                      }
                    }
                    return total + busyDays;
                  }, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Belegte Tage</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="warning.main" fontWeight="bold">
                  {saisonMonths.reduce((total, month) => {
                    let freeDays = 0;
                    for (let day = 1; day <= month.daysInMonth; day++) {
                      if (getAppointmentsForDay(month.month, day).length === 0) {
                        freeDays++;
                      }
                    }
                    return total + freeDays;
                  }, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Freie Tage</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="error.main" fontWeight="bold">
                  {saisonMonths.reduce((total, month) => {
                    let busyDays = 0;
                    for (let day = 1; day <= month.daysInMonth; day++) {
                      if (getAppointmentsForDay(month.month, day).length >= 3) {
                        busyDays++;
                      }
                    }
                    return total + busyDays;
                  }, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Sehr ausgelastet</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      {/* Kalender-Toolbar */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrevious} size="small">
            <ChevronLeft />
          </IconButton>
          <Button
            variant="outlined"
            onClick={handleToday}
            startIcon={<Today />}
            size="small"
          >
            Heute
          </Button>
          <IconButton onClick={handleNext} size="small">
            <ChevronRight />
          </IconButton>
        </Box>

        {/* Aktuelles Datum/Zeitraum */}
        <Typography variant="h6" sx={{ minWidth: 200 }}>
          {formatDisplayDate()}
        </Typography>

        {/* Ansichts-Buttons */}
        <ButtonGroup variant="outlined" size="small">
          <Button
            variant={currentView === 'month' ? 'contained' : 'outlined'}
            onClick={() => handleViewChange('month')}
            startIcon={<ViewModule />}
          >
            Monat
          </Button>
          <Button
            variant={currentView === 'week' ? 'contained' : 'outlined'}
            onClick={() => handleViewChange('week')}
            startIcon={<ViewWeek />}
          >
            Woche
          </Button>
          <Button
            variant={currentView === 'day' ? 'contained' : 'outlined'}
            onClick={() => handleViewChange('day')}
            startIcon={<ViewDay />}
          >
            Tag
          </Button>
          <Button
            variant={currentView === 'saison' ? 'contained' : 'outlined'}
            onClick={() => handleViewChange('saison')}
            startIcon={<Park />}
          >
            Saison
          </Button>
        </ButtonGroup>

        {/* Filter */}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Typ</InputLabel>
            <Select
              value={filterType}
              label="Typ"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="führung">Führung</MenuItem>
              <MenuItem value="vor-ort">Vor-Ort</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="geplant">Geplant</MenuItem>
              <MenuItem value="bestätigt">Bestätigt</MenuItem>
              <MenuItem value="abgeschlossen">Abgeschlossen</MenuItem>
              <MenuItem value="abgesagt">Abgesagt</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Legende */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip size="small" label="Führung" sx={{ bgcolor: '#2196F3', color: 'white' }} />
        <Chip size="small" label="Vor-Ort" sx={{ bgcolor: '#FF9800', color: 'white' }} />
        <Chip size="small" label="Abgeschlossen" sx={{ bgcolor: '#4CAF50', color: 'white' }} />
        <Chip size="small" label="Abgesagt" sx={{ bgcolor: '#F44336', color: 'white' }} />
      </Box>

      {/* Kalender */}
      <Paper elevation={1} sx={{ p: 2, height: currentView === 'saison' ? 'auto' : 600 }}>
        {currentView === 'saison' ? (
          <SaisonView />
        ) : (
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={handleViewChange}
            date={currentDate}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            messages={messages}
            eventPropGetter={eventStyleGetter}
            style={{ height: '100%' }}
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }) => 
                `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
              dayFormat: 'ddd DD.MM',
              dayHeaderFormat: 'dddd DD.MM.YYYY'
            }}
            min={new Date(0, 0, 0, 7, 0, 0)} // 07:00
            max={new Date(0, 0, 0, 20, 0, 0)} // 20:00
            step={30}
            timeslots={2}
          />
        )}
      </Paper>

      {/* Termin-Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EventIcon />
                <Box>
                  <Typography variant="h6">{selectedEvent.title}</Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {selectedEvent.type === 'führung' ? 'Führung' : 'Vor-Ort Termin'}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent>
              <List>
                <ListItem>
                  <Schedule sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Datum & Zeit"
                    secondary={`${DateUtils.formatDate(selectedEvent.start, 'dddd, DD.MM.YYYY')} von ${DateUtils.formatTime(selectedEvent.start)} bis ${DateUtils.formatTime(selectedEvent.end)}`}
                  />
                </ListItem>

                <ListItem>
                  <LocationOn sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Ort"
                    secondary={selectedEvent.location || 'Nicht angegeben'}
                  />
                </ListItem>

                <ListItem>
                  <Group sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Teilnehmer"
                    secondary={getParticipantNames(selectedEvent.participants)}
                  />
                </ListItem>

                {selectedEvent.description && (
                  <ListItem>
                    <ListItemText
                      primary="Beschreibung"
                      secondary={selectedEvent.description}
                    />
                  </ListItem>
                )}
              </List>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>
                Schließen
              </Button>
              <Button onClick={handleEditEvent} variant="outlined">
                Bearbeiten
              </Button>
              <Button 
                onClick={handleDeleteEvent} 
                variant="outlined" 
                color="error"
              >
                Löschen
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default KalenderAnsicht;
