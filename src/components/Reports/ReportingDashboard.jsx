// Reporting und Statistik Dashboard
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  LinearProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { MdAssessment as Assessment, MdEvent as EventIcon, MdPeople as People, MdTrendingUp as TrendingUp, MdTrendingDown as TrendingDown, MdCalendarMonth as CalendarMonth, MdBusiness as Business, MdDownload as Download, MdRefresh } from 'react-icons/md';
const Refresh = MdRefresh;

function ReportingDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [participantStats, setParticipantStats] = useState(null);
  const [reminderStats, setReminderStats] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // all, thisMonth, lastMonth, thisYear
  const [appointments, setAppointments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Basisdaten laden
      const allAppointments = AppointmentService.getAllAppointments();
      const allParticipants = ParticipantService.getAllParticipants();
      
      // Zeitbereich-gefilterte Termine
      let filteredAppointments = allAppointments;
      const now = new Date();
      
      switch (timeRange) {
        case 'thisMonth':
          const startOfMonth = DateUtils.startOfMonth(now);
          const endOfMonth = DateUtils.endOfMonth(now);
          filteredAppointments = DateUtils.filterByDateRange(allAppointments, startOfMonth, endOfMonth);
          break;
        case 'lastMonth':
          const lastMonth = DateUtils.subtractDays(now, 30);
          const startOfLastMonth = DateUtils.startOfMonth(lastMonth);
          const endOfLastMonth = DateUtils.endOfMonth(lastMonth);
          filteredAppointments = DateUtils.filterByDateRange(allAppointments, startOfLastMonth, endOfLastMonth);
          break;
        case 'thisYear':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31);
          filteredAppointments = DateUtils.filterByDateRange(allAppointments, startOfYear, endOfYear);
          break;
        default:
          filteredAppointments = allAppointments;
      }

      setAppointments(filteredAppointments);
      setParticipants(allParticipants);

      // Statistiken berechnen
      const appointmentStats = calculateAppointmentStatistics(filteredAppointments);
      const participantStatistics = ParticipantService.getParticipantStatistics();
      const reminderStatistics = ReminderService.getReminderStatistics();

      setStatistics(appointmentStats);
      setParticipantStats(participantStatistics);
      setReminderStats(reminderStatistics);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAppointmentStatistics = (appointmentList) => {
    const now = new Date();
    
    const stats = {
      total: appointmentList.length,
      byType: {
        führung: appointmentList.filter(apt => apt.type === 'führung').length,
        'vor-ort': appointmentList.filter(apt => apt.type === 'vor-ort').length
      },
      byStatus: {
        geplant: appointmentList.filter(apt => apt.status === 'geplant').length,
        bestätigt: appointmentList.filter(apt => apt.status === 'bestätigt').length,
        abgeschlossen: appointmentList.filter(apt => apt.status === 'abgeschlossen').length,
        abgesagt: appointmentList.filter(apt => apt.status === 'abgesagt').length
      },
      byMonth: {},
      upcoming: appointmentList.filter(apt => DateUtils.isAfter(apt.start, now)).length,
      past: appointmentList.filter(apt => DateUtils.isBefore(apt.start, now)).length,
      today: appointmentList.filter(apt => DateUtils.isToday(apt.start)).length,
      thisWeek: appointmentList.filter(apt => DateUtils.isSameWeek(apt.start, now)).length,
      averageDuration: 0,
      totalParticipants: 0,
      averageParticipants: 0,
      busyDays: [],
      popularTimes: {},
      // Nachbereitung-Statistiken
      totalEintrittsgeld: 0,
      totalWarenverkauf: 0,
      totalUmsatz: 0,
      eintrittsgeldCount: 0,
      totalTatsaechlicherBesuch: 0,
      tatsaechlicherBesuchCount: 0,
      durchschnittlicheAuslastung: null
    };

    // Termine nach Monat
    appointmentList.forEach(apt => {
      const monthKey = DateUtils.formatDate(apt.start).substring(3); // MM.YYYY
      stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
    });

    // Durchschnittliche Dauer
    if (appointmentList.length > 0) {
      const totalMinutes = appointmentList.reduce((sum, apt) => {
        const duration = DateUtils.getDuration(apt.start, apt.end);
        return sum + duration.minutes;
      }, 0);
      stats.averageDuration = Math.round(totalMinutes / appointmentList.length);
    }

    // Teilnehmer-Statistiken
    const totalParticipants = appointmentList.reduce((sum, apt) => sum + apt.participants.length, 0);
    stats.totalParticipants = totalParticipants;
    if (appointmentList.length > 0) {
      stats.averageParticipants = Math.round((totalParticipants / appointmentList.length) * 100) / 100;
    }

    // Beliebte Zeiten (Stunden)
    appointmentList.forEach(apt => {
      const hour = new Date(apt.start).getHours();
      stats.popularTimes[hour] = (stats.popularTimes[hour] || 0) + 1;
    });

    // Tage mit vielen Terminen
    const daysCounts = {};
    appointmentList.forEach(apt => {
      const dayKey = DateUtils.formatDate(apt.start);
      daysCounts[dayKey] = (daysCounts[dayKey] || 0) + 1;
    });
    
    stats.busyDays = Object.entries(daysCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([date, count]) => ({ date, count }));

    // Einnahmen (nur abgeschlossene Termine mit eingetragenem Wert)
    const aptsWithEinnahmen = appointmentList.filter(
      apt => apt.status === 'abgeschlossen' && (apt.eintrittsgeldBrutto != null || apt.warenverkaufBrutto != null)
    );
    stats.totalEintrittsgeld = aptsWithEinnahmen.reduce((sum, apt) => sum + (apt.eintrittsgeldBrutto || 0), 0);
    stats.totalWarenverkauf = aptsWithEinnahmen.reduce((sum, apt) => sum + (apt.warenverkaufBrutto || 0), 0);
    stats.totalUmsatz = stats.totalEintrittsgeld + stats.totalWarenverkauf;
    stats.eintrittsgeldCount = aptsWithEinnahmen.length;

    // Tatsächliche Besucherzahl
    const aptsWithBesuch = appointmentList.filter(
      apt => apt.tatsaechlicherBesuch != null && apt.gruppengröße > 0
    );
    if (aptsWithBesuch.length > 0) {
      stats.totalTatsaechlicherBesuch = aptsWithBesuch.reduce((sum, apt) => sum + apt.tatsaechlicherBesuch, 0);
      stats.tatsaechlicherBesuchCount = aptsWithBesuch.length;
      const totalAngemeldet = aptsWithBesuch.reduce((sum, apt) => sum + apt.gruppengröße, 0);
      stats.durchschnittlicheAuslastung = Math.round((stats.totalTatsaechlicherBesuch / totalAngemeldet) * 100);
    }

    return stats;
  };

  const getMostPopularTime = () => {
    if (!statistics?.popularTimes) return 'Keine Daten';
    
    const times = Object.entries(statistics.popularTimes);
    if (times.length === 0) return 'Keine Daten';
    
    const [hour, count] = times.sort(([,a], [,b]) => b - a)[0];
    return `${hour}:00 Uhr (${count} Termine)`;
  };

  const getCompletionRate = () => {
    if (!statistics || statistics.total === 0) return 0;
    return Math.round((statistics.byStatus.abgeschlossen / statistics.total) * 100);
  };

  const getCancellationRate = () => {
    if (!statistics || statistics.total === 0) return 0;
    return Math.round((statistics.byStatus.abgesagt / statistics.total) * 100);
  };

  const handleExportReport = () => {
    try {
      const reportData = {
        zeitraum: timeRange,
        generiert: new Date().toLocaleString('de-DE'),
        termine: statistics,
        teilnehmer: participantStats,
        erinnerungen: reminderStats
      };

      const jsonData = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bericht_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim Export:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Lade Statistiken...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <Assessment sx={{ mr: 1 }} />
          Berichte & Statistiken
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Zeitraum</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Zeitraum"
            >
              <MenuItem value="all">Alle Termine</MenuItem>
              <MenuItem value="thisMonth">Dieser Monat</MenuItem>
              <MenuItem value="lastMonth">Letzter Monat</MenuItem>
              <MenuItem value="thisYear">Dieses Jahr</MenuItem>
            </Select>
          </FormControl>
          <Button startIcon={<Refresh />} onClick={loadAllData}>
            Aktualisieren
          </Button>
          <Button startIcon={<Download />} onClick={handleExportReport}>
            Export
          </Button>
        </Box>
      </Box>

      {/* Überblick Karten */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Event sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4">{statistics?.total || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Termine gesamt
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
                <People sx={{ mr: 2, color: 'info.main' }} />
                <Box>
                  <Typography variant="h4">{statistics?.totalParticipants || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teilnehmer total
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
                <CheckCircleIcon sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography variant="h4">{getCompletionRate()}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Abschlussrate
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
                <ScheduleIcon sx={{ mr: 2, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h4">{statistics?.upcoming || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Kommende Termine
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Nachbereitung-Kennzahlen */}
      {(statistics?.eintrittsgeldCount > 0 || statistics?.tatsaechlicherBesuchCount > 0) && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Nachbereitung (abgeschlossene Führungen)
            </Typography>
          </Grid>
          {statistics?.eintrittsgeldCount > 0 && (
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderLeft: '4px solid', borderColor: 'success.main' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Gesamtumsatz brutto</Typography>
                  <Typography variant="h5" color="success.main" sx={{ mt: 0.5 }}>
                    € {statistics.totalUmsatz.toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Eintritt: € {statistics.totalEintrittsgeld.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Shop: € {statistics.totalWarenverkauf.toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    aus {statistics.eintrittsgeldCount} Termin{statistics.eintrittsgeldCount !== 1 ? 'en' : ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {statistics?.tatsaechlicherBesuchCount > 0 && (
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderLeft: '4px solid', borderColor: 'info.main' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Tatsächliche Auslastung</Typography>
                  <Typography variant="h5" color="info.main" sx={{ mt: 0.5 }}>
                    {statistics.durchschnittlicheAuslastung}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ø {Math.round(statistics.totalTatsaechlicherBesuch / statistics.tatsaechlicherBesuchCount)} Pers. tatsächlich
                    {' / '}Ø {Math.round(appointments.filter(a => a.tatsaechlicherBesuch != null && a.gruppengröße > 0).reduce((s, a) => s + a.gruppengröße, 0) / statistics.tatsaechlicherBesuchCount)} Pers. angemeldet
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Termin-Typen */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Termine nach Typ
            </Typography>
            <Box sx={{ mt: 2 }}>
              {statistics?.byType && Object.entries(statistics.byType).map(([type, count]) => {
                const percentage = statistics.total > 0 ? (count / statistics.total) * 100 : 0;
                return (
                  <Box key={type} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {type === 'führung' ? 'Führungen' : 'Vor-Ort Termine'}
                      </Typography>
                      <Typography variant="body2">
                        {count} ({Math.round(percentage)}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage}
                      color={type === 'führung' ? 'primary' : 'warning'}
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Status-Verteilung */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Status-Verteilung
            </Typography>
            <Box sx={{ mt: 2 }}>
              {statistics?.byStatus && Object.entries(statistics.byStatus).map(([status, count]) => {
                const percentage = statistics.total > 0 ? (count / statistics.total) * 100 : 0;
                const getColor = (status) => {
                  switch (status) {
                    case 'bestätigt': return 'success';
                    case 'abgeschlossen': return 'info';
                    case 'abgesagt': return 'error';
                    default: return 'warning';
                  }
                };
                
                return (
                  <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip 
                      label={`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`}
                      color={getColor(status)}
                      variant="outlined"
                      size="small"
                    />
                    <Typography variant="body2">
                      {Math.round(percentage)}%
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Termine nach Monat */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Termine nach Monat
            </Typography>
            {statistics?.byMonth && Object.keys(statistics.byMonth).length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Monat</TableCell>
                      <TableCell align="right">Anzahl</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(statistics.byMonth)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([month, count]) => (
                        <TableRow key={month}>
                          <TableCell>{month}</TableCell>
                          <TableCell align="right">{count}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">Keine Daten für den gewählten Zeitraum</Alert>
            )}
          </Paper>
        </Grid>

        {/* Weitere Statistiken */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Weitere Statistiken
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Durchschnittliche Dauer"
                  secondary={`${statistics?.averageDuration || 0} Minuten`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Ø Teilnehmer pro Termin"
                  secondary={statistics?.averageParticipants || 0}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Beliebteste Zeit"
                  secondary={getMostPopularTime()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Abbruchrate"
                  secondary={`${getCancellationRate()}%`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Termine heute"
                  secondary={statistics?.today || 0}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Termine diese Woche"
                  secondary={statistics?.thisWeek || 0}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Busyste Tage */}
        {statistics?.busyDays?.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tage mit den meisten Terminen
              </Typography>
              <List>
                {statistics.busyDays.map(({ date, count }, index) => (
                  <ListItem key={date}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={date}
                      secondary={`${count} Termine`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        {/* Teilnehmer-Statistiken */}
        {participantStats && (
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Teilnehmer-Übersicht
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Teilnehmer gesamt"
                    secondary={participantStats.totalParticipants}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Mit E-Mail"
                    secondary={`${participantStats.participantsWithEmail} (${Math.round((participantStats.participantsWithEmail / participantStats.totalParticipants) * 100)}%)`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Mit Telefon"
                    secondary={`${participantStats.participantsWithPhone} (${Math.round((participantStats.participantsWithPhone / participantStats.totalParticipants) * 100)}%)`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Organisationen"
                    secondary={participantStats.organizations.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Aktivste Teilnehmer"
                    secondary={participantStats.mostActiveParticipants.length}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default ReportingDashboard;
