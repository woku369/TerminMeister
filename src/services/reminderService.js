// Service für Erinnerungssystem
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../utils/storage.js';
import { DateUtils } from '../utils/dateUtils.js';

export class ReminderService {
  static getAllReminders() {
    return StorageService.getReminders();
  }

  static getReminderById(id) {
    const reminders = this.getAllReminders();
    return reminders.find(r => r.id === id);
  }

  static createReminder(reminderData) {
    const reminder = {
      id: uuidv4(),
      appointmentId: reminderData.appointmentId,
      reminderTime: reminderData.reminderTime, // Minuten vor Termin
      message: reminderData.message || '',
      isActive: true,
      hasBeenSent: false,
      createdAt: new Date()
    };

    StorageService.addReminder(reminder);
    return reminder;
  }

  static updateReminder(id, updates) {
    const reminder = this.getReminderById(id);
    if (!reminder) {
      throw new Error('Erinnerung nicht gefunden');
    }

    const updatedReminder = {
      ...reminder,
      ...updates
    };

    StorageService.updateReminder(updatedReminder);
    return updatedReminder;
  }

  static deleteReminder(id) {
    const reminder = this.getReminderById(id);
    if (!reminder) {
      throw new Error('Erinnerung nicht gefunden');
    }

    StorageService.deleteReminder(id);
    return true;
  }

  static getRemindersByAppointment(appointmentId) {
    const reminders = this.getAllReminders();
    return reminders.filter(r => r.appointmentId === appointmentId);
  }

  static getActiveReminders() {
    const reminders = this.getAllReminders();
    return reminders.filter(r => r.isActive && !r.hasBeenSent);
  }

