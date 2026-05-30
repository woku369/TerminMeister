// Lokale Datenspeicherung für das Terminplanungsmodul

const STORAGE_KEYS = {
  APPOINTMENTS: 'terminmodul_appointments',
  PARTICIPANTS: 'terminmodul_participants',
  REMINDERS: 'terminmodul_reminders',
  SETTINGS: 'terminmodul_settings'
};

// Default Settings
const DEFAULT_SETTINGS = {
  defaultReminderTime: 30, // 30 Minuten vor Termin
  defaultAppointmentDuration: 60, // 60 Minuten
  workingHours: {
    start: '08:00',
    end: '18:00'
  },
  workingDays: [1, 2, 3, 4, 5], // Montag bis Freitag
  theme: 'auto',
  language: 'de'
};

// Storage Utility Klasse
export class StorageService {
  // Appointments
  static getAppointments() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (!data) return [];
      
      const appointments = JSON.parse(data);
      // Konvertiere Datum-Strings zurück zu Date-Objekten
      return appointments.map((apt) => ({
        ...apt,
        start: new Date(apt.start),
        end: new Date(apt.end),
        createdAt: new Date(apt.createdAt),
        updatedAt: new Date(apt.updatedAt)
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Termine:', error);
      return [];
    }
  }

  static saveAppointments(appointments) {
    try {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    } catch (error) {
      console.error('Fehler beim Speichern der Termine:', error);
    }
  }

  static addAppointment(appointment) {
    const appointments = this.getAppointments();
    appointments.push(appointment);
    this.saveAppointments(appointments);
  }

  static updateAppointment(updatedAppointment) {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(apt => apt.id === updatedAppointment.id);
    if (index !== -1) {
      appointments[index] = updatedAppointment;
      this.saveAppointments(appointments);
    }
  }

  static deleteAppointment(id) {
    const appointments = this.getAppointments();
    const filtered = appointments.filter(apt => apt.id !== id);
    this.saveAppointments(filtered);
  }

  // Participants
  static getParticipants() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      if (!data) return [];
      
      const participants = JSON.parse(data);
      return participants.map((p) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Teilnehmer:', error);
      return [];
    }
  }

  static saveParticipants(participants) {
    try {
      localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
    } catch (error) {
      console.error('Fehler beim Speichern der Teilnehmer:', error);
    }
  }

  static addParticipant(participant) {
    const participants = this.getParticipants();
    participants.push(participant);
    this.saveParticipants(participants);
  }

  static updateParticipant(updatedParticipant) {
    const participants = this.getParticipants();
    const index = participants.findIndex(p => p.id === updatedParticipant.id);
    if (index !== -1) {
      participants[index] = updatedParticipant;
      this.saveParticipants(participants);
    }
  }

  static deleteParticipant(id) {
    const participants = this.getParticipants();
    const filtered = participants.filter(p => p.id !== id);
    this.saveParticipants(filtered);
  }

  // Reminders
  static getReminders() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (!data) return [];
      
      const reminders = JSON.parse(data);
      return reminders.map((r) => ({
        ...r,
        time: new Date(r.time),
        createdAt: new Date(r.createdAt)
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Erinnerungen:', error);
      return [];
    }
  }

  static saveReminders(reminders) {
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    } catch (error) {
      console.error('Fehler beim Speichern der Erinnerungen:', error);
    }
  }

  static addReminder(reminder) {
    const reminders = this.getReminders();
    reminders.push(reminder);
    this.saveReminders(reminders);
  }

  static updateReminder(updatedReminder) {
    const reminders = this.getReminders();
    const index = reminders.findIndex(r => r.id === updatedReminder.id);
    if (index !== -1) {
      reminders[index] = updatedReminder;
      this.saveReminders(reminders);
    }
  }

  static deleteReminder(id) {
    const reminders = this.getReminders();
    const filtered = reminders.filter(r => r.id !== id);
    this.saveReminders(filtered);
  }

  // Settings
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      
      const settings = JSON.parse(data);
      // Merge mit Default-Settings für fehlende Werte
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
    }
  }

  // Data Export/Import
  static exportData() {
    const data = {
      appointments: this.getAppointments(),
      participants: this.getParticipants(),
      reminders: this.getReminders(),
      settings: this.getSettings(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.appointments) this.saveAppointments(data.appointments);
      if (data.participants) this.saveParticipants(data.participants);
      if (data.reminders) this.saveReminders(data.reminders);
      if (data.settings) this.saveSettings(data.settings);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Importieren der Daten:', error);
      return false;
    }
  }

  // Utility-Methoden
  static clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
    localStorage.removeItem(STORAGE_KEYS.PARTICIPANTS);
    localStorage.removeItem(STORAGE_KEYS.REMINDERS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }

  static getStorageInfo() {
    try {
      const appointments = this.getAppointments();
      const participants = this.getParticipants();
      const reminders = this.getReminders();
      
      return {
        appointmentCount: appointments.length,
        participantCount: participants.length,
        reminderCount: reminders.length,
        storageSize: this.getStorageSize()
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Storage-Informationen:', error);
      return {
        appointmentCount: 0,
        participantCount: 0,
        reminderCount: 0,
        storageSize: 0
      };
    }
  }

  static getStorageSize() {
    let totalSize = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length;
      }
    });
    return Math.round(totalSize / 1024 * 100) / 100; // KB
  }
}

// Basis-Storage-Funktionen für einfache Nutzung
export const storageUtils = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  },

  getItem: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      return null;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Fehler beim Löschen aller Daten:', error);
    }
  }
};

export default StorageService;
