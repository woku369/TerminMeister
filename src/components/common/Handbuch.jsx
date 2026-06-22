import React, { useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  Chip, Divider, List, ListItem, ListItemIcon, ListItemText, Paper, Button
} from '@mui/material';
import {
  MdExpandMore, MdCalendarMonth, MdPeople, MdGroups, MdNotifications,
  MdAssessment, MdCloudSync, MdSettings, MdPhone, MdCheckCircle,
  MdInfo, MdLightbulb, MdLanguage, MdAdminPanelSettings
} from 'react-icons/md';

const QR_CODE_DATA = 'data:image/png;base64,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';

const Section = ({ icon, title, children, defaultExpanded = false }) => (
  <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 1 }}>
    <AccordionSummary expandIcon={<MdExpandMore />}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails>{children}</AccordionDetails>
  </Accordion>
);

const Step = ({ nr, text }) => (
  <ListItem sx={{ py: 0.3 }}>
    <ListItemIcon sx={{ minWidth: 32 }}>
      <Chip label={nr} size="small" color="primary" sx={{ width: 24, height: 24, fontSize: 11 }} />
    </ListItemIcon>
    <ListItemText primary={text} />
  </ListItem>
);

const Hint = ({ text }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1, p: 1.5, bgcolor: '#fff8e1', borderRadius: 1 }}>
    <MdLightbulb color="#f9a825" style={{ marginTop: 2, flexShrink: 0 }} />
    <Typography variant="body2" color="text.secondary">{text}</Typography>
  </Box>
);

