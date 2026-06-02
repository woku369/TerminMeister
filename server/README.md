# TerminMeister NAS-Server

Kanonische Version des HTTP-API-Servers. Läuft auf Synology DS124, Port 3005.

## Datei-Layout auf dem NAS
```
/volume1/Gurktaler/terminmeister/
├── server.js          ← diese Datei (deployed Kopie)
├── terminmeister.sh   ← Start-Script (DSM Task Scheduler)
├── restart.sh         ← Neustart-Script
├── database/          ← JSON-Datenfiles (NICHT in Git)
├── backups/           ← Inkrementelle Backups (NICHT in Git)
├── logs/              ← Server-Logs (NICHT in Git)
└── public/            ← Statische PWA-Dateien
```

## Daten-Collections

| Datei | Inhalt |
|---|---|
| `appointments.json` | Termine / Führungen |
| `participants.json` | Teilnehmer pro Termin |
| `reminders.json` | Erinnerungen / Push-Benachrichtigungen |
| `teams.json` | Team-Zuordnung |
| `settings.json` | Globale Einstellungen |

## Deployment

1. Hier in `server/server.js` editieren
2. `.\deploy.ps1` ausführen → legt Backup an und kopiert auf NAS
3. Auf NAS via SSH: `./restart.sh`

> Tipp: Niemals direkt auf dem NAS editieren — sonst läuft die Git-Version aus dem Takt.

## Integration mit LagerMeister

TerminMeister buchst Lagerabgänge automatisch über den LagerMeister-Endpoint
`POST http://100.121.103.107:3006/api/abgang` bei Führungsabschluss.
Siehe `LagerMeister/server/server.js` für die Gegenstelle.
