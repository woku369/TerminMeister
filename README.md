# TerminMeister – Führungsverwaltung Stift Gurk

**Repository:** [github.com/woku369/TerminMeister](https://github.com/woku369/TerminMeister)  
Terminplanungs- und Verwaltungssystem für Kräutergarten-Führungen am Stift Gurk (Kärnten).

---

## Systemarchitektur & Datensynchronisation

```
┌──────────────────────────────────────────────────────────────────┐
│  Desktop-App (Windows)                                           │
│  TerminMeister 1.0.0.exe (Electron + React)                      │
│  Primärspeicher: localStorage (terminmodul_appointments etc.)    │
│                                                                  │
│  SYNC: NasSyncWidget → REST API (Port 3005, Tailscale/LAN)      │
│        [manuell ausgelöst oder bei erstem Start ohne lokale Dat.] │
└────────────────────┬─────────────────────────────────────────────┘
                     │ REST API GET/POST (Port 3005)
                     │ http://100.121.103.107:3005/api/sync
                     │ (Tailscale) oder http://192.168.0.9:3005
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Synology DS124 – NAS                                            │
│  Tailscale: 100.121.103.107   LAN: 192.168.0.9                   │
│  SSH: ssh Wolfgang@192.168.0.9                                   │
│                                                                  │
│  Zentrale JSON-Datenbank:                                        │
│  /volume1/Gurktaler/terminmeister/database/                      │
│    ├── appointments.json                                         │
│    ├── participants.json                                         │
│    ├── reminders.json                                            │
│    ├── teams.json                                                │
│    └── settings.json                                             │
│                                                                  │
│  REST API Server (server.js, Port 3005):                         │
│  node /volume1/Gurktaler/terminmeister/server.js                 │
│  → gemeinsame Datenbasis für Desktop-Sync + Mobile PWA           │
└────────────────────┬─────────────────────────────────────────────┘
                     │ REST API GET/POST (Port 3005)
                     │ http://100.121.103.107:3005
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Mobile PWA (Browser, Smartphone/Tablet)                         │
│  http://100.121.103.107:3005/                                    │
│  Zugang nur via Tailscale VPN                                    │
│  Auto-Polling alle 15 Sekunden                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Wie die Synchronisation funktioniert

**Desktop → NAS:**
- Die Desktop-App arbeitet primär mit **localStorage** (kein direkter Netzzugriff nötig).
- Im `NasSyncWidget` (Sidebar) gibt es zwei Buttons: **Download** (NAS → localStorage) und **Upload** (localStorage → NAS).
- Beim ersten Start ohne lokale Daten läuft ein automatischer Download vom NAS.
- Sync läuft über dieselbe REST-API wie die Mobile PWA: `GET/POST http://<nasUrl>/api/sync`.

**Mobile PWA → NAS:**
- Die PWA schreibt und liest **direkt** über die REST-API des NAS-Servers (Port 3005).
- Kein localStorage, kein Zwischenspeicher — jede Aktion schreibt sofort auf den NAS.
- Alle 15 Sekunden wird automatisch ein `GET /api/sync` ausgelöst; bei Änderungen wird die Ansicht aktualisiert.

**Konfliktauflösung:**
- Der NAS-Server schützt via `safeWriteJson`: ein leeres Array überschreibt **niemals** vorhandene Daten. Bei >50% Datenverlust erscheint eine Warnung im Log.
- Die Desktop-App löst Konflikte per Timestamp (`updatedAt`): das neuere Objekt gewinnt (Merge über alle IDs).
- Vor jedem Schreibvorgang auf dem NAS wird ein inkrementelles Backup angelegt (`backups/incremental_*/`).

**Wichtig — Nicht verwechseln:**
- `cloudStorageService.js` und `electronCloudStorageService.js` im Electron-Projekt sind **OneDrive-basierter Legacy-Code** und werden für die NAS-Synchronisation **nicht verwendet**. Der aktive Sync läuft über `nasStorageService.js`.

---

## NAS Server

**Speicherort:** `\\DS124-RockingK\Gurktaler\terminmeister\server.js`  
**Auf dem NAS:** `/volume1/Gurktaler/terminmeister/server.js`

### Server starten / stoppen / neustarten
```bash
# Per SSH (LAN oder Tailscale):
ssh Wolfgang@192.168.0.9
ssh Wolfgang@100.121.103.107

# Neustart (empfohlen nach PWA-Updates):
sh /volume1/Gurktaler/terminmeister/restart.sh

# Manuell via Init-Script:
sh /volume1/Gurktaler/terminmeister/terminmeister.sh start
sh /volume1/Gurktaler/terminmeister/terminmeister.sh stop
sh /volume1/Gurktaler/terminmeister/terminmeister.sh restart

# Log beobachten:
tail -f /volume1/Gurktaler/terminmeister/logs/server.log
```

### PWA-Update auf den NAS aufspielen
Da der laufende Prozess `index.html` sperrt, gilt folgendes Vorgehen:
1. Neue `index.html` als `index.html.tmp` in `\\DS124-RockingK\Gurktaler\terminmeister\public\` speichern
2. `restart.sh` ausführen → wendet `*.tmp`-Dateien automatisch an und startet den Server neu

### Erreichbarkeit
| Zugang | URL |
|--------|-----|
| Tailscale (mobil/extern) | `http://100.121.103.107:3005` |
| LAN | `http://192.168.0.9:3005` |
| Health-Check | `http://100.121.103.107:3005/api/health` |

### API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/api/health` | Serverstatus, Uptime, Memory (kein Auth) |
| `GET` | `/api/sync` | Alle 5 Datenbankdateien auf einmal laden |
| `POST` | `/api/sync` | Alle 5 Dateien auf einmal schreiben |
| `GET` | `/api/data?file=appointments.json` | Einzelne Datei laden |
| `POST` | `/api/data?file=appointments.json` | Einzelne Datei schreiben (mit Datenverlustschutz) |
| `DELETE` | `/api/item?file=appointments.json&id=xxx` | Einzelnen Eintrag löschen (mit Backup) |
| `GET` | `/api/completed-today?date=2026-05-31` | Abgeschlossene Termine des Tages (für Zeiterfassung) |
| `GET` | `/api/backups` | Liste der letzten 20 Backups |
| `GET` | `/` | Mobile PWA (index.html) |

### NAS-Verzeichnisstruktur
```
/volume1/Gurktaler/terminmeister/
├── database/
│   ├── appointments.json    ← gemeinsame Datenbasis für Desktop + Mobile
│   ├── participants.json
│   ├── reminders.json
│   ├── teams.json
│   └── settings.json
├── backups/
│   ├── incremental_2026-05-31T.../   ← automatisch vor jedem Schreibvorgang
│   └── deleted_2026-05-31T.../       ← automatisch bei jedem Delete
├── public/
│   ├── index.html           ← Mobile PWA (aktualisieren: als .tmp hochladen + restart)
│   ├── sw.js                ← Service Worker (SW_VERSION hochzählen bei Updates!)
│   ├── manifest.json        ← PWA-Manifest
│   └── fonts/, icons...
├── logs/
│   └── server.log
├── server.js                ← API-Server (kein npm install nötig, reines Node.js)
├── restart.sh               ← Schnellneustart + auto-apply *.tmp Updates
└── terminmeister.sh         ← Init-Script: start|stop|restart
```

### Authentifizierung
Optional per `x-api-key` Header (Umgebungsvariable `API_KEY`). Wenn nicht gesetzt, ist der Server offen — akzeptabel, da nur über Tailscale erreichbar.

---

## Mobile PWA

**URL:** `http://100.121.103.107:3005` (nur via Tailscale)  
Am Smartphone: Browser öffnen → URL eingeben → "Zum Homescreen hinzufügen" → installiert als App.

### Tabs und Funktionen

| Tab | Funktion |
|-----|----------|
| **Heute** | Heutige Führungen, sortiert nach Uhrzeit |
| **Alle Termine** | Vollständige Liste mit Datumsfilter |
| **Neuer Termin** | Termin anlegen (sofort auf NAS gespeichert) |
| **Team** | Lesezugriff auf teams.json; Pflege erfolgt in der Desktop-App |
| **Statistik** | Monatliche Auswertung: Termine, Teilnehmer, Umsatz, tatsächliche Besucher |

### Termin bearbeiten (Bearbeitungsdialog)
- Alle Felder: Titel, Datum, **Uhrzeit, Dauer** (kein Reset-Bug), Teilnehmer, Typ, Status, Gruppe, Kontakt, Beschreibung
- **Nachbereitung** (klappt automatisch auf wenn Status = "Abgeschlossen"):
  - Angemeldet (automatisch aus participantCount, schreibgeschützt)
  - Tatsächlich erschienen (editierbar)
  - Eintrittsgeld brutto € (editierbar)
  - Warenverkauf brutto € (editierbar)
  - Gesamtumsatz (automatisch berechnet)
  - Interne Anmerkungen (Freitext)
- **Änderungen in der PWA sind sofort auf dem NAS** → nach manuellem NAS-Sync in der Desktop-App sichtbar

### PWA-Update-Zyklus
```
Änderung an index.html lokal vornehmen
    → als index.html.tmp auf NAS hochladen
    → ssh Wolfgang@192.168.0.9
    → sh /volume1/Gurktaler/terminmeister/restart.sh
    → sw.js: SW_VERSION hochzählen (damit Browser-Cache invalidiert wird)
```

---

## Desktop-App (Electron)

### Starten (Entwicklung)
```bash
cd fuehrungen-modul
npm install
npm run dev          # Vite Dev-Server → http://localhost:5173
```

### Build (portable EXE)
```bash
npm run build-portable
# Ausgabe: dist_electron\TerminMeister 1.0.0.exe  (~92 MB, kein Installer nötig)
```

### Features
- **Kalenderansicht** (Monat/Woche/Tag, react-big-calendar)
- **Terminverwaltung**: Erstellen, Bearbeiten, Stornieren, Abschließen
- Kein Uhrzeit-Reset-Bug beim Bearbeiten (seit 2026-05-31 gefixt via `useRef formInitialized`)
- Zeitenbearbeitung auch bei Status "abgeschlossen" möglich (Bussverspätung, komprimierte Führung)
- **Nachbereitung-Tab** bei abgeschlossenen Terminen: tatsächliche Besucherzahl, Eintrittsgeld €, Warenverkauf €, Anmerkungen
- **Teilnehmerverwaltung** pro Termin
- **Team-Management**: Zuweisung von Führungspersonen
- **Checklisten**: Vor/Während/Nach der Führung
- **Erinnerungen**: Zeitbasierte Benachrichtigungen
- **Wetterwidget**: Prognose für Terminplanung
- **Reporting & Statistik**: Auslastung, Gesamtumsatz (Eintritt + Shop), Besucherzahlen
- **NAS-Sync Widget** (Sidebar): manueller Upload/Download via WebDAV

### NAS-Verbindung konfigurieren (Einstellungen der Desktop-App)

| Feld | Wert |
|------|------|
| QuickConnect-ID | `diwkaon` |
| WebDAV-Pfad | `/webdav/Gurktaler/terminmeister/database` |
| Port | `5006` (HTTPS) |
| Benutzername / Passwort | NAS-Anmeldedaten |

### Tech-Stack
```
Electron  33.4.11
React     19
Vite      4.5        (build-portable: npm run build-portable)
MUI       v7 (Material-UI)
dayjs     Datum/Zeit
react-big-calendar   Kalender
localStorage         Primärspeicher (terminmodul_appointments etc.)
nasStorageService    WebDAV-Sync mit NAS (AKTIVER Sync)
```

---

## Projektstruktur (Desktop-App)

```
fuehrungen-modul/
├── src/
│   ├── components/
│   │   ├── AppointmentForm/
│   │   │   └── TerminFormular.jsx       # Termin-Dialog + Nachbereitung-Tab (Tab 5)
│   │   ├── Calendar/
│   │   │   ├── KalenderAnsicht.jsx      # Haupt-Kalenderansicht
│   │   │   └── SaisonView.jsx           # Saisonübersicht
│   │   ├── Checklists/ChecklistenManager.jsx
│   │   ├── CloudSync/
│   │   │   └── NasSyncWidget.jsx        # NAS-Sync UI (WebDAV)
│   │   ├── ParticipantManager/TeilnehmerVerwaltung.jsx
│   │   ├── Reminders/ErinnerungsSystem.jsx
│   │   ├── Reports/
│   │   │   └── ReportingDashboard.jsx   # Statistik: Umsatz, Auslastung, Besucher
│   │   ├── Sidebar/AppSidebar.jsx
│   │   ├── TeamManager/TeamVerwaltung.jsx
│   │   ├── Weather/WetterWidget.jsx
│   │   ├── common/SettingsDialog.jsx
│   │   └── theme/StiftGurkThemeProvider.jsx
│   ├── services/
│   │   ├── appointmentService.js        # Termin-CRUD (localStorage)
│   │   ├── nasStorageService.js         # ← AKTIVER NAS-Sync via WebDAV
│   │   ├── cloudStorageService.js       # Legacy OneDrive-Code (nicht aktiv)
│   │   ├── electronCloudStorageService.js # Legacy OneDrive-Code (nicht aktiv)
│   │   ├── participantService.js
│   │   ├── reminderService.js
│   │   ├── teamService.js
│   │   └── weatherService.js
│   ├── utils/
│   │   ├── storage.js                   # localStorage Wrapper (Keys: terminmodul_*)
│   │   ├── dateUtils.js
│   │   └── stiftGurkConfig.js
│   └── types/index.ts                   # Appointment-Interface (inkl. Nachbereitung-Felder)
├── electron/                            # Electron Main-Process
├── dist/                                # Vite Build-Ausgabe
├── dist_electron/
│   └── TerminMeister 1.0.0.exe          # Portable EXE (~92 MB)
├── vite.config.js                       # Enthält Workaround für core-js@3.49 fehlende Internals
└── package.json
```

### localStorage-Schlüssel (Desktop-App)
```
terminmodul_appointments    ← Termine
terminmodul_participants    ← Teilnehmer
terminmodul_reminders       ← Erinnerungen
terminmodul_settings        ← Einstellungen
terminmodul_team_members    ← Team
```

---

## Zeiterfassung-Kopplung

`/api/completed-today` liefert alle abgeschlossenen Termine eines Tages als vorbereitete Zeiterfassungs-Einträge (Szenario A Kopplung mit externem Zeiterfassungssystem).

```bash
curl http://100.121.103.107:3005/api/completed-today
curl http://100.121.103.107:3005/api/completed-today?date=2026-05-31
```

Rückgabefelder: `startTime`, `endTime`, `durationMinutes`, `dayType` (workday/saturday/sunday), `workType: offsite`, `isSpecialHours: true`, `project: Führungen`.

---

## Bekannte Eigenheiten & Hinweise

- **vite.config.js** enthält einen Workaround-Plugin für core-js@3.49.0 (fehlt `/internals/*.js`). Nicht entfernen.
- **SW_VERSION** in `public/sw.js` muss bei PWA-Updates manuell hochgezählt werden, damit Browser-Caches invalidiert werden.
- `cloudStorageService.js` / `electronCloudStorageService.js` sind OneDrive-Legacy-Code, der nicht mehr benötigt wird. Kann bei Bedarf gelöscht werden — wird von keiner aktiven Komponente importiert (außer potentiell `CloudSyncWidget.jsx`).
- Der übergeordnete Ordner `c:\Users\wolfg\Desktop\fuehrungen\` enthält eine ältere Web-only-Version des Projekts (ohne Electron, ohne NAS-Sync). Kann gelöscht werden.

---

**© 2026 Wolfgang Kulmitzer · Stift Gurk · Made in Austria**
