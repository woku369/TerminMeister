// LagerMeister API Service (Port 3006)
const DEFAULT_LAGER_BASE = 'http://100.121.103.107:3006';

function getLagerBase() {
  return localStorage.getItem('lagermeister_url') || DEFAULT_LAGER_BASE;
}

async function lagerFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(getLagerBase() + path, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getBestand() {
  return lagerFetch('/api/bestand');
}

export async function postAbgang({ artikelId, menge, grund, referenz }) {
  return lagerFetch('/api/abgang', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artikelId, menge, grund, referenz }),
  });
}
