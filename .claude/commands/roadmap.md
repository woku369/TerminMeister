# /roadmap – Dokumentation & Handbuch aktualisieren

Wenn der Benutzer `/roadmap` aufruft, führst du folgende drei Schritte durch:

---

## Schritt 1 – ROADMAP.md aktualisieren

Lies `ROADMAP.md` und prüfe anhand des aktuellen Code-Stands:

- Welche Punkte in **Offen** wurden inzwischen implementiert? → In **Erledigt** verschieben und Checkbox auf `[x]` setzen.
- Welche neuen Features oder Bugs sind dazugekommen? → Als neue offene Punkte ergänzen.
- Ist das Datum am Anfang der Datei noch korrekt? → Auf heute aktualisieren.

Konkret prüfen:
- `src/components/` auf neue Komponenten
- `src/services/` auf neue/geänderte Services  
- `server.js` auf dem NAS (`\\DS124-RockingK\Gurktaler\terminmeister\server.js`) auf neue API-Endpunkte
- `public/index.html` auf dem NAS auf neue PWA-Features
- `git log --oneline -20` für einen schnellen Überblick der letzten Commits

---

## Schritt 2 – README.md aktualisieren

Lies `README.md` und prüfe auf Veraltetes:

- **Architektur-Diagramm**: Stimmen die Ports, URLs, Sync-Mechanismen?
- **API-Endpunkte-Tabelle**: Fehlen neue Endpunkte? Sind gelöschte noch drin?
- **Features-Liste** (Desktop-App & Mobile PWA): Fehlen neue Features?
- **Tech-Stack**: Stimmen die Versionen noch?
- **localStorage-Schlüssel**: Alle fünf Keys korrekt?
- **NAS-Verzeichnisstruktur**: Neue Dateien/Ordner?

Aktualisiere nur was sich tatsächlich geändert hat. Nicht umschreiben was korrekt ist.

---

## Schritt 3 – Handbuch-Komponente aktualisieren

Lies `src/components/common/Handbuch.jsx` und prüfe:

- Gibt es neue Features, die noch nicht dokumentiert sind?
- Haben sich Workflows geändert (z.B. neue Sync-Schritte, neue Tabs in PWA)?
- Ist die Versionsangabe am Ende noch korrekt?
- Fehlen neue Abschnitte (z.B. wenn ein neuer Sidebar-Eintrag hinzugekommen ist)?

Ergänze fehlende Abschnitte als neue `<Section>` Komponenten nach dem bestehenden Muster.

---

## Nach den Änderungen

1. Berichte dem Benutzer kurz, was sich in jedem der drei Dokumente geändert hat.
2. Frage, ob direkt committet und gepusht werden soll:
   ```
   git add README.md ROADMAP.md src/components/common/Handbuch.jsx
   git commit -m "docs: Dokumentation und Handbuch aktualisiert"
   git push origin main
   ```
3. Wenn ja → commit und push durchführen.
