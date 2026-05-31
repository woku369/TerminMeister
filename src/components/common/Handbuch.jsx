import React, { useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  Chip, Divider, List, ListItem, ListItemIcon, ListItemText, Paper
} from '@mui/material';
import {
  MdExpandMore, MdCalendarMonth, MdPeople, MdGroups, MdNotifications,
  MdAssessment, MdCloudSync, MdSettings, MdPhone, MdCheckCircle,
  MdInfo, MdLightbulb
} from 'react-icons/md';

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
        <Hint text="Änderungen in der Mobile PWA sind sofort auf dem NAS. In der Desktop-App erst nach manuellem Download sichtbar." />
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
