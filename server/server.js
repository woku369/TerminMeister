// TerminMeister NAS API Server
// Synology DS124, Port 3005
// Tailscale-IP: 100.121.103.107
// Basispfad: /volume1/Gurktaler/terminmeister

const http  = require('http');
const fs    = require('fs').promises;
const path  = require('path');
const crypto = require('crypto');

// Nodemailer optional — falls nicht installiert: Mock-Modus
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch { console.warn('[MAIL] nodemailer nicht installiert — E-Mail-Versand im Mock-Modus'); }

// ── Konfiguration ──────────────────────────────────────────────────────────
const BASE_PATH = process.env.APP_BASE || '/volume1/Gurktaler/terminmeister';
const PORT      = parseInt(process.env.APP_PORT || '3005', 10);
const API_KEY   = process.env.API_KEY || null; // Optional: gesetzt per env-Variable
const DB_PATH   = path.join(BASE_PATH, 'database');
const LOG_PATH  = path.join(BASE_PATH, 'logs');

// E-Mail-Konfiguration (Brevo SMTP oder beliebiger SMTP-Relay)
const SMTP_HOST    = process.env.SMTP_HOST    || 'smtp-relay.brevo.com';
const SMTP_PORT    = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER    = process.env.SMTP_USER    || '';
const SMTP_PASS    = process.env.SMTP_PASS    || '';
const NOTIFY_TO    = process.env.NOTIFY_TO    || 'diwk@aon.at';
const FROM_EMAIL   = process.env.FROM_EMAIL   || 'diwk@aon.at';
const FROM_NAME    = 'Gurktaler Führungen';

