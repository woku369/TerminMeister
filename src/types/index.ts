// TypeScript-Definitionen für das Terminplanungsmodul

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'führung' | 'vor-ort';
  status: 'geplant' | 'bestätigt' | 'abgeschlossen' | 'abgesagt';
  participants: string[]; // Array von Participant IDs
  location?: string;
  reminder?: Reminder;
  createdAt: Date;
  updatedAt: Date;
  // Nachbereitung (nach Abschluss)
  tatsaechlicherBesuch?: number;
  eintrittsgeldBrutto?: number;
  warenverkaufBrutto?: number;
  nachtraeglicheAnmerkungen?: string;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  position?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  appointmentId: string;
  reminderTime: number; // Minuten vor dem Termin
  message?: string;
  isActive: boolean;
  hasBeenSent: boolean;
  createdAt: Date;
}

export interface ReportData {
  totalAppointments: number;
  appointmentsByType: {
    führung: number;
    'vor-ort': number;
  };
  appointmentsByStatus: {
    geplant: number;
    bestätigt: number;
    abgeschlossen: number;
    abgesagt: number;
  };
  appointmentsByMonth: {
    [key: string]: number;
  };
  averageParticipants: number;
  upcomingAppointments: number;
}

export interface CalendarView {
  view: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
}

export interface FilterOptions {
  type?: 'führung' | 'vor-ort' | 'all';
  status?: 'geplant' | 'bestätigt' | 'abgeschlossen' | 'abgesagt' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
  participant?: string;
}

export interface AppointmentFormData {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'führung' | 'vor-ort';
  location?: string;
  participants: string[];
  reminderTime?: number;
}

export interface ModuleSettings {
  defaultReminderTime: number; // Minuten
  defaultAppointmentDuration: number; // Minuten
  workingHours: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  workingDays: number[]; // 0 = Sonntag, 1 = Montag, etc.
  theme: 'light' | 'dark' | 'auto';
  language: 'de' | 'en';
}

export interface ModuleState {
  appointments: Appointment[];
  participants: Participant[];
  reminders: Reminder[];
  settings: ModuleSettings;
  selectedDate: Date;
  currentView: CalendarView['view'];
  filters: FilterOptions;
  loading: boolean;
  error?: string;
}
