// NAS-Sync via REST API (Port 3005)
// Gleicher Endpunkt wie Mobile PWA → gleiche Datenbasis
import { StorageService } from '../utils/storage.js';

const API_FILES = [
  { storageKey: 'terminmodul_appointments', file: 'appointments' },
  { storageKey: 'terminmodul_participants', file: 'participants'  },
  { storageKey: 'terminmodul_reminders',    file: 'reminders'    },
  { storageKey: 'terminmodul_team_members', file: 'teams'        },
  { storageKey: 'terminmodul_settings',     file: 'settings'     },
];

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export const nasStorageService = {
  async testConnection({ nasUrl, nasApiKey }) {
    try {
      const headers = nasApiKey ? { 'x-api-key': nasApiKey } : {};
      const r = await apiFetch(`${nasUrl}/api/health`, { headers });
      return r.success === true;
    } catch {
      return false;
    }
  },

  // Alle Daten vom NAS laden (GET /api/sync)
  async downloadAll({ nasUrl, nasApiKey }) {
    const headers = nasApiKey ? { 'x-api-key': nasApiKey } : {};
    const r = await apiFetch(`${nasUrl}/api/sync`, { headers });
    if (!r.success) throw new Error('NAS-Sync fehlgeschlagen');
    return r.data; // { appointments: [...], participants: [...], ... }
  },

  // Alle lokalen Daten auf NAS hochladen (POST /api/sync)
  async uploadAll({ nasUrl, nasApiKey }) {
    const payload = {};
    for (const { storageKey, file } of API_FILES) {
      try {
        const raw = localStorage.getItem(storageKey);
        payload[file] = raw ? JSON.parse(raw) : [];
      } catch {
        payload[file] = [];
      }
    }
    const headers = nasApiKey ? { 'x-api-key': nasApiKey } : {};
    const r = await apiFetch(`${nasUrl}/api/sync`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers,
    });
    if (!r.success) throw new Error('NAS-Upload fehlgeschlagen');
    return r;
  },
};

// Initialer Download aller Grunddaten von NAS → localStorage
export async function initialNasSync(settings) {
  const data = await nasStorageService.downloadAll({
    nasUrl:    settings.nasUrl,
    nasApiKey: settings.nasApiKey,
  });
  const keyMap = {
    appointments: 'terminmodul_appointments',
    participants:  'terminmodul_participants',
    reminders:     'terminmodul_reminders',
    teams:         'terminmodul_team_members',
    settings:      'terminmodul_settings',
  };
  for (const [key, storageKey] of Object.entries(keyMap)) {
    if (data[key] !== undefined) {
      localStorage.setItem(storageKey, JSON.stringify(data[key]));
    }
  }
}

// Komplettsync: localStorage → NAS
export async function fullNasUpload(settings) {
  return nasStorageService.uploadAll({
    nasUrl:    settings.nasUrl,
    nasApiKey: settings.nasApiKey,
  });
}
