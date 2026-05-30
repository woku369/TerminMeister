// Kalenderansicht mit react-big-calendar
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de';
import { AppointmentService } from '../../services/appointmentService';
import { ParticipantService } from '../../services/participantService';
import { DateUtils } from '../../utils/dateUtils';

import SaisonView from './SaisonView';
import { TeamService } from '../../services/teamService';
import jsPDF from 'jspdf';
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
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './german-calendar.css';

import {
  MdToday,
  MdChevronLeft,
  MdChevronRight,
  MdViewWeek,
  MdViewDay,
  MdViewModule,
  MdEvent,
  MdGroup,
  MdLocationOn,
  MdSchedule,
  MdPark,
  MdPictureAsPdf,
  MdDelete,
  MdEdit,
  MdInfo,
  MdWarning,
  MdCheckCircle,
  MdError,
  MdCloud,
  MdCloudOff,
  MdSync,
  MdSettings,
  MdRefresh
} from 'react-icons/md';

// Icon-Aliase für bessere Lesbarkeit
const ChevronLeft = MdChevronLeft;
const ChevronRight = MdChevronRight;
const Today = MdToday;
const ViewWeek = MdViewWeek;
const ViewDay = MdViewDay;
const ViewModule = MdViewModule;
const EventIcon = MdEvent;
const GroupIcon = MdGroup;
const LocationOnIcon = MdLocationOn;
const ScheduleIcon = MdSchedule;
const Park = MdPark;
const PictureAsPdf = MdPictureAsPdf;
const Refresh = MdRefresh;

// CSS für react-big-calendar
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './german-calendar.css';

// Moment.js für Deutsche Lokalisierung konfigurieren
moment.locale('de', {
  months: [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ],
  monthsShort: [
    'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
  ],
  weekdays: [
    'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'
  ],
  weekdaysShort: [
    'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'
  ],
  weekdaysMin: [
    'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'
  ],
  week: {
    dow: 1, // Montag ist der erste Tag der Woche
    doy: 4  // Die erste Woche des Jahres ist die erste Woche mit mindestens 4 Tagen
  }
});
const localizer = momentLocalizer(moment);

// Deutsche Übersetzungen für react-big-calendar
const messages = {
  allDay: 'Ganztägig',
  previous: '‹ Zurück',
  next: 'Weiter ›',
  today: 'Heute',
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Agenda',
  date: 'Datum',
  time: 'Zeit',
  event: 'Termin',
  noEventsInRange: 'Keine Termine in diesem Zeitraum.',
  showMore: total => `+ ${total} weitere`,
  work_week: 'Arbeitswoche',
  yesterday: 'Gestern',
  tomorrow: 'Morgen'
};