const Handbuch = () => {
  return (
    <Box sx={{ maxWidth: 780, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <MdInfo size={28} color="#1976d2" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Handbuch – TerminMeister</Typography>
          <Typography variant="body2" color="text.secondary">
            Stift Gurk · Kräutergarten-Führungen · v1.0.0
          </Typography>
        </Box>
      </Box>

      <Section icon={<MdCalendarMonth />} title="Kalender – Termine verwalten" defaultExpanded>
        <Typography variant="body2" gutterBottom>
          Der Kalender ist die Hauptansicht. Termine werden farblich nach Status markiert.
        </Typography>
        <List dense>
          <Step nr="1" text="Klick auf einen freien Kalenderbereich → neuer Termin" />
          <Step nr="2" text="Klick auf einen bestehenden Termin → Bearbeitungsdialog öffnet sich" />
          <Step nr="3" text="Im Dialog: Titel, Datum, Uhrzeit, Dauer, Teilnehmerzahl, Typ, Status, Gruppe, Kontakt, Beschreibung" />
          <Step nr="4" text="Status 'Abgeschlossen' → Tab 'Nachbereitung' erscheint automatisch" />
        </List>
        <Hint text="Zeiten lassen sich auch bei abgeschlossenen Terminen noch korrigieren (Busverspätung, komprimierte Führung)." />
      </Section>

      <Section icon={<MdCheckCircle />} title="Nachbereitung (abgeschlossene Termine)">
        <Typography variant="body2" gutterBottom>
          Sobald ein Termin auf &quot;Abgeschlossen&quot; gesetzt wird, erscheint Tab 5 &quot;Nachbereitung&quot;:
        </Typography>
        <List dense>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} /></ListItemIcon>
            <ListItemText primary="Angemeldet: automatisch aus Teilnehmerzahl (schreibgeschützt)" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} /></ListItemIcon>
            <ListItemText primary="Tatsächlich erschienen: editierbar (echte Besucherzahl)" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} /></ListItemIcon>
            <ListItemText primary="Eintrittsgeld brutto € / Warenverkauf brutto €: editierbar" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} /></ListItemIcon>
            <ListItemText primary="Gesamtumsatz: wird automatisch berechnet (Eintritt + Shop)" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} /></ListItemIcon>
            <ListItemText primary="Interne Anmerkungen: Freitext" />
          </ListItem>
        </List>
        <Hint text="Nachbereitung-Daten fließen automatisch in die Statistik (Berichte-Tab) ein." />
      </Section>

      <Section icon={<MdPeople />} title="Teilnehmerverwaltung">
        <Typography variant="body2" gutterBottom>
          Einzelne Teilnehmer können pro Termin erfasst werden (Name, Kontakt, Gruppe).
        </Typography>
        <List dense>
          <Step nr="1" text="Tab 'Teilnehmer' öffnen" />
          <Step nr="2" text="Termin auswählen → Teilnehmer hinzufügen / bearbeiten / löschen" />
          <Step nr="3" text="Teilnehmerzahl im Termin-Dialog bleibt davon unabhängig (Schnelleingabe)" />
        </List>
        <Hint text="Für einfache Gruppen reicht die Teilnehmeranzahl im Termin. Die Detailverwaltung ist für namentliche Erfassung gedacht." />
      </Section>

      <Section icon={<MdGroups />} title="Team-Management">
        <List dense>
          <Step nr="1" text="Tab 'Team' → Führungspersonen anlegen (Name, Rolle, Kontakt)" />
          <Step nr="2" text="Im Termin-Dialog: Teammitglied zuweisen" />
          <Step nr="3" text="Mobile PWA: Team-Tab zeigt die aktuelle Liste (nur Lesezugriff)" />
        </List>
        <Hint text="Team-Daten werden beim NAS-Sync übertragen und sind in der Mobile PWA sichtbar." />
      </Section>

      <Section icon={<MdNotifications />} title="Erinnerungen">
        <List dense>
          <Step nr="1" text="Tab 'Erinnerungen' → neue Erinnerung für einen Termin erstellen" />
          <Step nr="2" text="Zeitpunkt wählen (z.B. 30 Minuten vor dem Termin)" />
          <Step nr="3" text="Browser-Benachrichtigung wird zum festgelegten Zeitpunkt ausgelöst" />
        </List>
        <Hint text="Benachrichtigungen funktionieren nur solange die App geöffnet ist. Browser-Berechtigung muss erteilt sein." />
      </Section>

      <Section icon={<MdAssessment />} title="Berichte & Statistik">
        <Typography variant="body2" gutterBottom>
          Der Berichte-Tab wertet alle abgeschlossenen Termine aus:
        </Typography>
        <List dense>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#388e3c' }} /></ListItemIcon>
            <ListItemText primary="Termine pro Monat / Auslastung" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#388e3c' }} /></ListItemIcon>
            <ListItemText primary="Gesamtumsatz: Eintrittsgeld + Warenverkauf aufgeschlüsselt" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#388e3c' }} /></ListItemIcon>
            <ListItemText primary="Tatsächliche Besucherzahlen vs. Anmeldungen" />
          </ListItem>
        </List>
      </Section>

      <Section icon={<MdLanguage />} title="Web-Buchungssystem — Öffentliche Führungen">
        <Typography variant="body2" gutterBottom>
          Gäste können Führungen über die öffentliche Buchungsseite buchen. Die Buchungen
          landen direkt in <strong>appointments.json</strong> auf der NAS und sind in TerminMeister sichtbar.
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>Buchungsseite für Gäste:</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
            https://woku369.github.io/gurktaler-fuehrungen/
          </Typography>
        </Box>
        <Typography variant="body2" fontWeight={600} gutterBottom>Termine Saison 2026:</Typography>
        <List dense>
          {[
            ['t1', '19.07.2026 So 14:00 Uhr'],
            ['t2', '15.08.2026 Sa 13:00 Uhr'],
            ['t3', '13.09.2026 So 14:00 Uhr'],
            ['t4', '18.10.2026 So 14:00 Uhr'],
          ].map(([id, label]) => (
            <ListItem key={id} sx={{ py: 0.2 }}>
              <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1b5e20' }} /></ListItemIcon>
              <ListItemText primary={<><strong>{id}:</strong> {label} · max. 30 Personen · € 15,–/Person</>} />
            </ListItem>
          ))}
        </List>
        <Typography variant="body2" fontWeight={600} sx={{ mt: 1.5 }} gutterBottom>Was passiert bei einer Buchung:</Typography>
        <List dense>
          <Step nr="1" text="Gast wählt Termin, gibt Personenzahl + Kontaktdaten ein" />
          <Step nr="2" text="Server prüft Kapazität (freie Plätze in appointments.json)" />
          <Step nr="3" text="Buchung wird in appointments.json gespeichert (Feld buchungsquelle: 'web')" />
          <Step nr="4" text="Gast erhält Bestätigungs-E-Mail mit Buchungsnummer und Treffpunkt" />
          <Step nr="5" text="diwk@aon.at erhält Benachrichtigung mit allen Kontaktdaten" />
        </List>
        <Hint text="Web-Buchungen erscheinen in TerminMeister nach dem nächsten NAS-Download. Sie sind am Titel 'Web-Buchung: Name (X Pers.)' erkennbar." />
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box
            component="img"
            src={QR_CODE_DATA}
            alt="QR-Code Gurktaler Kräuterführungen"
            sx={{ width: 120, height: 120, border: '1px solid #d5ccb8', borderRadius: 1 }}
          />
          <Box>
            <Typography variant="body2" fontWeight={600} gutterBottom>QR-Code für Plakate und Flyer</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Direkt-Link zur Buchungsseite — ausdrucken, aufhängen, weitergeben.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              component="a"
              href={QR_CODE_DATA}
              download="QR-Code-Gurktaler-Fuehrungen.png"
              sx={{ mt: 0.5, borderColor: '#1b3d1b', color: '#1b3d1b', '&:hover': { borderColor: '#3a6b3a', bgcolor: '#f0f4f0' } }}
            >
              QR-Code herunterladen
            </Button>
          </Box>
        </Box>
      </Section>

      <Section icon={<MdAdminPanelSettings />} title="Admin-Dashboard — Marlies (Browser)">
        <Typography variant="body2" gutterBottom>
          Marlies hat keinen Zugang zur TerminMeister-App. Sie verwaltet die Web-Buchungen
          über ein eigenes Admin-Dashboard im Browser — keine Installation notwendig.
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>Admin-URL:</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
            http://100.121.103.107:3005/fuehrungen-admin
          </Typography>
        </Box>
        <List dense>
          <Step nr="1" text="URL im Browser öffnen (Chrome, Firefox, Edge — alles funktioniert)" />
          <Step nr="2" text="Browser fragt nach Passwort → Admin-Passwort eingeben (Benutzername beliebig)" />
          <Step nr="3" text="Dashboard zeigt: Buchungen gesamt, Personen, Umsatz, freie Plätze" />
          <Step nr="4" text="Pro Termin: Kapazitätsbalken + Tabelle aller Buchungen mit Kontaktdaten" />
          <Step nr="5" text="'Absagen'-Button → Grund eingeben → alle Gäste erhalten Absage-E-Mail" />
          <Step nr="6" text="'+ Termin manuell erfassen' → telefonische / direkte Anmeldungen eintragen (zählt zur Kapazität)" />
        </List>
        <Typography variant="body2" fontWeight={600} sx={{ mt: 1.5 }} gutterBottom>Sonstige / Private Termine:</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Termine ohne fixen Termin-ID (z.B. privat eingetragene Einträge) erscheinen im Abschnitt
          &quot;Sonstige Termine&quot; unterhalb der regulären Führungen.
          Dort können sie mit dem &quot;Löschen&quot;-Button direkt gelöscht werden.
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ mt: 1.5 }} gutterBottom>Farbcodierung der Termine:</Typography>
        <List dense>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#388e3c' }} /></ListItemIcon>
            <ListItemText primary="Grün: Plätze frei (unter 70 % belegt)" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f9a825' }} /></ListItemIcon>
            <ListItemText primary="Gold: Fast voll (70–99 % belegt)" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#9e2c1c' }} /></ListItemIcon>
            <ListItemText primary="Rot: Ausgebucht (100 %)" />
          </ListItem>
        </List>
        <Hint text="Das Dashboard aktualisiert sich automatisch alle 30 Sekunden. Das Admin-Passwort wird aus der .env-Datei auf der NAS geladen (ADMIN_PASS)." />
      </Section>

      <Section icon={<MdCloudSync />} title="NAS-Synchronisation">
        <Typography variant="body2" gutterBottom>
          Die Desktop-App speichert primär lokal (localStorage). Sync mit dem NAS erfolgt manuell.
        </Typography>
        <List dense>
          <Step nr="1" text="Sidebar → 'NAS Sync' öffnen" />
          <Step nr="2" text="Status-Chip zeigt: Verbunden / Verbinde… / Fehler / Inaktiv" />
          <Step nr="3" text="↓ Download: NAS-Daten ins lokale Gerät laden (überschreibt lokale Daten)" />
          <Step nr="4" text="↑ Upload: Lokale Daten auf den NAS hochladen (überschreibt NAS-Daten)" />
        </List>
        <Hint text="NAS muss zuerst in den Einstellungen aktiviert und mit URL konfiguriert werden (http://100.121.103.107:3005 via Tailscale oder http://192.168.0.9:3005 im LAN)." />
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={600}>Konfliktregeln:</Typography>
          <Typography variant="body2" color="text.secondary">
            Bei Konflikten gewinnt immer das neuere Objekt (Timestamp updatedAt).
            Der NAS-Server schützt vor Datenverlust: ein leeres Array überschreibt niemals vorhandene Daten.
          </Typography>
        </Box>
      </Section>

      <Section icon={<MdPhone />} title="Mobile PWA (Smartphone/Tablet)">
        <Typography variant="body2" gutterBottom>
          Zugang nur via Tailscale VPN: <strong>http://100.121.103.107:3005</strong>
        </Typography>
        <List dense>
          <Step nr="1" text="Tailscale auf Smartphone aktivieren" />
          <Step nr="2" text="Browser öffnen → http://100.121.103.107:3005" />
          <Step nr="3" text="'Zum Homescreen hinzufügen' → App-Icon wird erstellt" />
        </List>
        <Typography variant="body2" sx={{ mt: 1 }} fontWeight={600}>Tabs in der Mobile PWA:</Typography>
        <List dense>
          {[
            ['Heute', 'Heutige Führungen, sortiert nach Uhrzeit'],
            ['Alle Termine', 'Vollständige Liste mit Datumsfilter'],
            ['Neuer Termin', 'Termin anlegen (sofort auf NAS gespeichert)'],
            ['Team', 'Lesezugriff auf Teammitglieder (Pflege in Desktop-App)'],
            ['Statistik', 'Monatliche Auswertung: Termine, Teilnehmer, Umsatz, Besucher'],
          ].map(([label, desc]) => (
            <ListItem key={label} sx={{ py: 0.2 }}>
              <ListItemIcon sx={{ minWidth: 24 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#7b1fa2' }} /></ListItemIcon>
              <ListItemText primary={<><strong>{label}:</strong> {desc}</>} />
            </ListItem>
          ))}
        </List>
        <Hint text="Änderungen in der Mobile PWA sind sofort auf dem NAS. In der Desktop-App erst nach manuellem Download sichtbar. Web-Buchungen werden pro Termin zusammengefasst (mehrere Buchungen = eine Karte mit Gesamtpersonenzahl)." />
      </Section>

      <Section icon={<MdSettings />} title="Einstellungen">
        <List dense>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemText primary="NAS Sync aktivieren + URL eintragen (Tailscale oder LAN)" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemText primary="Standard-Kalenderansicht (Monat / Woche / Tag)" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemText primary="Arbeitszeitfenster, Wochenbeginn" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemText primary="Erinnerungen: Standard-Vorlaufzeit, Benachrichtigungen, Ton" />
          </ListItem>
          <ListItem sx={{ py: 0.2 }}>
            <ListItemText primary="Automatische Backups + Intervall" />
          </ListItem>
        </List>
      </Section>

      <Divider sx={{ my: 3 }} />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          TerminMeister v1.0.0 · © 2026 Wolfgang Kulmitzer · Stift Gurk · Made in Austria
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          NAS: Synology DS124 · Tailscale: 100.121.103.107 · REST API Port 3005
        </Typography>
      </Paper>
    </Box>
  );
};

export default Handbuch;