  static getDueReminders() {
    const activeReminders = this.getActiveReminders();
    const appointments = StorageService.getAppointments();
    const now = new Date();

    const dueReminders = [];

    activeReminders.forEach(reminder => {
      const appointment = appointments.find(apt => apt.id === reminder.appointmentId);
      if (!appointment) return;

      const reminderTime = DateUtils.getReminderTime(appointment.start, reminder.reminderTime);
      
      if (DateUtils.isBefore(reminderTime, now) || DateUtils.isSameDay(reminderTime, now)) {
        dueReminders.push({
          ...reminder,
          appointment: appointment,
          reminderTime: reminderTime
        });
      }
    });

    return dueReminders.sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime());
  }

  static getUpcomingReminders(hours = 24) {
    const activeReminders = this.getActiveReminders();
    const appointments = StorageService.getAppointments();
    const now = new Date();
    const futureTime = DateUtils.addHours(now, hours);

    const upcomingReminders = [];

    activeReminders.forEach(reminder => {
      const appointment = appointments.find(apt => apt.id === reminder.appointmentId);
      if (!appointment) return;

      const reminderTime = DateUtils.getReminderTime(appointment.start, reminder.reminderTime);
      
      if (DateUtils.isBetween(reminderTime, now, futureTime)) {
        upcomingReminders.push({
          ...reminder,
          appointment: appointment,
          reminderTime: reminderTime,
          timeUntilReminder: DateUtils.getDuration(now, reminderTime)
        });
      }
    });

    return upcomingReminders.sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime());
  }

  static markReminderAsSent(id) {
    const reminder = this.getReminderById(id);
    if (!reminder) {
      throw new Error('Erinnerung nicht gefunden');
    }

    const updatedReminder = {
      ...reminder,
      hasBeenSent: true
    };

    StorageService.updateReminder(updatedReminder);
    return updatedReminder;
  }

  static activateReminder(id) {
    return this.updateReminder(id, { isActive: true });
  }

  static deactivateReminder(id) {
    return this.updateReminder(id, { isActive: false });
  }

  static createDefaultReminders(appointmentId, settings) {
    const reminders = [];
    
    // Standard-Erinnerungszeiten basierend auf Einstellungen
    const defaultTimes = [
      settings.defaultReminderTime, // z.B. 30 Minuten
      settings.defaultReminderTime * 24, // z.B. 12 Stunden (720 Minuten)
      settings.defaultReminderTime * 48 // z.B. 24 Stunden (1440 Minuten)
    ];

    defaultTimes.forEach(time => {
      try {
        const reminder = this.createReminder({
          appointmentId: appointmentId,
          reminderTime: time,
          message: this.getDefaultReminderMessage(time)
        });
        reminders.push(reminder);
      } catch (error) {
        console.warn('Fehler beim Erstellen der Standard-Erinnerung:', error);
      }
    });

    return reminders;
  }

  static getDefaultReminderMessage(minutes) {
    if (minutes < 60) {
      return `Erinnerung: Ihr Termin beginnt in ${minutes} Minuten.`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `Erinnerung: Ihr Termin beginnt in ${hours} Stunde(n).`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `Erinnerung: Ihr Termin findet in ${days} Tag(en) statt.`;
    }
  }

  static processReminders() {
    const dueReminders = this.getDueReminders();
    const processedReminders = [];
    const failedReminders = [];

    dueReminders.forEach(reminder => {
      try {
        // Hier würde normalerweise die tatsächliche Benachrichtigung gesendet
        // z.B. E-Mail, Push-Notification, etc.
        this.sendReminderNotification(reminder);
        
        // Markiere als gesendet
        this.markReminderAsSent(reminder.id);
        processedReminders.push(reminder);
      } catch (error) {
        console.error('Fehler beim Senden der Erinnerung:', error);
        failedReminders.push({
          reminder: reminder,
          error: error.message
        });
      }
    });

    return {
      processed: processedReminders,
      failed: failedReminders,
      total: processedReminders.length
    };
  }

  static sendReminderNotification(reminderData) {
    // Mock-Implementierung für Benachrichtigungen
    // In einer echten Implementierung würde hier eine E-Mail, 
    // Push-Notification oder andere Benachrichtigung gesendet
    
    const { reminder, appointment } = reminderData;
    const message = reminder.message || this.getDefaultReminderMessage(reminder.reminderTime);
    
    console.log(`📅 Erinnerung: ${appointment.title}`);
    console.log(`⏰ Zeit: ${DateUtils.formatDateTime(appointment.start)}`);
    console.log(`📝 ${message}`);
    
    // Für eine Electron-App könnten hier native Notifications verwendet werden:
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Termin-Erinnerung: ${appointment.title}`, {
          body: `${message}\nZeit: ${DateUtils.formatDateTime(appointment.start)}`,
          icon: '/favicon.ico' // Optional: Icon für die Benachrichtigung
        });
      }
    }
    
    return true;
  }

  static requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        return Notification.requestPermission();
      }
    }
    return Promise.resolve(Notification.permission);
  }

  static getReminderStatistics() {
    const reminders = this.getAllReminders();
    const appointments = StorageService.getAppointments();

    const stats = {
      totalReminders: reminders.length,
      activeReminders: reminders.filter(r => r.isActive).length,
      sentReminders: reminders.filter(r => r.hasBeenSent).length,
      pendingReminders: reminders.filter(r => r.isActive && !r.hasBeenSent).length,
      remindersByTime: {},
      appointmentsWithReminders: 0,
      appointmentsWithoutReminders: 0
    };

    // Erinnerungen nach Zeit gruppieren
    reminders.forEach(reminder => {
      const timeKey = reminder.reminderTime < 60 
        ? `${reminder.reminderTime}min` 
        : reminder.reminderTime < 1440 
          ? `${Math.floor(reminder.reminderTime / 60)}h`
          : `${Math.floor(reminder.reminderTime / 1440)}d`;
      
      stats.remindersByTime[timeKey] = (stats.remindersByTime[timeKey] || 0) + 1;
    });

    // Termine mit/ohne Erinnerungen
    appointments.forEach(appointment => {
      const hasReminders = reminders.some(r => r.appointmentId === appointment.id);
      if (hasReminders) {
        stats.appointmentsWithReminders++;
      } else {
        stats.appointmentsWithoutReminders++;
      }
    });

    return stats;
  }

  static bulkCreateReminders(appointmentIds, reminderTime, message = '') {
    const created = [];
    const errors = [];

    appointmentIds.forEach(appointmentId => {
      try {
        const reminder = this.createReminder({
          appointmentId: appointmentId,
          reminderTime: reminderTime,
          message: message
        });
        created.push(reminder);
      } catch (error) {
        errors.push({
          appointmentId: appointmentId,
          error: error.message
        });
      }
    });

    return {
      created: created,
      errors: errors,
      total: created.length
    };
  }

  static bulkDeleteReminders(reminderIds) {
    const deleted = [];
    const errors = [];

    reminderIds.forEach(id => {
      try {
        this.deleteReminder(id);
        deleted.push(id);
      } catch (error) {
        errors.push({
          reminderId: id,
          error: error.message
        });
      }
    });

    return {
      deleted: deleted,
      errors: errors,
      total: deleted.length
    };
  }

  static scheduleReminderCheck() {
    // Führe alle 5 Minuten eine Überprüfung durch
    setInterval(() => {
      try {
        this.processReminders();
      } catch (error) {
        console.error('Fehler beim Verarbeiten der Erinnerungen:', error);
      }
    }, 5 * 60 * 1000); // 5 Minuten in Millisekunden
  }

  static snoozeReminder(id, snoozeMinutes = 10) {
    const reminder = this.getReminderById(id);
    if (!reminder) {
      throw new Error('Erinnerung nicht gefunden');
    }

    // Erstelle eine neue Erinnerung mit verschobener Zeit
    const newReminder = {
      ...reminder,
      id: uuidv4(),
      reminderTime: reminder.reminderTime - snoozeMinutes,
      hasBeenSent: false,
      message: reminder.message || `Snooze-Erinnerung (${snoozeMinutes} Min.)`
    };

    StorageService.addReminder(newReminder);
    
    // Deaktiviere die ursprüngliche Erinnerung
    this.deactivateReminder(id);

    return newReminder;
  }
}
