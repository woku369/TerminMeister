// Spezifische Konfiguration für Stift Gurk Kräutergarten-Führungen
export const FUEHRUNG_CONFIG = {
  // Führungs-Zeiten
  DAUER: {
    MIN: 90, // 1,5 Stunden
    MAX: 150, // 2,5 Stunden
    STANDARD: 120 // 2 Stunden
  },
  
  // Zeitplanung
  ZEITEN: {
    ANFAHRT: 45, // Minuten
    VORBEREITUNG: 20, // Minuten
    NACHBEREITUNG: 15, // Minuten
    PUFFER: 30 // Minuten zwischen Führungen
  },
  
  // Team-Konfiguration
  TEAM: {
    AKTUELL: 1,
    GEPLANT: 3,
    ROTATION: true
  },
  
  // Führungs-Stationen
  STATIONEN: [
    {
      id: 'garten',
      name: 'Bio-Kräutergarten',
      beschreibung: 'Herzstück der Produktion - Kräuteranbau und -ernte',
      dauer: 45, // Minuten
      wetterabhängig: true
    },
    {
      id: 'mazeration',
      name: 'Mazerationsraum',
      beschreibung: 'Technische Prozesse, Verkostung von Mazeraten und Destillaten',
      dauer: 45, // Minuten
      wetterabhängig: false
    },
    {
      id: 'shop',
      name: 'Shop & Verkauf',
      beschreibung: 'Detailverkauf, Goodie-Bags, Abschluss',
      dauer: 30, // Minuten
      wetterabhängig: false,
      entfernung: 100 // Meter
    }
  ],
  
  // Wetter-Kriterien
  WETTER: {
    KRITISCH: ['Regen', 'Sturm', 'Gewitter', 'Schnee'],
    BEDINGT: ['Nieselregen', 'Wind'],
    OPTIMAL: ['Sonnig', 'Bewölkt', 'Heiter']
  },
  
  // Arbeitszeiten (auch Wochenende)
  ARBEITSZEITEN: {
    MONTAG: { start: '09:00', end: '17:00' },
    DIENSTAG: { start: '09:00', end: '17:00' },
    MITTWOCH: { start: '09:00', end: '17:00' },
    DONNERSTAG: { start: '09:00', end: '17:00' },
    FREITAG: { start: '09:00', end: '17:00' },
    SAMSTAG: { start: '10:00', end: '16:00' },
    SONNTAG: { start: '10:00', end: '16:00' }
  },
  
  // Buchungsprozess
  BUCHUNG: {
    OFFICE_STANDORT: 'Wien',
    BESTAETIGUNG_ERFORDERLICH: true,
    VORLAUFZEIT_TAGE: 3,
    STORNIERUNG_STUNDEN: 24
  }
};

// Farbschema basierend auf dem Kloster-Garten-Bild
export const KLOSTER_THEME = {
  primary: {
    main: '#8B4513', // Warmes Braun der Klostergebäude
    light: '#A0522D',
    dark: '#654321',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#228B22', // Sattes Grün des Gartens
    light: '#32CD32',
    dark: '#006400',
    contrastText: '#FFFFFF'
  },
  tertiary: {
    main: '#DAA520', // Goldgelb der Kirchturmkuppeln
    light: '#FFD700',
    dark: '#B8860B',
    contrastText: '#000000'
  },
  background: {
    default: '#FDF5E6', // Warmes Pergament-Weiß
    paper: '#FFFFFF',
    garden: '#F0F8E8', // Helles Gartengrün
    monastery: '#F5F5DC' // Beige der Klosterwände
  },  text: {
    primary: '#1A1A1A', // Dunkleres Schwarz für besseren Kontrast
    secondary: '#3A3A3A', // Dunkleres Grau für bessere Lesbarkeit
    accent: '#8B4513',
    disabled: '#999999', // Für disabled Zustände
    onPrimary: '#FFFFFF', // Weiß auf braunem Hintergrund
    onSecondary: '#FFFFFF' // Weiß auf grünem Hintergrund
  },
  divider: '#D2B48C', // Sandfarbener Divider
  success: {
    main: '#228B22',
    light: '#90EE90',
    dark: '#006400'
  },
  warning: {
    main: '#FF8C00',
    light: '#FFA500',
    dark: '#FF6400'
  },
  error: {
    main: '#CD5C5C',
    light: '#F08080',
    dark: '#B22222'
  },
  info: {
    main: '#4682B4',
    light: '#87CEEB',
    dark: '#2F4F4F'
  }
};

