# StudySwiss – App-Design

Stand: 29. August 2026 · nach der zweiten Feedback-Runde von Juliette Michel

## Zuerst öffnen

- **`verbesserungen/Umsetzung.html`** — Doppelklick. Zeigt jede Rückmeldung im Wortlaut,
  daneben den Screen vorher und nachher und was geändert wurde. Am Schluss die offenen Punkte.
- **`01_Prototyp/StudySwiss-Prototyp.html`** — Doppelklick. Der klickbare Prototyp.

## Was liegt hier drin

| Ordner | Inhalt |
|---|---|
| `01_Prototyp/` | **StudySwiss-Prototyp.html** — im Browser öffnen, klickbar. Links die Screen-Liste, unten «Klickflächen zeigen». Keine Installation, kein Internet nötig. |
| `02_Screens_PNG/` | Alle Screens als PNG in doppelter Auflösung (780 × 1688 px), für Präsentationen und Feedback-Dokumente. |
| `03_Screens_HTML/` | Quellcode jedes Screens (`.dc.html`) plus die Eulen-Grafiken. Direkt im Browser zu öffnen. |
| `04_Canvas/` | Alle Screens nebeneinander auf einer Fläche, nach Bereichen gruppiert, mit Notizen. |
| `05_Marke/` | Die Eule als Vektor: zweifarbig (Hut dunkelbraun, Eule tan), einfarbig tan, weiss und dunkelbraun. |
| `verbesserungen/` | Die Rückmeldungen (PDF, Screenshot) und **Umsetzung.html** — was daraus geworden ist. |

## Version 1 — was drin ist

**Lernen** ist der Kern: Fach wählen → Thema wählen → üben. Vor jedem Übungsset wird der
Aufgabentyp an einem Beispiel erklärt; in jeder Aufgabe gibt es oben rechts einen Tipp-Knopf.
Dazu **Selbsttest** (Prüfungssimulation), **Fortschritt** und **Einstellungen**.

**Der Lernpfad ist nicht aktiv.** Der Tab ist markiert und führt auf «Demnächst verfügbar».
Die drei Entwürfe (Lernpfad, Lernkarte, Wochenplan) liegen im Canvas unter
«Spätere Ausbaustufe».

## Die Fortschrittsregel

Jedes Thema hat ein **Pflichtset von 20 Aufgaben**. Wer die gelöst hat, hat das Thema
abgeschlossen — das sind die 100 %. Alle weiteren Aufgaben bleiben unbegrenzt zum Üben
verfügbar und zählen nicht in die Zahl hinein. Deshalb steht überall eine abzählbare
Grösse statt einer Prozentzahl: «8 von 13 Themen», «13 von 20 Pflichtaufgaben».

## Aus der zweiten Runde umgesetzt

Alle 34 Punkte im Einzelnen in `verbesserungen/Umsetzung.html`. Die grossen Änderungen:

### Onboarding
- Der Screen «Fach, Thema, üben» ist raus; das Onboarding hat noch zwei Schritte.
- Keine 12-Tage-Serie mehr im Onboarding, keine feste Lernzeit. Der zweite Screen heisst
  «Dein Termin gibt das Tempo vor» und verweist auf die Standortbestimmung.
- Kantonswahl zeigt nur noch Kantone, ohne Prüfungstyp und Fächerliste.
- Schulwahl: fünf einzelne Optionen (Kurzgymnasium, Langgymnasium, FMS, HMS, IMS),
  begrenzt auf das Angebot im gewählten Kanton. «Nächster Prüfungstermin» statt «Dein».

### Standortbestimmung
- **Neuer Screen «Dein Startpunkt»** nach dem Test: 6 Themen sitzen · 7 zuerst üben ·
  12 noch offen, dazu die Listen mit Rang 1–3 und Fachangabe.
- Ausdrücklich keine Note und keine Niveau-Einstufung — der Test legt nur die Reihenfolge fest.

### Lernen und Üben
- «Heute empfohlen» → «Zuerst dran», mit Begründung und zweitem Vorschlag; Hinweis,
  dass sich die Reihenfolge nach jeder Übung neu rechnet.
- Mathematik: Ring und «Prüfungsniveau der ZAP» weg, dafür «8 von 13 Themen» und
  Pflichtaufgaben je Thema. Alle Themen von Anfang an offen, auch «Flächen & Volumen».
- «Aufgabentyp erklärt» → «Einführung in den Aufgabenblock». Der Tipp-Knopf sitzt in der
  Einführung und in der Aufgabe an derselben Stelle: oben rechts.

### Selbsttest
- Erst das Fach, dann der Umfang: «Alle Themen», «Einzelne Themen wählen» oder
  «Ganze Prüfung».
- Keine Punktevergabe mehr («+6 Punkte zum letzten Mal» ist weg).

### Fortschritt
- Kreisdiagramme durch abzählbare Grössen ersetzt.
- Jede Kennzahl trägt Zeitraum und Fachbezug.
- Säulendiagramm mit Achse 0–100 %, 50 %-Linie, Wert auf jeder Säule und einem Satz,
  der die Aussage benennt. «+14 % seit Oktober» → «+14 Prozentpunkte, KW 36: 57 % → heute 71 %».
- Stärkstes und schwächstes Thema neu über alle Fächer, mit Fachangabe.

### Eltern-Report
- Jede Zahl mit Zeitraum und Fachbezug, alle vier auf dieselbe Woche bezogen.
- «ZAP» → «Aufnahmeprüfung».

### Lernpfad
- «Dein Lernpfad kommt in einer späteren Version», Beschreibung als Schritt-für-Schritt-Weg.

## Offen — Entscheid nötig

- **Grösse des Pflichtsets**: überall 20 angenommen; fachlich festzulegen, darf je Thema
  unterschiedlich sein.
- **Punktegewichtung im Selbsttest**: derzeit gleichgewichtet angenommen.
- **Datenbasis**: stärkstes/schwächstes Thema und die Empfehlungsreihenfolge sind im
  Prototyp fest eingetragen und müssen gerechnet werden.
- **Begriffe «Lernpfad» und «Lernkarte»** überschneiden sich.
- **Entfernter Onboarding-Screen**: «Fach, Thema, üben» ist raus, weil er als nicht
  notwendig markiert war — er war aber die einzige Stelle, an der das Onboarding die
  Kernfunktion zeigt. Bitte bestätigen. Die Datei liegt noch unter
  `03_Screens_HTML/Onboarding2.dc.html`.

## Design-Grundlagen

- Schriften: **Bitter** (Überschriften, Zahlen) und **Nunito Sans** (Fliesstext, UI)
- Papier: warmes Beige `#FBF5EA` mit 24-px-Karoraster in Tan bei 10 % Deckkraft
- Braun `#3A1D0A`, Tan `#C99A66`, Schweizer Rot `#E2231A` nur für Marke und Fehler
- Keine Schatten, Eckenradius 14–16 px, flache Flächen
