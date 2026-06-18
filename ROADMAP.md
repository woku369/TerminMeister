# TerminMeister – Roadmap

Stand: 2026-06-18 (aktualisiert) | [woku369/TerminMeister](https://github.com/woku369/TerminMeister)

---

## Erledigt

### Kern-App (Desktop)

- [x] Electron-App (React 19 + MUI v7, Windows portable EXE ~92 MB)
- [x] Kalenderansicht (Monat/Woche/Tag, react-big-calendar)
- [x] Terminverwaltung: Erstellen, Bearbeiten, Stornieren, Abschließen
- [x] Kein Uhrzeit-Reset-Bug beim Bearbeiten (useRef formInitialized, 2026-05-31)
- [x] Zeitenbearbeitung auch bei Status "abgeschlossen" (Busverspätung etc.)
- [x] Nachbereitung-Tab bei abgeschlossenen Terminen (Tab 5 im Termin-Dialog):
  - [x] Angemeldet (aus participantCount, schreibgeschützt)
  - [x] Tatsächlich erschienen (editierbar)
  - [x] Eintrittsgeld brutto €
  - [x] Warenverkauf brutto €
  - [x] Gesamtumsatz (automatisch berechnet)
  - [x] Interne Anmerkungen
- [x] Teilnehmerverwaltung pro Termin
- [x] Team-Management (Zuweisung von Führungspersonen)
- [x] Checklisten (Vor/Während/Nach der Führung)
- [x] Erinnerungssystem (zeitbasierte Benachrichtigungen)
- [x] Wetterwidget (Prognose für Terminplanung)
- [x] Reporting & Statistik: Auslastung, Gesamtumsatz (Eintritt + Shop), Besucherzahlen

### LagerMeister-Integration (Juni 2026)

- [x] **`src/services/lagerService.js`** neu: API-Service für LagerMeister (Port 3006) mit konfigurierbarer Base-URL (`localStorage`) und 8s Timeout
- [x] **`src/components/Lager/LagerTab.jsx`** neu: Bestandsübersicht mit Ampelkacheln, Kategoriefilter (Alle / Alarm / Spirituosen / Lebensmittel / Merchandise / Verbrauch), Schnellabbuchungs-Dialog
- [x] **`TerminplanungsModul.jsx`**: Tab 6 „📦 Lager" hinzugefügt; `selectedAppointment?.id` wird als `terminId` weitergegeben
- [x] **PWA Lager-Fix:** `p.name` → `p.bezeichnung` in Kacheln und Ausbuchen-Dropdown; `produktId` → `artikelId` im Abgang-Request (`server/public/index.html`)
- [x] **`server/public/index.html`** in Version Control aufgenommen (war zuvor nur auf NAS)

### Mobile PWA – Führungspaket (Juni 2026)

- [x] **Führungspaket-Workflow** in der PWA-Nachbereitung (nach Kassenabschluss am Mobilgerät):
  - [x] Zahlende Eintritte × Eintrittspreis → Eintrittsgeld brutto (berechnet, schreibgeschützt)
  - [x] Artikelliste aus LagerMeister: „+ Artikel"-Button, Dropdown (Bezeichnung + Einheit aus `/api/bestand`), Menge, Einzelpreis (auto aus `vkPreisBrutto`), Gratis-Checkbox
  - [x] Goodie-Bag-Checkbox (Notiz in Anmerkungen)
  - [x] Gesamtumsatz (Eintritte + Warenverkauf) live berechnet, prominent angezeigt
  - [x] „📦 Lager buchen"-Button: Massenabgang an LagerMeister `/api/abgang` (`artikelId`, `menge`, `grund`, `referenz: terminId`)
  - [x] Idempotenz: `lagerGebucht: true` am Termin verhindert Doppelbuchung, Button zeigt „✓ gebucht"
  - [x] Lager-Tab in Desktop-Electron bleibt für Ad-hoc-Schnellabbuchungen (nicht-klassische Führungen)

### Mobile PWA – Team & Zeiterfassung (2026-05-31)

- [x] Team-Tab: echte Mitglieder mit Karten (Wolfgang Kulmitzer, Andrea Burger, Thomas Stranner, Marlies Maunz)
- [x] Führungsperson(en)-Auswahl im Bearbeitungsdialog und Neuer-Termin-Formular (Checkboxen)
- [x] Zeiterfassung pro Person in Nachbereitung (Stunden inkl. An-/Abfahrt, Vor-/Nacharbeit)
- [x] Marlies Maunz (Büro Wien) mit separatem Projektstunden-Feld
- [x] UTC-Timezone-Fix: `isoToTime()`, `isoToDate()`, `heute()` rechnen jetzt in Ortszeit
- [x] Statistik-Tab: Team-Einsatz-Block mit allen 4 Personen (Führungen + Stunden)
- [x] Handbuch-Seite in Desktop-App (Sidebar "Handbuch", interaktive Accordion-Ansicht)

### Synchronisation & NAS
- [x] WebDAV entfernt — Desktop-Sync läuft jetzt via REST API (Port 3005)
- [x] `nasStorageService.js` komplett neu: GET/POST `/api/sync`
- [x] NasSyncWidget: Download-Button (NAS → lokal) und Upload-Button (lokal → NAS)
- [x] Initialsync beim ersten App-Start ohne lokale Daten
- [x] SettingsDialog: NAS-URL + optionaler API-Key (statt 4 WebDAV-Felder)

### NAS-Server
- [x] `server.js` (reines Node.js, kein npm install) auf Synology DS124
- [x] REST API: `/api/health`, `/api/sync` (GET+POST), `/api/data`, `/api/item` (DELETE), `/api/completed-today`, `/api/backups`
- [x] `safeWriteJson`: leeres Array überschreibt niemals vorhandene Daten
- [x] Inkrementelle Backups vor jedem Schreibvorgang
- [x] Zeiterfassung-Kopplung via `/api/completed-today`

### Web-Buchungssystem — Öffentliche Führungen Saison 2026 (Juni 2026)

Gäste können Führungen direkt über eine öffentliche Buchungsseite (GitHub Pages) buchen.
Buchungen landen in `appointments.json` und sind in TerminMeister sichtbar.
Marlies erhält Zugang zum Admin-Dashboard per Browser-URL — ohne App-Installation.

**Buchungsseite (GitHub Pages):**
- [x] `woku369/gurktaler-fuehrungen` → `https://woku369.github.io/gurktaler-fuehrungen/`
- [x] Self-contained `index.html` (alle Assets Base64-eingebettet, kein Build nötig)
- [x] 4 Termine Saison 2026 (Jul / Aug / Sep / Okt), je 30 Plätze, € 15,– pro Person
- [x] Formular: Termin-Auswahl, Personenzahl-Stepper, Kontaktdaten
- [x] Kapazitätsprüfung live gegen NAS-Server (`/api/fuehrungen/kapazitaet`)
- [x] Offline-Fallback falls NAS nicht erreichbar (Buchung trotzdem möglich, keine E-Mail)

**Neue API-Routen in `server/server.js` (Port 3005):**
- [x] `GET /api/fuehrungen/kapazitaet` — freie Plätze je Termin (öffentlich, kein Auth)
- [x] `POST /api/fuehrungen/buchen` — Buchung anlegen, E-Mails senden (öffentlich, kein Auth)
- [x] `GET /api/fuehrungen/admin/buchungen` — Buchungsübersicht JSON (Basic Auth)
- [x] `POST /api/fuehrungen/admin/absage` — Termin absagen + Absage-E-Mails (Basic Auth)
- [x] `GET /fuehrungen-admin` — Admin-Dashboard HTML (Basic Auth)

**E-Mail-Versand (Brevo SMTP, 300 Mails/Tag kostenlos):**
- [x] nodemailer optional — Mock-Modus wenn nicht installiert (kein Absturz)
- [x] Bestätigungs-E-Mail an Gast nach Buchung (Termin, Personenzahl, Buchungsnr., Treffpunkt)
- [x] Benachrichtigungs-E-Mail an `NOTIFY_TO` (Admin) bei jeder neuen Buchung
- [x] Absage-E-Mail an alle gebuchten Gäste eines Termins
- [x] Konfiguration via Umgebungsvariablen: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_TO`, `FROM_EMAIL`

**Admin-Dashboard für Marlies (Browser, keine App-Installation):**
- [x] URL: `http://100.121.103.107:3005/fuehrungen-admin`
- [x] Basic Auth mit `ADMIN_PASS` Umgebungsvariable (Pflicht; fehlt → Zugang gesperrt)
- [x] 4 Kennzahlen: Buchungen, Personen, erwarteter Umsatz, freie Plätze
- [x] Pro Termin: Kapazitätsbalken + Tabelle (Name, E-Mail, Telefon, Personen, Preis, Datum)
- [x] Termin absagen: Modal mit Grundtext → Absage-E-Mail an alle Gäste
- [x] Automatische Aktualisierung alle 30 Sekunden

**Datenspeicherung:**
- [x] Web-Buchungen in `appointments.json` (Feld `buchungsquelle: 'web'`)
- [x] Kapazitätsberechnung: Summe `participantCount` aller nicht-abgesagten Web-Buchungen pro `terminId`
- [x] Inkrementelle Backups vor jedem Schreibvorgang (wie alle anderen Daten)

### Mobile PWA
- [x] Single-file PWA (`index.html`) auf NAS, Zugang nur via Tailscale
- [x] Tabs: Heute, Alle Termine, Neuer Termin, Team (Lesezugriff), Statistik, **Lager**
- [x] Bearbeitungsdialog: alle Felder inkl. Uhrzeit + Dauer
- [x] Nachbereitung bei Status "abgeschlossen"
- [x] Statistik-Tab: Umsatz (Eintritt + Shop aufgeschlüsselt), tatsächliche Besucher
- [x] Auto-Polling alle 15 Sekunden
- [x] Service Worker für Offline-Cache-Kontrolle

### Infrastruktur & Dokumentation
- [x] Portable EXE (`npm run build-portable`, electron-builder)
- [x] Git-Repository `woku369/TerminMeister`
- [x] README mit vollständiger Systemdokumentation und Architektur-Diagramm
- [x] ROADMAP.md (dieses Dokument)

---

## Offen

### Kurzfristig
- [ ] Legacy-Code entfernen: `cloudStorageService.js`, `electronCloudStorageService.js`, `CloudSyncWidget.jsx`
- [ ] Alte Dokument-Dateien aufräumen: `FERTIG.md`, `FEHLER_BEHOBEN.md`, `IMPLEMENTATION_SUCCESS.md` etc. → `.gitignore` oder löschen
- [ ] `storage_new.js` prüfen und ggf. mit `storage.js` zusammenführen (Duplikat)
- [ ] `KalenderAnsichtNeu.jsx`, `SaisonView_Fixed.jsx` etc. — welche Version ist aktiv?

### Mittelfristig
- [ ] Automatischer NAS-Sync beim App-Start (optional, konfigurierbar)
- [ ] Konfliktauflösung UI: Anzeigen wenn NAS-Daten neuer als lokale Daten
- [ ] PWA: Termin löschen direkt in PWA (aktuell nur Statusänderung möglich)
- [ ] Backup-Verwaltung UI in Desktop-App
- [ ] NAS-URL konfigurierbar in App ohne Neustart

---

## Zukunft / Ideen

### Kassa / Registrierkasse (geparkt, kein aktueller Handlungsbedarf)

> **Kontext:** In Österreich besteht Registrierkassenpflicht (Barumsatzgrenze überschritten).
> Kunden erhalten einen Bon, der Inhaber am Tagesende einen Sammelbon.
> Kundschaft bezahlt überwiegend bar, vereinzelt Kartenzahlung.
> Der Barumsatz wird an das Wiener Büro gemeldet, das die Buchhaltung veranlasst
> und den Betrag auf das Firmenkonto überweist.
>
> **Entscheidung:** Kein separates Kassenprogramm — Funktionalität bleibt in TerminMeister PWA
> (Mobilgerät, nach jeder Führung). Keine Eile; erst implementieren wenn rechtlich oder
> praktisch notwendig.

- [ ] **Wechselgeld-Rechner:** Gegeben-Betrag eingeben → Herausgabe berechnen (reine Hilfs-UI, kein Speicher nötig)
- [ ] **Rudimentäres Kassabuch (PWA):** pro Tag: Einnahmen (Eintritt + Warenverkauf), Zahlart (Bar/Karte), Kassenstand Anfang/Ende
- [ ] **Tagesabschluss-Funktion:** Summen des Tages zusammenfassen (aus Nachbereitungs-Daten), als PDF oder Text exportieren für Buchhaltungs-Meldung an Wien
- [ ] **Bon-Druck:** Einfache Bon-Ausgabe (Druckdialog des Browsers oder Bluetooth-Bondrucker), Sammelbon am Tagesende

### Funktionserweiterungen
- [ ] Export: PDF-Tagesbericht / Wochenbericht (pro Führung oder gesamt)
- [ ] iCal/ICS-Export für Integration in externe Kalender (Outlook, Google Calendar)
- [ ] QR-Code-Generator für Teilnehmer-Anmeldung
- [x] ~~Öffentliche Anmeldeseite (lightweight PWA ohne Auth für Besucher)~~ → **erledigt** als `gurktaler-fuehrungen` GitHub Pages
- [ ] Push-Benachrichtigungen für Mobile PWA (Web Push API, erfordert HTTPS)
- [ ] Führungs-Routen / Tourpläne verwalten
- [ ] Wiederkehrende Termine (Serientermine)

### Technisch
- [ ] HTTPS für NAS-Server (Let's Encrypt via Tailscale oder Synology Reverse Proxy)
- [ ] Automatisches Backup-Cleanup (alte Backups nach X Tagen löschen)
- [ ] Mehrere NAS-Profile (LAN vs. Tailscale automatisch wechseln)
- [ ] Electron Auto-Updater
- [ ] Unit-Tests für Services
