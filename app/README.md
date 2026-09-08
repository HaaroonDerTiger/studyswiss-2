# StudySwiss — so läuft es

Drei Teile, die dasselbe können: das Backend in Kotlin, die App in Flutter und
die Vorschau als eine einzige HTML-Datei. Wer nur schauen will, öffnet die
Vorschau; wer entwickeln will, braucht die anderen beiden.

---

## Ohne Installation: die Vorschau

```bash
open preview/StudySwiss-Vorschau.html
```

Eine Datei, kein Server, kein Internet. Sie enthält die vollständige App in
klickbarer Form: alle Screens, den echten Aufgabengenerator, echte
Antwortprüfung, echtes Feedback, echten Fortschritt.

**Sie ist die Referenz für Verhalten.** Wer unsicher ist, wie sich ein Screen
verhalten soll, klickt es dort nach. Wer Flutter oder Kotlin ändert, ändert
die Vorschau mit — sonst laufen sie auseinander, und `gleichlauf.py` schlägt
an.

---

## Alles prüfen

```bash
pruefung/pruefen.sh
```

Sieben Prüfungen, rund 62'000 Kontrollen. Sie ersetzen, was sonst der Compiler
und ein Testlauf leisten — auf einem Rechner ohne Kotlin und ohne Flutter ist
das die Absicherung. Was jede einzelne findet, steht in `CLAUDE.md`,
Abschnitt 8.

**Nach jeder Änderung an Aufgaben, Themenbaum oder Katalog:**

```bash
pruefung/vorschau_bauen.py     # Inhalte in die Vorschau einspielen
pruefung/abdeckung.py          # was belegt ist, nach Punkten sortiert
```

---

## Backend

```bash
cd backend
./gradlew run              # Server auf :8080, H2 im Speicher, Demo-Daten
./gradlew test
./gradlew tore             # die Qualitätstore auf alle Vorlagen
./gradlew offen            # Unterthemen ohne Aufgaben
./gradlew ktlintCheck
```

Ohne gesetzte Umgebungsvariablen läuft der Server mit H2 im Speicher und
Demo-Daten. Für PostgreSQL und die echten Läden siehe `start/checkliste.md`.

## App

```bash
cd frontend
flutter pub get
flutter run                # Simulator oder angeschlossenes Gerät
flutter analyze
```

---

## Wo was liegt

```
backend/     Kotlin · Ktor · Exposed · PostgreSQL (H2 im Dev)
  engine/      Generator, Auswerter, Rng, Validator — rein, ohne Seiteneffekte
  resources/
    themen/      die beiden Themenbäume
    templates/   die Aufgaben, plus zwei Verzeichnisdateien
frontend/    Flutter · Riverpod · go_router
  widgets/antwortflaeche.dart   alle vierzehn Eingabeflächen, an einer Stelle
preview/     die klickbare Vorschau, eine Datei
marke/       App-Icon, Web-Logo, Favicon — alle aus denselben Eulenpfaden
pruefung/    die sieben Prüfungen
start/       was vor der Veröffentlichung zu tun ist
```

**Zwei Verzeichnisdateien steuern, was geladen wird:**
`templates/vorlagen.index.json` listet die Zahlen-Vorlagen,
`templates/bloecke.index.json` die Textblöcke. Eine neue Datei braucht
dadurch keine Kotlin-Änderung — und was in keinem Verzeichnis steht, fällt
beim Prüfen auf, statt still zu verschwinden.

---

## Die drei Regeln, an denen alles hängt

1. **`templateId:seed` ist die Aufgabe.** Dieselbe Kennung ergibt überall
   dieselbe Aufgabe — auf dem Server, in der App, in der Vorschau, heute und
   in zwei Jahren. Deshalb speichert die App nie Aufgaben, sondern nur diese
   Zeile. Wer `Rng` ändert, ändert **alle** bisher gespeicherten Aufgaben.

2. **Die Aufgabe reist nie mit ihrer Lösung.** Die Antwort des Servers enthält
   Stamm, Optionen und Hinweisanzahl — nie die Lösung. Bewertet wird
   ausschliesslich in `POST /antwort`.

3. **Kein Tor wird gelockert.** Ein Template, das die Tore nicht besteht, ist
   nicht fertig. Dann wird das Template repariert, nie das Tor. Umgekehrt gilt:
   Ein Prüfer, der falschen Alarm schlägt, ist schlimmer als keiner — wer einen
   Befund für einen Fehlalarm hält, repariert den Prüfer und schaut erst dann
   wieder auf den Code.