function KalenderAnsicht({ onEditAppointment, onSuccess, onError, refreshTrigger }) {
  // Handler für neuen Termin (öffnet das Formular im Parent)
  const handleCreateAppointment = () => {
    onEditAppointment({});
  };
  const [appointments, setAppointments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  // Force-Update Trigger gegen UI-Einfrieren
  const [, setForceUpdate] = useState(0);
  // Daten laden
  useEffect(() => {
    loadAppointments();
    loadParticipants();
  }, []);

  // Kalender aktualisieren wenn refreshTrigger sich ändert
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadAppointments();
    }
  }, [refreshTrigger]);

  const loadAppointments = () => {
    try {
      const data = AppointmentService.getAllAppointments();
      setAppointments(data);
    } catch (error) {
      onError('Fehler beim Laden der Termine: ' + error.message);
    }
  };

  const loadParticipants = () => {
    try {
      const data = ParticipantService.getAllParticipants();
      setParticipants(data);
    } catch (error) {
      onError('Fehler beim Laden der Teilnehmer: ' + error.message);
    }
  };

  // Events für react-big-calendar formatieren
  const calendarEvents = useMemo(() => {
    let filteredAppointments = appointments;

    // Nach Typ filtern
    if (filterType !== 'all') {
      filteredAppointments = filteredAppointments.filter(apt => apt.type === filterType);
    }

    // Nach Status filtern
    if (filterStatus !== 'all') {
      filteredAppointments = filteredAppointments.filter(apt => apt.status === filterStatus);
    }

    return filteredAppointments.map(appointment => ({
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
    // Erstelle neuen Termin für ausgewählten Zeitslot
    const newAppointment = {
      start: start,
      end: end,
      type: 'führung'
    };
    onEditAppointment(newAppointment);
  };

  const handleNavigate = (date) => {
    setCurrentDate(date);
  };
  const handleViewChange = (view) => {
    setCurrentView(view);
      // Bei Saisonansicht auf März des aktuellen Jahres setzen
    if (view === 'saison') {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Wenn wir nach November sind, nächstes Jahr zeigen
      const targetYear = now.getMonth() > 10 ? currentYear + 1 : currentYear;
      setCurrentDate(new Date(targetYear, 2, 1)); // März 1st
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
        break;      case 'saison':
        // Vorherige Saison (März-November des Vorjahres)
        newDate = new Date(currentDate.getFullYear() - 1, 2, 1); // März des Vorjahres
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
        break;      case 'saison':
        // Nächste Saison (März-November des nächsten Jahres)
        newDate = new Date(currentDate.getFullYear() + 1, 2, 1); // März des nächsten Jahres
        break;
      default:
        newDate = DateUtils.addDays(currentDate, 1);
    }
    setCurrentDate(newDate);
  };

  const handleEditEvent = () => {
    onEditAppointment(selectedEvent);
    setDetailDialogOpen(false);
    setTimeout(() => setForceUpdate(f => f + 1), 50); // UI-Refresh nach Dialog-Schließen
  };

  const handleDeleteEvent = async () => {
    try {
      await AppointmentService.deleteAppointment(selectedEvent.id);
      loadAppointments();
      setDetailDialogOpen(false);
      setTimeout(() => setForceUpdate(f => f + 1), 50); // UI-Refresh nach Dialog-Schließen
      onSuccess('Termin wurde erfolgreich gelöscht');
    } catch (error) {
      onError('Fehler beim Löschen des Termins: ' + error.message);
    }
  };
  const getParticipantNames = (participantIds) => {
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return 'Keine Gäste angemeldet';
    }
    
    return participantIds
      .map(id => {
        const participant = participants.find(p => p.id === id);
        return participant ? participant.name : `Unbekannt (ID: ${id})`;
      })
      .join(', ');
  };
  // Universeller PDF-Export für alle Kalenderansichten
  const exportCalendarAsPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margins = { left: 15, right: 15, top: 15, bottom: 25 };
      const contentWidth = pageWidth - margins.left - margins.right;
      
      // Filtere Termine für aktuellen Zeitraum
      let filteredEvents = [];
      const today = new Date();
      
      if (currentView === 'month') {
        filteredEvents = calendarEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate.getMonth() === currentDate.getMonth() && 
                 eventDate.getFullYear() === currentDate.getFullYear();
        });
      } else if (currentView === 'week') {
        const weekStart = DateUtils.startOfWeek(currentDate);
        const weekEnd = DateUtils.endOfWeek(currentDate);
        filteredEvents = calendarEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });
      } else if (currentView === 'day') {
        filteredEvents = calendarEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate.toDateString() === currentDate.toDateString();
        });
      } else if (currentView === 'saison') {
        const currentYear = currentDate.getFullYear();
        const saisonStart = new Date(currentYear, 2, 1);
        const saisonEnd = new Date(currentYear, 10, 30);
        filteredEvents = calendarEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= saisonStart && eventDate <= saisonEnd;
        });
      } else {
        filteredEvents = [...calendarEvents];
      }
      
      // Nach Datum sortieren
      filteredEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
      
      let currentY = margins.top;
      
      // Eleganter Header mit Farbverlauf-Effekt
      pdf.setFillColor(34, 139, 34); // Wald-Grün
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      // Dekorative Elemente
      pdf.setFillColor(46, 125, 50);
      pdf.circle(20, 22, 8, 'F');
      pdf.circle(pageWidth - 20, 22, 8, 'F');
      
      // Header Text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🌿 STIFT GURK', pageWidth / 2, 18, { align: 'center' });
      
      // Titel je nach Ansicht
      let viewTitle = 'Terminkalender';
      switch (currentView) {
        case 'month': viewTitle = 'Monatskalender'; break;
        case 'week': viewTitle = 'Wochenkalender'; break;
        case 'day': viewTitle = 'Tageskalender'; break;
        case 'saison': viewTitle = 'Saisonkalender'; break;
      }
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(viewTitle.toUpperCase(), pageWidth / 2, 28, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.text(formatDateLabel(), pageWidth / 2, 38, { align: 'center' });
      
      currentY = 55;
      
      // Info-Box mit Statistiken
      const statistik = getTerminStatistics(filteredEvents);
      
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margins.left, currentY, contentWidth, 20, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margins.left, currentY, contentWidth, 20);
      
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      const statsText = `📊 ${filteredEvents.length} Termine • 🌿 ${statistik.führungen} Führungen • 📍 ${statistik.vorOrt} Vor-Ort • ✅ ${statistik.bestätigt} Bestätigt`;
      pdf.text(statsText, margins.left + 5, currentY + 8);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Exportiert am: ${today.toLocaleDateString('de-DE', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}`, margins.left + 5, currentY + 15);
      
      currentY += 30;
      
      // Keine Termine - elegante Darstellung
      if (filteredEvents.length === 0) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(margins.left, currentY, contentWidth, 80, 'F');
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(margins.left, currentY, contentWidth, 80);
        
        pdf.setFontSize(16);
        pdf.setTextColor(120, 120, 120);
        pdf.setFont('helvetica', 'normal');
        pdf.text('🌿', pageWidth / 2, currentY + 30, { align: 'center' });
        
        pdf.setFontSize(14);
        pdf.text('Keine Termine im gewählten Zeitraum', pageWidth / 2, currentY + 45, { align: 'center' });
        
        pdf.setFontSize(11);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Ein ruhiger Zeitraum für die Gartenarbeit und Meditation', pageWidth / 2, currentY + 60, { align: 'center' });
      } else {
        // Termine als moderne Karten darstellen
        filteredEvents.forEach((event, index) => {
          // Neue Seite wenn nötig
          if (currentY > pageHeight - 70) {
            pdf.addPage();
            currentY = margins.top;
            
            // Mini-Header auf neuer Seite
            pdf.setFillColor(34, 139, 34);
            pdf.rect(0, 0, pageWidth, 25, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`🌿 ${viewTitle} (Fortsetzung)`, pageWidth / 2, 16, { align: 'center' });
            currentY = 35;
          }
          
          const appointment = event.resource;
          const eventDate = new Date(event.start);
          const endDate = new Date(event.end);
          const cardHeight = 35;
          const cardY = currentY;
          
          // Karten-Hintergrund mit Schatten-Effekt
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margins.left + 1, cardY + 1, contentWidth, cardHeight, 'F'); // Schatten
          
          // Typ-spezifische Farben
          let cardColor = [255, 255, 255];
          let accentColor = [100, 100, 100];
          let typeIcon = '📅';
          
          if (appointment.type === 'führung') {
            cardColor = [240, 248, 255];
            accentColor = [33, 150, 243];
            typeIcon = '🌿';
          } else if (appointment.type === 'vor-ort') {
            cardColor = [255, 248, 240];
            accentColor = [255, 152, 0];
            typeIcon = '📍';
          }
          
          pdf.setFillColor(...cardColor);
          pdf.rect(margins.left, cardY, contentWidth, cardHeight, 'F');
          
          // Bunte Seitenleiste für Status
          let statusColor = [150, 150, 150];
          switch (appointment.status) {
            case 'bestätigt': statusColor = [76, 175, 80]; break;
            case 'abgeschlossen': statusColor = [67, 160, 71]; break;
            case 'abgesagt': statusColor = [244, 67, 54]; break;
            case 'geplant': statusColor = [255, 193, 7]; break;
          }
          
          pdf.setFillColor(...statusColor);
          pdf.rect(margins.left, cardY, 4, cardHeight, 'F');
          
          // Rahmen
          pdf.setDrawColor(220, 220, 220);
          pdf.rect(margins.left, cardY, contentWidth, cardHeight);
          
          // Zeit und Datum - links
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          
          const dateStr = eventDate.toLocaleDateString('de-DE', { 
            weekday: 'short', day: '2-digit', month: 'short'
          });
          const timeStr = `${eventDate.toLocaleTimeString('de-DE', { 
            hour: '2-digit', minute: '2-digit' 
          })} - ${endDate.toLocaleTimeString('de-DE', { 
            hour: '2-digit', minute: '2-digit' 
          })}`;
          
          pdf.text(dateStr, margins.left + 10, cardY + 10);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text(timeStr, margins.left + 10, cardY + 18);
          
          // Titel und Typ - Mitte
          const titleX = margins.left + 55;
          pdf.setTextColor(40, 40, 40);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          
          const maxTitleLength = 35;
          const displayTitle = event.title.length > maxTitleLength ? 
            event.title.substring(0, maxTitleLength) + '...' : event.title;
          
          pdf.text(`${typeIcon} ${displayTitle}`, titleX, cardY + 10);
          
          // Zusatzinfo
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          
          let infoLine = '';
          if (appointment.gruppengröße) {
            infoLine += `👥 ${appointment.gruppengröße} Pers.`;
          }
          if (appointment.kontaktperson) {
            if (infoLine) infoLine += ' • ';
            const kontakt = appointment.kontaktperson.length > 20 ? 
              appointment.kontaktperson.substring(0, 17) + '...' : 
              appointment.kontaktperson;
            infoLine += `📞 ${kontakt}`;
          }
          if (appointment.institution) {
            if (infoLine) infoLine += ' • ';
            const inst = appointment.institution.length > 15 ? 
              appointment.institution.substring(0, 12) + '...' : 
              appointment.institution;
            infoLine += `🏛️ ${inst}`;
          }
          
          if (infoLine) {
            pdf.text(infoLine, titleX, cardY + 18);
          }
          
          // Status-Badge - rechts
          const badgeX = pageWidth - margins.right - 35;
          const badgeY = cardY + 8;
          const badgeWidth = 30;
          const badgeHeight = 8;
          
          pdf.setFillColor(...statusColor);
          pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
          
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          
          let statusText = appointment.status?.toUpperCase() || 'GEPLANT';
          if (statusText === 'ABGESCHLOSSEN') statusText = 'ERLEDIGT';
          if (statusText === 'BESTÄTIGT') statusText = 'BESTÄTIGT';
          
          pdf.text(statusText, badgeX + badgeWidth/2, badgeY + 5.5, { align: 'center' });
          
          // Besonderheiten als kleiner Hinweis
          if (appointment.besonderheiten) {
            pdf.setTextColor(150, 100, 50);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'italic');
            const besonderheitenText = appointment.besonderheiten.length > 40 ? 
              appointment.besonderheiten.substring(0, 37) + '...' : 
              appointment.besonderheiten;
            pdf.text(`� ${besonderheitenText}`, titleX, cardY + 27);
          }
          
          currentY += cardHeight + 3;
        });
      }
      
      // Eleganter Footer
      const addFooter = () => {
        const footerY = pageHeight - 20;
        
        // Trennlinie
        pdf.setDrawColor(34, 139, 34);
        pdf.setLineWidth(0.5);
        pdf.line(margins.left, footerY - 3, pageWidth - margins.right, footerY - 3);
        
        // Legende
        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        
        pdf.text('Status:', margins.left, footerY + 2);
        
        // Status-Punkte mit besserer Optik
        const legendeY = footerY + 2;
        let legendeX = margins.left + 18;
        
        const statusItems = [
          { color: [76, 175, 80], text: 'Bestätigt' },
          { color: [67, 160, 71], text: 'Erledigt' },
          { color: [244, 67, 54], text: 'Abgesagt' },
          { color: [255, 193, 7], text: 'Geplant' }
        ];
        
        statusItems.forEach(item => {
          pdf.setFillColor(...item.color);
          pdf.circle(legendeX, legendeY - 1, 1.2, 'F');
          pdf.text(item.text, legendeX + 4, legendeY);
          legendeX += 25;
        });
        
        // Typ-Legende
        pdf.text('🌿 Führung  📍 Vor-Ort Termin', pageWidth - margins.right - 40, legendeY);
        
        // Seitenzahl
        const pageNum = pdf.internal.getNumberOfPages();
        const currentPageNum = pdf.internal.getCurrentPageInfo().pageNumber;
        if (pageNum > 1) {
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Seite ${currentPageNum} von ${pageNum}`, pageWidth / 2, footerY + 8, { align: 'center' });
        }
        
        // Website/Kontakt
        pdf.setFontSize(6);
        pdf.setTextColor(120, 120, 120);
        pdf.text('www.stift-gurk.at • Terminverwaltung', pageWidth / 2, footerY + 12, { align: 'center' });
      };
      
      // Footer zu allen Seiten hinzufügen
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addFooter();
      }
      
      // Dateiname generieren
      const fileName = generateCalendarFileName();
      pdf.save(fileName);
      
      // Erfolgs-Feedback
      if (onSuccess) {
        onSuccess(`Professioneller Kalender wurde als PDF exportiert: ${fileName}`);
      }
      
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      if (onError) {
        onError('Fehler beim Erstellen der PDF-Datei: ' + error.message);
      } else {
        alert('Fehler beim Erstellen der PDF-Datei. Bitte versuchen Sie es erneut.');
      }
    }
  };

  // Legacy-Funktion für Rückwärtskompatibilität
  const exportMonthlyCalendarAsPDF = exportCalendarAsPDF;
  
  // Hilfsfunktionen für PDF-Export
  const getTerminStatistics = (events) => {
    return {
      führungen: events.filter(e => e.resource.type === 'führung').length,
      vorOrt: events.filter(e => e.resource.type === 'vor-ort').length,
      bestätigt: events.filter(e => e.resource.status === 'bestätigt').length,
      abgeschlossen: events.filter(e => e.resource.status === 'abgeschlossen').length
    };
  };
  
  const generateCalendarFileName = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    if (currentView === 'month') {
      return `StiftGurk_Monatskalender_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}_${dateStr}.pdf`;
    } else if (currentView === 'week') {
      const weekStart = DateUtils.startOfWeek(currentDate);
      return `StiftGurk_Wochenkalender_KW${DateUtils.getWeekNumber(weekStart)}_${weekStart.getFullYear()}_${dateStr}.pdf`;
    } else if (currentView === 'day') {
      return `StiftGurk_Tageskalender_${currentDate.toISOString().split('T')[0]}_${dateStr}.pdf`;
    } else {
      return `StiftGurk_Terminkalender_${dateStr}.pdf`;
    }
  };

  // Event-Styling basierend auf Termintyp und Status
  const eventStyleGetter = (event) => {
    const appointment = event.resource;
    let backgroundColor = '#3174ad'; // Default
    let borderColor = '#265985';
    let color = 'white';

    // Farbzuordnung nach Kategorie
    switch (appointment.kategorie) {
      case 'Führung':
        backgroundColor = '#2196F3';
        borderColor = '#1976D2';
        break;
      case 'Vor-Ort-Termin':
        backgroundColor = '#FF9800';
        borderColor = '#F57C00';
        break;
      case 'Termin außerhalb':
        backgroundColor = '#9C27B0';
        borderColor = '#7B1FA2';
        break;
      case 'Event':
        backgroundColor = '#009688';
        borderColor = '#00695C';
        break;
      case 'Sonstiges':
        backgroundColor = '#607D8B';
        borderColor = '#455A64';
        break;
    }

    // Status-Farben überschreiben ggf. Kategorie
    if (appointment.abgesagt) {
      backgroundColor = '#F44336';
      borderColor = '#D32F2F';
    } else if (appointment.verschoben) {
      backgroundColor = '#FFC107';
      borderColor = '#FFA000';
      color = 'black';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color,
        border: `2px solid ${borderColor}`,
        borderRadius: '4px',
      }
    };
  };
  const formatDateLabel = () => {
    switch (currentView) {
      case 'month':
        return DateUtils.formatDate(currentDate).substring(3); // MM.YYYY
      case 'week':
        const weekStart = DateUtils.startOfWeek(currentDate);
        const weekEnd = DateUtils.endOfWeek(currentDate);
        return `${DateUtils.formatDate(weekStart)} - ${DateUtils.formatDate(weekEnd)}`;
      case 'day':
        return DateUtils.formatDateLong(currentDate);
      case 'saison':
        return `Saison ${currentDate.getFullYear()}`;
      default:
        return DateUtils.formatDate(currentDate);
    }
  };
  // Handler für Saisonansicht
  const handleSaisonDayClick = (date) => {
    // Öffnet direkt das Terminformular für den gewählten Tag
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    onEditAppointment({ start, end, type: 'führung' });
  };

  return (
    <Box>
      {/* Kalender-Toolbar */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Neuer Termin Button */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<EventIcon />}
          onClick={handleCreateAppointment}
          sx={{ ml: 'auto', minWidth: 180 }}
        >
          Neuer Termin
        </Button>
        {/* Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrevious}>
            <ChevronLeft />
          </IconButton>
          <Button variant="outlined" onClick={handleToday} startIcon={<Today />}>
            Heute
          </Button>
          <IconButton onClick={handleNext}>
            <ChevronRight />
          </IconButton>
        </Box>

        {/* Aktuelles Datum */}
        <Typography variant="h6" sx={{ minWidth: 200 }}>
          {formatDateLabel()}
        </Typography>        {/* Ansichts-Buttons */}
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
        </ButtonGroup>        {/* Filter */}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          {/* PDF-Export Button für alle Ansichten */}
          <Tooltip title="Kalender als PDF exportieren">
            <Button
              variant="outlined"
              size="small"
              onClick={exportCalendarAsPDF}
              startIcon={<PictureAsPdf />}
              sx={{ mr: 1 }}
            >
              PDF
            </Button>
          </Tooltip>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Typ</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Typ"
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
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
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
        <Chip size="small" label="Vor-Ort-Termin" sx={{ bgcolor: '#FF9800', color: 'white' }} />
        <Chip size="small" label="Termin außerhalb" sx={{ bgcolor: '#9C27B0', color: 'white' }} />
        <Chip size="small" label="Event" sx={{ bgcolor: '#009688', color: 'white' }} />
        <Chip size="small" label="Sonstiges" sx={{ bgcolor: '#607D8B', color: 'white' }} />
        <Chip size="small" label="Abgesagt" sx={{ bgcolor: '#F44336', color: 'white' }} />
        <Chip size="small" label="Verschoben" sx={{ bgcolor: '#FFC107', color: 'black' }} />
      </Box>
      {/* Kalender */}
      <Paper elevation={1} sx={{ p: 2, height: currentView === 'saison' ? 'auto' : 600 }}>
        {currentView === 'saison' ? (
          <SaisonView 
            appointments={appointments}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onDayClick={handleSaisonDayClick}
            onViewChange={setCurrentView}
          />
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
            selectable="ignoreEvents"
            messages={messages}
            eventPropGetter={eventStyleGetter}
            style={{ height: '100%' }}
            culture="de"
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }) => 
                `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
              dayFormat: 'dddd DD.MM',
              dayHeaderFormat: 'dddd, DD. MMMM YYYY',
              monthHeaderFormat: 'MMMM YYYY',
              weekdayFormat: 'dd',
              agendaDateFormat: 'dddd, DD. MMMM YYYY',
              agendaTimeFormat: 'HH:mm',
              agendaTimeRangeFormat: ({ start, end }) => 
                `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
              dayRangeHeaderFormat: ({ start, end }) => 
                `${moment(start).format('DD. MMMM')} - ${moment(end).format('DD. MMMM YYYY')}`,
              dateFormat: 'DD',
              selectRangeFormat: ({ start, end }) =>
                `${moment(start).format('DD. MMMM')} – ${moment(end).format('DD. MMMM')}`
            }}
            min={new Date(0, 0, 0, 7, 0, 0)} // 07:00
            max={new Date(0, 0, 0, 20, 0, 0)} // 20:00
            step={30}
            timeslots={2}
            onDrillDown={(date, view) => {
              // Nur im Monats-View: Klick auf einen Tag öffnet Terminformular
              if (currentView === 'month') {
                const start = new Date(date);
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                onEditAppointment({ start, end, type: 'führung' });
              }
            }}
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
          <>            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EventIcon />
                <Box>
                  <Typography component="span" variant="h6">{selectedEvent.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip 
                      size="small" 
                      label={selectedEvent.type === 'führung' ? 'Führung' : 'Vor-Ort'}
                      color={selectedEvent.type === 'führung' ? 'primary' : 'warning'}
                    />
                    <Chip 
                      size="small" 
                      label={selectedEvent.status}
                      color={
                        selectedEvent.status === 'bestätigt' ? 'success' :
                        selectedEvent.status === 'abgeschlossen' ? 'success' :
                        selectedEvent.status === 'abgesagt' ? 'error' : 'default'
                      }
                    />
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
              <DialogContent>              <Grid container spacing={2}>
                {/* Grundinformationen */}
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ScheduleIcon sx={{ mr: 2 }} />
                      <ListItemText
                        primary="Zeit"
                        secondary={`${DateUtils.formatDateTime(selectedEvent.start)} - ${DateUtils.formatTime(selectedEvent.end)}`}
                      />
                    </ListItem>
                    
                    {selectedEvent.location && (
                      <ListItem>
                        <LocationOnIcon sx={{ mr: 2 }} />
                        <ListItemText
                          primary="Ort"
                          secondary={selectedEvent.location}
                        />
                      </ListItem>
                    )}
                    
                    {selectedEvent.dauer && (
                      <ListItem>
                        <ListItemText
                          primary="Dauer"
                          secondary={`${selectedEvent.dauer} Minuten`}
                        />
                      </ListItem>
                    )}
                      {selectedEvent.kontaktperson && (
                      <ListItem>
                        <ListItemText
                          primary="Kontaktperson"
                          secondary={selectedEvent.kontaktperson}
                        />
                      </ListItem>
                    )}

                    {selectedEvent.telefon && (
                      <ListItem>
                        <ListItemText
                          primary="Telefon"
                          secondary={selectedEvent.telefon}
                        />
                      </ListItem>
                    )}                    {selectedEvent.email && (
                      <ListItem>
                        <ListItemText
                          primary="E-Mail"
                          secondary={selectedEvent.email}
                        />
                      </ListItem>
                    )}

                    {selectedEvent.gruppengröße && (
                      <ListItem>
                        <GroupIcon sx={{ mr: 2 }} />
                        <ListItemText
                          primary="Gruppengröße"
                          secondary={`${selectedEvent.gruppengröße} Personen`}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>                {/* Weitere Informationen */}
                <Grid item xs={12} md={6}>
                  <List>                    {selectedEvent.teamMitglied && resolveTeamMembers(selectedEvent.teamMitglied) && (
                      <ListItem>
                        <GroupIcon sx={{ mr: 2 }} />
                        <ListItemText
                          primary="Zugewiesenes Team"
                          secondary={resolveTeamMembers(selectedEvent.teamMitglied)}
                        />
                      </ListItem>
                    )}

                    {selectedEvent.institution && (
                      <ListItem>
                        <ListItemText
                          primary="Institution"
                          secondary={selectedEvent.institution}
                        />
                      </ListItem>
                    )}

                    {selectedEvent.altersgruppe && (
                      <ListItem>
                        <ListItemText
                          primary="Altersgruppe"
                          secondary={selectedEvent.altersgruppe}
                        />
                      </ListItem>
                    )}

                    {selectedEvent.sprache && (
                      <ListItem>
                        <ListItemText
                          primary="Sprache"
                          secondary={selectedEvent.sprache}
                        />
                      </ListItem>
                    )}

                    {selectedEvent.kosten && (
                      <ListItem>
                        <ListItemText
                          primary="Kosten"
                          secondary={`€ ${selectedEvent.kosten}`}
                        />
                      </ListItem>
                    )}                    {selectedEvent.zahlungsart && (
                      <ListItem>
                        <ListItemText
                          primary="Zahlungsart"
                          secondary={selectedEvent.zahlungsart}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                {/* Beschreibung und Besonderheiten */}
                {(selectedEvent.description || selectedEvent.besonderheiten) && (
                  <Grid item xs={12}>
                    {selectedEvent.description && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>Beschreibung</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedEvent.description}
                        </Typography>
                      </Box>
                    )}
                    
                    {selectedEvent.besonderheiten && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>Besonderheiten</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedEvent.besonderheiten}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>
                Schließen
              </Button>
              <Button onClick={handleEditEvent} variant="contained">
                Bearbeiten
              </Button>
              <Button onClick={handleDeleteEvent} color="error">
                Löschen
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}



// Funktion zum Auflösen von Team-IDs zu Namen
const resolveTeamMembers = (teamIds) => {
  if (!teamIds) return '';
  
  // Lade aktuelle Teammitglieder aus dem Service
  const teamMembers = TeamService.getAllTeamMembers();
  const teamLookup = teamMembers.reduce((acc, member) => {
    acc[member.id] = member;
    return acc;
  }, {});
  
  if (Array.isArray(teamIds)) {
    if (teamIds.length === 0) return '';
    return teamIds.map(id => {
      const member = teamLookup[id];
      return member ? `${member.name} (${member.rolle})` : id;
    }).join(', ');
  }
  
  // Legacy: String-basierte Teammitglieder
  if (typeof teamIds === 'string' && teamIds.trim() === '') return '';
  const member = teamLookup[teamIds];
  return member ? `${member.name} (${member.rolle})` : teamIds;
};

export default KalenderAnsicht;
