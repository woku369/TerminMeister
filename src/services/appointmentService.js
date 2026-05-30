// Service für Terminverwaltung
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../utils/storage.js';
import { DateUtils } from '../utils/dateUtils.js';

export class AppointmentService {
  static getAllAppointments() {
    return StorageService.getAppointments();
  }

  static getAppointmentById(id) {
    const appointments = this.getAllAppointments();
    return appointments.find(apt => apt.id === id);
  }
  static createAppointment(appointmentData) {
    const appointment = {
      id: uuidv4(),
      ...appointmentData, // Alle Felder von appointmentData übernehmen
      status: appointmentData.status || 'geplant',
      participants: appointmentData.participants || [],
      location: appointmentData.location || '',
      description: appointmentData.description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Prüfe auf Überschneidungen
    const conflicts = this.checkForConflicts(appointment);
    if (conflicts.length > 0) {
      throw new Error(`Terminkonflikt gefunden: ${conflicts.map(c => c.title).join(', ')}`);
    }

    StorageService.addAppointment(appointment);

    // Erstelle automatische Erinnerung falls gewünscht
    if (appointmentData.reminderTime) {
      this.createReminder(appointment.id, appointmentData.reminderTime);
    }

    return appointment;
  }

  static updateAppointment(id, updates) {
    const appointment = this.getAppointmentById(id);
    if (!appointment) {
      throw new Error('Termin nicht gefunden');
    }

    const updatedAppointment = {
      ...appointment,
      ...updates,
      updatedAt: new Date()
    };

    // Prüfe auf Überschneidungen (außer mit sich selbst)
    const conflicts = this.checkForConflicts(updatedAppointment, [id]);
    if (conflicts.length > 0) {
      throw new Error(`Terminkonflikt gefunden: ${conflicts.map(c => c.title).join(', ')}`);
    }

    StorageService.updateAppointment(updatedAppointment);
    return updatedAppointment;
  }

  static deleteAppointment(id) {
    const appointment = this.getAppointmentById(id);
    if (!appointment) {
      throw new Error('Termin nicht gefunden');
    }

    StorageService.deleteAppointment(id);
    
    // Lösche zugehörige Erinnerungen
    const reminders = StorageService.getReminders();
    const appointmentReminders = reminders.filter(r => r.appointmentId === id);
    appointmentReminders.forEach(reminder => {
      StorageService.deleteReminder(reminder.id);
    });

    return true;
  }

  static checkForConflicts(appointment, excludeIds = []) {
    const allAppointments = this.getAllAppointments()
      .filter(apt => !excludeIds.includes(apt.id));

    return allAppointments.filter(existing => 
      DateUtils.hasOverlap(appointment, existing)
    );
  }

  static getAppointmentsByDateRange(startDate, endDate) {
    const appointments = this.getAllAppointments();
    return DateUtils.filterByDateRange(appointments, startDate, endDate);
  }

  static getAppointmentsByType(type) {
    const appointments = this.getAllAppointments();
    return appointments.filter(apt => apt.type === type);
  }

  static getAppointmentsByStatus(status) {
    const appointments = this.getAllAppointments();
    return appointments.filter(apt => apt.status === status);
  }

  static getUpcomingAppointments(days = 7) {
    const appointments = this.getAllAppointments();
    const now = new Date();
    const futureDate = DateUtils.addDays(now, days);
    
    return appointments.filter(apt => 
      DateUtils.isAfter(apt.start, now) && 
      DateUtils.isBefore(apt.start, futureDate)
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  static getAppointmentsForDate(date) {
    const appointments = this.getAllAppointments();
    return appointments.filter(apt => DateUtils.isSameDay(apt.start, date))
                      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  static getAppointmentsForWeek(date) {
    const weekStart = DateUtils.startOfWeek(date);
    const weekEnd = DateUtils.endOfWeek(date);
    return this.getAppointmentsByDateRange(weekStart, weekEnd);
  }

  static getAppointmentsForMonth(date) {
    const monthStart = DateUtils.startOfMonth(date);
    const monthEnd = DateUtils.endOfMonth(date);
    return this.getAppointmentsByDateRange(monthStart, monthEnd);
  }

  static searchAppointments(query) {
    const appointments = this.getAllAppointments();
    const searchTerm = query.toLowerCase();
    
    return appointments.filter(apt => 
      apt.title.toLowerCase().includes(searchTerm) ||
      apt.description?.toLowerCase().includes(searchTerm) ||
      apt.location?.toLowerCase().includes(searchTerm) ||
      apt.type.toLowerCase().includes(searchTerm)
    );
  }

  static createReminder(appointmentId, reminderMinutes, message = '') {
    const appointment = this.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new Error('Termin nicht gefunden');
    }

    const reminder = {
      id: uuidv4(),
      appointmentId: appointmentId,
      reminderTime: reminderMinutes,
      message: message,
      isActive: true,
      hasBeenSent: false,
      createdAt: new Date()
    };
    StorageService.addReminder(reminder);
    return reminder;
  }

  static updateAppointmentStatus(id, status) {
    const appointment = this.getAppointmentById(id);
    if (!appointment) {
      throw new Error('Termin nicht gefunden');
    }

    const updatedAppointment = {
      ...appointment,
      status: status,
      updatedAt: new Date()
    };

    StorageService.updateAppointment(updatedAppointment);
    return updatedAppointment;
  }

  static findFreeSlots(date, durationMinutes) {
    const appointments = this.getAppointmentsForDate(date);
    const settings = StorageService.getSettings();
    
    return DateUtils.findFreeSlots(date, durationMinutes, appointments, settings.workingHours);
  }

  static getStatistics() {
    const appointments = this.getAllAppointments();
    const participants = StorageService.getParticipants();

    const stats = {
      totalAppointments: appointments.length,
      appointmentsByType: {
        führung: appointments.filter(apt => apt.type === 'führung').length,
        'vor-ort': appointments.filter(apt => apt.type === 'vor-ort').length
      },
      appointmentsByStatus: {
        geplant: appointments.filter(apt => apt.status === 'geplant').length,
        bestätigt: appointments.filter(apt => apt.status === 'bestätigt').length,
        abgeschlossen: appointments.filter(apt => apt.status === 'abgeschlossen').length,
        abgesagt: appointments.filter(apt => apt.status === 'abgesagt').length
      },
      appointmentsByMonth: {},
      averageParticipants: 0,
      upcomingAppointments: this.getUpcomingAppointments().length
    };

    // Termine nach Monat gruppieren
    appointments.forEach(apt => {
      const month = DateUtils.formatDate(apt.start).substring(3); // MM.YYYY
      stats.appointmentsByMonth[month] = (stats.appointmentsByMonth[month] || 0) + 1;
    });

    // Durchschnittliche Teilnehmerzahl
    if (appointments.length > 0) {
// ...existing code...
      stats.averageParticipants = Math.round((totalParticipants / appointments.length) * 100) / 100;
    }

    return stats;
  }

  static exportAppointments(format = 'json') {
    const appointments = this.getAllAppointments();
    
    if (format === 'csv') {
      return this.exportToCSV(appointments);
    }
    
    return JSON.stringify(appointments, null, 2);
  }

  static exportToCSV(appointments) {
    const headers = ['Titel', 'Beschreibung', 'Start', 'Ende', 'Typ', 'Status', 'Ort', 'Teilnehmer'];
    const rows = appointments.map(apt => [
      apt.title,
      apt.description || '',
      DateUtils.formatDateTime(apt.start),
      DateUtils.formatDateTime(apt.end),
      apt.type,
      apt.status,
      apt.location || '',
      apt.participants.length
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  static duplicateAppointment(id, newDate) {
    const originalAppointment = this.getAppointmentById(id);
    if (!originalAppointment) {
      throw new Error('Termin nicht gefunden');
    }

    const duration = DateUtils.getDuration(originalAppointment.start, originalAppointment.end);
    const newEnd = DateUtils.addMinutes(newDate, duration.minutes);

    const duplicatedAppointment = {
      ...originalAppointment,
      id: uuidv4(),
      title: `${originalAppointment.title} (Kopie)`,
      start: newDate,
      end: newEnd,
      status: 'geplant',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    StorageService.addAppointment(duplicatedAppointment);
    return duplicatedAppointment;
  }
}
