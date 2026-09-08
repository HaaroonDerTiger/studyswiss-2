# Die Website

`studyswiss.ch` — dieselbe App, nur in der Website-Ansicht, plus alles,
was eine Schule braucht: Lizenzrechner, Offerte, Bestellung, Rechnung mit
QR-Zahlteil und die Lizenzverwaltung.

**Es ist dasselbe Backend.** Die Website ist der zweite Client von `/v1`
(§4.10), nicht ein zweites System. Fortschritt, Fehlerarchiv, Aufsätze
und der Abo-Status liegen am Konto auf dem Server — wer am Telefon übt
und dann den Laptop aufklappt, sieht denselben Stand. Möglich macht das
der Determinismus (§2.4): Gespeichert wird nie eine Aufgabe, sondern
`rabatt-rueckwaerts:8812`, und diese Zeile ergibt überall dieselbe.

## Anschauen

```bash
open StudySwiss-Website.html      # alles in einer Datei, ohne Server
```

Diese Datei ist die Vorschau: Sie zeigt jede Seite und lässt die ganze
Schul-Strecke durchklicken, ohne dass ein Backend läuft. Jede Offerte und
jede Rechnung daraus trägt sichtbar «Muster» — eine Musterrechnung, die
aussieht wie eine echte, wird irgendwann bezahlt.

## Bauen und prüfen

```bash
app/pruefung/website_bauen.py            # Seiten und Einzeldatei erzeugen
app/pruefung/website_bauen.py --pruefen  # nur schauen, ob sie aktuell sind
app/pruefung/website.py                  # der Text der gebauten Seiten
app/pruefung/web_pruefen.py              # der Lernbereich, wirklich ausgeführt
```

Beide laufen in `pruefen.sh` mit, und sie finden Verschiedenes.

`website.py` liest die gebauten Seiten gegen: eine tote Verknüpfung, ein
Platzhalter, ein Eingabefeld ohne Beschriftung, ein Preis im Quelltext,
die Sie-Form dort, wo die App duzt.

`web_pruefen.py` **führt den Lernbereich aus**. Das ist der Unterschied,
auf den es ankommt: Ein Knopf, der an nichts hängt, sieht im Quelltext
aus wie einer, der funktioniert — «Abbrechen» stand so monatelang da.
Die Runde klickt sich mit einem winzigen DOM (`app/pruefung/dom.js`)
durch Übung, Selbsttest, Standortbestimmung, Aufsatz und die
Tipps-Seiten, tippt echte Antworten ein und prüft, dass die Engine sie
annimmt. Sie fand beim ersten Lauf drei Fehler, darunter einen, der den
ganzen Aufgabenschirm abstürzen liess.

## Was wo liegt

| Ordner | Inhalt |
|---|---|
| `quelle/` | Der Inhalt je Seite. **Hier wird geschrieben.** |
| `quelle/rahmen.html` | Kopfzeile, Navigation, Fuss — genau einmal |
| `css/` | Tokens, Bausteine, Seitenaufbau, Belege |
| `js/` | Der `/v1`-Client, die Preise, die Seitenskripte |
| `js/antwort.js` | Die Eingabeflächen für alle vierzehn Formate |
| `js/uebung.js` | Der Aufgabenlauf — ein Läufer, drei Modi |
| `js/selbsttest.js` | Fach, Umfang, Bedingungen, Ergebnis |
| `js/standort.js` | Standortbestimmung und «Dein Startpunkt» |
| `js/aufsatz.js` | Arten, Themen, Schreibfläche, Korrektur |
| `js/engine.js` | **Gebaut.** Wörtlich die Engine der App-Vorschau |
| `js/inhalt.js` | **Gebaut.** Der Inhalt — nur für die Einzeldatei |
| `bilder/` | Eule und Favicon, aus denselben Pfaden wie die App |
| `*.html` | **Gebaut.** Nicht von Hand ändern. |
| `StudySwiss-Website.html` | **Gebaut.** Die Vorschau in einer Datei. |

## Der Lernbereich

Er hat dieselben Schirme wie die App:

| Teil | Was er tut |
|---|---|
| Lernen | Termin, «Zuerst dran» mit Begründung, die Fächer |
| Fach → Bereich | Bei Deutsch die Zwischenebene; Mathematik überspringt sie |
| Übung | Zehn Aufgaben, sofortige Rückmeldung, Hinweise |
| Lernpfad | Wochenpensum, vier Abschnitte, Woche für Woche |
| Standortbestimmung | 24 Aufgaben je Fach, danach «Dein Startpunkt» |
| Selbsttest | Uhr, Zurückblättern, Bewertung erst bei der Abgabe |
| Aufsatz | Arten, Themen, Schreibfläche mit zwei Hilfen, Korrektur |
| Tipps | Hörverstehen und mündliche Prüfungen — Ablauf statt Aufgaben |
| Fortschritt · Fehlerarchiv · Einstellungen | wie in der App |

**Ein Läufer, drei Modi.** Übung, Selbsttest und Standortbestimmung
zeigen dieselben vierzehn Eingabeflächen und stehen darum in einer
Datei (`js/uebung.js`). Sie unterscheiden sich in genau drei Punkten:
wann die Rückmeldung kommt, ob eine Uhr läuft und ob der Themen-Titel
über der Aufgabe steht. Drei Kopien wären drei Stellen, an denen ein
neues Format vergessen wird.

## Die Übungen

Sie laufen mit **derselben Engine wie die App**. `website_bauen.py` holt
sie wörtlich aus `StudySwiss-Vorschau.html` und legt sie als
`js/engine.js` ab; `website.py` prüft, dass sie Block für Block
übereinstimmt. Abgeschrieben wird nichts — §8 hält schon drei Fassungen
in Gleichschritt, eine vierte wäre die erste, die still abweicht.

Eigen ist nur die Ansicht: `js/antwort.js` baut die Eingabeflächen für
alle vierzehn Formate. Alles wird angetippt, nichts gezogen, und ein
zweites Antippen nimmt die Wahl zurück (§4.5).

**Die Lösung reist nie zum Client.** Im Betrieb prüft der Server; in der
Vorschau prüft `demo.js`, und `demoOhneLoesung` streicht vorher alles,
woraus sich die Antwort ablesen liesse. Die ausgelieferten Seiten laden
`inhalt.js` gar nicht erst — auch das prüft `website.py`.

## Drei Entscheide, die man kennen muss

**Die Seite wächst mit.** Unter 900 px ist sie die App — eine Spalte,
Seitenrand 24. Darüber wird die Tab-Leiste zur Kopfzeile, im Lernbereich
zur Seitenleiste, und beim Textverständnis stehen Lesetext und Frage
nebeneinander statt übereinander. Farben, Schriften und Bauteile sind
unverändert die des Design-Systems.

**Die Startseite duzt, die Schulseiten siezen.** Auf der einen liest eine
Jugendliche, auf der anderen bestellt eine Behörde. `website.py` prüft
das für die duzenden Seiten.

**Die Vorschau spricht die DTOs des Servers.** `js/demo.js` ist nicht
«die Engine mit weggelassener Lösung», sondern **die Antwort des
Servers, nachgebaut**: dieselben Feldnamen wie `model/Dto.kt`, dieselbe
Mischung, dieselbe flache Antwortform. Das war lange nicht so — die
Website las `paare`, `wertetabelle` und `indizes`, wo der Server
`ziele`, `tabelle` und `anzahlGesucht` sendet, und schickte die Antwort
unter `antwort` verschachtelt, wo er sie flach erwartet. Die Vorschau
lief tadellos, weil sie beide Enden selbst hielt; im Betrieb wäre die
halbe Bedienung gebrochen gewesen.

`pruefe_web.js` vergleicht darum bei jedem Lauf beide Formen gegen
`model/Dto.kt`. Wer ein Feld umbenennt, sieht es sofort.

**Der Token liegt anders als in der App.** Die App legt den
Refresh-Token in `flutter_secure_storage`; ein Browser hat nichts
Vergleichbares. Er kommt darum als `httpOnly`-Cookie vom Server und ist
für jedes Skript unsichtbar, auch für unseres. Der Access-Token lebt nur
im Speicher. Siehe den Kommentar in `js/api.js`.

## Was noch fehlt

- **Der Zahlteil braucht eine IBAN.** Ohne `RECHNUNG_IBAN` erzeugt der
  Server bewusst keinen QR-Code, statt einen wertlosen zu liefern.
- **Der Kauf auf der Website braucht einen Zahlungsanbieter.**
  `/v1/abo/web/start` ist die Stelle, an der er angebunden wird.
- **Die Anmeldung mit Apple und Google im Browser** braucht eine
  Service-ID und eine Web-Client-ID; beide gehören in die Umgebung.
