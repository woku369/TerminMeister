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
| Health-Check | http://100.121.103.107:3005/api/health |

---

## Verzeichnisstruktur auf der NAS

```
/volume1/Gurktaler/terminmeister/
├── server.js               ← Node.js API-Server (GitHub: server/server.js)
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
```

**Wichtig:** Das `server/`-Verzeichnis im GitHub-Repo entspricht dem **Basisverzeichnis** auf der NAS:
- GitHub `server/server.js` → NAS `/volume1/Gurktaler/terminmeister/server.js`
- GitHub `server/public/index.html` → NAS `/volume1/Gurktaler/terminmeister/public/index.html`

---

## index.html deployen (Windows PowerShell)

**Via scp (Tailscale):**
```powershell
scp "$env:USERPROFILE\Downloads\terminmeister_index.html" Wolfgang@100.121.103.107:/volume1/Gurktaler/terminmeister/public/index.html
```

**Via SMB-Share:**
```powershell
Copy-Item "$env:USERPROFILE\Downloads\terminmeister_index.html" "\\DS124-RockingK\Gurktaler\terminmeister\public\index.html" -Force
```

**Via DSM File Station:**
Pfad: `Gurktaler > terminmeister > public > index.html` ersetzen

---

## server.js deployen

```powershell
# Aus dem Repo-Verzeichnis:
.\server\deploy.ps1

# Oder manuell:
Copy-Item "server\server.js" "\\DS124-RockingK\Gurktaler\terminmeister\server.js" -Force
```

Danach Node-Prozess neustarten (SSH):

```bash
ssh Wolfgang@100.121.103.107
ps aux | grep "node server" | grep -v grep
sudo kill <PID>
cd /volume1/Gurktaler/terminmeister
nohup node server.js > logs/server.log 2>&1 &
```

---

## Autostart (Synology Task Scheduler)

- **Trigger:** Bootup
- **User:** root
- **Befehl:**
  ```bash
  sleep 30 && cd /volume1/Gurktaler/terminmeister && node server.js >> /volume1/Gurktaler/terminmeister/logs/server.log 2>&1
  ```

---

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/health` | Status-Check |
| GET | `/api/data?file=appointments.json` | Termine lesen |
| POST | `/api/data?file=appointments.json` | Termine schreiben (ganzes Array) |
| DELETE | `/api/item?file=appointments.json&id=...` | Einzelnen Termin löschen |
| GET | `/api/sync` | Alle Daten auf einmal |
| GET | `/api/data?file=settings.json` | Lager-Daten (lagerProdukte + lagerVerlauf) |

---

## Troubleshooting

**Server läuft nicht / Dot rot:**
```bash
ssh Wolfgang@100.121.103.107
ps aux | grep "node server" | grep -v grep
# Falls kein Ergebnis: manuell starten (siehe oben)
```

**Port belegt (EADDRINUSE):**
```bash
ps aux | grep "node server" | grep -v grep
sudo kill <PID1> <PID2>
```

**PWA zeigt alten Stand:**
Browser-Cache leeren — `index.html` wird mit `no-cache` ausgeliefert.

**NAS nicht erreichbar:**
Prüfen ob Tailscale läuft: `ping 100.121.103.107`
