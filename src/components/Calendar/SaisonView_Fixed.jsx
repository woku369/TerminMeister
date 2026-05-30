import { Card, CardContent } from '@mui/material';
// Saisonansicht als echtes Kalenderblatt (März - November)
import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  useTheme,
  Divider
} from '@mui/material';
import { MdChevronLeft, MdChevronRight, MdToday, MdEvent as EventIcon, MdWbSunny, MdLocalFlorist, MdPark } from 'react-icons/md';
import { DateUtils } from '../../utils/dateUtils';

// Deutsche Monatsnamen (erweitert auf 9 Monate)
const MONATE = [
  'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November'
];

const MONAT_EMOJIS = {
  'März': '🌱',
  'April': '🌸', 
  'Mai': '🌼',
  'Juni': '🌿',
  'Juli': '☀️',
  'August': '🌾',
  'September': '🍂',
  'Oktober': '🎃',
  'November': '🍁'
};

function SaisonView({ appointments, currentDate, onDateChange, onDayClick, onViewChange }) {
  // Handler für Tag-Klick: öffnet Terminformular, wenn onEditAppointment übergeben
  const handleDayClick = (date) => {
    if (typeof onEditAppointment === 'function') {
      onEditAppointment({ start: date });
    }
    if (typeof onDayClick === 'function') {
      onDayClick(date);
    }
  };
  const theme = useTheme();
  const year = currentDate.getFullYear();

  // Termine nach Tagen gruppieren
  const appointmentsByDate = useMemo(() => {
    const grouped = {};
    
    appointments.forEach(appointment => {
      const date = new Date(appointment.start);
      if (date.getFullYear() === year && date.getMonth() >= 2 && date.getMonth() <= 10) { // März (2) bis November (10)
        const dateKey = DateUtils.formatDate(date);
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(appointment);
      }
    });
    
    return grouped;
  }, [appointments, year]);

  // Navigation
  const handlePreviousYear = () => {
    const newDate = new Date(year - 1, 2, 1); // März des Vorjahres
    onDateChange(newDate);
  };

  const handleNextYear = () => {
    const newDate = new Date(year + 1, 2, 1); // März des nächsten Jahres
    onDateChange(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    if (today.getMonth() >= 2 && today.getMonth() <= 10) { // März bis November
      onDateChange(today);
    } else {
      // Wenn außerhalb der Saison, zur aktuellen Saison springen
      const currentYear = today.getFullYear();
      const saisonYear = today.getMonth() < 2 ? currentYear : currentYear + 1;
      onDateChange(new Date(saisonYear, 2, 1)); // März
    }
  };

  // Einzelner Monatskalender im echten Kalenderformat
  const MonthCalendar = ({ month, monthIndex }) => {
    const monthDate = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Montag = 0

    // Kalender-Grid erstellen (6 Wochen x 7 Tage = 42 Zellen)
    const calendarWeeks = [];
    let currentWeek = [];
    
    // Leere Zellen am Anfang für die erste Woche
    for (let i = 0; i < adjustedFirstDay; i++) {
      currentWeek.push(null);
    }
    
    // Tage des Monats hinzufügen
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      
      // Wenn Woche voll ist (7 Tage), neue Woche beginnen
      if (currentWeek.length === 7) {
        calendarWeeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Letzte Woche mit leeren Zellen auffüllen
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      calendarWeeks.push(currentWeek);
    }
    
    // Sicherstellen, dass wir 6 Wochen haben (für einheitliche Höhe)
    while (calendarWeeks.length < 6) {
      calendarWeeks.push(new Array(7).fill(null));
    }

    const getDayAppointments = (day) => {
      const dateKey = `${day.toString().padStart(2, '0')}.${(monthIndex + 1).toString().padStart(2, '0')}.${year}`;
      return appointmentsByDate[dateKey] || [];
    };

    const getDayColor = (day, appointments) => {
      if (appointments.length === 0) return 'transparent';
      
      const hasImportant = appointments.some(apt => apt.status === 'bestätigt' && apt.type === 'führung');
      const hasVorOrt = appointments.some(apt => apt.type === 'vor-ort');
      
      if (hasImportant) return theme.palette.primary.main;
      if (hasVorOrt) return theme.palette.warning.main;
      return theme.palette.grey[400];
    };

    const isToday = (day) => {
      const today = new Date();
      return today.getDate() === day && 
             today.getMonth() === monthIndex && 
             today.getFullYear() === year;
    };

    return (
      <Card 
        elevation={2} 
        sx={{ 
          height: '100%',
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            elevation: 4
          }
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          {/* Monatsheader */}
          <Box sx={{ textAlign: 'center', mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'primary.main',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                fontSize: '1.1rem'
              }}
            >
              <span style={{ fontSize: '1.2em' }}>{MONAT_EMOJIS[month]}</span>
              {month} {year}
            </Typography>
          </Box>

          {/* Wochentags-Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
            {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map((day, index) => (
              <Box key={day} sx={{ textAlign: 'center', py: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: index >= 5 ? 'error.main' : 'text.primary', // Wochenende rot
                    fontSize: '0.75rem',
                    display: { xs: 'none', sm: 'block' } // Volltext nur auf größeren Bildschirmen
                  }}
                >
                  {day}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: index >= 5 ? 'error.main' : 'text.primary',
                    fontSize: '0.75rem',
                    display: { xs: 'block', sm: 'none' } // Abkürzung auf kleinen Bildschirmen
                  }}
                >
                  {day.substring(0, 2)}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Kalender-Wochen */}
          <Box sx={{ display: 'grid', gridTemplateRows: 'repeat(6, 1fr)', gap: 0.5, minHeight: 180 }}>
            {calendarWeeks.map((week, weekIndex) => (
              <Box key={weekIndex} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <Box 
                        key={`empty-${weekIndex}-${dayIndex}`} 
                        sx={{ 
                          minHeight: 28,
                          backgroundColor: 'grey.50',
                          borderRadius: 1,
                          opacity: 0.3
                        }} 
                      />
                    );
                  }

                  const dayAppointments = getDayAppointments(day);
                  const dayColor = getDayColor(day, dayAppointments);
                  const today = isToday(day);
                  const isWeekend = dayIndex >= 5;

                  return (
                    <Tooltip
                      key={day}
                      title={
                        dayAppointments.length > 0 
                          ? `${day}.${(monthIndex + 1).toString().padStart(2, '0')}.${year} - ${dayAppointments.length} Termin(e): ${dayAppointments.map(apt => apt.title).join(', ')}`
                          : `${day}.${(monthIndex + 1).toString().padStart(2, '0')}.${year}`
                      }
                      arrow
                    >
                      <Box
                        onClick={() => {
                          const clickedDate = new Date(year, monthIndex, day);
                          handleDayClick(clickedDate);
                        }}
                        sx={{
                          minHeight: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          borderRadius: 1,
                          backgroundColor: dayColor !== 'transparent' ? dayColor : (isWeekend ? 'grey.50' : 'white'),
                          border: today ? `2px solid ${theme.palette.secondary.main}` : '1px solid',
                          borderColor: today ? theme.palette.secondary.main : 'grey.300',
                          color: dayColor !== 'transparent' ? 'white' : (isWeekend ? 'error.main' : 'text.primary'),
                          fontWeight: today ? 'bold' : (isWeekend ? 'normal' : 'normal'),
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: today 
                              ? theme.palette.secondary.dark
                              : dayColor !== 'transparent' 
                                ? theme.palette.primary.dark 
                                : theme.palette.grey[200],
                            transform: 'scale(1.05)',
                            zIndex: 1,
                            boxShadow: 2
                          },
                          position: 'relative'
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.8rem',
                            fontWeight: today ? 'bold' : 'normal'
                          }}
                        >
                          {day}
                        </Typography>
                        
                        {/* Termin-Indikator */}
                        {dayAppointments.length > 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              minWidth: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: dayColor !== 'transparent' ? 'white' : theme.palette.error.main,
                              color: dayColor !== 'transparent' ? theme.palette.error.main : 'white',
                              fontSize: '0.6rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              border: dayColor !== 'transparent' ? `1px solid ${theme.palette.error.main}` : 'none'
                            }}
                          >
                            {dayAppointments.length > 9 ? '9+' : dayAppointments.length}
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>

          {/* Monatsstatistik */}
          <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
            {(() => {
              const monthAppointments = Object.values(appointmentsByDate)
                .flat()
                .filter(apt => new Date(apt.start).getMonth() === monthIndex);
              
              const führungen = monthAppointments.filter(apt => apt.type === 'führung').length;
              const vorOrt = monthAppointments.filter(apt => apt.type === 'vor-ort').length;
              
              return (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    {monthAppointments.length} Termine gesamt
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {führungen > 0 && (
                      <Chip
                        size="small"
                        label={`${führungen} F`}
                        color="primary"
                        sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }}
                      />
                    )}
                    {vorOrt > 0 && (
                      <Chip
                        size="small"
                        label={`${vorOrt} V`}
                        color="warning"
                        sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Gesamtstatistiken für die Saison
  const saisonStats = useMemo(() => {
    const saisonAppointments = Object.values(appointmentsByDate).flat();
    
    return {
      gesamt: saisonAppointments.length,
      führungen: saisonAppointments.filter(apt => apt.type === 'führung').length,
      vorOrt: saisonAppointments.filter(apt => apt.type === 'vor-ort').length,
      verkostungen: saisonAppointments.filter(apt => apt.type === 'verkostung').length,
      workshops: saisonAppointments.filter(apt => apt.type === 'workshop').length,
      bestätigt: saisonAppointments.filter(apt => apt.status === 'bestätigt').length,
      aktiveMonate: MONATE.filter(monat => {
        const monthIndex = MONATE.indexOf(monat) + 2; // März = 2
        return saisonAppointments.some(apt => new Date(apt.start).getMonth() === monthIndex);
      }).length
    };
  }, [appointmentsByDate]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Header mit Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handlePreviousYear} size="large">
            <ChevronLeft />
          </IconButton>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Park sx={{ fontSize: '2rem', color: 'success.main' }} />
              Führungssaison {year}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Stift Gurk Klostergarten • März bis November
            </Typography>
          </Box>
          
          <IconButton onClick={handleNextYear} size="large">
            <ChevronRight />
          </IconButton>
        </Box>

        <IconButton onClick={handleToday} color="primary">
          <Today />
        </IconButton>
      </Box>

      {/* Kalenderblatt - 9 Monate in 3er-Raster */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {MONATE.map((month, index) => (
          <Grid item xs={12} sm={6} md={4} key={month}>
            <MonthCalendar month={month} monthIndex={index + 2} />
          </Grid>
        ))}
      </Grid>

      {/* Legende */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon />
          Legende
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: theme.palette.primary.main, borderRadius: 1 }} />
            <Typography variant="body2">Führungen (bestätigt)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: theme.palette.warning.main, borderRadius: 1 }} />
            <Typography variant="body2">Vor-Ort Termine</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: theme.palette.grey[400], borderRadius: 1 }} />
            <Typography variant="body2">Andere Termine</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, border: `2px solid ${theme.palette.secondary.main}`, borderRadius: 1 }} />
            <Typography variant="body2">Heute</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>Sa/So</Typography>
            <Typography variant="body2">Wochenende</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                backgroundColor: theme.palette.error.main,
                color: 'white',
                fontSize: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              #
            </Box>
            <Typography variant="body2">Anzahl Termine</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Saisonstatistiken */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📊 Saisonstatistiken {year}
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={6} sm={4} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {saisonStats.gesamt}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesamt Termine
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {saisonStats.führungen}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Führungen
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main" fontWeight="bold">
                {saisonStats.vorOrt}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vor-Ort Termine
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main" fontWeight="bold">
                {saisonStats.bestätigt}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bestätigt
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="text.primary" fontWeight="bold">
                {saisonStats.aktiveMonate}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aktive Monate
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="secondary.main" fontWeight="bold">
                {Math.round((saisonStats.gesamt / 9) * 10) / 10}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ⌀ pro Monat
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Zusätzliche Insights */}
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              🎯 Saison-Highlights
            </Typography>
            <Box sx={{ ml: 2 }}>
              {saisonStats.führungen > 0 && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  • {saisonStats.führungen} Kräutergarten-Führungen geplant
                </Typography>
              )}
              {saisonStats.vorOrt > 0 && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  • {saisonStats.vorOrt} Vor-Ort Termine vereinbart
                </Typography>
              )}
              {saisonStats.aktiveMonate > 0 && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  • {saisonStats.aktiveMonate} von 9 Monaten aktiv
                </Typography>
              )}
              {saisonStats.gesamt === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Noch keine Termine für diese Saison geplant
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              📅 Beste Monate
            </Typography>
            <Box sx={{ ml: 2 }}>
              {(() => {
                const monthCounts = MONATE.map(monat => {
                  const monthIndex = MONATE.indexOf(monat) + 2; // März = 2
                  const count = Object.values(appointmentsByDate)
                    .flat()
                    .filter(apt => new Date(apt.start).getMonth() === monthIndex).length;
                  return { monat, count };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

                return monthCounts.map(({ monat, count }) => (
                  count > 0 && (
                    <Typography key={monat} variant="body2" sx={{ mb: 0.5 }}>
                      • {monat}: {count} Termine {MONAT_EMOJIS[monat]}
                    </Typography>
                  )
                ));
              })()}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default SaisonView;
