// TerminMeister NAS API Server
// Synology DS124, Port 3005
// Tailscale-IP: 100.121.103.107
// Basispfad: /volume1/Gurktaler/terminmeister

const http  = require('http');
const fs    = require('fs').promises;
const path  = require('path');

// ── Konfiguration ──────────────────────────────────────────────────────────
const BASE_PATH = process.env.APP_BASE || '/volume1/Gurktaler/terminmeister';
const PORT      = parseInt(process.env.APP_PORT || '3005', 10);
const API_KEY   = process.env.API_KEY || null; // Optional: gesetzt per env-Variable
const DB_PATH   = path.join(BASE_PATH, 'database');
const LOG_PATH  = path.join(BASE_PATH, 'logs');

// Erlaubte Datenbankdateien (Whitelist – verhindert Path-Traversal)
const ALLOWED_FILES = [
  'appointments.json',
  'participants.json',
  'reminders.json',
  'teams.json',
  'settings.json'
];

// ── Verzeichnisstruktur beim Start anlegen ─────────────────────────────────
const DIRS = [
  'database',
  'backups',
  'public',
  'logs'
];

async function ensureDirs() {
  for (const d of DIRS) {
    await fs.mkdir(path.join(BASE_PATH, d), { recursive: true });
  }
  // Leere Datenbank-Dateien anlegen falls nicht vorhanden
  for (const file of ALLOWED_FILES) {
    const filePath = path.join(DB_PATH, file);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, '[]', 'utf8');
      console.log('Neue Datenbankdatei angelegt:', file);
    }
  }
}

// ── Datenverlustschutz – safeWriteJson ────────────────────────────────────
async function safeWriteJson(filePath, newData) {
  let existing = [];
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    existing = JSON.parse(raw);
  } catch {}

  // Leeres Array NIEMALS über vorhandene Daten schreiben
  if (Array.isArray(existing) && existing.length > 0 &&
      Array.isArray(newData)  && newData.length === 0) {
    throw new Error(
      'DATENVERLUST-SCHUTZ: Leeres Array blockiert (' + existing.length + ' Datensaetze vorhanden)'
    );
  }
  // Warnung bei starkem Datenverlust (>50%)
  if (Array.isArray(existing) && existing.length > 10 &&
      Array.isArray(newData)  && newData.length < existing.length * 0.5) {
    console.warn('WARNUNG: Starker Datenverlust erkannt:', path.basename(filePath),
      existing.length, '->', newData.length);
  }
  // Inkrementelles Backup vor dem Schreiben
  if (Array.isArray(existing) && existing.length > 0) {
    const ts = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const bdir = path.join(BASE_PATH, 'backups', 'incremental_' + ts);
    await fs.mkdir(bdir, { recursive: true });
    await fs.writeFile(
      path.join(bdir, path.basename(filePath)),
      JSON.stringify(existing),
      'utf8'
    );
  }
  await fs.writeFile(filePath, JSON.stringify(newData, null, 2), 'utf8');
}

// ── Body-Lese-Helfer ───────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ── Dateiname validieren (Whitelist) ─────────────────────────────────────
function validateFileName(name) {
  if (!name || !ALLOWED_FILES.includes(name)) {
    throw Object.assign(
      new Error('Ungueltiger oder nicht erlaubter Dateiname: ' + name),
      { status: 400 }
    );
  }
  return name;
}

// ── JSON-Antwort Helfer ───────────────────────────────────────────────────
function jsonOk(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function jsonError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: false, error: message }));
}

// ── API-Key Prüfung ─────────────────────────────────────────────────────
function checkAuth(req) {
  if (!API_KEY) return true; // kein Auth konfiguriert → immer erlaubt
  const key = req.headers['x-api-key'];
  return key === API_KEY;
}