// Checklisten-Vorlagen (Optimiert für praktische Nutzung)
export const CHECKLISTEN = {
  VOR_FUEHRUNG: [
    { id: 'wetter_check', text: 'Aktuelle Wetterprognose prüfen', kategorie: 'Vorbereitung' },
    { id: 'material_check', text: 'Führungs-Material vollständig (Informationsblätter, Verkostungsutensilien)', kategorie: 'Material' },
    { id: 'garten_zustand', text: 'Gartenzustand prüfen (Wege, Pflanzen, Sicherheit)', kategorie: 'Standort' },
    { id: 'mazeration_vorbereitung', text: 'Mazerationsraum vorbereitet (Verkostungsproben, Reinigung)', kategorie: 'Standort' },
    { id: 'shop_vorbereitung', text: 'Shop-Bereich vorbereitet (Waren, Goodie-Bags, Kasse)', kategorie: 'Standort' },
    { id: 'teilnehmer_info', text: 'Teilnehmer-Informationen durchgehen (Anzahl, Besonderheiten)', kategorie: 'Organisation' },
    { id: 'anfahrt_zeit', text: 'Anfahrtszeit kalkuliert (45 Min + Puffer)', kategorie: 'Logistik' },
    { id: 'backup_plan', text: 'Schlechtwetter-Plan vorbereitet (Indoor-Alternativen)', kategorie: 'Sicherheit' },
    { id: 'kontakt_check', text: 'Erreichbarkeit für Teilnehmer sichergestellt', kategorie: 'Kommunikation' }
  ],
  
  // WÄHREND_FÜHRUNG wurde entfernt - unpraktisch während der Führung
  
  NACH_FUEHRUNG: [
    { id: 'teilnehmer_zufriedenheit', text: 'Teilnehmer-Zufriedenheit einschätzen', kategorie: 'Feedback' },
    { id: 'besondere_ereignisse', text: 'Besondere Ereignisse notieren (positiv/negativ)', kategorie: 'Dokumentation' },
    { id: 'material_vollständig', text: 'Material vollständig und sauber verstaut', kategorie: 'Nachbereitung' },
    { id: 'verkauf_dokumentieren', text: 'Shop-Verkäufe dokumentieren', kategorie: 'Administration' },
    { id: 'zeitplan_bewertung', text: 'Zeitplan-Einhaltung bewerten (zu lang/kurz?)', kategorie: 'Planung' },
    { id: 'wetter_auswirkungen', text: 'Wetter-Auswirkungen auf Führung notieren', kategorie: 'Dokumentation' },
    { id: 'verbesserungsideen', text: 'Ideen für Verbesserungen festhalten', kategorie: 'Optimierung' },
    { id: 'naechste_vorbereitung', text: 'Material für nächste Führung prüfen', kategorie: 'Vorbereitung' }
  ],
  
  // Neue Kategorie: Führungs-Qualitätskontrolle (Post-Event)
  QUALITAETS_CHECK: [
    { id: 'alle_stationen_besucht', text: 'Alle geplanten Stationen wurden besucht', kategorie: 'Vollständigkeit' },
    { id: 'zeitrahmen_eingehalten', text: 'Zeitrahmen eingehalten (90-150 Min)', kategorie: 'Timing' },
    { id: 'sicherheit_gewährleistet', text: 'Keine Sicherheitsprobleme aufgetreten', kategorie: 'Sicherheit' },
    { id: 'wetter_angepasst', text: 'Führung an Wetterbedingungen angepasst', kategorie: 'Flexibilität' },
    { id: 'teilnehmer_engagement', text: 'Teilnehmer waren engagiert und interessiert', kategorie: 'Interaktion' },
    { id: 'verkostung_erfolgreich', text: 'Verkostung im Mazerationsraum erfolgreich', kategorie: 'Highlights' }
  ]
};

export default { FUEHRUNG_CONFIG, KLOSTER_THEME, CHECKLISTEN };
