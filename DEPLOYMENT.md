# TerminMeister – NAS Deployment

## Infrastruktur

| Variable | Wert |
|---|---|
| NAS | Synology DS124 |
| Tailscale-IP | 100.121.103.107 |
| SSH-User | Wolfgang |
| SMB-Share | `\\DS124-RockingK\Gurktaler\terminmeister\` |
| Port | **3005** |
| PWA-URL | http://100.121.103.107:3005/ |
| Admin-Dashboard | http://100.121.103.107:3005/fuehrungen-admin |
| Extern (Tailscale Funnel) | https://ds124-rockingk.tail334b55.ts.net |
| Health-Check | http://100.121.103.107:3005/api/health |

---

## Verzeichnisstruktur auf der NAS

```
/volume1/Gurktaler/terminmeister/
├── server.js               ← Node.js API-Server (GitHub: server/server.js)
├── .env                    ← Credentials (NICHT in Git — manuell anlegen!)
├── restart.sh              ← Start-Script mit Credential-Export
├── public/                 ← PWA (Single-File HTML)
│   └── index.html          ← Haupt-App (GitHub: server/public/index.html)
├── database/               ← JSON-Datenbank (automatisch angelegt)
│   ├── appointments.json
│   ├── participants.json
│   ├── reminders.json
│   ├── teams.json
│   └── settings.json       ← auch: lagerProdukte + lagerVerlauf
├── backups/                ← Automatische Backups vor jedem Schreibvorgang
└── logs/
    └── server.log
```

**Wichtig:** Das `server/`-Verzeichnis im GitHub-Repo entspricht dem **Basisverzeichnis** auf der NAS:
- GitHub `server/server.js` → NAS `/volume1/Gurktaler/terminmeister/server.js`
- GitHub `server/public/index.html` → NAS `/volume1/Gurktaler/terminmeister/public/index.html`

---

## Credentials (.env Datei)

Die `.env`-Datei liegt **nur auf der NAS** — niemals in Git committen.

**Einmalig anlegen via SSH:**

```bash
ssh Wolfgang@100.121.103.107
cat > /volume1/Gurktaler/terminmeister/.env << 'EOF'
ADMIN_PASS=<passwort>
NOTIFY_TO=<email-empfaenger>
FROM_EMAIL=<absender-email>
BREVO_API_KEY=<brevo-api-key>
EOF
```

`server.js` liest `.env` automatisch beim Start (`loadDotEnv()`). Umgebungsvariablen (z.B. gesetzt via `export` in `restart.sh`) haben Vorrang.

---

## server.js und index.html deployen (Windows PowerShell)

```powershell
# Aus dem Repo-Verzeichnis — kopiert server.js UND public/index.html:
.\server\deploy.ps1
```

Danach Node-Prozess neustarten (SSH):

```bash
ssh Wolfgang@100.121.103.107
sudo sh /volume1/Gurktaler/terminmeister/restart.sh
```

**Manuell (Einzeldateien):**

```powershell
# server.js
Copy-Item "server\server.js" "\\DS124-RockingK\Gurktaler\terminmeister\server.js" -Force

# index.html
Copy-Item "server\public\index.html" "\\DS124-RockingK\Gurktaler\terminmeister\public\index.html" -Force
```

---

## restart.sh (auf der NAS)

Das Script `/volume1/Gurktaler/terminmeister/restart.sh` beendet den laufenden Prozess,
wendet ausstehende `.tmp`-Updates an und startet den Server neu:

```bash
#!/bin/sh
pkill -f terminmeister/server.js 2>/dev/null
sleep 1
cd /volume1/Gurktaler/terminmeister
for f in public/*.tmp; do
  [ -f "$f" ] && mv "$f" "${f%.tmp}" && echo "Update angewendet: ${f%.tmp}"
done
export ADMIN_PASS=<passwort>
export NOTIFY_TO=<email-empfaenger>
export FROM_EMAIL=<absender-email>
export BREVO_API_KEY=<brevo-api-key>
nohup /usr/local/bin/node server.js >> logs/server.log 2>&1 &
echo "Server gestartet"
```

> **Tipp:** Die Credentials im restart.sh sind redundant zur `.env`-Datei (doppelte Absicherung).
> `server.js` liest `.env` wenn Umgebungsvariablen nicht gesetzt sind.

---

## Autostart (Synology Task Scheduler)

- **Trigger:** Bootup
- **User:** root
- **Befehl:**
  ```bash
  sleep 30 && sudo sh /volume1/Gurktaler/terminmeister/restart.sh
  ```

> **Hinweis:** Es sollte nur **ein** Task aktiv sein. Mehrere parallele Tasks (z.B. "TerminMeister Autostart", "TerminMeister Server", "Gurktaler Führungen") führen zu `EADDRINUSE`-Fehlern. Überflüssige Tasks im DSM Task Scheduler deaktivieren.

---

## API-Endpunkte

### Basis-API (Desktop-App Sync)

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/health` | Status-Check |
| GET | `/api/data?file=appointments.json` | Termine lesen |
| POST | `/api/data?file=appointments.json` | Termine schreiben (ganzes Array) |
| DELETE | `/api/item?file=appointments.json&id=...` | Einzelnen Termin löschen (Basic Auth) |
| GET | `/api/sync` | Alle Daten auf einmal |
| GET | `/api/data?file=settings.json` | Lager-Daten (lagerProdukte + lagerVerlauf) |

### Web-Buchungssystem (öffentliche API)

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| GET | `/api/fuehrungen/kapazitaet` | - | Freie Plätze je Termin |
| POST | `/api/fuehrungen/buchen` | - | Buchung anlegen + E-Mails senden |

### Admin-API (Basic Auth: `ADMIN_PASS`)

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/fuehrungen-admin` | Admin-Dashboard HTML |
| GET | `/api/fuehrungen/admin/buchungen` | Buchungsübersicht JSON |
| POST | `/api/fuehrungen/admin/absage` | Termin absagen + Absage-E-Mails |
| POST | `/api/fuehrungen/admin/termin` | Manuelle Buchung durch Marlies |

---

## Troubleshooting

**Server läuft nicht / Dot rot:**
```bash
ssh Wolfgang@100.121.103.107
ps aux | grep terminmeister/server.js | grep -v grep
# Falls kein Ergebnis:
sudo sh /volume1/Gurktaler/terminmeister/restart.sh
```

**Port belegt (EADDRINUSE):**
```bash
ps aux | grep terminmeister/server.js | grep -v grep
sudo kill -9 <PID1> <PID2>
sudo sh /volume1/Gurktaler/terminmeister/restart.sh
```

**Admin-Dashboard zeigt leere Seite / Fehler 503:**
Credentials prüfen — `ADMIN_PASS` muss gesetzt sein:
```bash
grep 'ADMIN_PASS' /volume1/Gurktaler/terminmeister/logs/server.log | tail -5
# Sollte zeigen: [CONF] ADMIN_PASS gesetzt ✓
# Wenn nicht: restart.sh prüfen und neu ausführen
sudo sh /volume1/Gurktaler/terminmeister/restart.sh
```

**E-Mails werden nicht gesendet:**
```bash
grep '\[MAIL\]' /volume1/Gurktaler/terminmeister/logs/server.log | tail -10
# [MAIL] Gesendet → OK
# [MAIL-MOCK] → BREVO_API_KEY fehlt → .env prüfen
```

**PWA zeigt alten Stand:**
Browser-Cache leeren — `index.html` wird mit `no-cache` ausgeliefert.

**NAS nicht erreichbar:**
Prüfen ob Tailscale läuft: `ping 100.121.103.107`
