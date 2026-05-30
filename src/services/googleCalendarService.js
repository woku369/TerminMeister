// Service für Google Calendar Integration (OAuth2 + API)
// Hinweis: Für die Nutzung muss ein Google Cloud-Projekt mit aktivierter Calendar API und OAuth2-Client-ID existieren.
// Siehe: https://developers.google.com/calendar/api/quickstart/js

let gapiLoaded = false;

export const GoogleCalendarService = {
  // Google API laden
  async loadGapi() {
    if (gapiLoaded) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', async () => {
          gapiLoaded = true;
          resolve();
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  },

  // Initialisiere Google API Client
  async initClient({ clientId }) {
    await this.loadGapi();
    return window.gapi.client.init({
      apiKey: '', // Optional, für öffentliche Daten
      clientId,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
      ],
      scope: 'https://www.googleapis.com/auth/calendar.events'
    });
  },

  // Login/Logout
  signIn() {
    return window.gapi.auth2.getAuthInstance().signIn();
  },
  signOut() {
    return window.gapi.auth2.getAuthInstance().signOut();
  },
  isSignedIn() {
    return window.gapi.auth2.getAuthInstance().isSignedIn.get();
  },
  getUser() {
    return window.gapi.auth2.getAuthInstance().currentUser.get();
  },

  // Termin in Google Kalender eintragen
  async createEvent({ summary, description, start, end, location }) {
    const event = {
      summary,
      description,
      start: { dateTime: start, timeZone: 'Europe/Berlin' },
      end: { dateTime: end, timeZone: 'Europe/Berlin' },
      location
    };
    return window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });
  }
};
