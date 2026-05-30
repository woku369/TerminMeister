// Lokale Datenspeicherung für das Terminplanungsmodul mit Cloud-Sync
import { cloudStorage } from '../services/cloudStorageService';

const STORAGE_KEYS = {
  APPOINTMENTS: 'terminmodul_appointments',
  PARTICIPANTS: 'terminmodul_participants',
  REMINDERS: 'terminmodul_reminders',
  SETTINGS: 'terminmodul_settings',
  TEAM_MEMBERS: 'terminmodul_team_members'
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
      let data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (!data) {
        // Demo-Termine für den Erststart
        const DEMO_APPOINTMENTS = [
          {
            id: 'demo-1',
            title: 'Führung durch den Kräutergarten',
            description: 'Erleben Sie die Vielfalt der Kräuter im Stiftgarten.',
            start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
            end: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
            dauer: 90,
            type: 'führung',
            status: 'bestätigt',
            location: 'Kräutergarten',
            kontaktperson: 'Anna Müller',
            institution: 'Stift Gurk',
            gruppengröße: 12,
            teamMitglied: ['team1'],
            besonderheiten: 'Bitte wetterfeste Kleidung mitbringen.',
            participants: ['p1']
          },
          {
            id: 'demo-2',
            title: 'Vor-Ort Termin: Technik-Check',
            description: 'Technische Überprüfung der Audioanlage im Dom.',
            start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
            end: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
            dauer: 60,
            type: 'vor-ort',
            status: 'geplant',
            location: 'Dom',
            kontaktperson: 'Hans Weber',
            institution: 'Stift Gurk',
            gruppengröße: 3,
            teamMitglied: ['team2'],
            besonderheiten: 'Zugang über Seiteneingang.',
            participants: ['p2']
          }
        ];
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(DEMO_APPOINTMENTS));
        data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      }
      const appointments = JSON.parse(data);
      // Konvertiere Datum-Strings zurück zu Date-Objekten
      return appointments.map((apt) => ({
        ...apt,
        start: new Date(apt.start),
        end: new Date(apt.end),
        createdAt: apt.createdAt ? new Date(apt.createdAt) : new Date(),
        updatedAt: apt.updatedAt ? new Date(apt.updatedAt) : new Date()
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Termine:', error);
      return [];
    }
  }
  static saveAppointments(appointments) {
    try {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
      // Trigger Cloud-Sync nach Speicherung
      this.triggerCloudSync('appointments');
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
      let data = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      if (!data) {
        // Demo-Teilnehmer für den Erststart
        const DEMO_PARTICIPANTS = [
          {
            id: 'p1',
            name: 'Anna Müller',
            email: 'anna.mueller@stift-gurk.at',
            telefon: '+43 123 4567',
            organisation: 'Stift Gurk',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'p2',
            name: 'Hans Weber',
            email: 'hans.weber@stift-gurk.at',
            telefon: '+43 987 6543',
            organisation: 'Stift Gurk',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(DEMO_PARTICIPANTS));
        data = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      }
      const participants = JSON.parse(data);
      return participants.map((p) => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Teilnehmer:', error);
      return [];
    }
  }
  static saveParticipants(participants) {
    try {
      localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
      // Trigger Cloud-Sync nach Speicherung
      this.triggerCloudSync('participants');
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
      // Trigger Cloud-Sync nach Speicherung
      this.triggerCloudSync('reminders');
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
      // Trigger Cloud-Sync nach Speicherung
      this.triggerCloudSync('settings');
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

  // Team Members
  static getTeamMembers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS);
      if (!data) return [];
      
      const members = JSON.parse(data);
      return members.map((member) => ({
        ...member,
        createdAt: new Date(member.createdAt),
        updatedAt: new Date(member.updatedAt)
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Teammitglieder:', error);
      return [];
    }
  }
  static saveTeamMembers(teamMembers) {
    try {
      localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(teamMembers));
      // Trigger Cloud-Sync nach Speicherung
      this.triggerCloudSync('teams');
    } catch (error) {
      console.error('Fehler beim Speichern der Teammitglieder:', error);
      throw error;
    }
  }

  static addTeamMember(member) {
    const members = this.getTeamMembers();
    members.push(member);
    this.saveTeamMembers(members);
  }

  static updateTeamMember(updatedMember) {
    const members = this.getTeamMembers();
    const index = members.findIndex(m => m.id === updatedMember.id);
    if (index !== -1) {
      members[index] = updatedMember;
      this.saveTeamMembers(members);
    }
  }

  static deleteTeamMember(id) {
    const members = this.getTeamMembers();
    const filteredMembers = members.filter(m => m.id !== id);
    this.saveTeamMembers(filteredMembers);
  }

  // Cloud-Sync-Hilfsfunktionen
  static triggerCloudSync(dataType) {
    try {
      if (cloudStorage && typeof cloudStorage.manualSync === 'function') {
        // Verzögerte Synchronisation um Batch-Operationen zu unterstützen
        setTimeout(() => {
          cloudStorage.manualSync();
        }, 100);
      }
    } catch (error) {
      console.warn('Cloud-Sync-Trigger fehlgeschlagen:', error);
    }
  }

  // Sichere Speicherfunktion mit Konfliktbehandlung
  static setItemSafe(key, value, clientId = null) {
    try {
      const timestamp = new Date().toISOString();
      const dataWithMetadata = {
        data: value,
        lastModified: timestamp,
        clientId: clientId || this.getClientId(),
        version: 1
      };
      
      localStorage.setItem(key, JSON.stringify(dataWithMetadata));
      this.triggerCloudSync(key);
      return true;
    } catch (error) {
      console.error('Fehler beim sicheren Speichern:', error);
      return false;
    }
  }

  // Client-ID-Verwaltung für Multi-Client-Synchronisation
  static getClientId() {
    let clientId = localStorage.getItem('client_id');
    if (!clientId) {
      clientId = this.generateClientId();
      localStorage.setItem('client_id', clientId);
    }
    return clientId;
  }

  static generateClientId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `client_${result}_${Date.now()}`;
  }

  // Backup-Funktionen
  static createBackup() {
    const backup = {
      appointments: this.getAppointments(),
      participants: this.getParticipants(),
      reminders: this.getReminders(),
      teamMembers: this.getTeamMembers(),
      settings: this.getSettings(),
      timestamp: new Date().toISOString(),
      clientId: this.getClientId()
    };
    
    const backupKey = `backup_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    return backupKey;
  }

  static restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) return false;
      
      const backup = JSON.parse(backupData);
      
      if (backup.appointments) this.saveAppointments(backup.appointments);
      if (backup.participants) this.saveParticipants(backup.participants);
      if (backup.reminders) this.saveReminders(backup.reminders);
      if (backup.teamMembers) this.saveTeamMembers(backup.teamMembers);
      if (backup.settings) this.saveSettings(backup.settings);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Wiederherstellen des Backups:', error);
      return false;
    }
  }

  // Liste alle verfügbaren Backups
  static getAvailableBackups() {
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('backup_')) {
        try {
          const backupData = JSON.parse(localStorage.getItem(key));
          backups.push({
            key,
            timestamp: backupData.timestamp,
            clientId: backupData.clientId
          });
        } catch (error) {
          console.warn(`Ungültiges Backup gefunden: ${key}`);
        }
      }
    }
    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

// Basis-Storage-Funktionen für einfache Nutzung
export const storageUtils = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      StorageService.triggerCloudSync(key);
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
      StorageService.triggerCloudSync(key);
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
  },

  // Cloud-Sync-spezifische Funktionen
  setItemSafe: (key, value) => {
    return StorageService.setItemSafe(key, value);
  },

  getClientId: () => {
    return StorageService.getClientId();
  }
};

export default StorageService;
