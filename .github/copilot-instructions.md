# Copilot-Anweisungen für Terminplanungsmodul

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Projektübersicht
Dies ist ein React-basiertes Terminplanungsmodul für Führungen und Vor-Ort-Termine, das in eine bestehende Electron-App integriert werden soll.

## Technischer Stack
- **Frontend**: React mit Vite
- **UI-Framework**: Material-UI (@mui/material)
- **Kalender**: react-big-calendar
- **Datums-Utilities**: dayjs und date-fns
- **Icons**: @mui/icons-material
- **Zielplattform**: Electron App Integration

## Kernfunktionen
1. **Terminverwaltung**: Erstellen, bearbeiten, löschen von Führungen und Vor-Ort-Terminen
2. **Kalenderansicht**: Monats-, Wochen- und Tagesansicht
3. **Teilnehmerverwaltung**: Kontakte und Teilnehmerlisten verwalten
4. **Erinnerungssystem**: Automatische Benachrichtigungen vor Terminen
5. **Reporting**: Statistiken und Berichte über Termine
6. **MS Teams Integration**: Import/Sync von Teams-Terminen (geplant)
7. **Google Calendar Sync**: Optional als Backup (geplant)

## Code-Standards
- Verwende funktionale React-Komponenten mit Hooks
- Implementiere TypeScript für bessere Typsicherheit
- Nutze Material-UI-Komponenten für konsistentes Design
- Strukturiere Code in modulare, wiederverwendbare Komponenten
- Verwende Local Storage für Datenpersistierung
- Implementiere responsive Design für verschiedene Bildschirmgrößen

## Datenmodell
- **Termine**: ID, Titel, Beschreibung, Datum/Zeit, Dauer, Typ (Führung/Vor-Ort), Status, Teilnehmer
- **Teilnehmer**: ID, Name, E-Mail, Telefon, Organisation
- **Erinnerungen**: ID, Termin-ID, Zeit vor Termin, Status

## Projektstruktur
```
src/
├── components/
│   ├── Calendar/          # Kalenderansichten
│   ├── AppointmentForm/    # Terminformulare
│   ├── ParticipantManager/ # Teilnehmerverwaltung
│   ├── Reminders/          # Erinnerungssystem
│   ├── Reports/            # Reporting-Dashboard
│   └── common/             # Wiederverwendbare Komponenten
├── services/
│   ├── appointmentService.js
│   ├── participantService.js
│   └── reminderService.js
├── utils/
│   ├── dateUtils.js
│   └── storage.js
└── types/
    └── index.ts
```

## Spezielle Anforderungen
- Das Modul soll als eigenständige Komponente exportierbar sein
- Alle Daten sollen lokal gespeichert werden (LocalStorage/IndexedDB)
- UI soll modern und benutzerfreundlich sein
- Deutsche Lokalisierung für alle Texte
- Responsive Design für Desktop-Nutzung optimiert
