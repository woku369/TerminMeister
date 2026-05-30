// Datum und Zeit Utility-Funktionen
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// Dayjs konfigurieren
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.locale('de');

export const DateUtils = {
  // Formatierung
  formatDate: (date) => dayjs(date).format('DD.MM.YYYY'),
  formatTime: (date) => dayjs(date).format('HH:mm'),
  formatDateTime: (date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
  formatDateLong: (date) => dayjs(date).format('dddd, DD. MMMM YYYY'),
  formatTimeRange: (start, end) => {
    const startTime = dayjs(start).format('HH:mm');
    const endTime = dayjs(end).format('HH:mm');
    return `${startTime} - ${endTime}`;
  },

  // Relative Zeit
  fromNow: (date) => dayjs(date).fromNow(),
  toNow: (date) => dayjs(date).toNow(),

  // Datum-Operationen
  addDays: (date, days) => dayjs(date).add(days, 'day').toDate(),
  addWeeks: (date, weeks) => dayjs(date).add(weeks, 'week').toDate(),
  addMonths: (date, months) => dayjs(date).add(months, 'month').toDate(),
  addMinutes: (date, minutes) => dayjs(date).add(minutes, 'minute').toDate(),
  addHours: (date, hours) => dayjs(date).add(hours, 'hour').toDate(),

  subtractDays: (date, days) => dayjs(date).subtract(days, 'day').toDate(),
  subtractMinutes: (date, minutes) => dayjs(date).subtract(minutes, 'minute').toDate(),

  // Start/Ende von Zeiträumen
  startOfDay: (date) => dayjs(date).startOf('day').toDate(),
  endOfDay: (date) => dayjs(date).endOf('day').toDate(),
  startOfWeek: (date) => dayjs(date).startOf('week').toDate(),
  endOfWeek: (date) => dayjs(date).endOf('week').toDate(),
  startOfMonth: (date) => dayjs(date).startOf('month').toDate(),
  endOfMonth: (date) => dayjs(date).endOf('month').toDate(),

  // Vergleiche
  isSameDay: (date1, date2) => dayjs(date1).isSame(dayjs(date2), 'day'),
  isSameWeek: (date1, date2) => dayjs(date1).isSame(dayjs(date2), 'week'),
  isSameMonth: (date1, date2) => dayjs(date1).isSame(dayjs(date2), 'month'),
  isBefore: (date1, date2) => dayjs(date1).isBefore(dayjs(date2)),
  isAfter: (date1, date2) => dayjs(date1).isAfter(dayjs(date2)),
  isBetween: (date, start, end) => dayjs(date).isBetween(dayjs(start), dayjs(end), 'day', '[]'),

  // Heute, gestern, morgen
  isToday: (date) => dayjs(date).isSame(dayjs(), 'day'),
  isTomorrow: (date) => dayjs(date).isSame(dayjs().add(1, 'day'), 'day'),
  isYesterday: (date) => dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day'),
  isPast: (date) => dayjs(date).isBefore(dayjs()),
  isFuture: (date) => dayjs(date).isAfter(dayjs()),

  // Wochentage
  getWeekday: (date) => dayjs(date).format('dddd'),
  getWeekdayNumber: (date) => dayjs(date).day(), // 0 = Sonntag, 1 = Montag, etc.
  isWeekend: (date) => {
    const day = dayjs(date).day();
    return day === 0 || day === 6; // Sonntag oder Samstag
  },
  isWorkingDay: (date, workingDays = [1, 2, 3, 4, 5]) => {
    const day = dayjs(date).day();
    return workingDays.includes(day);
  },

  // Kalender-spezifische Funktionen
  getMonthDays: (date) => {
    const start = dayjs(date).startOf('month');
    const end = dayjs(date).endOf('month');
    const days = [];
    
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      days.push(current.toDate());
      current = current.add(1, 'day');
    }
    
    return days;
  },

  // Wochennummer
  getWeekNumber: (date) => dayjs(date).week(),

  getWeekDays: (date) => {
    const start = dayjs(date).startOf('week');
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      days.push(start.add(i, 'day').toDate());
    }
    
    return days;
  },

  getCalendarWeeks: (date) => {
    const start = dayjs(date).startOf('month').startOf('week');
    const end = dayjs(date).endOf('month').endOf('week');
    const weeks = [];
    
    let currentWeek = start;
    while (currentWeek.isBefore(end) || currentWeek.isSame(end, 'week')) {
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        weekDays.push(currentWeek.add(i, 'day').toDate());
      }
      weeks.push(weekDays);
      currentWeek = currentWeek.add(1, 'week');
    }
    
    return weeks;
  },

  // Dauer berechnen
  getDuration: (start, end) => {
    const startMoment = dayjs(start);
    const endMoment = dayjs(end);
    const duration = dayjs.duration(endMoment.diff(startMoment));
    
    return {
      milliseconds: duration.asMilliseconds(),
      seconds: duration.asSeconds(),
      minutes: duration.asMinutes(),
      hours: duration.asHours(),
      days: duration.asDays(),
      humanize: () => duration.humanize()
    };
  },

  // Zeit parsen
  parseTime: (timeString) => {
    // Format: "HH:mm" -> Date für heute
    const [hours, minutes] = timeString.split(':').map(Number);
    return dayjs().hour(hours).minute(minutes).second(0).millisecond(0).toDate();
  },

  // Zeitbereich erstellen
  createTimeSlot: (date, startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = dayjs(date).hour(hours).minute(minutes).second(0).millisecond(0);
    const end = start.add(durationMinutes, 'minute');
    
    return {
      start: start.toDate(),
      end: end.toDate()
    };
  },

  // Überschneidungen prüfen
  hasOverlap: (appointment1, appointment2) => {
    const start1 = dayjs(appointment1.start);
    const end1 = dayjs(appointment1.end);
    const start2 = dayjs(appointment2.start);
    const end2 = dayjs(appointment2.end);
    
    return start1.isBefore(end2) && start2.isBefore(end1);
  },

  // Freie Zeitslots finden
  findFreeSlots: (date, duration, appointments, workingHours = { start: '08:00', end: '18:00' }) => {
    const freeSlots = [];
    const dayStart = dayjs(date).set('hour', parseInt(workingHours.start.split(':')[0]))
                                .set('minute', parseInt(workingHours.start.split(':')[1]))
                                .set('second', 0);
    const dayEnd = dayjs(date).set('hour', parseInt(workingHours.end.split(':')[0]))
                              .set('minute', parseInt(workingHours.end.split(':')[1]))
                              .set('second', 0);
    
    // Termine für den Tag sortieren
    const dayAppointments = appointments
      .filter(apt => dayjs(apt.start).isSame(dayjs(date), 'day'))
      .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf());
    
    let currentTime = dayStart;
    
    for (const appointment of dayAppointments) {
      const aptStart = dayjs(appointment.start);
      
      // Freier Slot vor dem Termin?
      if (currentTime.add(duration, 'minute').isBefore(aptStart) || currentTime.add(duration, 'minute').isSame(aptStart)) {
        freeSlots.push({
          start: currentTime.toDate(),
          end: currentTime.add(duration, 'minute').toDate()
        });
      }
      
      currentTime = dayjs(appointment.end);
    }
    
    // Letzter freier Slot nach dem letzten Termin
    if (currentTime.add(duration, 'minute').isBefore(dayEnd) || currentTime.add(duration, 'minute').isSame(dayEnd)) {
      freeSlots.push({
        start: currentTime.toDate(),
        end: currentTime.add(duration, 'minute').toDate()
      });
    }
    
    return freeSlots;
  },

  // Erinnerungszeit berechnen
  getReminderTime: (appointmentStart, reminderMinutes) => {
    return dayjs(appointmentStart).subtract(reminderMinutes, 'minute').toDate();
  },

  // Termine nach Zeitraum filtern
  filterByDateRange: (appointments, startDate, endDate) => {
    return appointments.filter(apt => 
      dayjs(apt.start).isBetween(dayjs(startDate), dayjs(endDate), 'day', '[]')
    );
  },

  // Nächste Arbeitstage
  getNextWorkingDays: (count = 5, workingDays = [1, 2, 3, 4, 5]) => {
    const days = [];
    let current = dayjs();
    
    while (days.length < count) {
      if (workingDays.includes(current.day())) {
        days.push(current.toDate());
      }
      current = current.add(1, 'day');
    }
    
    return days;
  }
};
