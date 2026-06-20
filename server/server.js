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
const API_KEY   = process.env.API_KEY || null;
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
const ADMIN_PASS   = process.env.ADMIN_PASS   || '';

// Führungen-Konfiguration Saison 2026
const FUEHRUNGEN_TERMINE = [
  { id: 't1', datum: '2026-07-19', label: '19.07.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30, dauer: 120 },
  { id: 't2', datum: '2026-08-15', label: '15.08.2026', tag: 'Sa', uhrzeit: '13:00', kapazitaet: 30, dauer: 120 },
  { id: 't3', datum: '2026-09-13', label: '13.09.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30, dauer: 120 },
  { id: 't4', datum: '2026-10-18', label: '18.10.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30, dauer: 120 },
];
const FUEHRUNG_PREIS = 15;
const FUEHRUNG_ORT   = 'Domplatz 11, Stift Gurk — Einfahrt JUFA-Hotel';

function isoDateTime(datum, uhrzeit, plusMin = 0) {
  const [h, m] = uhrzeit.split(':').map(Number);
  const total = h * 60 + m + plusMin;
  return `${datum}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}

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

// ── Verzeichnisstruktur beim Start anlegen ─────────────────────────────────────────
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

// ── Datenverlustschutz – safeWriteJson ─────────────────────────────────────────
async function safeWriteJson(filePath, newData) {
  let existing = [];
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    existing = JSON.parse(raw);
  } catch {}

  if (Array.isArray(existing) && existing.length > 0 &&
      Array.isArray(newData)  && newData.length === 0) {
    throw new Error(
      'DATENVERLUST-SCHUTZ: Leeres Array blockiert (' + existing.length + ' Datensaetze vorhanden)'
    );
  }
  if (Array.isArray(existing) && existing.length > 10 &&
      Array.isArray(newData)  && newData.length < existing.length * 0.5) {
    console.warn('WARNUNG: Starker Datenverlust erkannt:', path.basename(filePath),
      existing.length, '->', newData.length);
  }
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

// ── Body-Lese-Helfer ────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ── Dateiname validieren (Whitelist) ───────────────────────────────────────────────────
function validateFileName(name) {
  if (!name || !ALLOWED_FILES.includes(name)) {
    throw Object.assign(
      new Error('Ungueltiger oder nicht erlaubter Dateiname: ' + name),
      { status: 400 }
    );
  }
  return name;
}

// ── E-Mail-Versand (nodemailer mit Mock-Fallback) ────────────────────────────────────
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

// ── Admin Basic-Auth ─────────────────────────────────────────────────────────────────────
function checkAdminAuth(req, res) {
  if (!ADMIN_PASS) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Admin-Zugang nicht konfiguriert (ADMIN_PASS fehlt).');
    return false;
  }
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const [, pass] = decoded.split(':');
    if (pass === ADMIN_PASS) return true;
  }
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Gurktaler Führungen Admin"',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end('Zugriff verweigert');
  return false;
}

// ── Admin-Dashboard HTML (inline) ────────────────────────────────────────────────────────────
function adminHtml() {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Führungen Admin · Gurktaler</title>
<style>
:root{--green:#1b3d1b;--gold:#b8891a;--cream:#f7f3ea;--cream-dk:#ece4d0;--border:#d5ccb8;--text:#1a1a1a;--muted:#555;--red:#9e2c1c;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;background:var(--cream);color:var(--text);font-size:14px;}
header{background:var(--green);padding:16px 32px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
header h1{color:#fff;font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;}
header span{color:rgba(255,255,255,.5);font-size:12px;}
.wrap{max-width:1100px;margin:0 auto;padding:28px 24px;}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:28px;}
.stat{background:#fff;border:1px solid var(--border);padding:16px 20px;}
.stat-v{font-size:28px;font-weight:800;color:var(--green);line-height:1;}
.stat-l{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-top:4px;}
.block{background:#fff;border:1px solid var(--border);margin-bottom:20px;}
.block-head{background:var(--green);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.block-head h2{color:#fff;font-size:14px;font-weight:700;}
.meta{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
.badge{padding:3px 10px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
.ok{background:rgba(255,255,255,.15);color:#fff;}
.warn{background:var(--gold);color:#fff;}
.voll{background:var(--red);color:#fff;}
.btn-abs{background:transparent;border:1px solid rgba(255,255,255,.4);color:rgba(255,255,255,.85);padding:5px 14px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;}
.btn-abs:hover{background:rgba(255,255,255,.1);}
.btn-neu{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.5);color:#fff;padding:6px 16px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-left:auto;}
.btn-neu:hover{background:rgba(255,255,255,.28);}
.badge-intern{background:#4a7c4a;color:#fff;}
.kapbar{height:5px;background:var(--cream-dk);margin:0 20px 2px;}
.kapbar-fill{height:100%;background:var(--green);transition:.3s;}
.kapbar-fill.warn{background:var(--gold);}
.kapbar-fill.voll{background:var(--red);}
table{width:100%;border-collapse:collapse;}
th{padding:8px 14px;background:var(--cream);font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);}
td{padding:8px 14px;border-bottom:1px solid var(--cream-dk);font-size:13px;vertical-align:top;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:#faf7f0;}
.empty{padding:20px;text-align:center;color:var(--muted);}
.modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100;align-items:center;justify-content:center;}
.modal-bg.show{display:flex;}
.modal{background:#fff;max-width:460px;width:90%;padding:28px;max-height:90vh;overflow-y:auto;}
.modal h3{color:var(--green);font-size:16px;margin-bottom:14px;}
.modal label{display:block;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;margin-top:12px;}
.modal label:first-of-type{margin-top:0;}
.modal input,.modal select,.modal textarea{width:100%;padding:9px 12px;border:1.5px solid var(--border);font-family:inherit;font-size:13px;outline:none;background:#fff;}
.modal input:focus,.modal select:focus,.modal textarea:focus{border-color:var(--green);}
.modal textarea{resize:vertical;min-height:60px;}
.modal .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.modal-btns{display:flex;gap:10px;margin-top:16px;justify-content:flex-end;}
.btn{padding:9px 18px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border:none;}
.btn-cancel{background:var(--cream-dk);color:var(--text);}
.btn-confirm{background:var(--red);color:#fff;}
.btn-save{background:var(--green);color:#fff;}
.toast{position:fixed;bottom:24px;right:24px;background:var(--green);color:#fff;padding:12px 20px;font-size:13px;font-weight:600;opacity:0;transition:.3s;pointer-events:none;z-index:200;}
.toast.show{opacity:1;}
</style>
</head>
<body>
<header>
  <h1>Führungen Admin</h1>
  <span>Gurktaler Kräuterführungen · Saison 2026</span>
  <button class="btn-neu" onclick="openNeu()">+ Termin manuell erfassen</button>
</header>
<div class="wrap">
  <div class="stats">
    <div class="stat"><div class="stat-v" id="s-total">–</div><div class="stat-l">Buchungen</div></div>
    <div class="stat"><div class="stat-v" id="s-pers">–</div><div class="stat-l">Personen</div></div>
    <div class="stat"><div class="stat-v" id="s-umsatz">–</div><div class="stat-l">Erw. Umsatz</div></div>
    <div class="stat"><div class="stat-v" id="s-frei">–</div><div class="stat-l">Freie Plätze</div></div>
  </div>
  <div id="termine"></div>
</div>

<div class="modal-bg" id="neuBg">
  <div class="modal">
    <h3>Termin manuell erfassen</h3>
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Für telefonische oder direkte Anmeldungen — erscheint im TerminMeister und zählt zur Kapazität.</p>
    <label>Für welchen Termin?</label>
    <select id="nTerminId" onchange="toggleFreierTermin()">
      <option value="t1">19.07.2026 · So · 14:00 Uhr</option>
      <option value="t2">15.08.2026 · Sa · 13:00 Uhr</option>
      <option value="t3">13.09.2026 · So · 14:00 Uhr</option>
      <option value="t4">18.10.2026 · So · 14:00 Uhr</option>
      <option value="">Anderer Termin / privat</option>
    </select>
    <div id="freiTermin" style="display:none">
      <label>Datum</label>
      <input type="date" id="nDatum">
      <div class="row2">
        <div><label>Von</label><input type="time" id="nVon" value="14:00"></div>
        <div><label>Bis</label><input type="time" id="nBis" value="16:00"></div>
      </div>
    </div>
    <label>Kontaktperson / Gruppe *</label>
    <input type="text" id="nName" placeholder="z.B. Familie Müller oder Schulklasse 3A">
    <div class="row2">
      <div><label>Personen *</label><input type="number" id="nPers" min="1" max="60" value="1"></div>
      <div><label>Telefon</label><input type="tel" id="nTel" placeholder="0664 ..."></div>
    </div>
    <label>E-Mail</label>
    <input type="email" id="nEmail" placeholder="optional">
    <label>Notizen / Besonderheiten</label>
    <textarea id="nNotiz" placeholder="z.B. Rollstuhlfahrer, spezielle Wünsche ..."></textarea>
    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeNeu()">Abbrechen</button>
      <button class="btn btn-save" onclick="doNeu()">Eintragen</button>
    </div>
  </div>
</div>

<div class="modal-bg" id="modalBg">
  <div class="modal">
    <h3>Termin absagen</h3>
    <p style="font-size:13px;color:#555;margin-bottom:14px;">Alle angemeldeten Gäste erhalten eine Absage-E-Mail.</p>
    <label>Termin</label>
    <p style="font-size:14px;font-weight:700;margin-bottom:14px;" id="modalTermin">–</p>
    <label>Grund (optional)</label>
    <textarea id="modalGrund" placeholder="Mindest-Teilnehmerzahl nicht erreicht."></textarea>
    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-confirm" onclick="doAbsage()">Absagen &amp; E-Mails senden</button>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
let pendingId = null;

async function load() {
  try {
    const r = await fetch('/api/fuehrungen/admin/buchungen');
    if (r.status === 401) { document.body.innerHTML = '<p style="padding:40px;font-size:16px;color:#9e2c1c;">Zugriff verweigert — bitte Seite neu laden.</p>'; return; }
    const data = await r.json();
    renderStats(data.summary);
    renderTermine(data.summary);
  } catch(e) {
    document.getElementById('termine').innerHTML = '<p style="padding:24px;color:#9e2c1c;">Fehler: '+e.message+'</p>';
  }
}

function renderStats(summary) {
  const alle = summary.flatMap(s => s.buchungen);
  document.getElementById('s-total').textContent = alle.length;
  const pers = alle.reduce((s,b)=>s+b.participantCount,0);
  document.getElementById('s-pers').textContent = pers;
  document.getElementById('s-umsatz').textContent = '€ '+( pers*15).toLocaleString('de-AT')+'\u2c,–';
  document.getElementById('s-frei').textContent = summary.reduce((s,t)=>s+t.freiePlaetze,0);
}

function renderTermine(summary) {
  document.getElementById('termine').innerHTML = summary.map(s => {
    const pct = Math.min(100, Math.round(s.gesamtPersonen/s.kapazitaet*100));
    const bc = pct>=100?'voll':pct>=70?'warn':'ok';
    const bt = pct>=100?'Ausgebucht':pct>=70?'Fast voll':'Plätze frei';
    return `<div class="block">
      <div class="block-head">
        <h2>${s.label} · ${s.tag} · ${s.uhrzeit} Uhr</h2>
        <div class="meta">
          <span class="badge ${bc}">${bt}</span>
          <span style="color:rgba(255,255,255,.7);font-size:12px;">${s.gesamtPersonen}/${s.kapazitaet} Pers.</span>
          ${s.buchungen.length>0?`<button class="btn-abs" onclick="openModal('${s.terminId}','${s.label} (${s.tag}), ${s.uhrzeit} Uhr')">Absagen</button>`:''}
        </div>
      </div>
      <div class="kapbar"><div class="kapbar-fill ${bc}" style="width:${pct}%"></div></div>
      ${s.buchungen.length===0
        ?'<div class="empty">Noch keine Buchungen für diesen Termin.</div>'
        :`<table><thead><tr><th>Buchungsnr.</th><th>Name</th><th>E-Mail</th><th>Telefon</th><th style="text-align:right">Pers.</th><th style="text-align:right">Preis</th><th>Quelle</th><th>Gebucht am</th></tr></thead><tbody>
          ${s.buchungen.map(b=>`<tr>
            <td style="font-family:monospace;font-size:12px">${b.id}</td>
            <td style="font-weight:600">${b.kontaktperson}</td>
            <td><a href="mailto:${b.kontaktemail}" style="color:var(--green)">${b.kontaktemail||'–'}</a></td>
            <td>${b.kontakttelefon||'–'}</td>
            <td style="text-align:right;font-weight:700">${b.participantCount||b.gruppengröße||'–'}</td>
            <td style="text-align:right">€ ${b.gesamtpreis||'–'},–</td>
            <td><span class="badge ${b.buchungsquelle==='intern'?'badge-intern':'ok'}" style="font-size:9px">${b.buchungsquelle==='intern'?'Direkt':'Online'}</span></td>
            <td style="color:var(--muted)">${new Date(b.createdAt).toLocaleString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
          </tr>`).join('')}
        </tbody></table>`}
    </div>`;
  }).join('');
}

function openModal(id, label) {
  pendingId = id;
  document.getElementById('modalTermin').textContent = label;
  document.getElementById('modalGrund').value = '';
  document.getElementById('modalBg').classList.add('show');
}
function closeModal() { document.getElementById('modalBg').classList.remove('show'); pendingId = null; }

async function doAbsage() {
  if (!pendingId) return;
  const id = pendingId;
  const grund = document.getElementById('modalGrund').value.trim() || 'Mindest-Teilnehmerzahl nicht erreicht.';
  closeModal();
  try {
    const r = await fetch('/api/fuehrungen/admin/absage', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({terminId:id,grund}) });
    const d = await r.json();
    if (d.success) toast('Absage gesendet · '+d.emailsGesendet+' E-Mails · '+d.betroffenePersonen+' Personen');
    else toast('Fehler: '+d.error);
    setTimeout(load, 600);
  } catch(e) { toast('Fehler: '+e.message); }
}

function openNeu() {
  document.getElementById('nName').value = '';
  document.getElementById('nPers').value = '1';
  document.getElementById('nTel').value = '';
  document.getElementById('nEmail').value = '';
  document.getElementById('nNotiz').value = '';
  document.getElementById('nTerminId').value = 't1';
  document.getElementById('freiTermin').style.display = 'none';
  document.getElementById('neuBg').classList.add('show');
}
function closeNeu() { document.getElementById('neuBg').classList.remove('show'); }
function toggleFreierTermin() {
  document.getElementById('freiTermin').style.display = document.getElementById('nTerminId').value ? 'none' : 'block';
}

async function doNeu() {
  const terminId = document.getElementById('nTerminId').value || null;
  const name = document.getElementById('nName').value.trim();
  const pers = parseInt(document.getElementById('nPers').value);
  if (!name) { alert('Bitte Kontaktperson eingeben.'); return; }
  if (!pers || pers < 1) { alert('Bitte Personenzahl eingeben.'); return; }
  const payload = {
    terminId,
    kontaktperson: name,
    personen: pers,
    kontakttelefon: document.getElementById('nTel').value.trim(),
    kontaktemail: document.getElementById('nEmail').value.trim(),
    besonderheiten: document.getElementById('nNotiz').value.trim(),
  };
  if (!terminId) {
    payload.datum = document.getElementById('nDatum').value;
    payload.uhrzeitVon = document.getElementById('nVon').value;
    payload.uhrzeitBis = document.getElementById('nBis').value;
    if (!payload.datum) { alert('Bitte Datum eingeben.'); return; }
  }
  closeNeu();
  try {
    const r = await fetch('/api/fuehrungen/admin/termin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const d = await r.json();
    if (d.success) toast('Termin eingetragen · Nr. ' + d.buchungId);
    else toast('Fehler: ' + d.error);
    setTimeout(load, 500);
  } catch(e) { toast('Fehler: ' + e.message); }
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 3500);
}

load();
setInterval(load, 30000);
</script>
</body>
</html>`;
}

// ── JSON-Antwort Helfer ───────────────────────────────────────────────────────────────────────
function jsonOk(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function jsonError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: false, error: message }));
}

// ── API-Key Prüfung ───────────────────────────────────────────────────────────────────────────
function checkAuth(req) {
  if (!API_KEY) return true;
  const key = req.headers['x-api-key'];
  return key === API_KEY;
}

// ── Router ──────────────────────────────────────────────────────────────────────────────────
async function router(req, res, url) {
  const method = req.method.toUpperCase();
  const p = url.pathname;

  if (p.startsWith('/api/') && !PUBLIC_API.has(p)) {
    if (!checkAuth(req)) return jsonError(res, 401, 'Unauthorized: x-api-key fehlt oder ungültig');
  }

  // ── GET /api/health ───────────────────────────────────────────────────────────────────
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

  // ── GET /api/data?file=appointments.json ───────────────────────────────────────────────
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

  // ── DELETE /api/item?file=appointments.json&id=xxx ──────────────────────────────────────
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
    const ts   = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const bdir = path.join(BASE_PATH, 'backups', 'deleted_' + ts);
    await fs.mkdir(bdir, { recursive: true });
    await fs.writeFile(path.join(bdir, fileName), JSON.stringify([removed], null, 2), 'utf8');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return jsonOk(res, { success: true, deleted: itemId, remaining: data.length });
  }

  // ── POST /api/data?file=appointments.json ───────────────────────────────────────────────
  if (method === 'POST' && p === '/api/data') {
    const fileName = validateFileName(url.searchParams.get('file'));
    const filePath = path.join(DB_PATH, fileName);
    const body = await readBody(req);
    const newData = JSON.parse(body);
    await safeWriteJson(filePath, newData);
    return jsonOk(res, { success: true, file: fileName, count: Array.isArray(newData) ? newData.length : 1 });
  }

  // ── GET /api/sync ──────────────────────────────────────────────────────────────────────────────
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

  // ── POST /api/sync ────────────────────────────────────────────────────────────────────────────
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

  // ── GET /api/completed-today ─────────────────────────────────────────────────────────────────────
  if (method === 'GET' && p === '/api/completed-today') {
    const dateParam = url.searchParams.get('date');
    const targetDate = dateParam || new Date().toISOString().split('T')[0];

    let appointments = [];
    try {
      const raw = await fs.readFile(path.join(DB_PATH, 'appointments.json'), 'utf8');
      appointments = JSON.parse(raw);
    } catch { appointments = []; }

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

        const dow = startDt ? startDt.getDay() : -1;
        const dayType = dow === 0 ? 'sunday' : dow === 6 ? 'saturday' : 'workday';

        return {
          source:          'terminmeister',
          appointmentId:   a.id,
          date:            targetDate,
          startTime:       startIso,
          endTime:         endIso,
          durationMinutes: durationMin,
          dayType:         dayType,
          workType:        'offsite',
          isSpecialHours:  true,
          project:         'Führungen',
          title:           a.title  || a.titel  || '',
          note:            [
            a.title || a.titel || '',
            a.description || a.beschreibung || '',
            a.organization ? 'Gruppe: ' + a.organization : ''
          ].filter(Boolean).join(' | '),
          groupName:       a.organization || '',
          participantCount:a.participantCount || (a.participants && a.participants.length) || 0,
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

  // ── GET /api/backups ──────────────────────────────────────────────────────────────────────────────
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
      .slice(0, 20);
    return jsonOk(res, { success: true, backups });
  }

  // ── GET /api/fuehrungen/kapazitaet ─────────────────────────────────────────────────────────────
  if (method === 'GET' && p === '/api/fuehrungen/kapazitaet') {
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(path.join(DB_PATH, 'appointments.json'), 'utf8')); } catch {}
    const result = {};
    for (const t of FUEHRUNGEN_TERMINE) {
      const gebucht = appointments
        .filter(a => a.terminId === t.id && (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt')
        .reduce((s, a) => s + (a.participantCount || 0), 0);
      result[t.id] = Math.max(0, t.kapazitaet - gebucht);
    }
    return jsonOk(res, result);
  }

  // ── POST /api/fuehrungen/buchen ──────────────────────────────────────────────────────────────────
  if (method === 'POST' && p === '/api/fuehrungen/buchen') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return jsonError(res, 400, 'Ungültiges JSON'); }
    const { terminId, personen, vorname, nachname, email, telefon } = body;
    const termin = FUEHRUNGEN_TERMINE.find(t => t.id === terminId);
    if (!termin) return jsonError(res, 400, 'Ungültiger Termin');
    if (!personen || personen < 1 || personen > 30) return jsonError(res, 400, 'Ungültige Personenzahl');
    if (!vorname?.trim() || !nachname?.trim()) return jsonError(res, 400, 'Vor- und Nachname erforderlich');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(res, 400, 'Ungültige E-Mail-Adresse');

    const apPath = path.join(DB_PATH, 'appointments.json');
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(apPath, 'utf8')); } catch {}
    const gebucht = appointments
      .filter(a => a.terminId === terminId && (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt')
      .reduce((s, a) => s + (a.participantCount || 0), 0);
    if (gebucht + Number(personen) > termin.kapazitaet)
      return jsonError(res, 409, `Kapazität erschöpft — noch ${termin.kapazitaet - gebucht} Plätze frei`);

    const buchungId = 'BK-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const now = new Date().toISOString();
    const name = `${vorname.trim()} ${nachname.trim()}`;

    const buchung = {
      id:               buchungId,
      title:            `Kräuterführung – ${name} (${personen} Pers.)`,
      description:      `Online-Buchung via Gurktaler Führungen\nBuchungsnr.: ${buchungId}\nPreis: € ${Number(personen) * FUEHRUNG_PREIS},–`,
      start:            isoDateTime(termin.datum, termin.uhrzeit),
      end:              isoDateTime(termin.datum, termin.uhrzeit, termin.dauer),
      type:             'führung',
      status:           'bestätigt',
      location:         FUEHRUNG_ORT,
      participants:     [],
      teamMitglied:     [],
      stationen:        [],
      wetterRelevant:   true,
      besonderheiten:   '',
      abgesagt:         false,
      verschoben:       false,
      kontaktperson:    name,
      kontaktemail:     email.trim().toLowerCase(),
      kontakttelefon:   telefon?.trim() || '',
      kontaktadresse:   '',
      gruppengroesse:   Number(personen),
      buchungsquelle:   'web',
      terminId,
      participantCount: Number(personen),
      gesamtpreis:      Number(personen) * FUEHRUNG_PREIS,
      createdAt:        now,
      updatedAt:        now,
    };
    appointments.push(buchung);
    await safeWriteJson(apPath, appointments);
    console.log('[FÜHRUNG-BUCHUNG]', buchungId, buchung.kontaktperson, termin.label);

    sendFuehrungsMail(email.trim(), `Buchungsbestätigung – Gurktaler Führung ${termin.label}`, tplBestaetigung(buchung, termin)).catch(e => console.error('[MAIL-ERR]', e.message));
    sendFuehrungsMail(NOTIFY_TO, `Neue Buchung: ${buchung.kontaktperson}, ${personen} Pers., ${termin.label}`, tplNotify(buchung, termin)).catch(e => console.error('[MAIL-ERR]', e.message));

    return jsonOk(res, { success: true, buchungId, terminLabel: `${termin.label} (${termin.tag}), ${termin.uhrzeit} Uhr`, personen: Number(personen), gesamtpreis: buchung.gesamtpreis });
  }

  // ── POST /api/fuehrungen/absage ──────────────────────────────────────────────────────────────────
  if (method === 'POST' && p === '/api/fuehrungen/absage') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return jsonError(res, 400, 'Ungültiges JSON'); }
    const { terminId, grund } = body;
    const termin = FUEHRUNGEN_TERMINE.find(t => t.id === terminId);
    if (!termin) return jsonError(res, 400, 'Ungültiger Termin');

    const apPath = path.join(DB_PATH, 'appointments.json');
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(apPath, 'utf8')); } catch {}
    const betroffen = appointments.filter(a => a.terminId === terminId && (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt');
    appointments.forEach(a => { if (a.terminId === terminId && (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt') { a.status = 'abgesagt'; a.abgesagt = true; a.updatedAt = new Date().toISOString(); } });
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

  // ── GET /fuehrungen-admin ───────────────────────────────────────────────────────────────────────────
  if (method === 'GET' && p === '/fuehrungen-admin') {
    if (!checkAdminAuth(req, res)) return;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(adminHtml());
  }

  // ── GET /api/fuehrungen/admin/buchungen ─────────────────────────────────────────────────────────
  if (method === 'GET' && p === '/api/fuehrungen/admin/buchungen') {
    if (!checkAdminAuth(req, res)) return;
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(path.join(DB_PATH, 'appointments.json'), 'utf8')); } catch {}
    const webBuchungen = appointments.filter(a => (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt');
    const summary = FUEHRUNGEN_TERMINE.map(t => {
      const buchungen = webBuchungen.filter(a => a.terminId === t.id);
      const gesamtPersonen = buchungen.reduce((s, a) => s + (a.participantCount || 0), 0);
      return {
        terminId:       t.id,
        label:          t.label,
        tag:            t.tag,
        uhrzeit:        t.uhrzeit,
        kapazitaet:     t.kapazitaet,
        gesamtPersonen,
        freiePlaetze:   Math.max(0, t.kapazitaet - gesamtPersonen),
        buchungen,
      };
    });
    return jsonOk(res, { success: true, summary });
  }

  // ── POST /api/fuehrungen/admin/absage ───────────────────────────────────────────────────────────
  if (method === 'POST' && p === '/api/fuehrungen/admin/absage') {
    if (!checkAdminAuth(req, res)) return;
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return jsonError(res, 400, 'Ungültiges JSON'); }
    const { terminId, grund } = body;
    const termin = FUEHRUNGEN_TERME.find(t => t.id === terminId);
    if (!termin) return jsonError(res, 400, 'Ungültiger Termin');

    const apPath = path.join(DB_PATH, 'appointments.json');
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(apPath, 'utf8')); } catch {}
    const betroffen = appointments.filter(a => a.terminId === terminId && (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt');
    appointments.forEach(a => { if (a.terminId === terminId && (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt') { a.status = 'abgesagt'; a.abgesagt = true; a.updatedAt = new Date().toISOString(); } });
    await safeWriteJson(apPath, appointments);

    let gesendet = 0;
    for (const b of betroffen) {
      try {
        await sendFuehrungsMail(b.kontaktemail, `Absage – Gurktaler Führung ${termin.label}`, tplAbsage(b, termin, grund));
        gesendet++;
      } catch (e) { console.error('[MAIL-ERR]', e.message); }
    }
    console.log('[ADMIN-ABSAGE]', terminId, '— E-Mails gesendet:', gesendet);
    return jsonOk(res, { success: true, terminId, emailsGesendet: gesendet, betroffenePersonen: betroffen.reduce((s, b) => s + (b.participantCount || 0), 0) });
  }

  // ── POST /api/fuehrungen/admin/termin ────────────────────────────────────────────────────────────
  if (method === 'POST' && p === '/api/fuehrungen/admin/termin') {
    if (!checkAdminAuth(req, res)) return;
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return jsonError(res, 400, 'Ungültiges JSON'); }
    const { terminId, datum, uhrzeitVon, uhrzeitBis, kontaktperson, personen, kontaktemail, kontakttelefon, besonderheiten } = body;
    if (!kontaktperson?.trim()) return jsonError(res, 400, 'Kontaktperson erforderlich');
    if (!personen || personen < 1) return jsonError(res, 400, 'Personenzahl erforderlich');

    let startIso, endIso, verknuepftTermin = null;

    if (terminId) {
      const termin = FUEHRUNGEN_TERME.find(t => t.id === terminId);
      if (!termin) return jsonError(res, 400, 'Ungültiger Termin');
      const apPath2 = path.join(DB_PATH, 'appointments.json');
      let apts2 = [];
      try { apts2 = JSON.parse(await fs.readFile(apPath2, 'utf8')); } catch {}
      const gebucht2 = apts2.filter(a => a.terminId === terminId && (a.buchungsquelle === 'web' || a.buchungsquelle === 'intern') && a.status !== 'abgesagt').reduce((s, a) => s + (a.participantCount || 0), 0);
      if (gebucht2 + Number(personen) > termin.kapazitaet)
        return jsonError(res, 409, `Kapazität erschöpft — noch ${termin.kapazitaet - gebucht2} Plätze frei`);
      startIso = isoDateTime(termin.datum, termin.uhrzeit);
      endIso   = isoDateTime(termin.datum, termin.uhrzeit, termin.dauer);
      verknuepftTermin = terminId;
    } else {
      if (!datum || !uhrzeitVon || !uhrzeitBis) return jsonError(res, 400, 'Datum und Uhrzeit erforderlich');
      startIso = `${datum}T${uhrzeitVon}:00`;
      endIso   = `${datum}T${uhrzeitBis}:00`;
    }

    const buchungId = 'INT-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const now = new Date().toISOString();
    const eintrag = {
      id:               buchungId,
      title:            `Führung – ${kontaktperson.trim()} (${personen} Pers.)`,
      description:      `Manuell erfasst von Marlies\nBuchungsnr.: ${buchungId}${besonderheiten ? '\n\n' + besonderheiten : ''}`,
      start:            startIso,
      end:              endIso,
      type:             'führung',
      status:           'bestätigt',
      location:         FUEHRUNG_ORT,
      participants:     [],
      teamMitglied:     [],
      stationen:        [],
      wetterRelevant:   true,
      besonderheiten:   besonderheiten?.trim() || '',
      abgesagt:         false,
      verschoben:       false,
      kontaktperson:    kontaktperson.trim(),
      kontaktemail:     kontaktemail?.trim() || '',
      kontakttelefon:   kontakttelefon?.trim() || '',
      kontaktadresse:   '',
      gruppengroesse:   Number(personen),
      buchungsquelle:   'intern',
      terminId:         verknuepftTermin,
      participantCount: Number(personen),
      gesamtpreis:      Number(personen) * FUEHRUNG_PREIS,
      createdAt:        now,
      updatedAt:        now,
    };

    const apPath = path.join(DB_PATH, 'appointments.json');
    let appointments = [];
    try { appointments = JSON.parse(await fs.readFile(apPath, 'utf8')); } catch {}
    appointments.push(eintrag);
    await safeWriteJson(apPath, appointments);
    console.log('[INTERN-BUCHUNG]', buchungId, eintrag.kontaktperson, eintrag.start);
    return jsonOk(res, { success: true, buchungId });
  }

  // ── Statische Dateien (PWA) ──────────────────────────────────────────────────────────────────
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

// ── HTTP-Server ──────────────────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  try {
    const url = new URL(req.url, 'http://localhost:' + PORT);
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
  console.log('  Admin  : http://100.121.103.107:' + PORT + '/fuehrungen-admin  [ADMIN_PASS ' + (ADMIN_PASS ? 'gesetzt ✓' : 'FEHLT – Zugang gesperrt!') + ']');
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