// Führungen-Konfiguration Saison 2026
const FUEHRUNGEN_TERMINE = [
  { id: 't1', datum: '2026-07-19', label: '19.07.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30 },
  { id: 't2', datum: '2026-08-15', label: '15.08.2026', tag: 'Sa', uhrzeit: '13:00', kapazitaet: 30 },
  { id: 't3', datum: '2026-09-13', label: '13.09.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30 },
  { id: 't4', datum: '2026-10-18', label: '18.10.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30 },
];
const FUEHRUNG_PREIS = 15;

// Öffentliche API-Routen (kein x-api-key erforderlich)
const PUBLIC_API = new Set(['/api/health', '/api/fuehrungen/kapazitaet', '/api/fuehrungen/buchen']);

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

// ── E-Mail-Versand (nodemailer mit Mock-Fallback) ─────────────────────────
async function sendFuehrungsMail(to, subject, htmlBody) {
  if (!nodemailer || !SMTP_USER || !SMTP_PASS) {
    console.log('[MAIL-MOCK] An:', to);
    console.log('[MAIL-MOCK] Betreff:', subject);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html: htmlBody,
  });
  console.log('[MAIL] Gesendet an', to);
}

function tplBestaetigung(b, t) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;}
.header{background:#1b3d1b;color:#fff;padding:24px 28px;text-align:center;}
.header h1{margin:0;font-size:18px;letter-spacing:2px;text-transform:uppercase;}
.body{padding:24px 28px;background:#fff;border:1px solid #d5ccb8;}
.highlight{background:#f7f3ea;padding:16px;margin:16px 0;border-left:3px solid #1b3d1b;}
.footer{padding:16px 28px;font-size:12px;color:#888;text-align:center;}
</style></head><body>
<div class="header"><h1>Buchungsbestätigung</h1></div>
<div class="body">
<p>Sehr geehrte/r ${b.kontaktperson},</p>
<p>wir freuen uns, Ihre Buchung für die <strong>Gurktaler Kräuterführung</strong> bestätigen zu dürfen.</p>
<div class="highlight">
  <strong>Termin:</strong> ${t.label} (${t.tag}), ${t.uhrzeit} Uhr<br>
  <strong>Personen:</strong> ${b.participantCount}<br>
  <strong>Gesamtpreis:</strong> € ${b.gesamtpreis},– (Barzahlung vor Ort)<br>
  <strong>Buchungsnummer:</strong> ${b.id}<br>
  <strong>Treffpunkt:</strong> Domplatz 11, Stift Gurk — Einfahrt JUFA-Hotel<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Schild „Hier geht's zur Gurktaler Führung"
</div>
<p>Bitte achten Sie auf wetterfeste Kleidung und festes Schuhwerk.</p>
<p>Bei Fragen stehen wir gerne unter <a href="mailto:diwk@aon.at">diwk@aon.at</a> zur Verfügung.</p>
<p>Wir freuen uns auf Sie!</p>
<p>Mit herzlichen Grüßen,<br>Ihr Gurktaler-Team</p>
</div>
<div class="footer">Gurktaler Kräuterführungen · Stift Gurk · Kärnten</div>
</body></html>`;
}

function tplNotify(b, t) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;}
.header{background:#1b3d1b;color:#fff;padding:16px 28px;}
.header h1{margin:0;font-size:15px;}
.body{padding:20px 28px;background:#fff;border:1px solid #d5ccb8;}
table{border-collapse:collapse;width:100%;}
td{padding:6px 0;vertical-align:top;}
td:first-child{color:#555;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-right:16px;white-space:nowrap;}
</style></head><body>
<div class="header"><h1>Neue Web-Buchung</h1></div>
<div class="body">
<table>
<tr><td>Buchungsnr.</td><td><strong>${b.id}</strong></td></tr>
<tr><td>Termin</td><td>${t.label} (${t.tag}), ${t.uhrzeit} Uhr</td></tr>
<tr><td>Kontaktperson</td><td>${b.kontaktperson}</td></tr>
<tr><td>E-Mail</td><td><a href="mailto:${b.kontaktemail}">${b.kontaktemail}</a></td></tr>
<tr><td>Telefon</td><td>${b.kontakttelefon || '–'}</td></tr>
<tr><td>Personen</td><td><strong>${b.participantCount}</strong></td></tr>
<tr><td>Gesamtpreis</td><td>€ ${b.gesamtpreis},–</td></tr>
<tr><td>Gebucht am</td><td>${new Date(b.createdAt).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })}</td></tr>
</table>
</div>
</body></html>`;
}

function tplAbsage(b, t, grund) {
  const grundText = grund || 'Mindest-Teilnehmerzahl nicht erreicht.';
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;}
.header{background:#9e2c1c;color:#fff;padding:24px 28px;text-align:center;}
.header h1{margin:0;font-size:18px;letter-spacing:2px;text-transform:uppercase;}
.body{padding:24px 28px;background:#fff;border:1px solid #d5ccb8;}
.highlight{background:#f7f3ea;padding:16px;margin:16px 0;border-left:3px solid #9e2c1c;}
.footer{padding:16px 28px;font-size:12px;color:#888;text-align:center;}
</style></head><body>
<div class="header"><h1>Absage Ihrer Buchung</h1></div>
<div class="body">
<p>Sehr geehrte/r ${b.kontaktperson},</p>
<p>leider müssen wir Ihre Buchung für die Gurktaler Kräuterführung absagen:</p>
<div class="highlight">
  <strong>Termin:</strong> ${t.label} (${t.tag}), ${t.uhrzeit} Uhr<br>
  <strong>Buchungsnummer:</strong> ${b.id}<br>
  <strong>Grund:</strong> ${grundText}
</div>
<p>Es fallen keine Kosten an — eine Vorauszahlung war nicht erforderlich.</p>
<p>Wir würden uns freuen, Sie bei einem anderen Termin begrüßen zu dürfen.</p>
<p>Mit herzlichen Grüßen und Entschuldigung für die Unannehmlichkeiten,<br>Ihr Gurktaler-Team</p>
</div>
<div class="footer">Gurktaler Kräuterführungen · Stift Gurk · Kärnten</div>
</body></html>`;
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

  // Auth-Prüfung — öffentliche Führungs-Endpunkte ausgenommen
  if (p.startsWith('/api/') && !PUBLIC_API.has(p)) {
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

  // ── GET /api/fuehrungen/kapazitaet — freie Plätze je Termin (public) ───
  if (method === 'GET' && p === '/api/fuehrungen/kapazitaet') {
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(path.join(DB_PATH, 'appointments.json'), 'utf8')); } catch {}
    const result = {};
    for (const t of FUEHRUNGEN_TERMINE) {
      const gebucht = appointments
        .filter(a => a.terminId === t.id && a.buchungsquelle === 'web' && a.status !== 'abgesagt')
        .reduce((s, a) => s + (a.participantCount || 0), 0);
      result[t.id] = Math.max(0, t.kapazitaet - gebucht);
    }
    return jsonOk(res, result);
  }

  // ── POST /api/fuehrungen/buchen — Buchung anlegen + E-Mails (public) ───
  if (method === 'POST' && p === '/api/fuehrungen/buchen') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return jsonError(res, 400, 'Ungültiges JSON'); }
    const { terminId, personen, vorname, nachname, email, telefon } = body;
    const termin = FUEHRUNGEN_TERMINE.find(t => t.id === terminId);
    if (!termin) return jsonError(res, 400, 'Ungültiger Termin');
    if (!personen || personen < 1 || personen > 30) return jsonError(res, 400, 'Ungültige Personenzahl');
    if (!vorname?.trim() || !nachname?.trim()) return jsonError(res, 400, 'Vor- und Nachname erforderlich');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(res, 400, 'Ungültige E-Mail-Adresse');

    // Kapazität prüfen
    const apPath = path.join(DB_PATH, 'appointments.json');
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(apPath, 'utf8')); } catch {}
    const gebucht = appointments
      .filter(a => a.terminId === terminId && a.buchungsquelle === 'web' && a.status !== 'abgesagt')
      .reduce((s, a) => s + (a.participantCount || 0), 0);
    if (gebucht + Number(personen) > termin.kapazitaet)
      return jsonError(res, 409, `Kapazität erschöpft — noch ${termin.kapazitaet - gebucht} Plätze frei`);

    const buchungId = 'BK-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const now = new Date().toISOString();
    const startIso = termin.datum + 'T' + termin.uhrzeit + ':00.000+02:00';
    const endIso   = termin.datum + 'T' + (parseInt(termin.uhrzeit) + 2) + ':00:00.000+02:00';

    const buchung = {
      id:               buchungId,
      buchungsquelle:   'web',
      terminId,
      title:            `Web-Buchung: ${vorname.trim()} ${nachname.trim()} (${personen} Pers.)`,
      type:             'führung',
      status:           'bestätigt',
      startDate:        startIso,
      endDate:          endIso,
      participantCount: Number(personen),
      kontaktperson:    `${vorname.trim()} ${nachname.trim()}`,
      kontaktemail:     email.trim().toLowerCase(),
      kontakttelefon:   telefon?.trim() || '',
      gesamtpreis:      Number(personen) * FUEHRUNG_PREIS,
      createdAt:        now,
      updatedAt:        now,
    };
    appointments.push(buchung);
    await safeWriteJson(apPath, appointments);
    console.log('[FÜHRUNG-BUCHUNG]', buchungId, buchung.kontaktperson, termin.label);

    // E-Mails (non-blocking)
    sendFuehrungsMail(email.trim(), `Buchungsbestätigung – Gurktaler Führung ${termin.label}`, tplBestaetigung(buchung, termin)).catch(e => console.error('[MAIL-ERR]', e.message));
    sendFuehrungsMail(NOTIFY_TO, `Neue Buchung: ${buchung.kontaktperson}, ${personen} Pers., ${termin.label}`, tplNotify(buchung, termin)).catch(e => console.error('[MAIL-ERR]', e.message));

    return jsonOk(res, { success: true, buchungId, terminLabel: `${termin.label} (${termin.tag}), ${termin.uhrzeit} Uhr`, personen: Number(personen), gesamtpreis: buchung.gesamtpreis });
  }

  // ── POST /api/fuehrungen/absage — Termin absagen, alle informieren ───────
  if (method === 'POST' && p === '/api/fuehrungen/absage') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return jsonError(res, 400, 'Ungültiges JSON'); }
    const { terminId, grund } = body;
    const termin = FUEHRUNGEN_TERMINE.find(t => t.id === terminId);
    if (!termin) return jsonError(res, 400, 'Ungültiger Termin');

    const apPath = path.join(DB_PATH, 'appointments.json');
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(apPath, 'utf8')); } catch {}
    const betroffen = appointments.filter(a => a.terminId === terminId && a.buchungsquelle === 'web' && a.status !== 'abgesagt');
    appointments.forEach(a => { if (a.terminId === terminId && a.buchungsquelle === 'web' && a.status !== 'abgesagt') a.status = 'abgesagt'; });
    await safeWriteJson(apPath, appointments);

    let gesendet = 0;
    for (const b of betroffen) {
      try {
        await sendFuehrungsMail(b.kontaktemail, `Absage – Gurktaler Führung ${termin.label}`, tplAbsage(b, termin, grund));
        gesendet++;
      } catch (e) { console.error('[MAIL-ERR]', e.message); }
    }
    console.log('[FÜHRUNG-ABSAGE]', terminId, '— E-Mails gesendet:', gesendet);
    return jsonOk(res, { success: true, terminId, emailsGesendet: gesendet, betroffenePersonen: betroffen.reduce((s, b) => s + (b.participantCount || 0), 0) });
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