// ── Router ────────────────────────────────────────────────────────────────
async function router(req, res, url) {
  const method = req.method.toUpperCase();
  const p = url.pathname;

  // Auth-Prüfung für alle /api/-Routen außer /api/health
  if (p.startsWith('/api/') && p !== '/api/health') {
    if (!checkAuth(req)) return jsonError(res, 401, 'Unauthorized: x-api-key fehlt oder ungültig');
  }

  // ── GET /api/health ────────────────────────────────────────────────────
  if (method === 'GET' && p === '/api/health') {
    return jsonOk(res, {
      success: true,
      status: 'online',
      app: 'TerminMeister',
      version: '1.0.0',
      basePath: BASE_PATH,
      port: PORT,
      uptime: Math.floor(process.uptime()),
      memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      timestamp: new Date().toISOString()
    });
  }

  // ── GET /api/data?file=appointments.json ───────────────────────────────
  if (method === 'GET' && p === '/api/data') {
    const fileName = validateFileName(url.searchParams.get('file'));
    const filePath = path.join(DB_PATH, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    return res.end(raw);
  }

  // ── DELETE /api/item?file=appointments.json&id=xxx ────────────────────
  // Löscht einen einzelnen Eintrag per ID – umgeht Datenverlustschutz sicher
  if (method === 'DELETE' && p === '/api/item') {
    const fileName = validateFileName(url.searchParams.get('file'));
    const itemId   = url.searchParams.get('id');
    if (!itemId) return jsonError(res, 400, 'id-Parameter fehlt');
    const filePath = path.join(DB_PATH, fileName);
    const raw  = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    const idx  = data.findIndex(e => e.id === itemId);
    if (idx === -1) return jsonError(res, 404, 'Eintrag nicht gefunden: ' + itemId);
    const removed = data.splice(idx, 1)[0];
    // Backup des gelöschten Eintrags
    const ts   = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const bdir = path.join(BASE_PATH, 'backups', 'deleted_' + ts);
    await fs.mkdir(bdir, { recursive: true });
    await fs.writeFile(path.join(bdir, fileName), JSON.stringify([removed], null, 2), 'utf8');
    // Direkt schreiben (kein Datenverlustschutz nötig – explizites Löschen)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return jsonOk(res, { success: true, deleted: itemId, remaining: data.length });
  }

  // ── POST /api/data?file=appointments.json ──────────────────────────────
  if (method === 'POST' && p === '/api/data') {
    const fileName = validateFileName(url.searchParams.get('file'));
    const filePath = path.join(DB_PATH, fileName);
    const body = await readBody(req);
    const newData = JSON.parse(body);
    await safeWriteJson(filePath, newData);
    return jsonOk(res, { success: true, file: fileName, count: Array.isArray(newData) ? newData.length : 1 });
  }

  // ── GET /api/sync – alle Daten auf einmal laden ────────────────────────
  if (method === 'GET' && p === '/api/sync') {
    const result = {};
    for (const file of ALLOWED_FILES) {
      try {
        const raw = await fs.readFile(path.join(DB_PATH, file), 'utf8');
        result[file.replace('.json', '')] = JSON.parse(raw);
      } catch {
        result[file.replace('.json', '')] = [];
      }
    }
    return jsonOk(res, { success: true, data: result, timestamp: new Date().toISOString() });
  }

  // ── POST /api/sync – alle Daten auf einmal schreiben ──────────────────
  if (method === 'POST' && p === '/api/sync') {
    const body = await readBody(req);
    const payload = JSON.parse(body);
    const written = [];
    for (const key of Object.keys(payload)) {
      const fileName = key + '.json';
      if (!ALLOWED_FILES.includes(fileName)) continue;
      await safeWriteJson(path.join(DB_PATH, fileName), payload[key]);
      written.push(fileName);
    }
    return jsonOk(res, { success: true, written, timestamp: new Date().toISOString() });
  }

  // ── GET /api/completed-today – abgeschlossene Führungen des heutigen Tages
  // Für Zeiterfassung: liefert alle heute abgeschlossenen/bestätigten Termine
  // als vorausgefüllte Zeiterfassungs-Einträge (Szenario A Kopplung)
  if (method === 'GET' && p === '/api/completed-today') {
    const dateParam = url.searchParams.get('date'); // optional: ?date=2026-05-12
    const targetDate = dateParam || new Date().toISOString().split('T')[0];

    let appointments = [];
    try {
      const raw = await fs.readFile(path.join(DB_PATH, 'appointments.json'), 'utf8');
      appointments = JSON.parse(raw);
    } catch { appointments = []; }

    // Filtere: Datum passt + Status abgeschlossen oder bestätigt
    const DONE_STATUS = ['abgeschlossen', 'completed', 'bestätigt', 'confirmed'];
    const results = appointments
      .filter(a => {
        const startIso = a.startDate || a.start || '';
        if (!startIso) return false;
        const dateStr = startIso.split('T')[0];
        if (dateStr !== targetDate) return false;
        const status = (a.status || '').toLowerCase();
        return DONE_STATUS.includes(status);
      })
      .map(a => {
        const startIso = a.startDate || a.start || '';
        const endIso   = a.endDate   || a.end   || '';
        const startDt  = startIso ? new Date(startIso) : null;
        const endDt    = endIso   ? new Date(endIso)   : null;
        const durationMin = (startDt && endDt)
          ? Math.round((endDt - startDt) / 60000)
          : (a.duration || 120);

        // Wochentag für Zuschlagsinfo (0=So, 6=Sa)
        const dow = startDt ? startDt.getDay() : -1;
        const dayType = dow === 0 ? 'sunday' : dow === 6 ? 'saturday' : 'workday';

        return {
          // Identifikation
          source:          'terminmeister',
          appointmentId:   a.id,
          // Zeiterfassungs-relevante Felder (direkt als time_entry verwendbar)
          date:            targetDate,
          startTime:       startIso,
          endTime:         endIso,
          durationMinutes: durationMin,
          dayType:         dayType,
          workType:        'offsite',         // Führung = Außer-Haus-Termin
          isSpecialHours:  true,              // Führungen = Sonderarbeitszeit
          project:         'Führungen',       // Gurktaler-Projekt
          // Beschreibungsfelder
          title:           a.title  || a.titel  || '',
          note:            [
            a.title || a.titel || '',
            a.description || a.beschreibung || '',
            a.organization ? 'Gruppe: ' + a.organization : ''
          ].filter(Boolean).join(' | '),
          groupName:       a.organization || '',
          participantCount:a.participantCount || (a.participants && a.participants.length) || 0,
          // Originaldaten
          status:          a.status,
          type:            a.type || a.typ || 'fuehrung'
        };
      });

    return jsonOk(res, {
      success: true,
      date:    targetDate,
      count:   results.length,
      entries: results
    });
  }

  // ── GET /api/backups – Liste der Backups ──────────────────────────────
  if (method === 'GET' && p === '/api/backups') {
    const backupDir = path.join(BASE_PATH, 'backups');
    let entries = [];
    try {
      entries = await fs.readdir(backupDir);
    } catch {}
    const backups = entries
      .filter(e => e.startsWith('incremental_'))
      .sort()
      .reverse()
      .slice(0, 20); // Letzte 20 Backups
    return jsonOk(res, { success: true, backups });
  }

  // ── Statische Dateien (PWA) ────────────────────────────────────────────
  if (method === 'GET') {
    const rel  = p === '/' ? '/index.html' : p;
    const abs  = path.resolve(path.join(__dirname, 'public', rel));
    const base = path.resolve(path.join(__dirname, 'public'));
    if (!abs.startsWith(base + path.sep) && abs !== base) {
      return jsonError(res, 403, 'Zugriff verweigert');
    }
    try {
      const data = await fs.readFile(abs);
      const ext = path.extname(abs).toLowerCase();
      const mimes = {
        '.html': 'text/html; charset=utf-8',
        '.json': 'application/json',
        '.js':   'application/javascript',
        '.css':  'text/css',
        '.png':  'image/png',
        '.svg':  'image/svg+xml',
        '.webp': 'image/webp',
        '.ttf':  'font/ttf',
        '.woff': 'font/woff',
        '.woff2':'font/woff2'
      };
      // index.html und sw.js nie cachen – immer aktuell ausliefern
      const noCache = rel === '/index.html' || rel === '/sw.js';
      const headers = {
        'Content-Type': mimes[ext] || 'application/octet-stream',
        'Cache-Control': noCache ? 'no-store, no-cache, must-revalidate' : 'public, max-age=86400',
      };
      res.writeHead(200, headers);
      return res.end(data);
    } catch {
      return jsonError(res, 404, 'Nicht gefunden: ' + rel);
    }
  }

  return jsonError(res, 404, 'Route nicht gefunden: ' + method + ' ' + p);
}

// ── HTTP-Server ────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  try {
    const url = new URL(req.url, 'http://localhost:' + PORT);
    // Log
    const ts = new Date().toISOString();
    console.log('[' + ts + '] ' + req.method + ' ' + url.pathname);
    await router(req, res, url);
  } catch (err) {
    const status = err.status || 500;
    console.error('Server-Fehler:', err.message);
    if (!res.headersSent) {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
});

server.listen(PORT, () => {
  console.log('================================================');
  console.log('  TerminMeister NAS API Server gestartet');
  console.log('  Port   : ' + PORT);
  console.log('  Basis  : ' + BASE_PATH);
  console.log('  Health : http://100.121.103.107:' + PORT + '/api/health');
  console.log('  Heute  : http://100.121.103.107:' + PORT + '/api/completed-today');
  console.log('  Auth   : ' + (API_KEY ? 'x-api-key aktiv' : 'kein Auth (API_KEY nicht gesetzt)'));
  console.log('  PWA    : http://100.121.103.107:' + PORT + '/');
  console.log('================================================');
});

server.on('error', err => {
  console.error('FATAL Server-Fehler:', err.message);
  process.exit(1);
});

ensureDirs().then(() => {
  console.log('Verzeichnisstruktur bereit.');
}).catch(err => {
  console.error('Fehler beim Anlegen der Verzeichnisse:', err.message);
});
