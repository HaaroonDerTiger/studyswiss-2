# StudySwiss — Lern-App für Aufnahmeprüfungen an Schweizer Mittelschulen

Eine App, mit der sich Schülerinnen und Schüler auf die Aufnahmeprüfung an
eine Mittelschule vorbereiten: **Mathematik**, **Deutsch** und, wo der Kanton
es prüft, **Französisch**. Backend in **Kotlin (Ktor)**, Frontend in
**Flutter**, dazu eine **Website** auf demselben Backend. Das Design liegt
fertig vor und ist verbindlich.

**Es gibt zwei Clients und ein Backend.** Die Flutter-App und die Website
unter `app/website/` sprechen beide `/v1`; Fortschritt, Fehlerarchiv,
Aufsätze und der Abo-Status liegen am Konto auf dem Server. Wer am Telefon
übt und dann den Laptop aufklappt, sieht denselben Stand — ohne dass
irgendetwas synchronisiert würde. Möglich macht das der Determinismus
(§2.4): Gespeichert wird nie eine Aufgabe, sondern `rabatt-rueckwaerts:8812`,
und diese Zeile ergibt überall dieselbe. Siehe Abschnitt 5.6.

**Zürich ist der Referenzkanton, aber längst nicht mehr der einzige.** Alle
zwölf Kantone mit Quellen unter `kantone/` sind vollständig bespielt und
aktiv: Zürich, Bern, Basel-Stadt, St. Gallen, Aargau, Luzern, Thurgau,
Solothurn, Appenzell Ausserrhoden, Glarus, Graubünden und Schwyz. Ein Kanton
ist dabei **reine Datenlage** — es gibt keinen Codepfad, der Kantone
aufzählt. Wie einer dazukommt, steht in Abschnitt 11.

Stand dieser Datei: 3. September 2026.

---

## 1. Was hier gebaut wird

Aus den Quellordnern dieses Repos wird **eine** App:

| Quellordner | Was daraus wird |
|---|---|
| `kantone/<kanton>/` | Je Kanton die alten Prüfungen, die ZAP-Trainer, der Lehrplan und die Richtlinien. Daraus werden Katalog, Themenbäume und Aufgaben abgeleitet — **nie der Wortlaut**. |
| `gestaltung/design frontend/` | Verbindliche Design-Vorlage. 33 Screens als HTML und PNG, Design-System, Marke. |
| `gestaltung/marke/` | Die Rohdateien der Marke: Eulen, App-Icon, Vektorquellen, Weblogo. |

**Alles Kantonale liegt unter `kantone/`, und zwar nach demselben Muster.**
Vorher lag Zürich als `math/`, `deutsch sprachbetrachtung/` und
`aufsatzkorrektur/` neben der App, während Bern schon unter `kantone/bern/`
stand — man sah dem Repo nicht an, dass beides dasselbe ist. Jetzt hat jeder
Kanton einen Ordner, und darin je Fach die alten Prüfungen.

Zielgruppe sind 14- bis 16-Jährige, die in sechs bis neun Monaten eine Prüfung
schreiben. Sie öffnen die App zwischen Schule und Abendessen, oft nur zehn
Minuten. Alles muss ohne Anleitung verständlich sein.

### Verzeichnisse

```
app/
  README.md         Wie man das Ganze startet
  backend/          Kotlin · Ktor · Exposed · PostgreSQL (H2 im Dev)
  frontend/         Flutter · Riverpod · go_router
  preview/          Klickbare Web-Vorschau der App, eine einzige HTML-Datei
  website/          studyswiss.ch — dieselbe App als Website, dazu der
                    Schulverkauf: Rechner, Offerte, Bestellung, Rechnung
  pruefung/         Die zwölf Prüfungen — sie ersetzen Compiler und Testlauf
  marke/            App-Icon, Web-Logo, Favicon — alle aus denselben Eulenpfaden
  start/            Vor der Veröffentlichung: Checkliste, Datenschutz, AGB,
                    Store-Texte. Was dort steht, kann kein Code erledigen.
kantone/            Quelle je Kanton — gleiches Muster für alle
  zuerich/          Mathematik · Deutsch Sprachbetrachtung · Deutsch Aufsatz,
                    je mit «alte pruefungen» und «zap-trainer»; dazu
                    «Grundlagen» mit Prüfungsanforderungen und Themenstruktur
  bern/             GYM 1 (8./9. SJ) · FMS · GYM 3, Jahrgänge 2022-2026
  sankt-gallen/     Gymnasium · FMS/WMS/IMS, Jahrgänge 2021-2026
  basel-stadt/      Richtlinien, Anforderungsprofile und die
                    Musterprüfungen 2021 und 2022 mit Lösungen
  solothurn/        Prüfungseckwerte ab 2026, Sprachbogen und
                    Aufnahmeprüfungen für BM, FMS und Gymnasium
  thurgau/          Wegweiser Mittelschulen 2026/27 und die Prüfungsarchive
                    der Kanti Frauenfeld 2017-2026, GMS und FMS, je aus der
                    2. und aus der 3. Sek
  Aargau/           Aufnahmeprüfungen Gymnasium, FMS, IMS und WMS
  Appenzell_Ausserrhoden/  Kantonsschule Trogen, Gymnasium und FMS
  Glarus/           Kantonsschule Glarus, Gymnasium 1. und 3. Klasse, FMS
  graubünden/       Bestimmungen des Amts für Höhere Bildung, Prüfung 1G
                    und Einheitsprüfung, dazu das fixierende Kopfrechnen
  Luzern/           eine zentrale Prüfung für BM, FMS, WMS und IMS;
                    fürs Gymnasium gibt es gar keine Aufnahmeprüfung
  Schwyz/           kantonales Aufnahmeverfahren für Gymnasien und FMS,
                    dazu die Stiftsschule Einsiedeln mit eigener Prüfung
                    ins Untergymnasium
gestaltung/
  design frontend/  Quelle: Design-System und alle Screens
  marke/            Eulen, App-Icon, Vektorquellen, Weblogo
```

Die Quellordner sind **Referenz, kein Build-Input.** Nichts darin wird
verändert. Wer die Fachlogik ändern will, ändert sie in `app/backend/` und
hält die Quelle als Beleg daneben.

---

## 2. Die Regeln, die über allem stehen

### 2.1 Sprache

Schweizer Hochdeutsch, durchgehend, in Code, Kommentaren, UI und Prüfdaten.

- `ss` statt `ß` — ausnahmslos, auch in Testfixtures.
- **Umlaute werden ausgeschrieben: ä, ö, ü — nie `ae`, `oe`, `ue`.** Das gilt
  für jeden Text, den ein Mensch liest: Aufgaben, Rückmeldungen, Themennamen,
  Kommentare, Meldungen der Prüfer. Tor T3 fängt Umschriften ab.

  **Bezeichner sind davon ausgenommen und bleiben ASCII**: Feldnamen wie
  `loesung`, Variablennamen wie `hoehe`, Klassennamen wie `Antwortflaeche`.
  Sie sind der Vertrag zwischen Backend, App und Vorschau; ein Umlaut darin
  bräche jeden Ausdruck, der die Variable benutzt.

  Beim Zurückverwandeln hilft `app/pruefung/umlaute.py`. Zwei Regeln stehen
  darin, die man leicht falsch macht: Ein Wort, das **schon** einen Umlaut
  trägt, ist bereits richtig — sonst wird «Bäuerin» zu «Bäürin». Und ein `ue`
  nach a, e oder q ist ein echtes Vokalpaar — Ba**ue**r, ne**ue**, q**ue**r,
  vertra**ue**nsvoll.
- Franken und Rappen, nie Euro. Format `Fr. 12.50`, ganze Beträge `Fr. 12.–`.
- Velo statt Fahrrad, Trottinett statt Roller, Masseinheit statt Maßeinheit,
  Znüni statt Pausenbrot, Perron statt Bahnsteig.
- Jugendliche werden **geduzt**, immer. Eltern im Eltern-Report gesiezt.
  Das gilt für jede Arbeitsanweisung: «Tippe in die Lücken», nie «Tippen Sie
  in die Lücken». T3 nannte die Du-Form von Anfang an, prüfte sie aber nie —
  92 Anweisungen in der Sie-Form standen jahrelang im Bestand. Seit das Tor
  danach sucht, sind sie weg. **Nicht** betroffen ist die wörtliche Rede: In
  einem Lesetext siezt eine fremde Erwachsene eine Jugendliche völlig zu
  Recht, und ein Tor, das dort anschlüge, wäre ein Tor mit falschem Alarm
  (§8). Passagen in Anführungszeichen werden darum vorher ausgenommen.
- Vornamen in Aufgaben sollen im Kanton Zürich vorkommen können und
  verschiedene Herkünfte abbilden.
- Kein Denglisch in der UI: «Übung», nicht «Practice»; «Selbsttest», nicht «Quiz».

**Jede gezogene Aufgabe wird auf Grammatik geprüft.** «die ersten 1 Stunden»
ist rechnerisch richtig und trotzdem falsches Deutsch. Solche Fälle werden
über `bedingungen` oder die Wertebereiche ausgeschlossen, nicht gehofft.

### 2.2 Kein Taschenrechner

In der ZAP ist keiner erlaubt. Alle Zwischen- **und** Endergebnisse müssen im
Kopf erreichbar sein. Das wird über `bedingungen` erzwungen und von Tor 6 des
Validators geprüft.

### 2.3 Templates, nie einzelne Aufgaben

Wer «eine Aufgabe» sagt, meint ein Template. Ein Template ist ein
JSON-Objekt nach `TemplateSpec`; der Generator zieht daraus hunderttausende
Aufgaben, indem er die Variablen neu würfelt.

### 2.4 Determinismus

`Template-ID + Seed` ergibt immer exakt dieselbe Aufgabe — heute, morgen, auf
jedem Gerät, auf Server und Client. Deshalb speichert die App nie Aufgaben,
sondern nur `zwei-toepfe:47`. Diese Zeile *ist* die Aufgabe.

Daraus folgen zwei harte Regeln:

- Der Zufallsgenerator ist die eigene `Rng`-Klasse, nie `Random()` oder
  `Math.random()` innerhalb der Generierung. `Math.random()` wird nur benutzt,
  um den Seed selbst zu würfeln — und der gewürfelte Wert wird sofort gemerkt.
- Seeds werden nie durchgezählt (1, 2, 3), sonst bekommen alle Nutzer dieselbe
  Reihenfolge.

### 2.5 Kein LLM in der Aufgabengenerierung

Mathematik und Sprachbetrachtung werden **deterministisch** erzeugt. Ein LLM
kommt an genau einer Stelle vor: der **Aufsatzkorrektur**. Dort schreibt der
Schüler einen Text, und ein Modell gibt Rückmeldung nach festem Schema.

### 2.6 Datenschutz

Nutzer sind minderjährig. Das ist kein Randthema.

- Keine Klarnamen nötig; ein Vorname genügt und ist optional.
- Aufsätze verlassen das Backend nur zur Korrektur und werden nicht zum
  Training weitergegeben. Der Vertrag mit dem Modellanbieter muss das abdecken.
- Der Eltern-Report ist **opt-in durch den Schüler** und zeigt Kennzahlen,
  nie Aufsatztexte oder einzelne Aufgabenlösungen.
- Löschung des Kontos löscht alles innerhalb von 30 Tagen, inklusive Aufsätzen.
- Serverstandort Schweiz oder EU.

---

## 3. Fachliche Grundlagen

### 3.1 Prüfungen und Schultypen

**Die Prüfung ist ein eigenes Ding, nicht eine Eigenschaft des Schultyps.**
Das ist die tragende Entscheidung, sobald mehr als ein Kanton dazukommt: In
Basel-Stadt schreiben Gymnasium, FMS, WMS, IMS und BM 1 **dieselbe** Prüfung
und unterscheiden sich nur in der nötigen Punktzahl; in St. Gallen teilen
sich FMS, WMS und IMS eine. Wer Fächer, Dauer und Hilfsmittel am Schultyp
führt, pflegt dieselben Angaben fünfmal — und hat sie beim ersten Nachtrag
viermal falsch.

Ein Schultyp im Katalog ist darum nur noch ein Name und ein Verweis:

```json
{"id": "fms", "name": "Fachmittelschule FMS", "pruefung": "zh-zap3"}
```

Was die App bekommt, ist etwas anderes — ein Schultyp mit allem schon
eingesetzt. `Katalog.kt` löst das **einmal** auf; keine andere Stelle im Code
darf eine eigene Antwort geben. Auf Python-Seite steht dieselbe Auflösung in
`app/pruefung/katalog.py`, weil Vorschau und Prüfer sie ebenfalls brauchen.

| Kanton | Prüfungen | Besonderheit |
|---|---|---|
| Zürich | ZAP 1 · ZAP 2 · ZAP 3 | Referenzkanton, vollständig befüllt |
| Bern | GYM 1 · FMS · GYM 3 | Mathematik in **zwei** Teilen, Französisch verpflichtend |
| Basel-Stadt | eine Prüfung für fünf Schulen | **freiwillige** Prüfung, Taschenrechner erlaubt |
| St. Gallen | Gymnasium · FMS/WMS/IMS | zwei Termine im Jahr, Französisch mit Hörverstehen |
| Solothurn | eine Prüfung für Gymnasium, FMS und BM | **Englisch neben Französisch**, beide mit einem Hörteil |
| Thurgau | GMS und FMS, je aus der 2. und aus der 3. Sek | **vier Prüfungen** mit verschieden grossem Stoff, Französisch nur mündlich und nur bei knappem Ergebnis |
| Aargau | Gymnasium · FMS · IMS/WMS | Französisch und Englisch nebeneinander, beide schriftlich |
| Appenzell Ausserrhoden | Gymnasium · FMS | zwei Hörteile, für die je eine Tipps-Seite einspringt |
| Glarus | Gymnasium 1. Klasse · Gymnasium 3. Klasse · FMS | drei Prüfungen an derselben Schule, Deutsch mit eigener Sprachkunde |
| Graubünden | Prüfung 1G · Einheitsprüfung | einziger Kanton mit **fixierendem Kopfrechnen** als eigenem Prüfungsteil |
| Luzern | eine zentrale Prüfung für BM, FMS, WMS und IMS | fürs **Gymnasium gibt es keine Aufnahmeprüfung**; Herbst- und Frühlingstermin |
| Schwyz | Gymnasium · FMS · Stiftsschule Einsiedeln | eine Fremdsprache schriftlich, **die andere mündlich**; Einsiedeln prüft nach der 6. Klasse |

**Eine Prüfung besteht aus Prüfungsteilen.** Das ist die Einheit, die vorher
fehlte, und sie fehlte genau dort, wo die Kantone auseinandergehen: Bern und
St. Gallen schreiben Mathematik in zwei Teilen — Mathematik I **ohne**
Taschenrechner, Mathematik II **mit**. Solange Dauer und Hilfsmittel am
Schultyp hingen, musste die App sich für einen der beiden entscheiden und log
für den anderen. Je Teil steht darum im Katalog: Name, Prüfungsfach,
Bereiche, Dauer, Punkte, Anzahl Aufgaben, Hilfsmittel, ob man zurückblättern
darf und ob die Uhr anhält.

**Hilfsmittel sind kein Ja-Nein.** St. Gallen verbietet programmierbare,
grafikfähige und CAS-Rechner und erlaubt alles übrige; Bern erlaubt in der
GYM-3-Prüfung einen Rechner ohne CAS **und** eine Formelsammlung; in Zürich
ist gar keiner zugelassen. Darum `taschenrechner: keiner | einfach |
nicht_cas | beliebig`, und angezeigt wird der ausgeschriebene Satz, nicht das
Ja-Nein daneben.

**Eine Prüfung kann eine Wahl enthalten.** Bern prüft Französisch **oder**
Englisch als Sonderprüfung. Solche Teile tragen eine `wahlgruppe`, und die
Gruppe steht unter `wahl` mit ihrer Frage. Ein Teil, für den die App keinen
Stoff hat, trägt `angeboten: false` — die Prüfung kennt ihn, die App bietet
ihn nicht an. Das gehört in die Daten; sonst ist es eine stille Lücke.

**Termine hängen an der Prüfung und es dürfen mehrere sein.** St. Gallen
prüft im Frühling und im Herbst; ausgeliefert wird der nächste, der noch
bevorsteht. Basel-Stadt nennt statt eines Datums ein Fenster «zwischen den
Sport- und den Frühjahrsferien» — dann gilt dessen **letzter** Tag, denn wer
damit rechnet, kommt nie zu spät, und das Feld `genau: false` sagt, dass es
geschätzt ist.

Die Kantonswahl zeigt nur Kantone, ohne Prüfungstyp und Fächerliste — der
Prüfungstyp kommt im nächsten Schritt. Ein Kanton mit `aktiv: false` steht
ausgegraut da und ist nicht antippbar.

Schulwahl: die Schulen des gewählten Kantons, je mit Prüfungsname **und**
Fächern. **Die Kennung «ZAP» steht nur, wo sie hingehört:** Sie ist der
Zürcher Name und kommt aus dem Katalog, nicht aus dem Code. Bern führt kein
Kürzel — dort steht dann nichts, nicht eine erfundene Abkürzung.

**`aktiv: true` ist ein Versprechen.** Es heisst: Für jedes Fach dieser
Prüfung gibt es wirklich Aufgaben, jede genannte Aufsatzart existiert, und
der Termin liegt in der Zukunft. Geprüft wird das von `app/pruefung/kantone.py`
— siehe Abschnitt 8. Solange das nicht stimmt, bleibt der Kanton auf `false`.
Das ist ehrlich und kostet niemanden etwas.

### 3.1.1 Fach und Bereich — zwei Ebenen

Das ist die inhaltliche Achse der Navigation, und der Unterschied trägt sie:

| | Beispiele | Hat einen Themenbaum? |
|---|---|---|
| **Prüfungsfach** | Mathematik · Deutsch · Französisch | nein |
| **Bereich** | Mathematik · Sprachbetrachtung · Textverständnis · Aufsatz | ja (ausser Aufsatz) |

Ein Bereich trägt eine `art`, und es gibt drei:

| `art` | Was dahintersteckt |
|---|---|
| `themenbaum` | Unterthemen mit Pflichtset — der Normalfall |
| `aufsatz` | Schreiben und korrigieren lassen |
| `tipps` | **Ein Prüfungsteil, den man nicht antippen kann** |

**`tipps` ist die Antwort auf Hörverstehen und mündliche Prüfungen.** Ein
Video hat die App nicht, ein Gegenüber auch nicht — und den Prüfungsteil
verschweigen geht schlecht, wenn er ein Fünftel der Punkte trägt. Was sich
sehr wohl vermitteln lässt, ist das Verfahren: was in welcher Reihenfolge
geschieht, worauf es dabei ankommt, welche Sätze man vorher können sollte.
Die Seiten liegen in `app/backend/src/main/resources/tipps/`, das Verzeichnis
daneben sagt, welche es gibt.

Eine solche Seite hat vier Teile: **Ablauf** (nummerierte Schritte mit
Dauer), **Abschnitte** mit Tipps, je aus `regel` und `warum` — eine Regel
ohne Grund merkt sich niemand, und `kantone.py` besteht darauf —,
**Redemittel** zum Auswendiglernen und **Übungen**: Verweise auf
Unterthemen, die genau diese Fertigkeit trainieren. Für das französische
Hörverstehen sind das Uhrzeit, Mengen und Fragen bilden; die zeigen auf
echte Unterthemen, und der Prüfer schlägt an, wenn einer ins Leere zeigt.

Unter «Lernen», im Selbsttest, im Fortschritt und in der Standortbestimmung
steht auf der ersten Ebene **immer das Fach**. Erst darunter kommen die
Bereiche. Vorher standen «Mathematik» und «Deutsch Sprachbetrachtung»
nebeneinander, als wäre das eine so gross wie das andere — und
Textverständnis fehlte ganz, obwohl es an der Prüfung geschrieben wird.

Bei Mathematik fallen Fach und Bereich zusammen; dort überspringt die App die
Zwischenebene.

**Die Aufgaben tragen weiterhin den Bereich in ihrem Feld `fach`.** Der Name
bleibt: Er steht in Vorlagen, Backend, Vorschau und gespeichertem Fortschritt,
und ihn umzubenennen wäre eine Datenmigration ohne Gegenwert. Wo der Code die
obere Ebene meint, heisst sie `pruefungsfach`.

**Welche Bereiche ein Fach hat, entscheidet der SCHULTYP, nicht das Fach.**
«Deutsch» heisst in Zürich Sprachbetrachtung plus Textverständnis plus
Aufsatz, in Bern die Berner Fassung davon — und an der FMS Bern nur den
Aufsatz, weil die ganze Deutschprüfung dort aus einem einzigen Text besteht.
Die Bereiche stehen deshalb am Prüfungsteil.

Es gibt dabei **keinen Rückfall** auf die Bereichsliste des Fachs. Ein
Rückfall hätte einem Berner Kind stillschweigend Zürcher Stoff gezeigt,
sobald in seiner Prüfung ein Bereich fehlt, und niemand hätte es gemerkt.
Fehlt etwas, ist die richtige Antwort «nichts» — und `kantone.py` schlägt an.
Die Liste des Fachs gilt nur, solange überhaupt kein Schultyp gewählt ist.

**Ein Prüfungsfach führt seine Bereiche nicht selbst.** Die Zugehörigkeit
steht genau einmal, nämlich am Bereich (`pruefungsfach`); `Katalog.kt`
rechnet die Liste des Fachs daraus aus. Vorher stand sie zweimal da und lief
beim ersten neuen Kanton auseinander.

**Französisch ist inzwischen befüllt-vorbereitet.** In der Zürcher ZAP wird
es nicht geprüft, also erscheint es dort nirgends; in Bern und St. Gallen
gehört es zur Prüfung. Ein Bereich ohne Themenbaum wird gefiltert, nicht
angezeigt.

### 3.2 Themenbäume

Die Themenbäume sind **die** inhaltliche Achse der App. Sie stehen in
`app/backend/src/main/resources/themen/`; welche es gibt, sagt
`themen/index.json` — genau wie bei den Vorlagen. Ein neuer Baum braucht
dadurch keine Kotlin-Änderung, und keiner der Prüfer übersieht ihn.

Ein Baum gehört zu **einem Bereich** (Feld `fach`) und bedient alle
Prüfungen, deren Teile diesen Bereich nennen. Innerhalb eines Baums kann ein
Unterthema auf einzelne Prüfungen eingeschränkt sein:

| Feld | Bedeutung |
|---|---|
| `nurGeprueftIn: ["zh-zap3"]` | kommt **nur** in dieser Prüfung vor |
| `nichtGeprueftIn: ["zh-zap3"]` | kommt in dieser Prüfung **nicht** vor |

Vierzehn Unterthemen des Zürcher Mathematikbaums stehen nur in der ZAP 3 —
Zinsrechnen, Kreissektor, Zylinder, Geradengleichung. Die Angabe stand von
Anfang an im Baum, hiess aber `zap3` und `nur: "ZAP 3"` und wurde **von
niemandem gelesen**: Ein Kind, das die ZAP 1 schreibt, bekam sie trotzdem
vorgeschlagen. Jetzt ist sie kantonsneutral formuliert und wirkt — Scheduler,
Selbsttest, Standortbestimmung und Fortschritt fragen `Katalog.giltIn`.

**Die Anteile eines Baums ergeben 100 %, immer.** Sie werden nach dem
Verfahren des grössten Rests gerundet; einfaches Aufrunden hatte die Summe
auf 101 und 102 laufen lassen, und der Fortschritt-Screen rechnet damit.

Aufgaben gibt es in zwei Formen: **parametrisierte Templates** in
`templates/mathematik.json`, aus denen der Generator hunderttausende Aufgaben
zieht, und **Blöcke im Textformat** in `templates/mathematik-*.json` für
Aufgaben, deren Lösung ein Term ist.

**Mathematik ZAP 3** — 8 Oberthemen, 87 Unterthemen, Codes `N.NN`:

| Nr | Oberthema | Punkte | Anteil |
|---|---|---|---|
| 1 | Zahl und Arithmetik | 0 | 0 % |
| 2 | Terme und Gleichungen | 18 | 45 % |
| 3 | Statistik und Wahrscheinlichkeit | 4 | 10 % |
| 4 | Grössen und Masse | 7 | 18 % |
| 5 | Funktionale Zusammenhänge | 3 | 8 % |
| 6 | Abbildungen und Symmetrien | 0 | 0 % |
| 7 | Geometrie in der Ebene | 4 | 10 % |
| 8 | Geometrie im Raum | 4 | 10 % |

Oberthema 1 und 6 haben 0 Punkte, weil sie nicht eigenständig geprüft werden —
sie sind Voraussetzung für die anderen. Sie bleiben trotzdem übbar.

Jedes Unterthema trägt `zap3: true|false` und optional `nur: 'ZAP 3'` sowie
eine `lp21`-Referenz auf den Lehrplan 21.

**Deutsch Sprachbetrachtung ZAP 2** — 9 Oberthemen, 57 Unterthemen, 52 Punkte:
(Der Kommentar in der Quelle sagt 55; gezählt sind es 57.)
Wortschatz (10) · Wortarten (6) · Verb Zeitformen (4) · Verb Modus (6) ·
Aktiv/Passiv/Modalverben (3) · Nomen, Artikel, Pronomen (6) · Adjektiv (2) ·
Satzglieder und verbale Teile (5) · Satzbau und Satzzeichen (10).

**Deutsch Textverständnis ZAP 2** — 6 Oberthemen, 24 Unterthemen, 30 Punkte,
Lernziel-IDs `DT.*`:
Informationen entnehmen (7) · Wortschatz im Text (5) · Bezüge und Verweise (4) ·
Aufbau und Textsorte (5) · Aussage und Deutung (6) · Sprachliche Mittel (3).

Textverständnis-Aufgaben tragen einen **Lesetext**: Er gehört zum Block, nicht
zur einzelnen Aufgabe — ein Text, viele Fragen, wie in der Prüfung. Er steht
über der Aufgabe und lässt sich einklappen; auf einem Telefon schöbe er die
Frage sonst bei jeder Aufgabe aus dem Bild. Im Template steht er als `text`,
am Block oder an der einzelnen Aufgabe.

Das Format ist bewusst **geschlossen** — Einfachauswahl, Auswahltabelle,
Markieren. Eine Lücke wäre hier falsch: Beim Textverständnis steht die Antwort
im Text, und genau das ist der Sinn der Aufgabe. Tor T8 fragte dort etwas
Sinnloses.

**Deutsch Aufsatz** — 150 Themen über dreizehn Arten; in Zürich vier Slots: `arg` (Argumentation),
`erz` (Erzählung), `ref` (Reflexion), `bild` (Bildimpuls). Textsorten nach
Prüfungsanforderungen: Beschreibung, Bericht, Argumentation/Stellungnahme,
Erzählung.

### 3.3 Lernziel-IDs

Schema `FACH.THEMA.NR`. Mathematik ZAP 3 durchwegs `M2.*`, Sprachbetrachtung
`D2.*`, Textverständnis `DT.*`, Aufsatz `DA.*`.

**Einmal vergeben, nie ändern.** Sie landen in Nutzerfortschritten. Neue IDs
immer aus dem passenden Oberthema ableiten. `MA.*` gehörte zur ausgebauten
ZAP-1-Fassung und wird für Neues nie verwendet.

### 3.4 Die Fortschrittsregel

Jedes Thema hat ein **Pflichtset**. Wer es gelöst hat, hat das Thema
abgeschlossen — das sind die 100 %. Alle weiteren Aufgaben bleiben unbegrenzt
verfügbar und zählen nicht mit.

Deshalb steht in der UI **überall eine abzählbare Grösse statt einer
Prozentzahl**: «8 von 13 Themen», «13 von 20 Pflichtaufgaben». Kreisdiagramme
und Ringe sind aus dem Design entfernt worden und kommen nicht zurück.

Die Grösse des Pflichtsets ist pro Unterthema konfigurierbar (`pflichtset`),
Standard 20. Sie steht im Themenbaum, nie im Code.

---

## 4. Backend — Kotlin

### 4.1 Stack

Kotlin 2.0 · Ktor 3 · Exposed · PostgreSQL 16 (H2 in-memory im Dev) ·
kotlinx.serialization · Koin · JWT (java-jwt) · Flyway.

### 4.2 Schichten

```
route/      Ktor-Routen. Nur HTTP: Parsen, Validieren, Statuscode.
service/    Fachlogik. Kennt kein Ktor.
engine/     Generator, Auswerter, Rng, Validator. Rein, ohne Seiteneffekte.
repo/       Exposed-Zugriff. Gibt Domänentypen zurück, nie ResultRow.
model/      Domänentypen und DTOs. Datenklassen, kein Verhalten.
```

**Eine Route ruft nie ein Repo direkt auf.** Immer über einen Service.

### 4.3 Die Engine

`engine/Ausdruck.kt` enthält einen eigenen Parser für arithmetische Ausdrücke
(Shunting-Yard). **Nie `ScriptEngine`, nie Reflection, nie `eval`.** Erlaubt
sind Zahlen, die deklarierten Variablennamen, `+ - * / %`, Vergleiche,
`&& || ! ? :` und die Funktionen `floor ceil round abs min max pow sqrt ggt
istGanz teilerImBereich`. Alles andere wirft beim Parsen.

`engine/Rng.kt` ist bitgenau dieselbe Implementierung wie die JS-Fassung in
`kantone/zuerich/Mathematik/zap-trainer/demo-kurzzeit.html`. Der Seed wird zuerst gestreut, sonst liefern 1, 2, 3
sehr ähnliche erste Ziehungen. Wer `Rng` ändert, ändert **alle** bisher
gespeicherten Aufgaben — das ist ein Datenmigrationsfall, kein Refactoring.

`engine/Generator.kt` zieht per Rejection Sampling: Variablen würfeln, alle
`bedingungen` prüfen, bei Misserfolg neu würfeln, nach 400 Versuchen
`ZiehungFehlgeschlagen`.

### 4.4 Die Qualitätstore

`engine/Validator.kt`, je 200 Ziehungen pro Template.
**Nur erweitern, nie lockern.** Ein Template, das die Tore nicht besteht, ist
nicht fertig — dann wird das Template repariert, nie das Tor.

| Tor | Prüft |
|---|---|
| T1 | Struktur: Pflichtfelder, gültige `unterthemen`-Codes |
| T2 | Mindestens 3 Fehlermuster, jedes mit Feedback |
| T3 | Schweizer Hochdeutsch: kein `ß`, kein Euro, Du-Form — auch in Arbeitsanweisungen, wörtliche Rede ausgenommen |
| T4 | Ziehung gelingt in ≥ 90 % der Seeds |
| T5 | Gegenprobe: zweite, strukturell andere Formel stimmt überein |
| T6 | Zahlenqualität: ohne Taschenrechner lösbar |
| T7 | Distraktoren brauchbar, keine Dubletten, keine negativen Preise |
| T8 | Lösung steht nicht im Aufgabentext |
| T9 | Erster Hinweis verrät die Lösung nicht |
| T10 | Ausbeute: genug verschiedene Aufgaben |
| T11 | Vielfalt: genug verschiedene Aufgabentexte und Lösungen |
| T12 | Jedes Fehlermuster greift mindestens einmal |
| T17 | Beim Gitter liegen keine zwei Bildpunkte auf demselben Feld |

**T17** kam aus einem Befund, der lange nur flackerte. Ein zweites Antippen
nimmt die Wahl zurück (§4.5) — fallen zwei Bildpunkte zusammen, löscht das
Setzen des zweiten das erste, und die Aufgabe ist über die echte Bedienung
unlösbar. Sie sieht dabei völlig in Ordnung aus. In `drehung-gitter` landeten
A′ und B′ bei einer von vielen tausend Ziehungen beide auf (10|11).

`a*b` und `b*a` sind **nicht** strukturell anders. Die Gegenprobe fängt
selbstkonsistente Fehler ab — sie muss einen anderen Rechenweg gehen.

Zwei Tore fallen in der Praxis am häufigsten:

- **T11 Vielfalt** braucht mindestens halb so viele verschiedene Aufgabentexte
  wie gelungene Ziehungen. Ein Template mit wenigen Zahlenkombinationen — etwa
  pythagoreische Tripel — besteht das nur mit einer **Textvariablen für den
  Kontext** oder einem Streckfaktor.
- **T8 Verrat** schlägt an, wenn die Lösung als Zahl im Aufgabentext steht.
  Das wird über eine **Bedingung** ausgeschlossen (`teil!=satz`, `x!=a`), nicht
  über Glück. Verglichen werden Zahlen, nicht Zeichenketten — sonst schlüge das
  Tor bei «120 Minuten» und der Lösung 12 falsch an.

### 4.5 Deutsch: Blöcke statt Templates

**Grammatik lässt sich nicht parametrisieren wie Arithmetik.** «Bestimme die
Wortart von *dennoch*» hat keine Variablen, sondern einen Satz, der stimmen
muss. Deshalb ist ein Deutsch-Template ein **Block gleichartiger Aufgaben**
mit gemeinsamem Rahmen: dieselbe Frageform, dieselben Hinweise, dieselbe
geschlossene Optionenmenge.

Was bleibt, ist die harte Regel: **Template-ID plus Seed ergibt immer dieselbe
Aufgabe**, und jede Aufgabe benennt ihre Denkfehler. Der Seed wählt die
Aufgabe *und* mischt die Optionen — so steht die richtige Antwort nicht
immer an derselben Stelle.

**Das Format trägt auch Algebra.** Die Lösung von «Multipliziere aus:
2(3x − 1)» ist ein Term, keine Zahl — der Zahlengenerator kann sie nicht
prüfen. Solche Aufgaben liegen deshalb in `templates/mathematik-*.json`,
tragen `fach: "mathematik"` und laufen durch dieselbe Engine. Ein drittes
Format wäre eine dritte Stelle zum Pflegen gewesen.

Welche Dateien geladen werden, steht in `templates/bloecke.index.json` —
ein neuer Block braucht dadurch keine Kotlin-Änderung.

**Vierzehn Aufgabenarten.** Sechs davon waren von Anfang an da; acht sind
aus den ZAP-Trainern dazugekommen, weil in der Prüfung eben nicht nur Zahlen
eingetippt werden. Wer nur «Zahl eingeben» anbietet, übt einen Teil der
Prüfung nie.

Die Aufzählung steht in `engine/Format` (Zahlen) und `engine/TextFormat`
(Blöcke):

| Format | Was der Schüler tut | Beispiel |
|---|---|---|
| `zahl_eingeben` | eine Zahl tippen | Rabatt zurückrechnen |
| `mehrfeld` | mehrere Felder füllen, jedes mit eigenen Fehlermustern | Hypotenuse, Um- und Inkreis |
| `gitter` | Punkte ins Koordinatengitter setzen | Achsenspiegelung, Schnittpunkt |
| `zuordnen` | Elemente ihren Zielen zuordnen | Würfel kippen |
| `sortieren` | der Grösse nach ordnen | Zehnerpotenzen, Volumen |
| `wertetabelle` | alle passenden Zahlenpaare eintragen | umgekehrte Proportionalität |
| `faerben` | Rasterfelder einfärben | Vorderansicht eines Würfelkörpers |
| `loesungsmenge` | eine Menge angeben | gemeinsame Teiler |
| `einfachauswahl` | eine aus einer geschlossenen Menge | Wortart, Kasus, Modus, Zeitform |
| `mehrfachauswahl` | mehrere aus einer Liste | alle Pronomen im Satz |
| `luecke` | Freitext, mehrere Schreibweisen gelten | «Setze ins Perfekt» |
| `markieren` | Wörter im Satz antippen | Objekt, verbale Teile |
| `kommas` | in die Lücke zwischen Wörtern tippen | Kommas setzen |
| `tabelle_auswahl` | je Zeile eine Wahl aus derselben Menge | Wortart mehrerer Wörter |

**Alles wird angetippt, nichts gezogen.** Auf einem Telefon ist Ziehen mit
dem Daumen unzuverlässig — man verfehlt das Ziel, das Blatt scrollt
stattdessen weg, und ein Kind, das die Aufgabe lösen kann, scheitert an der
Bedienung. Zuordnen und Sortieren laufen deshalb über zwei Tipps. **Ein
zweites Antippen nimmt die Wahl zurück**; ohne das gäbe es keinen Weg,
einen Fehlgriff zu berichtigen.

**In der Übung darf man unvollständig prüfen.** Wer drei von vier Feldern
gefüllt hat, soll nicht raten müssen, was ins vierte gehört — die
Rückmeldung sagt es ihm, und genau dafür ist die Übung da. Im Selbsttest
und in der Standortbestimmung zählt die Aufgabe als Ganzes, wie in der
Prüfung. Die Unterscheidung steht in `AntwortZustand.abgebbar`.

Bei `kommas` steht im Template der Satz **mit** Kommas; der Generator nimmt
sie heraus und leitet die Stellen ab. So kann nichts auseinanderlaufen — und
Tor 16 prüft, dass Aufgabentext und Lösungssatz wirklich derselbe Satz sind.

Die Deutsch-Tore stehen in `engine/TextValidator.kt`:

| Tor | Prüft |
|---|---|
| T1 | Struktur, gültige Codes, Herkunft, Optionen vorhanden |
| T2 | Jede Auswahl- und Lückenaufgabe hat mindestens ein Fehlermuster mit Feedback |
| T3 | Schweizer Hochdeutsch |
| T8 | Bei einer Lücke steht die Lösung nicht schon im Aufgabentext |
| T11 | Mindestens 12 Aufgaben je Block, keine wortgleichen, kein doppelter Aufgabentext — auch bei `tabelle_auswahl` —, keine Antwort in über der Hälfte |
| T13 | Die Lösung steht in den Optionen |
| T14 | Distraktoren sind brauchbar und stehen in den Optionen |
| T15 | Jedes zu markierende Wort kommt im Satz vor |
| T16 | Bei Kommas stimmen Aufgabentext und Lösungssatz überein |

T11 verlangt seit Kurzem auch, dass der **Aufgabentext allein** schon
unterscheidet. Zwölf Aufgaben mit dem Satz «Welche Aussage stimmt im Sinne
des Textes?» sind formal verschieden — die Antworten unterscheiden sich —,
aber niemand kann sie auseinanderhalten: nicht die Schülerin, die im
Fehlerarchiv nachschaut, und nicht die Prüfung, die eine Aufgabe über ihren
Stamm wiederfinden will. Die Berner Prüfung nummeriert sie ebenso: 3.1, 3.2,
3.3, 3.4.

T11 ist die häufigste Hürde: **Zwölf Aufgaben sind das Minimum**, weil ein
Set von zehn sich sonst wiederholt. Und wenn eine Antwort in mehr als der
Hälfte der Aufgaben die richtige ist, käme durch, wer immer dasselbe antippt.

**Bei `tabelle_auswahl` galt die Stammregel lange nicht** — dort steckt die
Aufgabe ja in den Zeilen. Das war ein Irrtum mit Folgen: `setZiehen` verwirft
eine Aufgabe, deren Stamm es schon gezogen hat. Ein Block mit zwölf
gleichlautenden Stämmen liefert in der Übung darum ein Set von **genau einer**
Aufgabe — «1 von 1» statt «1 von 10». Fünf Blöcke in drei Kantonen waren so,
und es fiel niemandem auf, weil alles funktionierte. Seit T11 auch dieses
Format prüft, tragen sie eine Nummer im Stamm; die Berner Prüfung nummeriert
ihre Teilaufgaben ebenso.

### 4.5.1 Zwei Herkünfte, zwei Garantien

Die Aufgaben stammen aus zwei Quellen, und sie tragen verschiedene
Zusicherungen. Das steht im Feld `status` und wird von den Toren
unterschiedlich geprüft — **nicht, um es den eingeführten leichter zu
machen**, sondern weil bei ihnen etwas anderes belegbar ist.

| | von Hand (`review`, `live`) | eingeführt (`importiert`) |
|---|---|---|
| Gegenprobe | Pflicht, strukturell anderer Rechenweg | entfällt |
| Fehlermuster | mindestens 3, jedes mit benanntem Denkfehler | mindestens 2 je Feld |
| Erklärung | Lösungsweg in Schritten | **Pflicht**: Kern, Schritte, Falle (Tor T18) |

Tor T18 misst dabei nicht die Länge. «*«trotz» fordert den Genitiv.*» ist
kurz und gut; «*Lösung: Er wird darum bitten.*» ist länger und wertlos, weil
es nur wiederholt, was der Schüler ohnehin sieht. Geprüft wird deshalb:
Bleibt etwas übrig, wenn man die Antwort abzieht?

**Manche Templates können nicht beliebig viele Aufgaben geben.** Ein
Spielwürfel hat genau 48 Lagen. Wer das ausnutzt, hält es in
`variantenGrenze` fest — **mit Grund**. Die Schwelle von Tor T11 bleibt bei
60; die Ausnahme steht in den Daten und ist nachlesbar, statt in einer
gesenkten Schwelle zu verschwinden.

### 4.6 Was ein Template braucht

1. **Gegenprobe** — zweite, strukturell andere Formel für dieselbe Lösung.
2. **Mindestens 3 Fehlermuster**, jedes ein echter Denkfehler: falscher
   Grundwert, Richtung vertauscht, Schritt vergessen, Anteil als fixer Betrag,
   additiv statt multiplikativ, Einheit nicht umgerechnet. Immer prüfen, ob ein
   Muster für gewisse Parameter zufällig die richtige Lösung ergibt — dann
   fällt der Distraktor weg und die Aufgabe hat zu wenige.
3. **Feedback, das den Denkfehler benennt.** Nie nur «Das ist falsch.» Zwei bis
   drei Sätze in Du-Form, Wortschatz einer 9. Klasse.
4. **2–3 Hinweise, aufsteigend.** Der erste stellt eine Rückfrage und verrät die
   Lösung nicht.
5. **`unterthemen`** — mindestens ein Code aus dem Themenbaum.
6. **`herkunft`** — `abgeleitet` plus Quelle, oder `eigenentwicklung`.

Im Aufgabentext stehen Platzhalter:

| Form | Ergibt |
|---|---|
| `{preis}` | die Zahl schlicht: `240`, `2.5`, `-3` |
| `{preis:franken}` | `Fr. 24'000.–` — Schweizer Schreibweise mit Apostroph |
| `{ware.1}` | die zweite Form einer Textvariablen, für Fälle und Artikel |
| `{n:hoch}` | hochgestellt: `2{n:hoch}` ergibt `2⁴` |

**Eine Hochzahl steht hochgestellt, nie als `^`.** «2^5» ist eine Notlösung
aus der Zeit der Schreibmaschine; ein Kind liest dort «zwei Dach fünf» und
muss erst übersetzen. Bei fester Hochzahl steht das Zeichen direkt im Text
(`2⁵`, `x²`, `10⁻⁴`), bei einer variablen der Platzhalter `{n:hoch}`. Das
gilt für Aufgabentext, Antwort, Hinweis, Feedback und Lösungsweg
gleichermassen — Tor T3 lehnt jedes `^` ab.

**Ein Bruch wird gesetzt, nie als `4/6` geschrieben.** Angezeigt wird `⁴⁄₆`:
Zähler hochgestellt, Bruchstrich `⁄` (U+2044), Nenner tiefgestellt. Das
`zahlformat: "bruch"` erzeugt es selbst; in Blöcken steht es im Text.

Zwei Dinge dabei, die man leicht falsch macht:

- **Getippt wird weiterhin mit dem Schrägstrich.** Eine Tastatur hat kein
  `⁴⁄₆`. Darum verwandelt `alsZahl` hoch- und tiefgestellte Ziffern vor dem
  Rechnen zurück — wer `5/12` tippt und wer `⁵⁄₁₂` abschreibt, bekommt
  dieselbe Zahl. Wo der Schüler tippt (`luecke`, `kommas`, `markieren`),
  bleibt der Schrägstrich auch in den Daten stehen.
- **In `ausdruck`, `bedingungen` und `gegenprobe` ist der Schrägstrich eine
  Division**, die die Engine rechnet. Wer dort `⁵⁄₁₂` hineinschreibt, macht
  aus einer Formel Zeichensalat. Tor T3 prüft darum nur Anzeigetexte,
  Optionen, Lösungen und Fehlerantworten.

**Auf dem Bildschirm steht der Bruch zweizeilig**, Zähler über Nenner mit
Strich dazwischen — so, wie er im Heft steht. Die Zeichenkette `⁴⁄₆` in den
Daten ist die Zwischenform: Sie reist durch Backend, Vorschau und
gespeicherten Fortschritt, bleibt überall lesbar und braucht **kein Markup in
den Vorlagen** (§4.5: Vorlagen sind Daten). Gerendert wird sie erst in der
Oberfläche, an genau einer Stelle je Fassung:

| Fassung | Wo |
|---|---|
| Vorschau | `anzeige()` und `hervor()` — maskieren und Brüche setzen, wie es `hervor` schon für `_Hervorhebung_` tut |
| Flutter | `widgets/mathe_text.dart` — `MatheText` baut ein `Text.rich` mit einem `WidgetSpan` je Bruch |

Der Helfer heisst in der Vorschau bewusst **nicht** `mathe`: So heisst in
`setZiehen` bereits eine lokale Variable für die Mathematik-Templates, und
eine Verschattung ist genau die Sorte Fehler, die erst auffällt, wenn ein
Screen leer bleibt.

Das getrennte Format ist nötig, weil in einer Aufgabe «Fr. 80.–» und «20 %»
nebeneinander stehen: Ein einziges Format für den ganzen Stamm ergäbe
«Fr. 20.–» für den Prozentsatz.

Wir orientieren uns an offiziellen Prüfungen, übernehmen aber **nie deren
Wortlaut**. Eigener Kontext, eigene Zahlen, eigene Namen.

### 4.6 Der Scheduler — «Zuerst dran»

`service/Scheduler.kt` bestimmt die Reihenfolge. Der Wert eines Unterthemas:

```
prioritaet = 0.40 · pruefungsgewicht      Punkteanteil des Oberthemas
           + 0.25 · schwaeche             1 − Trefferquote der letzten 10
           + 0.20 · dringlichkeit         Zeit bis zur Prüfung, Pflichtset offen
           + 0.15 · vergessen             Tage seit letzter Übung, Ebbinghaus
```

Zwei Regeln darüber:

- **Voraussetzungen zuerst.** Ein Unterthema mit unerfüllten `voraussetzungen`
  wird zurückgestellt, bis diese ein Pflichtset zur Hälfte haben.
- **Kein drittes Mal am Stück.** Dasselbe Unterthema kommt nicht dreimal
  hintereinander als Vorschlag.

Die Reihenfolge rechnet sich **nach jeder Übung neu**. Die UI sagt das auch so.

Der Screen «Zuerst dran» zeigt Vorschlag 1 **mit Begründung** und Vorschlag 2
als Alternative. Nie mehr als zwei.

### 4.7 Die Standortbestimmung

24 Aufgaben **je Fach**, quer über alle Oberthemen, gewichtet nach
Prüfungsanteil. Dauer 20–25 Minuten, unterbrechbar. Mathematik und Deutsch
werden getrennt geprüft, also werden sie auch getrennt angeboten: Eine
gemeinsame Zahl sagt niemandem, wo er steht.

Das Ergebnis ist **keine Note und keine Niveau-Einstufung** — und **keine
verbindliche Reihenfolge.** Der Ergebnis-Screen «Dein Startpunkt» zeigt drei
Zahlen — «6 sitzen · 7 zuerst üben · 12 noch offen» — und darunter die Themen
mit der **höchsten Fehlerquote** als Empfehlung.

Hier standen die Plätze 1 bis 3 und darüber «In dieser Reihenfolge». Das
versprach mehr, als eine halbe Stunde Aufgaben belegen kann: Eine verbindliche
Reihenfolge legt der **Lernpfad** fest. Was die Standortbestimmung zeigen kann,
ist genau eines — wo es gehakt hat. Solange der Lernpfad nicht steht, bleibt es
dabei.

**Sie heisst überall «Standortbestimmung», nie «Test».** Das ist keine
Wortklauberei: «Test» weckt genau die Erwartung, die der Screen gleich darauf
verneinen muss.

Wer sie überspringt, bekommt die Reihenfolge nach Prüfungsgewicht.

### 4.8 Auth

Drei Wege, gleichwertig:

1. **Sign in with Apple** — Pflicht auf iOS, sobald ein zweiter Anbieter da ist
   (App Store Review Guideline 4.8). `identityToken` wird serverseitig gegen
   `https://appleid.apple.com/auth/keys` geprüft: Signatur, `iss`, `aud` gleich
   der Bundle-ID, `exp`, und `nonce` gleich dem SHA-256 des Client-Nonce.
   Apple liefert Name und E-Mail **nur beim allerersten Mal** — wer sie da nicht
   speichert, bekommt sie nie wieder.
2. **Google Sign-In** — für Android und den Play Store. `idToken` gegen
   `https://www.googleapis.com/oauth2/v3/certs`, `aud` gleich der Web-Client-ID.
3. **Ohne Konto weiterlernen** — Gerätekonto, sofort nutzbar, jederzeit
   nachträglich mit Apple oder Google verknüpfbar. Der Fortschritt wandert mit.
   Ein 14-Jähriger soll nicht an einer Anmeldemaske scheitern.

Serverseitig eine eigene Session: Access-Token 15 Minuten, Refresh-Token
60 Tage, rotierend. Der Client kennt nur diese beiden, nie das Apple- oder
Google-Token.

**E-Mail-Passwort gibt es nicht.** Keine vergessenen Passwörter, kein
Passwort-Reset-Flow, keine Passwort-Datenbank.

### 4.9 Abo — StudySwiss Plus

**Der Markt im Kanton Zürich**, Stand August 2026:

| Angebot | Preis |
|---|---|
| Präsenzkurs über eine Saison (Lern-Forum, Logos) | Fr. 1'980 – 3'370 |
| Einzelnachhilfe | Fr. 27 – 49 pro Lektion |
| GoGymi, direkter Mitbewerber | Fr. 49 im Monat, Fr. 390 im Jahr |
| Edufox, Selbstlernmaterial | gratis |

**Daraus folgen drei Entscheide:**

1. **Der Prüfungs-Pass ist das Hauptprodukt, nicht das Monatsabo.** Die App
   sagt von Anfang an: «Dein Termin gibt das Tempo vor.» Ein Produkt, das
   genau bis zu diesem Termin gilt, passt dazu — und Eltern müssen nichts
   kündigen und nichts im Kalender notieren.
2. **Fr. 129 für den Pass.** Rund fünf Prozent eines Präsenzkurses, ein Drittel
   des Jahresabos beim direkten Mitbewerber.
3. **Ein Fach bleibt gratis, und zwar vollständig.** Nicht drei Aufgaben zur
   Probe, sondern Mathematik von A bis Z.

| Produkt | Preis | Art | Läuft bis |
|---|---|---|---|
| `ch.studyswiss.plus.pass` | Fr. 129.– | einmalig | 30 Tage nach der Prüfung |
| `ch.studyswiss.plus.familie` | Fr. 189.– | einmalig, 3 Codes | je bis zur eigenen Prüfung |
| `ch.studyswiss.plus.monat` | Fr. 19.– | Abo, monatlich kündbar | 31 Tage, erneuert sich |

Der Kauf-Screen **rechnet vor**, welcher Weg beim eigenen Termin günstiger ist:
Wer noch acht Monate hat, fährt mit dem Pass besser; wer noch zwei hat,
monatlich. Das steht auf der Karte, nicht im Kleingedruckten.

Der **Familien-Pass** erzeugt zwei Codes zum Weitergeben. Wer einen einlöst,
bekommt Plus **bis zur eigenen Prüfung**, nicht bis zu der des Geschwisters.

Gratis: Standortbestimmung, ein Fach vollständig, Lernpfad, Fortschritt,
Fehlerarchiv. Plus: alle Fächer, Selbsttest über die ganze Prüfung,
Aufsatzkorrektur, Eltern-Report.

**Gekauft wird ausschliesslich über StoreKit 2 und Google Play Billing 6.**
Der Server prüft jede Quittung serverseitig gegen die App Store Server API
bzw. die Google Play Developer API und führt den Status selbst. **Dem Client
wird nie geglaubt** — und ohne die Server-Schlüssel lehnt er in Produktion
jeden Kauf ab. Lieber kein Plus als eines, das sich jeder selbst ausstellt.

Zwei Dinge, die beide Läden verlangen und die man leicht vergisst:
`completePurchase` muss **immer** aufgerufen werden, auch nach einem Fehler
(sonst erstattet Google nach drei Tagen automatisch zurück), und «Kauf
wiederherstellen» ist auf iOS Pflicht (Review Guideline 3.1.1).

### 4.9.1 Beide Läden gleichwertig

Die App erscheint im App Store **und** im Play Store, mit demselben
Funktionsumfang. Was sich unterscheidet, steht an genau diesen Stellen:

| | iOS | Android |
|---|---|---|
| Anmeldung oben | Apple | Google |
| Kaufabwicklung | StoreKit 2 | Play Billing 6 |
| Quittung | signierte Transaktion (JWS) | `purchaseToken` |
| Icon | `app/marke/app-icon.svg` | adaptiv, Vordergrund + Volltonfarbe |

Die Produkt-IDs sind in beiden Läden **identisch**, damit im Code keine
Fallunterscheidung nötig ist. Was von Hand einzurichten ist, steht in
`app/frontend/ios/Runner/Info.plist.ergaenzungen.md` und
`app/frontend/android/app/src/main/AndroidManifest.xml.ergaenzungen.md`.

### 4.10 API

Alles unter `/v1`. Antworten sind JSON, Fehler nach RFC 9457
(`application/problem+json`) mit deutschsprachigem `detail`.

```
POST   /v1/auth/apple            identityToken, nonce   → Session
POST   /v1/auth/google           idToken                → Session
POST   /v1/auth/gast                                    → Session
POST   /v1/auth/refresh          refreshToken           → Session
POST   /v1/auth/verknuepfen      identityToken          → Session
DELETE /v1/auth/konto                                   → Löschung anstossen

GET    /v1/katalog/kantone
GET    /v1/katalog/schultypen?kanton=ZH   aufgelöst: Fächer, Bedingungen,
                                          Aufsatzarten, Bereiche, Teile, Wahl
GET    /v1/katalog/termine?kanton=ZH&schultyp=fms   der NÄCHSTE Termin
GET    /v1/katalog/faecher                Prüfungsfächer + Bereiche
GET    /v1/katalog/tipps?bereich=…        Ablauf, Tipps, Redemittel und
                                          Übungsverweise eines `tipps`-Bereichs
GET    /v1/katalog/themen?fach=sprachbetrachtung&pruefung=zh-zap3
                                          ein BEREICH, nicht ein Fach; mit
                                          `pruefung` nur, was sie wirklich stellt

GET    /v1/profil
PATCH  /v1/profil                kanton, schultyp, pruefungsdatum, vorname

GET    /v1/standort/faecher                             → die Fächer zur Wahl
POST   /v1/standort/start?fach=deutsch                  → 24 Aufgaben
POST   /v1/standort/{id}/antwort
POST   /v1/standort/{id}/abschluss                      → Startpunkt

GET    /v1/uebung/vorschlag                             → «Zuerst dran» + Grund
POST   /v1/uebung/start          unterthema | lernziel  → Set + Einführung
POST   /v1/uebung/{id}/antwort   aufgabeRef, eingabe    → richtig/falsch + Feedback
POST   /v1/uebung/{id}/hinweis   stufe                  → nächster Hinweis
POST   /v1/uebung/{id}/abschluss                        → Ergebnis

GET    /v1/selbsttest/faecher                           → die Fächer zur Wahl
GET    /v1/selbsttest/bedingungen?fach=deutsch          → aus dem Katalog;
                                          mit `fach` die des Fachs — in Bern
                                          dauert Deutsch doppelt so lange
POST   /v1/selbsttest/start      fach (Prüfungsfach), umfang, themen
GET    /v1/selbsttest/{id}
POST   /v1/selbsttest/{id}/antwort
POST   /v1/selbsttest/{id}/abgabe                       → Ergebnis
GET    /v1/selbsttest/versuche

GET    /v1/fortschritt
GET    /v1/fortschritt/{fach}
GET    /v1/fehler                                       → Fehlerarchiv
POST   /v1/fehler/nochmal       aufgabeRef  → dieselbe Aufgabe

GET    /v1/aufsatz/arten                                → Arten dieser Prüfung
GET    /v1/aufsatz/themen?art=erzaehlung
POST   /v1/aufsatz/entwurf       themaId, text          → speichern
POST   /v1/aufsatz/{id}/korrektur                       → Korrektur nach Schema
GET    /v1/aufsatz/{id}

GET    /v1/eltern/report
POST   /v1/eltern/freigabe       aktiv: true|false

POST   /v1/abo/apple             signedTransaction
POST   /v1/abo/google            purchaseToken
POST   /v1/abo/web/start         produktId, email    → Zahlungsanbieter
POST   /v1/abo/code              code                → Familien- ODER Schulcode
GET    /v1/abo/status

GET    /v1/schule/preise                             → die Staffel, offen
POST   /v1/schule/offerte                            → Offerte + Schlüssel
GET    /v1/schule/offerte/{nr}?schluessel=…
POST   /v1/schule/bestellung                         → Bestellung + Rechnung
GET    /v1/schule/rechnung/{nr}?schluessel=…
GET    /v1/schule/rechnung/{nr}/zahlteil.svg         → QR-Zahlteil
GET    /v1/schule/lizenzen?schluessel=…              → Codes, ohne «wer»
PATCH  /v1/schule/lizenzen/{code}?schluessel=…       klasse, gesperrt
GET    /v1/schule/bericht?schluessel=…               → nur ab 5 Eingelösten
GET    /v1/schule/belege?schluessel=…
```

**Die Aufgabe reist nie mit ihrer Lösung.** `GET`-Antworten enthalten
`aufgabeRef` (`"zwei-toepfe:47"`), Stamm, Optionen und Hinweisanzahl. Die
Lösung liegt nur im Server. Bewertet wird in `POST /antwort`.

### 4.11 Befehle

```bash
./gradlew run              # Server auf :8080, H2 in-memory, Demo-Daten
./gradlew test             # Unit- und Routentests
./gradlew tore             # die zwölf Qualitätstore auf alle Templates
./gradlew offen            # Unterthemen ohne Template
./gradlew ktlintCheck
```

**Nach jeder Template-Änderung `./gradlew tore`.** Ein rotes Tor blockiert den
Merge.

---

## 5. Frontend — Flutter und Website

### 5.1 Stack

Flutter 3.24 · Dart 3.5 · Riverpod 2 · go_router 14 · dio ·
flutter_secure_storage · sign_in_with_apple · google_sign_in · in_app_purchase.

**Kein Codegen.** Die Modelle in `daten/modelle.dart` sind von Hand geschrieben
statt mit `freezed`/`json_serializable` erzeugt. So ist der Code ohne
`build_runner` vollständig und lesbar, und man sieht jedem Feld an, woher es
kommt. Wer das ändern will, ändert es für alle Modelle auf einmal — halb
generiert und halb von Hand wäre das Schlechteste.

### 5.2 Struktur

```
lib/
  main.dart
  app.dart                 MaterialApp.router, Theme
  core/
    theme/                 Farben, Typografie, Abstände, PapierHintergrund
    net/                   Dio-Client, Interceptors, Fehlerabbildung
    speicher/              SecureStorage für Tokens
  daten/
    modelle/               freezed-Datenklassen, spiegeln die DTOs
    quellen/               Ein Repository je API-Bereich
  funktionen/
    onboarding/  anmeldung/  standort/  lernen/  uebung/
    selbsttest/  fortschritt/  fehler/  aufsatz/  eltern/  einstellungen/  plus/
  widgets/                 SsKnopf, SsKarte, SsChip, SsTabLeiste, PapierGrund …
```

Ein Feature-Ordner enthält `screens/`, `widgets/`, `controller.dart`.
**Ein Screen ruft nie `dio` direkt** — immer über Repository und Controller.

### 5.3 Design-System — verbindlich

Alle Werte stammen aus `gestaltung/design frontend/03_Screens_HTML/DesignSystem.dc.html`
und stehen in `core/theme/farben.dart` und `typografie.dart`. Sie werden nicht
neu erfunden und nirgends als Literal in einen Screen geschrieben.

**Farben**

| Token | Hex | Verwendung |
|---|---|---|
| `ink900` | `#3A1D0A` | Text, Primärknopf, dunkle Karte |
| `ink700` | `#5C3A1E` | Icons |
| `ink500` | `#7C5836` | Fliesstext |
| `ink300` | `#A98B66` | Sekundärtext, inaktive Tabs |
| `tan600` | `#B0834F` | Eyebrow, Links |
| `tan500` | `#C99A66` | Fortschrittsbalken, Marke |
| `tan300` | `#E4CBA9` | Rahmen Sekundärknopf, Griff |
| `tan100` | `#F2E4CF` | Icon-Fläche, Balkenhintergrund |
| `papier` | `#FBF5EA` | Seitenhintergrund |
| `karte` | `#FFFDF8` | Kartenfläche |
| `linie` | `#EADCC6` | Rahmen |
| `creme` | `#FFF7EA` | Text auf dunkler Fläche |
| `rot` | `#E2231A` | Marke und Fehler — **nur dafür** |
| `rot100` | `#FBE3E1` | Fehlerfläche |
| `gruen` | `#3F7A4D` | Richtig |
| `gruen100` | `#E3F0E4` | Richtig-Fläche |
| `gelb` | `#D99A2B` | Hinweis |
| `gelb100` | `#FAEED6` | Hinweisfläche |

**Typografie** — zwei Schriften, mehr nicht.

- **Bitter** (Serif): Überschriften und alle Zahlen.
  Display 34/1.1 Bold · Titel 20 SemiBold · h1 27/1.18 SemiBold ·
  h2 18/1.32 · h3 17 · h4 15 · Kennzahl 44/1 SemiBold.
- **Nunito Sans**: Fliesstext und UI.
  Body 14–15/1.5 Regular in `ink500` · Klein 12/1.45 in `ink300` ·
  Label 13 Bold · Eyebrow 10–11 Bold, `letter-spacing .11em`, versal, `tan600`.

**Flächen**

- Papier ist warmes Beige mit **24-px-Karoraster** in `tan600` bei 10 %
  Deckkraft. Das Raster liegt auf jedem Screen und ist Teil der Marke.
- Eckenradius: Karte 16, dunkle Karte 18, Knopf 14, Chip 9, Sheet 20 oben.
- **Keine Schatten.** Einzige Ausnahme: das Bottom-Sheet, `0 -12px 24px rgba(58,29,10,.07)`.
- Seitenrand 24. Knopfhöhe 54. Tab-Leiste 86 hoch. Safe-Area oben 58.

**Icons** sind Lucide, Strichstärke 1.8 für Inhalt, 1.9 für den aktiven Tab,
`stroke-linecap: round`. Keine gefüllten Icons.

### 5.4.1 Studi

Studi ist die Eule als Figur, in acht Stimmungen: **winkend, denkend, Erfolg,
hoppla, fröhlich, ladend, leer, schlafend**. Die Bilder liegen in
`frontend/assets/studi/`, alle auf denselben Rahmen (600 × 536) zugeschnitten —
so springt die Figur nicht, wenn die Stimmung wechselt.

**Sparsam einsetzen.** Die App lebt von Papier, Raster und zwei Schriften;
Studi ist der eine Platz, an dem sie Wärme zeigt. Sie erscheint dort, wo eine
Person gerade etwas fühlt, und sonst nirgends:

| Stimmung | Wo |
|---|---|
| winkend | Splash, Onboarding 1, Anmeldung |
| denkend | Onboarding 2, vor der Standortbestimmung, Übungsergebnis unter der Hälfte |
| Erfolg | Richtig geantwortet, «Dein Startpunkt», Übung über der Hälfte |
| hoppla | Danebengelegen — nie hämisch, Studi wischt sich den Schweiss ab |
| fröhlich | Eltern-Report, Plus freigeschaltet |
| ladend | Wartezeiten, vor allem die Aufsatzkorrektur |
| leer | Fehlerarchiv ohne Einträge |
| schlafend | Lernpfad ohne gesetzten Termin |

**Keine Karte bekommt eine Illustration.** Wer Studi überall hinsetzt, nimmt
ihr die Wirkung an den Stellen, wo sie zählt.

### 5.4.2 Die Marke

**Die Eule** ist die Marke. Die Vorlage steht in
`gestaltung/design frontend/05_Marke/eule-zweifarbig.svg`, 520 × 351, in vier Fassungen:
zweifarbig (Hut `ink900`, Eule `tan500`), einfarbig tan, weiss, dunkelbraun.
Auf hellem Grund zweifarbig, auf `ink900` tan, auf Rot weiss.

Die Pfade bestehen **ausschliesslich aus Geraden** (M, L, Z). Deshalb braucht
weder die App noch die Vorschau ein SVG-Paket: In `widgets/eule.dart` steht ein
dreissigzeiliger Parser, in der Vorschau steht der Pfad direkt im Markup. Wer
die Vorlage austauscht, muss prüfen, ob sie noch ohne Kurven auskommt.

Alles Abgeleitete liegt in `app/marke/` und wird aus **denselben Pfaden**
erzeugt — es gibt keine zweite, nachgezeichnete Eule:

| Datei | Wofür |
|---|---|
| `app-icon.svg` | 1024 × 1024 für App Store Connect: Kartenfläche, rote Schweizer Ecke mit Kreuz, darunter die Eule |
| `android-vordergrund.svg` | Vordergrund des adaptiven Icons |
| `favicon.svg` | dasselbe mit Eckenradius |
| `weblogo.svg`, `weblogo-hell.svg` | Eule plus Wortmarke, für helle und dunkle Hintergründe |

Zwei Masse, die man nachrechnen muss und die leicht falsch werden:

- **Das Schweizerkreuz** hat Arme, die 7/6 so lang sind wie breit. Bei 44
  Einheiten Armbreite ergibt das 146,7 Einheiten Gesamtmass — nicht 122.
- **Das adaptive Android-Icon** wird aussen beschnitten. Alles Wichtige muss in
  den inneren Kreis mit 66 dp Durchmesser, also von 21 bis 87 dp in einem
  108-dp-Feld. Die Eule sitzt dort auf den Punkt genau.

Wortmarke: «Study» in `ink900`, «swiss» in `tan500`, Bitter Bold, `-.02em`.

### 5.4 Die fünf Tabs

`Lernen` · `Lernpfad` · `Selbsttest` · `Fortschritt` · `Einstellungen`

### 5.5 Der Lernpfad

Der Lernpfad beantwortet die Frage, die jedes Kind und jedes Elternteil zuerst
stellt: **Reicht die Zeit?**

Er nimmt die zwei Zahlen, die feststehen — wie viele Wochen bis zur Prüfung
und wie viele Pflichtaufgaben noch offen sind — und teilt die zweite durch die
erste. Heraus kommt ein Wochenpensum, und daraus ein Weg von heute bis zum
Prüfungstag.

**Der Pfad ist selbstheilend.** Er wird bei jedem Aufruf neu gerechnet; es gibt
keinen gespeicherten Plan, der veralten könnte. Wer eine Woche auslässt, findet
keinen roten Rückstand vor, sondern ein etwas grösseres Pensum in den übrigen
Wochen. Ein fixer Wochenplan bricht beim ersten Skiwochenende zusammen, und
dann schaut ihn niemand mehr an.

**Vier Abschnitte**, aus der Sache abgeleitet, nicht erzählt:

1. **Grundlagen** — Unterthemen, die anderen als `voraussetzungen` dienen.
2. **Die grossen Brocken** — die Oberthemen, die zusammen die halbe Prüfung tragen.
3. **Der Rest** — alles Übrige, in der Reihenfolge des Schedulers.
4. **Prüfungsform** — die letzten vier Wochen: keine neuen Themen mehr, nur
   noch Selbsttests und das Fehlerarchiv.

Der vierte Abschnitt ist der wichtigste und der, den Schülerinnen von selbst
nie machen: In den letzten Wochen bringt Wiederholen mehr als Neues.

**Keine Serie, keine Punkte, keine Abzeichen.** Der Pfad zeigt eine abzählbare
Grösse — «14 Pflichtaufgaben diese Woche» — und sonst nichts. Das Pensum ist
auf 40 gedeckelt: Wer mehr bräuchte, bekommt stattdessen den Hinweis, dass die
Zeit knapp ist, und die Themen mit dem grössten Punkteanteil zuerst.

Die Begriffe «Lernkarte» und «Wochenplan» aus den Entwürfen sind entfallen —
es gibt nur noch den Lernpfad. Damit ist auch die alte Überschneidung weg.

### 5.6 Die Website

`app/website/` ist **derselbe Stoff auf demselben Backend, nur in der
Website-Ansicht** — und dazu alles, was eine Schule braucht.

Sie ist kein zweites System: Die Seite ruft `/v1` wie die App und hat
keine eigene Datenhaltung. Ein Kind, das am Telefon eine Aufgabe falsch
hatte, findet sie am Laptop im Fehlerarchiv wieder, mit denselben Zahlen.

**Der Lernbereich ist vollständig.** Er hat dieselben Schirme wie die
App: Lernen mit «Zuerst dran», die Fach-Ebene für Deutsch, Übung,
Lernpfad, Standortbestimmung, Selbsttest, Aufsatz, die Tipps-Seiten,
Fortschritt, Fehlerarchiv und Einstellungen. Selbsttest,
Standortbestimmung und Aufsatz fehlten lange ganz — der Selbsttest-Knopf
führte in eine gewöhnliche Übung, und ein Kommentar daneben sagte, das
sei «ehrlicher als ein Knopf, der nichts tut». Jetzt tut er, was
draufsteht.

**Ein Läufer, drei Modi.** Übung, Selbsttest und Standortbestimmung
zeigen dieselben vierzehn Eingabeflächen und stehen darum in einer
Datei (`js/uebung.js`). Sie unterscheiden sich in genau drei Punkten:
wann die Rückmeldung kommt, ob eine Uhr läuft und ob der Themen-Titel
über der Aufgabe steht. Drei Kopien wären drei Stellen, an denen ein
neues Format vergessen wird — die App hält es mit `laufAnsicht` ebenso.

**Sie wächst mit, statt zu spiegeln.** Unter 900 px ist sie die App: eine
Spalte, Seitenrand 24, dieselben Bauteile. Darüber wird die Tab-Leiste zur
Kopfzeile, im Lernbereich zur Seitenleiste, und beim Textverständnis stehen
Lesetext und Frage nebeneinander statt übereinander. Die Tab-Leiste liegt
am Telefon unten, weil dort der Daumen ist; am Laptop liegt dort nichts.
Farben, Schriften und Bauteile bleiben unverändert die des Design-Systems.

**Gebaut wird sie wie die Vorschau.** `app/pruefung/website_bauen.py`
setzt aus `quelle/` und einem Rahmen die fertigen Seiten zusammen — und
zusätzlich `StudySwiss-Website.html`, alles in einer Datei, ohne Server.
Kopfzeile und Fuss stehen dadurch genau einmal da, und die Icons werden
aus `js/hilfen.js` gelesen, damit Python und JavaScript nie zwei
Wahrheiten haben.

**Die Übungen laufen wirklich, und zwar mit derselben Engine.**
`website_bauen.py` holt sie wörtlich aus der App-Vorschau — Blöcke 0, 3,
4, 6 und 7 — und legt sie als `js/engine.js` neben die Website. Sie wird
nicht abgeschrieben: §8 hält bereits drei Fassungen in Gleichschritt
(Kotlin, JavaScript, Python), und `gleichlauf.py` vergleicht sie Zeichen
für Zeichen. Eine vierte wäre die erste, die still abweicht. `website.py`
prüft darum, dass `engine.js` Block für Block der Vorschau entspricht.

Was die Website selbst mitbringt, ist die **Ansicht**: `js/antwort.js`
baut die Eingabeflächen für alle vierzehn Formate, so wie
`widgets/antwortflaeche.dart` sie für Flutter baut. Zwei Ansichten, eine
Engine — genau die Aufteilung, die es zwischen Flutter und der Vorschau
schon gibt.

Dass die Ansicht dabei zur Engine passt, ist die Probe, auf die es
ankommt: Für jedes der vierzehn Formate wird der Zustand so gefüllt, wie
ihn jemand antippt, und dann muss `bewerteAlles` die Antwort annehmen.
Baute die Fläche fürs Sortieren `{elemente}` statt `{reihenfolge}`, wäre
jede Antwort falsch — die Aufgabe sähe richtig aus, das Kind rechnete
richtig, und der Bildschirm sagte trotzdem «danebengelegen».

**Die Website sprach mit dem Server eine andere Sprache als er.** Das
war der grösste Fehler im Repo, und er lag genau dort, wo niemand
hinsah: Der Lernbereich war gegen die **Vorschau-Schicht** geschrieben,
und die gab die Formen der Engine weiter. Der Server sendet andere:

| Website las | Server sendet |
|---|---|
| `paare` (Zuordnen) | `ziele` und `elemente`, letztere schon gemischt |
| `elemente` (Sortieren) | `zuOrdnen` |
| `wertetabelle` | `tabelle` |
| `indizes` | `anzahlGesucht` |
| `hinweise` (Anzahl) | `hinweiseVerfuegbar` |
| `thema` / `oberthema` | `themaKurz` |
| `gitter.strecken[].von[0]` | `vonX`, `vonY`, `bisX`, `bisY` |
| `loesungText` in der Rückmeldung | `loesung` |

Und die Antwort ging **verschachtelt** hinaus (`{aufgabeRef, antwort:
{…}}`), wo der Server sie flach erwartet — er hätte kein einziges Feld
gelesen und jede Antwort als leer bewertet. Beim Färben hiess das Feld
`felder` statt `gefaerbt`, beim Selbsttest gingen Themen als Objekte
statt als Codes hinaus, und `/standort/start` nimmt das Fach in der
Fragezeile, nicht im Körper.

**Im Betrieb wäre der halbe Lernbereich unbedienbar gewesen** — und die
Vorschau lief dabei tadellos, weil sie beide Enden selbst hielt. Eine
Vorschau, die sich anders verhält als der Betrieb, bestätigt einen
Fehler, statt ihn zu zeigen.

Die Vorschau-Schicht liefert darum jetzt **die DTOs des Servers**, nicht
die Formen der Engine; die Mischung von Zuordnen und Sortieren wird auf
ihrer Seite zurückgerechnet, genau wie im `AufgabenService`. Und
`pruefe_web.js` vergleicht beide Formen bei jedem Lauf gegen
`model/Dto.kt` — Runde 8c. Ein Feld, das anders heisst, fällt jetzt
sofort auf.

**Ausgeführt wurde die Website vorher nie.** `website.py` liest den
gebauten Text; seit `web_pruefen.py` läuft sie wirklich — und fand beim
ersten Lauf drei weitere Fehler, jeden von der Sorte, die still bleibt:

1. **Die Wertetabelle stürzte ab.** Die Fläche las
   `wertetabelle.paare.length` — die Lösungspaare, die der Server
   streicht (§4.10). Sobald eine Wertetabelle gezogen wurde, stand
   statt der Aufgabe «Es hat nicht geklappt» da. In der Einzeldatei
   fiel es nie auf, weil dort dieselbe Aufgabe kurz vorher noch
   vollständig vorlag.
2. **Der Lernpfad zeigte «0 Pflichtaufgaben».** Er las `wochenpensum`
   und `abschnitte`; die Engine liefert `pensumDieseWoche`, `etappen`
   und `wochen`. Eine Null, die wie ein Ergebnis aussieht, ist
   schlimmer als eine leere Karte — sie wird nicht angezweifelt.
3. **«Abbrechen» hing an nichts.** Der Knopf stand seit je im Markup
   und bekam nie einen Handler.

Dazu zwei Befunde auf der **App**-Seite:

4. **Eine Bereichszeile konnte spurlos verschwinden.** Kannte der Katalog
   einen Bereich nicht, zeichnete `bereiche_screen.dart` ein
   `SizedBox.shrink()` — nichts. Kein Fehler, keine leere Karte, gar
   nichts: Der Bereich fehlte einfach, und niemand konnte es merken.
   Jetzt trägt `BereichZeile` selbst Name und `art`, und die Zeile wird
   auch dann gezeigt, wenn der Katalog schweigt. Eine Lücke, die man
   sieht, ist besser als eine, die man nicht sieht.
5. **`/fortschritt` verschwieg die Bereiche ohne Themenbaum.** Die Liste
   `bereiche` enthielt nur, was einen Baum hat — der Aufsatz kam darin
   gar nicht vor, obwohl er an der FMS Bern die ganze Deutschprüfung
   ist. Sie enthält jetzt alle, mit ihrer `art` und mit null Themen; das
   ist keine Lücke, sondern ihre Art.

**Was dabei auffiel und offen bleibt:** Auf dem Fach-Schirm steht in §6,
Screen 12, «Je Unterthema *13 von 20 Pflichtaufgaben*». Das kann heute
**kein** Client zeigen: `/katalog/themen` liefert `pflichtset`, aber
keinen Stand je Unterthema, und Flutter schreibt darum nur «20
Pflichtaufgaben». Entweder liefert das Backend den Stand mit, oder der
Satz in §6 gehört angepasst. Ebenso führt §4.10 ein
`GET /v1/fortschritt/{fach}`, das es in `Routen.kt` nicht gibt.

Die Regel dahinter, wieder einmal: Ein Prüfer, der noch nie
angeschlagen hat, ist ungeprüft. Beide Fehler wurden nach dem Fund
absichtlich wieder eingebaut, um zu sehen, dass die Runde sie fängt.

**Die Lösung reist auch in der Vorschau nicht mit.** `demoOhneLoesung`
streicht `loesung`, `loesungText`, `loesungWorte`, `fehler` und
`indizes`, bevor eine Aufgabe den Übungsschirm erreicht — und
`website.py` prüft, dass die ausgelieferten Seiten `inhalt.js` gar nicht
erst laden. Nur die Einzeldatei-Vorschau hat den Inhalt bei sich, weil
dort kein Server antwortet.

**Drei Dinge sind anders als in der App, und zwar aus Gründen:**

| | App | Website |
|---|---|---|
| Refresh-Token | `flutter_secure_storage` | `httpOnly`-Cookie vom Server |
| Navigation | fünf Tabs unten | Kopfzeile, im Lernbereich Seitenleiste |
| Kauf | StoreKit 2, Play Billing 6 | Zahlungsanbieter, und Rechnung für Schulen |

Der Token ist der wichtigste Unterschied. Ein Browser hat kein sicheres
Fach: `localStorage` liest jedes Skript, das auf die Seite gelangt, und
ein Token mit sechzig Tagen Laufzeit ist ein lohnendes Ziel — bei
Minderjährigen erst recht (§2.6). Der Refresh-Token kommt darum als
`httpOnly`-Cookie und ist für JavaScript unsichtbar, auch für unseres;
der Access-Token lebt nur im Speicher. Gegen Anfragen von fremden Seiten
schützt der Kopf `X-Client: web` — einen eigenen Kopf kann eine fremde
Seite nur mit Vorabanfrage senden, und die lässt das CORS nur für die
eigene Herkunft zu.

**Die Startseite duzt, die Schulseiten siezen.** Auf der einen liest eine
Jugendliche, auf der anderen bestellt eine Behörde. `website.py` prüft es
für die duzenden Seiten — und fand beim ersten Lauf nichts, weil dort der
Name der Quelldatei stand statt der der gebauten Seite. Erst der
absichtliche Bruch nach §8 hat das gezeigt.

### 5.7 Schulen: von der Offerte bis zur Rechnung

Der zweite Grund für die Website. Eine Schule kauft nicht mit der
Kreditkarte: Sie holt eine Offerte, legt sie der Schulleitung oder der
Gemeinde vor, bestellt mit einer Bestellnummer und bezahlt auf 30 Tage.
Genau dieser Weg ist gebaut — fünf Schritte, jeder mit eigener Adresse,
damit eine Schulsekretärin den Laptop zumachen und am nächsten Tag
weitermachen kann.

| Schritt | Was entsteht |
|---|---|
| 1 Angaben | Schule, Kontaktperson, Anzahl, Beginn |
| 2 Offerte | druckbar, 30 Tage gültig, als Link weitergebbar |
| 3 Bestellung | Rechnungsadresse (oft die Gemeinde), Bestellnummer, AGB |
| 4 Bestätigung | Verwaltungsschlüssel, Codes **sofort** gültig |
| 5 Rechnung | mit Schweizer QR-Zahlteil, 30 Tage netto |

**Der Zugang gilt ab der Bestellung, nicht ab dem Zahlungseingang.** Eine
Gemeinde bezahlt in dreissig Tagen; wer die Kinder so lange warten liesse,
hätte das Schuljahr verpasst.

**Die Schule hat kein Nutzerkonto.** Sie meldet sich mit einem
Verwaltungsschlüssel an. Eine Schulsekretärin soll dafür kein Konto
anlegen müssen, und ein Passwort, das drei Leute im Sekretariat teilen,
ist ohnehin keines. Der Schlüssel liegt gehasht in der Datenbank.

**Der wichtigste Entscheid steht im Bericht — nämlich das, was fehlt.**
§2.6: Die Nutzer sind minderjährig. Die Schule sieht Kennzahlen über die
Gruppe: wie viele Lizenzen eingelöst sind, wie viele diese Woche geübt
haben, das mittlere Wochenpensum und **die Themen mit der höchsten
Fehlerquote in der Gruppe**. Sie sieht nie, wer wie viel geübt hat, welche
Aufgabe wer falsch hatte oder was in einem Aufsatz steht.

Dazu eine **Mindestgruppe**: Unter fünf eingelösten Lizenzen gibt es gar
keine Kennzahlen. Bei drei Kindern ist «einer war diese Woche aktiv» keine
Zahl über eine Gruppe mehr, sondern eine Aussage über eine bestimmte
Person — und «Thema 4.02 läuft schlecht» wird zur Note eines einzelnen.
Ein Schwellenwert ist die einzige Verteidigung, die auch dann noch hält,
wenn später jemand eine Kennzahl dazunimmt, ohne an diesen Satz zu denken.

**Die Preisstaffel steht offen da**, weil eine Schule den Betrag im
Budgetantrag begründen muss. «Preis auf Anfrage» kostet beide Seiten eine
Woche und verrät ausserdem, dass der Preis verhandelbar wäre.

| Lizenzen | je Lizenz und Schuljahr |
|---|---|
| 1–19 | Fr. 89.– |
| 20–49 | Fr. 69.– |
| 50–199 | Fr. 55.– |
| ab 200 | Fr. 45.– |

Gerechnet wird **in Rappen und ganzzahlig**, gerundet auf fünf Rappen.
Fliesskomma und Geld vertragen sich nicht, und auf einer Rechnung über
sechzig Lizenzen fällt genau das irgendwann als ein Rappen Differenz auf.
Dieselbe Rechnung läuft im Rechner, in der Offerte, in der Bestellung und
auf der Rechnung — vier eigene Rechnungen liefen früher oder später
auseinander, und dann steht auf dem Papier ein anderer Betrag als in der
Offerte.

**Der QR-Zahlteil wird auf dem Server erzeugt, nie im Browser.** Ein
QR-Code mit einem Fehler sieht aus wie einer ohne; die Schule merkt es
erst bei der Mahnung. Er folgt den «Schweizer Implementation Guidelines
QR-Rechnung»: 210 × 105 mm am Blattfuss, Empfangsschein 62 mm,
Fehlerkorrektur M, Schweizerkreuz 7 × 7 mm. Fehlt die IBAN in der
Konfiguration, wird **bewusst keiner** erzeugt.

### 5.8 Drei Kaufwege, ein Konto

Plus lässt sich im App Store kaufen, bei Google Play, auf der Website —
oder die Schule kauft Lizenzen und gibt Codes aus. Freigeschaltet ist es
überall, weil es am Konto hängt und nicht am Gerät.

**Der Verkauf auf der eigenen Website ist erlaubt.** Apples Guideline
3.1.3(b) «Multiplatform Services» deckt es ausdrücklich: Wer seinen Dienst
auch ausserhalb der App anbietet, darf in der App freischalten, was
anderswo gekauft wurde. Google Play kennt dieselbe Konstruktion.

**Nicht erlaubt ist das Hinweisen aus der App heraus** — kein Link, kein
Web-Preis, kein «günstiger auf unserer Website». Das ist Apples
Anti-Steering-Regel, und die Lockerungen von 2025 (das US-Urteil in Epic
gegen Apple, die DMA-Regeln in der EU) gelten für die Schweiz nicht.

**Der Weg über einen Code umgeht das ganz.** Das Elternteil kauft auf der
Website und bekommt einen Code; das Kind löst ihn in der App ein. Kein
Link aus der App, kein Steering — und ohnehin der natürlichere Weg: Der
Zahler ist ein Elternteil, und das sitzt am Laptop, nicht am Telefon des
Kindes. Der Familien-Pass arbeitet seit je so, und `AboService` kannte
den Mechanismus schon.

> Diese Ladenregeln bewegen sich schnell. Vor der Veröffentlichung im
> aktuellen Wortlaut nachlesen — der Punkt steht in `app/start/checkliste.md`.


---

## 6. Alle Screens

36 Screens, in der Reihenfolge, in der ein Schüler sie sieht. Dazugekommen
sind `FachBereiche`, `FortschrittFach` und `AufsatzArten` — alle drei sind die
Fach-Ebene, die vorher fehlte.

### Start und Anmeldung

| # | Screen | Was passiert |
|---|---|---|
| 1 | `Start` | Splash, Eule zweifarbig auf Papier, Wortmarke. 1.2 s, dann automatisch weiter. Beim zweiten Start direkt nach `Lernen`. |
| 2 | `Onboarding1` | «Die Aufnahmeprüfung, Schritt für Schritt.» Zwei Schritte, nicht mehr. |
| 3 | `Onboarding2` | «Dein Termin gibt das Tempo vor.» Verweist auf die Standortbestimmung. **Keine Serie, keine feste Lernzeit.** |
| 4 | `Anmeldung` | Drei Knöpfe untereinander: «Mit Apple anmelden» (schwarz, Apple-Logo, Höhe 54) · «Mit Google anmelden» (weiss, Rahmen `tan300`) · «Ohne Konto weiterlernen» (Textknopf `tan600`). Darunter zwei Zeilen zu Datenschutz und AGB. Auf Android steht Google oben. |
| 5 | `KantonWahl` | Liste der Kantone, **nur Kantone** — kein Prüfungstyp, keine Fächerliste. Eyebrow: «Wo schreibst du deine Aufnahmeprüfung?» |
| 6 | `SchulWahl` | «Welche Aufnahmeprüfung möchtest du machen?» Fünf Optionen — begrenzt auf das Angebot im Kanton, je mit Prüfungsname und Fächern. «ZAP» steht nur, wo es passt. |
| 7 | `PruefungTermin` | «Nächster Prüfungstermin» (nicht «Dein»). Vorbelegt aus dem Katalog, änderbar. |

### Standortbestimmung

| # | Screen | Was passiert |
|---|---|---|
| 8 | `Diagnosetest` | Erklärt sie: 24 Aufgaben, 20–25 Minuten, unterbrechbar. Ausdrücklich keine Note. **Darunter die Fachwahl** — Mathematik oder Deutsch. Zweiter Knopf «Später machen». |
| 9 | `DiagnoseLauf` | Aufgabe für Aufgabe, Fortschrittsbalken, kein Feedback zwischendurch. Zurückblättern erlaubt, wenn die Prüfung es vorsieht. |
| 10 | `DiagnoseErgebnis` | **«Dein Startpunkt».** Drei Zahlen: «6 sitzen · 7 zuerst üben · 12 noch offen», darunter **«Diese Themen zuerst üben»** — nach Fehlerquote, ohne Rangnummern. Keine Note, keine Einstufung, keine Reihenfolge. |

### Lernen

| # | Screen | Was passiert |
|---|---|---|
| 11 | `Lernen` | Startseite. Oben dunkle Karte «Prüfung in 191 Tagen». Darunter **«Zuerst dran»** mit Begründung und zweitem Vorschlag, plus dem Hinweis, dass sich die Reihenfolge nach jeder Übung neu rechnet. Darunter **die Fächer** — Mathematik und Deutsch auf derselben Ebene. |
| 11b | `FachBereiche` | Nur für Fächer mit mehr als einem Bereich, also für Deutsch: Sprachbetrachtung, Textverständnis, Aufsatz. Mathematik überspringt diesen Screen. |
| 12 | `Fach` | Ein Bereich. **Zuerst nur die Oberthemen; die Unterthemen klappen über den Pfeil auf.** Je Unterthema «13 von 20 Pflichtaufgaben». **Alle Themen von Anfang an offen**, nichts ist gesperrt. Kein Ring, kein «Prüfungsniveau der ZAP». |
| 13 | `UebungIntro` | **«Einführung in den Aufgabenblock»** (nicht «Aufgabentyp erklärt»). Ein durchgerechnetes Beispiel. Tipp-Knopf oben rechts. |
| 14 | `UebungFrage` | Die Aufgabe. Tipp-Knopf **an derselben Stelle wie in der Einführung: oben rechts**. Fortschritt «3 von 10». Schliessen-X links oben. Oben klein und leise das **Oberthema** — «Bruchrechnen», «Satzglieder»; kurz, damit die Aufgabe im Blick bleibt. Beim Textverständnis darüber der **Lesetext**, einklappbar. Im Selbsttest steht kein Themen-Titel: An der Prüfung wird auch nicht danebengeschrieben, worum es geht. |
| 15 | `UebungRichtig` | Sheet von unten, grün. Lösungsweg. «Weiter». |
| 16 | `UebungFalsch` | Sheet von unten, rot. **Benennt den Denkfehler** in zwei bis drei Sätzen, Du-Form. Dann der richtige Weg. «Nochmal versuchen» oder «Weiter». |
| 17 | `UebungErgebnis` | «8 von 10 richtig», die verpassten Themen, «Weiterüben» oder «Fertig». |

### Selbsttest

| # | Screen | Was passiert |
|---|---|---|
| 18 | `Selbsttest` | Erst das **Fach** — Mathematik oder Deutsch, nie «Deutsch Sprachbetrachtung» —, dann der **Umfang**: «Alle Themen» · «Einzelne Themen wählen» · «Ganze Prüfung». Ein Deutsch-Selbsttest mischt Sprachbetrachtung und Textverständnis nach ihrem Punkteanteil. Ein Hinweis sagt, dass der Aufsatz separat geschrieben wird. **Keine Punktevergabe.** |
| 19 | `SelbsttestThemen` | Nur bei «Einzelne Themen wählen». Mehrfachauswahl. |
| 20 | `SelbsttestStart` | Bedingungen — **alle aus dem Katalog des Schultyps**: Dauer, Taschenrechner, Hinweise, Zurückblättern. Keine feste Liste im Screen. Darunter, wo es welche gibt, die **Bemerkungen der Prüfungsteile** dieses Fachs: «steht mehr als ein Lösungsweg da, wird die Aufgabe nicht bewertet», «falsche Antworten geben Abzug». Sie standen lange nur in den Daten. |
| 21 | `SelbsttestLauf` | Uhr oben, kein Feedback. **Die Uhr hält an, wenn die App in den Hintergrund geht**, und **Zurückblättern ist möglich** — an der Prüfung liegt das Blatt vor einem. Bewertet wird erst bei der Abgabe, alles auf einmal: Sonst zählte eine geänderte Antwort zweimal. |
| 22 | `SelbsttestErgebnis` | Punkte nach Prüfungsschema, Aufschlüsselung nach Oberthema, «Meine Fehler ansehen». |

### Fortschritt

| # | Screen | Was passiert |
|---|---|---|
| 23 | `Fortschritt` | **Abzählbare Grössen, keine Kreisdiagramme.** Jede Kennzahl trägt Zeitraum und Fachbezug. Säulendiagramm mit Achse 0–100 %, 50 %-Linie, Wert auf jeder Säule und einem Satz, der die Aussage benennt: «+14 Prozentpunkte, KW 36: 57 % → heute 71 %». Stärkstes und schwächstes Thema über **alle** Fächer, mit Fachangabe. |
| 24 | `FortschrittFach` | Dasselbe je **Fach**: oben das ganze Fach, darunter die Bereiche, darin die Oberthemen — Unterthemen klappen über den Pfeil auf. Dieselbe Ordnung wie unter «Lernen». |
| 25 | `Fehlerarchiv` | «Meine Fehler», gruppiert nach Unterthema, mit dem Denkfehler. «Nochmal» erzeugt aus derselben `aufgabeRef` dieselbe Aufgabe. |

### Aufsatz

| # | Screen | Was passiert |
|---|---|---|
| 26 | `AufsatzArten` | **«Wähle eine Aufsatzart aus, die du üben möchtest.»** Erzählung, Argumentation, Beschreibung, Bericht — gefiltert nach der gewählten Prüfung. Eine Art ohne Themen steht blass da mit «Themen folgen». |
| 26b | `AufsatzThemen` | Die Themen dieser Art. Neu würfeln möglich. |
| 26c | `Tipps` | Für einen Bereich mit `art: "tipps"` — Hörverstehen, mündliche Prüfung. Zuerst der **Ablauf** der Prüfung als nummerierte Schritte, dann die Tipps nach Abschnitten, dann die **Redemittel** zum Auswendiglernen, zuletzt die Unterthemen, die sich doch üben lassen. Der Screen verspricht keine Aufgaben und sagt darum auch nie «Aufgaben folgen». |
| 27 | `AufsatzSchreiben` | Schreibfläche, Wortzähler, Uhr 90 Minuten, Teilaufträge zum Abhaken. Automatisch gespeichert. **Tipp-Knopf oben rechts**, wie in Mathematik, mit zwei getrennten Hilfen: «Aufbau & Checkliste» zum Abhaken und «Satzstarter». Zusammen in einem Kasten wären sie eine Wand aus Text genau dann, wenn jemand nicht weiterweiss. |
| 28 | `AufsatzKorrektur` | **Keine Note.** Vier Kriterien A–D (Aufgabenerfüllung & Inhalt · Aufbau & Struktur · Ausdruck & Wortschatz · Sprachrichtigkeit), jedes mit einer beschreibenden Stufe — *noch nicht · teilweise · erreicht · sicher erreicht* — und der abzählbaren Grösse «3 von 4 Kriterien erreicht». Dazu Teilaufträge, markierte Textstellen nach Fehlerfamilie, Stärken, nächste Schritte, Musterabschnitt, Wortschatzvorschläge. |

### Rest

| # | Screen | Was passiert |
|---|---|---|
| 29 | `Lernpfad` | Der Weg von heute bis zur Prüfung. Oben das Wochenpensum als abzählbare Grösse, darunter die vier Abschnitte, darunter Woche für Woche als senkrechte Linie. Ohne gesetzten Termin steht hier der Hinweis, einen zu setzen. |
| 30 | `Einstellungen` | Profilkarte, Plus-Banner, «Prüfung & Kanton», Eltern-Report, Benachrichtigungen, Datenschutz, Konto löschen. |
| 31 | `EinstellungenPruefung` | Kanton, Schultyp, Termin ändern. |
| 32 | `Profil` | Vorname, Avatar, verknüpfte Anmeldung, Mitglied seit. |
| 33 | `Plus` | Drei Produkte, eines empfohlen — welches, rechnet der Server aus dem Prüfungstermin. Dazu «Woher der Preis kommt» mit dem Marktvergleich, «Kauf wiederherstellen» und die Eingabe für einen Familien-Code. Mit aktivem Plus stehen hier die Codes zum Weitergeben. |
| 34 | `ElternReport` | Jede Zahl mit Zeitraum und Fachbezug, alle vier auf **dieselbe Woche** bezogen. «Aufnahmeprüfung», nie «ZAP». Opt-in durch den Schüler. |

---

## 7. Der Weg eines Schülers

So ist die App gedacht. Wer eine Änderung plant, prüft sie gegen diesen Weg.

**Tag 1, 19:40 Uhr.** Lena, 14, zweite Sek in Winterthur, will an die FMS. Sie
installiert die App. Splash, zwei Onboarding-Screens, «Mit Apple anmelden» —
Face ID, fertig, kein Passwort. Kanton Zürich. FMS. Der Termin ist vorbelegt:
**7. März 2027**. Die App rechnet: 190 Tage.

Sie macht die Standortbestimmung. Sie wählt **Mathematik** — Deutsch kommt
später dran. 24 Aufgaben, 22 Minuten, keine Note am Ende — **«Dein
Startpunkt»**: 6 sitzen, 7 zuerst üben, 12 noch offen. Darunter «Diese Themen
zuerst üben», ohne Rangnummern: *Verminderter und vermehrter Grundwert* steht
oben, weil sie dort 0 von 2 getroffen hat.

**Tag 1, 20:05 Uhr.** Auf `Lernen` steht «Zuerst dran: Verminderter und
vermehrter Grundwert — *weil dieses Thema in der Prüfung 18 von 40 Punkten
trägt und du 2 von 5 Aufgaben getroffen hast*.» Alternativ: *Bruchterme kürzen*.

Sie tippt drauf. Erst die **Einführung in den Aufgabenblock** — ein Beispiel,
durchgerechnet, mit Tipp-Knopf oben rechts. Dann zehn Aufgaben.

Aufgabe 3 geht schief: Sie rechnet 20 % vom reduzierten statt vom ursprünglichen
Preis. Das rote Sheet sagt nicht «falsch», sondern: *«Du hast die 20 % vom
reduzierten Preis gerechnet. Der Rabatt bezieht sich aber immer auf den
ursprünglichen Preis — das ist der Grundwert. Suche zuerst, welche Zahl 100 %
entspricht.»* Sie versucht es nochmals und trifft.

8 von 10. Die Aufgabe wandert ins **Fehlerarchiv**, unter dem Denkfehler
«falscher Grundwert», mit `rabatt-rueckwaerts:8812` — dieselbe Aufgabe ist
jederzeit wieder herstellbar. Unter der Aufgabe selbst stand die Nummer nie;
sie gehört ins Archiv, nicht auf den Übungsschirm.

**Tag 2.** Der Scheduler hat neu gerechnet. «Zuerst dran» zeigt jetzt
*Bruchterme kürzen*, weil der Grundwert getroffen wurde. Sie übt 10 Minuten.

**Tag 9.** Die App schlägt den Grundwert erneut vor — sieben Tage sind vergangen,
der Vergessens-Term ist gestiegen. Diesmal 9 von 10.

**Woche 4.** Erster **Selbsttest**: Mathematik, alle Themen. Uhr läuft, keine
Hinweise, kein Feedback — aber sie darf zurückblättern, wie am Prüfungstag, und
als ihre Mutter anruft, hält die Uhr an. 24 von 40. Die Aufschlüsselung zeigt:
Geometrie im Raum trägt 4 Punkte und sie hat 0 geholt.

**Woche 5.** Deutsch. Unter «Lernen» tippt sie auf **Deutsch**, dann auf
**Textverständnis** — den Bereich, den sie an der Prüfung am meisten fürchtet.
Ein Text über Nachtzüge, vier Fragen dazu, der Text bleibt oben stehen und
lässt sich einklappen, wenn er im Weg ist.

**Woche 6.** Sie schaltet **Plus** frei und schreibt den ersten Aufsatz. Erst
die Art — **Argumentation**, weil ihr das schwerfällt —, dann das Thema:
«Handys im Schulzimmer», 90 Minuten, 520 Wörter. Beim dritten Abschnitt stockt
es; sie tippt oben rechts auf **Tipp**, hakt im Aufbau ab, was sie schon hat,
und nimmt einen Satzstarter aus der zweiten Liste. Die Korrektur
nennt keine Note, sondern **2 von 4 Kriterien erreicht**: A und D erreicht,
B erst teilweise — *«Deine drei Hauptteil-Abschnitte behandeln zweimal
dasselbe Argument. Plane vor dem Schreiben je ein Stichwort pro Abschnitt.»*
Dazu ein überarbeiteter Musterabschnitt und vier Wortschatzvorschläge.

**Woche 12.** Sie gibt den **Eltern-Report** frei. Ihre Mutter sieht vier Zahlen,
alle auf dieselbe Woche bezogen, mit Fachangabe. Keine Aufsatztexte, keine
einzelnen Aufgaben.

**Tag 185.** `Fortschritt`: «+14 Prozentpunkte, KW 36: 57 % → heute 71 %.»
34 von 44 Themen abgeschlossen. Auf `Lernen` steht: «Prüfung in 5 Tagen.»

---

## 8. Prüfen

Alles auf einmal:

```bash
app/pruefung/pruefen.sh
```

Zwölf Prüfungen, die zusammen das ersetzen, was sonst der Compiler und ein
Testlauf leisten. Die letzte davon läuft in acht Runden:

| Prüfung | Was sie findet |
|---|---|
| `kantone.py` | **Ob der Weg eines Schülers aufgeht — für jeden Kanton, jeden Schultyp.** Kantonswahl → Schulwahl → Termin → Fächer → Bereiche → Themenbaum → Aufgaben → Selbsttest → Aufsatz. An jeder Stelle: Kommt hier wirklich etwas an? |
| `tore.py` | Die Qualitätstore auf allen 439 Zahlen-Templates, je 200 Ziehungen — formatbewusst, und mit den zwei Herkunftsstufen aus 4.5.1 |
| `tore_deutsch.py` | Dieselben Tore für die 405 Blöcke im Textformat, gegen den Themenbaum des jeweiligen Bereichs |
| `kotlin_pruefen.py` | Benannte Argumente mit Tippfehler, fehlende Pflichtfelder, unbekannte Enum-Werte, Importe ins Leere, Ressourcen, die es nicht gibt — **und ob jede Vorlagendatei in genau einem Verzeichnis steht und jede Kennung nur einmal vorkommt** |
| `dart_pruefen.py` | Dasselbe für Widgets, dazu doppelte Provider, ungenutzte Importe — **und ob ein Screen die Eingabeflächen selbst zusammenbaut, statt `Antwortflaeche` zu benutzen** |
| `vertrag.py` | **Ob Backend und seine beiden Clients dieselben Feldnamen benutzen.** Das ist der Fehler, der ohne Compiler am ehesten durchrutscht: Heisst ein Feld anders, zeigt der Screen still nichts an — keine Ausnahme, kein Hinweis, nur eine leere Karte |
| `website.py` | **Ob die Website hält, was sie anzeigt.** Eine tote Verknüpfung, ein Platzhalter, den niemand ersetzt hat, ein Eingabefeld ohne Beschriftung, ein Preis im Quelltext statt in `preise.js`, die Sie-Form dort, wo die App duzt — alles Fehler, die auf einer Website still bleiben und darum nie gemeldet werden |
| `web_pruefen.py` | **Ob der Lernbereich der Website wirklich läuft.** `website.py` liest den gebauten Text; ein Knopf, der an nichts hängt, sieht dort aus wie einer, der funktioniert. Diese Runde klickt sich mit einem winzigen DOM (`dom.js`) durch Übung, Selbsttest, Standortbestimmung, Aufsatz und Tipps, tippt echte Antworten ein und prüft, dass die Engine sie annimmt — und sie vergleicht Aufgabe und Antwort Feld für Feld gegen `model/Dto.kt`, denn genau dort lag der grösste Fehler des Repos |
| `website_bauen.py --pruefen` | Ob die gebauten Seiten auf dem Stand ihrer Quellen sind |
| `gleichlauf.py` | **Ob die Engine-Fassungen gleichen Schritt halten.** Die App gibt es dreimal — Kotlin, JavaScript, Python. Alle drei müssen aus `templateId:seed` dieselbe Aufgabe ziehen. Geprüft wird Python gegen JavaScript, Zeichen für Zeichen |
| `vorschau_bauen.py --pruefen` | **Ob die Vorschau auf dem Stand der Ressourcen ist.** Die sieben Runden führen die Vorschau aus; ist sie veraltet, prüfen sie einen alten Inhalt, und «alles grün» hiesse gar nichts |
| `pruefe.js` … `pruefe7.js` | Die Vorschau wird mit **JavaScriptCore wirklich ausgeführt** |

`kantone.py` ist der Prüfer, den es vorher nicht gab, und er fängt genau die
Sorte Fehler, die ohne Compiler durchrutscht und in der App als **leere
Karte** endet: ein Schultyp, der eine Aufsatzart nennt, die es nicht gibt;
ein Bereich ohne Themenbaum; ein Fach ohne eine einzige Aufgabe; ein
Prüfungstermin in der Vergangenheit; eine Wahlgruppe, von der kein Teil weiss.
Beim ersten Lauf fand er 24 Befunde — darunter zwei Zürcher Themenbäume,
deren Anteile 101 % und 102 % ergaben.

Für einen Kanton mit `aktiv: false` gilt der weiche Massstab: Die Struktur
muss stimmen, Inhalt darf fehlen. Er ist in der App ausgegraut. Ein Kanton
mit `aktiv: true` verspricht, dass alles da ist — und genau dieses
Versprechen wird geprüft.

**Ein Pflichtset, das niemand erreichen kann, ist eine stille Sackgasse.**
`kantone.py` prüft seit Kurzem auch das. Ein Unterthema, das nur aus Blöcken
bedient wird, hat endlich viele Aufgaben: `setZiehen` überspringt jede
Aufgabe, deren Stamm schon gezogen wurde, und der Zähler zählt nur
verschiedene. Ein Unterthema mit zwölf Blockaufgaben und `pflichtset: 20`
bleibt darum für immer bei «12 von 20» stehen — das Thema wird nie
abgeschlossen, der Lernpfad führt es endlos weiter, und nichts davon sieht
nach einem Fehler aus. Beim ersten Lauf fand das neue Tor **715 Unterthemen**
in diesem Zustand. Die Pflichtsets sind jetzt auf das angeglichen, was der
Bestand hergibt; wer Aufgaben ergänzt, hebt sie mit
`scratchpad/pflichtset.py` wieder an. Unterthemen mit Zahlen-Templates sind
nicht betroffen — dort ist der Vorrat unbegrenzt.

**Der Zufall ist berechenbar.** Die App würfelt den Seed einer Aufgabe mit
`Math.random()`, so soll es sein (§2.4). Für einen Prüfer ist das die falsche
Eigenschaft: Läuft eine Runde zweimal über andere Aufgaben, ist ein roter
Lauf nicht wiederholbar und ein grüner beweist wenig. Genau das passierte —
Runde 4 meldete einmal einen Fehler, der beim nächsten Lauf weg war. `zufall.js`
ersetzt `Math.random` darum durch einen Generator mit Startwert:

```bash
app/pruefung/pruefen.sh              # Startwert 1
SS_SEED=9 app/pruefung/pruefen.sh    # dieselbe Prüfung über andere Ziehungen
```

Der verschwundene Fehler war echt: Bei Startwert 9 fielen in `drehung-gitter`
die Bildpunkte A′ und B′ zusammen. Daraus wurde Tor T17.

**Jeder Prüfer findet seinen Ordner selbst.** Sechs von ihnen trugen einen
fest verdrahteten Pfad auf ein bestimmtes Verzeichnis. Wer das Repo kopierte
oder umbenannte, prüfte danach still die alte Kopie weiter und bekam «alles
grün» für Dateien, die er gar nicht angefasst hatte. Der Anker ist jetzt der
Ordner des Skripts.

Die letzte ist die wichtigste. Sie prüft nicht, ob der Code aussieht wie er
soll, sondern ob er tut, was er soll:

| Runde | Frage | Umfang |
|---|---|---|
| `pruefe.js` | Läuft ein ganzer Nutzerweg durch, von der Anmeldung bis zum Eltern-Report? | 1'390 Schritte |
| `pruefe2.js` | Wird eine richtige Antwort immer angenommen und jeder Distraktor mit dem **richtigen** Denkfehler abgelehnt? | 231'524 Fälle |
| `pruefe3.js` | Gilt das für alle vierzehn Formate — und wird eine knapp danebenliegende Antwort auch wirklich abgelehnt? | 21'532 Aufgaben |
| `pruefe4.js` | Lässt sich jedes Format über die **echten Bedienelemente** bedienen, zeichnet sich der Screen leer wie gefüllt, und nimmt ein zweites Antippen die Wahl zurück? | 3'847 Bedienungen |
| `pruefe5.js` | Zeichnet sich jeder Screen — auch ohne den Zustand, den er braucht? | 1'381 Screens |
| `pruefe6.js` | Halten Selbsttest, Fehlerarchiv, Lesetext und Aufgabennummer, was sie versprechen? | 87 Prüfungen |
| `pruefe7.js` | Steht jeder Punkt aus der Rückmeldung wirklich im Screen? | 37 Punkte |
| `pruefe8.js` | **Geht der Weg jedes Kantons durch die echten Screens auf?** Schulwahl, Termin, Fächer, Bereiche, Bedingungen, Aufsatzarten, Bemerkungen — und zeigt kein Screen etwas, das einem anderen Kanton gehört? | 2'351 Prüfungen über zwölf Kantone |

`helfer.js` baut zu jeder Aufgabe die richtige und eine knapp falsche Antwort,
in allen vierzehn Formaten. Ohne ihn müsste jede Runde die Formate einzeln
kennen — und beim nächsten neuen Format vergisst man eine.

**Ein Prüfer, der falschen Alarm schlägt, ist schlimmer als keiner.** Wer
einen Befund für einen Fehlalarm hält, repariert den Prüfer — und erst dann
schaut er wieder auf den Code. Umgekehrt gilt: Ein Prüfer, der noch nie
angeschlagen hat, ist ungeprüft. Wer eine Regel ergänzt, bricht den Code
einmal absichtlich und schaut, ob sie greift.

**Eine umgesetzte Rückmeldung gehört in `pruefe7.js`.** Ein Haken auf einer
Liste verschwindet beim nächsten Umbau still; eine Prüfung schlägt an. Jede
Zeile dort ist ein Punkt aus einem Rückmeldungsdokument, mit seiner Nummer.

Nach jeder Änderung an Templates, Themenbaum oder Katalog:

```bash
app/pruefung/vorschau_bauen.py     # Inhalte in die Vorschau einspielen
app/pruefung/abdeckung.py --offen  # was noch fehlt, nach Punkten sortiert
```

**Ein Prüfer, der falschen Alarm schlägt, ist schlimmer als keiner.** Wer
einen Befund für einen Fehlalarm hält, repariert den Prüfer — und erst dann
schaut er wieder auf den Code.

## 9. Vorschau

`app/preview/StudySwiss-Vorschau.html` — eine einzige Datei, im Browser zu
öffnen, ohne Installation und ohne Internet. Sie enthält die vollständige App
in klickbarer Form: alle Screens, die echte Aufgaben-Engine in JavaScript,
echte Antwortprüfung, echtes Feedback, echter Fortschritt.

Sie ist **die Referenz für Verhalten**. Wer unsicher ist, wie sich ein Screen
verhalten soll, klickt es dort nach. Wer Flutter oder Kotlin ändert, ändert die
Vorschau mit — sonst laufen sie auseinander.

```bash
open app/preview/StudySwiss-Vorschau.html
```

---

## 9. Was nicht passiert

- **Keine Aufgaben zur Laufzeit per LLM.** Der Generator ist deterministisch.
  Einzige Ausnahme: Aufsatzkorrektur.
- **Keine Tore lockern**, um ein Template durchzubekommen. Immer das Template
  reparieren.
- **Keine Lernziel-ID ändern.** Sie stecken in Nutzerfortschritten.
- **Keine Kreisdiagramme und keine Prozentzahl als Hauptaussage.** Abzählbare
  Grössen, sonst nichts. Das kam aus dem Feedback und gilt.
- **Keine Serie, keine Streak, keine Punkte, keine Abzeichen.** Bewusst
  entfernt. Das Tempo gibt der Prüfungstermin vor, nicht eine Zahl.
- **Keine Noten, nirgends.** Weder die Standortbestimmung noch der Selbsttest
  noch die Aufsatzkorrektur geben eine Ziffer. Eine Note sagt einer
  14-Jährigen, wo sie steht, aber nicht, was sie tun soll — und sie erzeugt
  Druck genau dort, wo Übung nötig wäre. An ihrer Stelle steht formative
  Rückmeldung: welches Kriterium erreicht ist, woran man das im Text sieht
  und was der nächste Schritt ist.
- **Kein Thema gesperrt.** Alle sind von Anfang an offen, auch «Flächen &
  Volumen». Der Scheduler schlägt vor, er verbietet nicht.
- **Kein Schatten** ausser am Bottom-Sheet.
- **Kein `ß`**, nirgends.
- **Keine E-Mail-Passwort-Anmeldung.**
- **Kein fixer Wochenplan.** Der Lernpfad rechnet sich neu, statt einen
  Rückstand anzuzeigen. Ein Plan, der beim ersten Skiwochenende bricht, wird
  nicht mehr angeschaut.
- **Kein Preis im Code.** Die Zahlen im Kauf-Screen kommen aus dem Laden,
  sobald er antwortet — sonst zeigt die App etwas anderes an als die
  Kaufbestätigung.
- **Kein Wortlaut aus offiziellen Prüfungen.** Eigener Kontext, eigene Zahlen,
  eigene Namen. `herkunft` festhalten.
- **Keine Aufgabe mit ihrer Lösung an den Client.**
- **Keine Aufgabennummer unter der Aufgabe.** Sie stand dort für den Support,
  aber sie war das Erste, was einer Schülerin unter der Aufgabe entgegensprang,
  und sie erklärte sich nicht. Im **Fehlerarchiv** steht sie weiter — und genau
  dort schaut man nach, wenn jemand ein Problem meldet.
- **Kein Bereich auf der obersten Ebene.** «Deutsch Sprachbetrachtung» steht
  nie neben «Mathematik». Erst das Fach, dann der Bereich.
- **Keine Prüfungsbedingung im Screen.** Taschenrechner, Zurückblättern, Dauer
  und Uhr kommen aus dem Katalog — und zwar vom **Prüfungsteil**, nicht vom
  Schultyp. Ein Screen, der sie fest aufzählt, lügt beim ersten Kanton mit
  anderen Regeln.
- **Kein Kanton im Code.** Weder Backend noch App noch Vorschau zählen Kantone,
  Schultypen oder Bereiche auf. Wo ein Rückfall nötig schien, steht
  `Katalog.standardKanton` — der erste aktive Kanton, nicht «ZH».
- **Kein Rückfall vom Schultyp auf das Fach.** Welche Bereiche jemand sieht,
  sagt sein Schultyp. Fehlt dort etwas, ist die richtige Antwort «nichts» —
  ein Rückfall zeigte einem Berner Kind stillschweigend Zürcher Stoff.
- **Keine Angabe zweimal.** Die Zugehörigkeit eines Bereichs zu seinem Fach
  steht am Bereich, nicht auch am Fach; die Bedingungen stehen am
  Prüfungsteil, nicht auch am Schultyp. Zwei Listen für dieselbe Sache laufen
  auseinander, und dann zeigt die App ein Fach ohne Inhalt.
- **Kein Kanton auf `aktiv: true` ohne Inhalt.** Das Flag ist ein Versprechen,
  und `kantone.py` prüft es.
- **Keine verbindliche Reihenfolge aus der Standortbestimmung.** Sie empfiehlt
  Themen nach Fehlerquote. Die Reihenfolge legt der Lernpfad fest.

---

## 10. Offen — Entscheid nötig

Diese Punkte sind bewusst nicht entschieden und im Code mit `// OFFEN:` markiert.

- **Grösse des Pflichtsets.** Überall 20 angenommen. Fachlich festzulegen, darf
  je Unterthema unterschiedlich sein. Steht in `themen/*.json`, nicht im Code.
- **Punktegewichtung im Selbsttest.** Derzeit gleichgewichtet je Aufgabe
  angenommen; die echte ZAP gewichtet nach Aufgabe.
- **Ob der Familien-Pass drei oder fünf Plätze hat.** Drei deckt Geschwister
  ab; fünf würde auch Cousins erreichen, macht die Weitergabe aber unkontrolliert.
- **Entfernter Onboarding-Screen «Fach, Thema, üben».** Er war die einzige
  Stelle, an der das Onboarding die Kernfunktion zeigt. Als «nicht notwendig»
  markiert und entfernt — bitte bestätigen. Die Datei liegt noch unter
  `gestaltung/design frontend/03_Screens_HTML/Onboarding2.dc.html`.
- **Begriffe «Lernpfad» und «Lernkarte»** überschneiden sich und müssen vor
  Version 2 getrennt werden.
- **Fachreview.** Kein Template geht auf `live` ohne Review durch eine
  Lehrperson. Der Status steht in `templates/*.json` als `status`.
- **Abdeckung des Prüfungsstoffs: 1'853 von 1'853 Punkten.** Zürich 122/122
  (Mathematik 86 von 87 Unterthemen, Sprachbetrachtung 57/57,
  Textverständnis 24/24), Bern 208/208, Basel-Stadt 97/97, St. Gallen
  182/182, Aargau 184/184, Luzern 79/79, Thurgau 123/123, Solothurn 124/124,
  Appenzell Ausserrhoden 215/215, Glarus 70/70, Graubünden 135/135, Schwyz
  314/314 (davon 100 an der Stiftsschule Einsiedeln) — alle zwölf Kantone
  vollständig. Bestand über alle Kantone: **439 Zahlen-Templates** (jedes
  erzeugt beliebig viele Aufgaben) und **405 Textblöcke mit 7'537
  Aufgaben**, verteilt auf 54 Themenbäume mit 1'362 Unterthemen.
  `app/pruefung/abdeckung.py` zeigt es nach Punkten sortiert.

  Das eine offene Mathematik-Unterthema ist **7.12 «Konstruktionsaufgaben mit
  Zirkel»**. Es trägt `nichtGeprueftIn: ["zh-zap3"]` — in der ZAP 3 wird es nicht geprüft, und
  eine Zirkelkonstruktion lässt sich auf einem Telefon auch nicht sinnvoll
  üben. Es bleibt bewusst leer; das ist keine Lücke, sondern ein Entscheid.

- **Textverständnis ist vollständig.** 24 von 24 Unterthemen, 30 von 30
  Punkten, 13 Blöcke mit 166 Aufgaben. Grundlage sind **acht eigene
  Lesetexte**; die vier neuen decken bewusst vier Textsorten ab — Sachtext,
  Kommentar, Erzählung, Reportage —, weil «Textsorte bestimmen» (4.02) und
  «Absicht des Textes» (4.03) sonst nichts zu unterscheiden hätten.

  Beim Schreiben schlug ein **Fehlalarm** an: Die Umschriften-Liste in
  `tore.py` führte `einheitli`, und damit galt «einheitlich» als
  Umlaut-Umschrift — ein Wort, das gar kein Vokalpaar trägt. Das Muster hatte
  nie angeschlagen, weil das Wort in keiner Vorlage vorkam. Nach §8 wurde
  zuerst der Prüfer repariert, dann weitergeschrieben.

- **Welche Aufsatzarten kommen je Prüfung vor?** `aufsatz/arten.json` führt
  dreizehn Arten mit zusammen 150 Themen, und **jede trägt Themen** — zuletzt
  kamen «Erzählung weiterführen» und «textbezogenes Schreiben» mit Thurgau
  dazu und die **Kurzgeschichte** mit Luzern, wo die Prüfung ihre fünf
  Merkmale einzeln bewertet. «Themen folgen» erscheint damit nirgends mehr.
  Ob die Liste je Prüfung stimmt und ob weitere Arten dazugehören, muss eine
  Fachperson bestätigen.

- **Französisch steht in acht Kantonen, Englisch in sechs.** Wo eine Prüfung
  eine Fremdsprache stellt, ist sie bespielt; wo keine, erscheint sie
  nirgends — die Zürcher ZAP und die Basler Prüfung stellen keine, Glarus
  ebenso wenig. Offen bleibt allein das **Hörverstehen und die mündliche
  Prüfung**: Es gibt kein Audio und kein Gegenüber, sondern eine Tipps-Seite
  (§3.1.1). Inzwischen sind es vierzehn solcher Seiten. Ob je echte
  Tonaufnahmen dazukommen, ist ein Entscheid, keine Lücke im Stoff.
- **Fachreview.** Kein Template und kein Block steht auf `live` — sie tragen
  `review` oder `importiert`. Die Sätze und Zahlen sind eigenentwickelt und an
  den Aufgabentypen der Prüfungen orientiert; eine Fachperson muss sie
  durchsehen, bevor etwas auf `live` geht. Das ist der einzige Schritt, den
  keine Prüfung dieses Repos ersetzen kann.

- **Das Gerüst fehlt noch, nicht nur der Build.** Drei Dinge, die keine
  Prüfung dieses Repos ersetzt und die vor allem anderen kommen:

  1. **Das Flutter-Projekt hat keine Plattformordner.** `frontend/ios/` und
     `frontend/android/` enthalten Notizen und Icons, aber kein Xcode-Projekt,
     kein `Info.plist`, kein `AndroidManifest.xml`, keine Gradle-Dateien.
     `flutter create . --platforms=ios,android --org ch.studyswiss` erzeugt
     sie; danach die beiden `*.ergaenzungen.md` einarbeiten.
  2. **Der Gradle-Wrapper fehlt.** `./gradlew` steht in dieser Datei, in der
     Checkliste und im `Dockerfile` — die Datei gibt es nicht, und das
     Docker-Bild scheitert schon beim Kopieren.
  3. **Das Repo ist kein Git-Repo.** Ein `.gitignore` liegt da, ein `.git`
     nicht.

- **Der erste echte Build.** Auf dem Entwicklungsrechner gibt es weder einen
  Kotlin- noch einen Flutter-Compiler; abgesichert wird über die sieben
  Prüfungen aus Abschnitt 8. Der erste `./gradlew build` und `flutter run`
  werden trotzdem Meldungen bringen. Das ist erwartet und schnell behoben —
  aber es ist der eine Punkt, den man nicht vorwegnehmen kann.

- **Das Schema wird erzeugt, nicht migriert.** §4.1 nennt Flyway;
  `Application.kt` ruft `SchemaUtils.create`. Der Unterschied fällt erst nach
  dem Start auf: `create` legt fehlende Tabellen an und rührt bestehende nie
  an. Die erste Schemaänderung nach der Veröffentlichung tut damit still
  nichts. Vor dem ersten echten Nutzer entscheiden: entweder Flyway einbauen
  oder die Zeile in §4.1 streichen.

- **Die Website ist gebaut, drei Anschlüsse fehlen.** `app/website/` steht
  vollständig: alle öffentlichen Seiten, der Lernbereich und die
  Schul-Strecke von der Offerte bis zur Rechnung mit QR-Zahlteil. Drei
  Dinge lassen sich ohne Konten und Verträge nicht abschliessen, und der
  Server sagt bei allen dreien ehrlich «noch nicht eingerichtet», statt
  etwas vorzutäuschen:

  1. **Der Kauf auf der Website** (`/v1/abo/web/start`) braucht einen
     Zahlungsanbieter — Datatrans oder Stripe. §4.9 gilt hier wie bei den
     Läden: lieber kein Plus als eines, das sich jeder selbst ausstellt.
  2. **Die Anmeldung mit Apple und Google im Browser** braucht eine
     Apple-Service-ID und eine Google-Web-Client-ID. Ohne sie funktioniert
     «ohne Konto weiterlernen» und «Code einlösen», mehr nicht.
  3. **Der QR-Zahlteil braucht eine QR-IBAN.** Ohne sie wird bewusst
     keiner erzeugt.

  Dazu ein Entscheid, den kein Code trifft: **Ob digitale Lernmittel in
  der Schweiz mehrwertsteuerpflichtig sind.** Eingestellt ist der
  Normalsatz von 8,1 %; ob die Ausnahme für Bildungsleistungen greift,
  muss die Treuhandstelle sagen. Auf einer Rechnung ist das keine
  Kleinigkeit.

  Und eine Lücke im Ablauf, nicht im Code: **Heute steht jede Rechnung
  auf «offen», bis jemand sie umstellt.** Bevor die erste Mahnung fällig
  wäre, braucht es einen Weg, wie ein Zahlungseingang ankommt.

- **Das Frontend hat keinen einzigen Test.** `dart_pruefen.py` liest den Code
  gegen, aber niemand führt ein Widget aus. Solange kein Compiler da ist,
  ändert das nichts; sobald einer da ist, ist es die erste Lücke.
- **Alle zwölf erfassten Kantone sind aktiv.** Zürich, Bern, Basel-Stadt,
  St. Gallen, Aargau, Luzern, Thurgau, Solothurn, Appenzell Ausserrhoden,
  Glarus, Graubünden und Schwyz stehen auf `aktiv: true` und halten das
  Versprechen aus §3.1. `app/pruefung/kantone.py` meldet **0 Fehler und 0
  Warnungen**, und in der Kantonswahl steht kein «bald» mehr. Ein weiterer
  Kanton käme nur mit Quellen unter `kantone/` dazu — ohne Quellen wird kein
  Prüfungsstoff erfunden.

  Die sechs zuletzt dazugekommenen Kantone im Überblick:

  | Kanton | Bereiche | Umfang |
  |---|---|---|
  | Aargau | Mathematik · Textverständnis · Sprachbetrachtung · Französisch · Englisch | 118 Unterthemen, 184 Punkte |
  | Appenzell Ausserrhoden | Mathematik · Textverständnis · Grammatik · Französisch · Englisch, dazu zwei Tipps-Seiten für die Hörteile | 135 Unterthemen, 215 Punkte |
  | Glarus | Mathematik · Textverständnis · Sprachkunde | 65 Unterthemen, 70 Punkte |
  | Graubünden | Mathematik · **fixierendes Kopfrechnen** · Lesen · Sprache im Fokus · Englisch | 86 Unterthemen, 135 Punkte |
  | Luzern | Mathematik · Leseverstehen · Sprachreflexion · Französisch · Use of English, dazu Tipps-Seiten für das Hörverstehen und das Writing | 79 Unterthemen, 79 Punkte |
  | Schwyz | Mathematik · Textverständnis · Sprache im Fokus · Englisch · Französisch, dazu vier Tipps-Seiten; **eigene Prüfung der Stiftsschule Einsiedeln** mit vier weiteren Bereichen | 122 Unterthemen, 314 Punkte |

  Drei Dinge sind dabei neu und nirgends sonst so:

  1. **Graubünden prüft Kopfrechnen als eigenen Prüfungsteil.** «Fixierendes
     Kopfrechnen» nach Armin Kuratle ist ein Teil der Prüfung 1G, dreissig
     Minuten, ohne etwas aufzuschreiben. Er hat einen eigenen Bereich und
     einen eigenen Baum; die Aufgaben verlangen einen Rechentrick, nicht
     einen Rechenweg.
  2. **Luzern kennt fürs Gymnasium gar keine Aufnahmeprüfung.** Der Übertritt
     läuft über Zeugnisnoten. Die App führt darum nur die zentrale Prüfung
     für BM, FMS, WMS und IMS — und zwar mit zwei Prüfungen, weil die
     Berufsmaturitätsschulen im März schreiben und die übrigen im Oktober.
  3. **In Schwyz wird eine Fremdsprache schriftlich und die andere mündlich
     geprüft.** Das sind zwei Wahlgruppen in derselben Prüfung: eine für die
     schriftliche, eine für die mündliche Sprache. Die mündliche ist je eine
     Tipps-Seite, weil ein Gegenüber die App nicht hat.

  **Die Stiftsschule Einsiedeln ist der erste Fall einer Schule mit eigener
  Prüfung neben dem kantonalen Verfahren.** Sie prüft ins Untergymnasium,
  also nach der 6. Klasse, mit ganz anderem Stoff: Brüche und Dezimalzahlen
  statt Terme, Würfelnetze statt Pythagoras, ein Text von 70 bis 100 Wörtern
  statt eines Aufsatzes. Sie bekommt darum eigene Bereiche und eigene Bäume;
  in die Schwyzer Bäume liess sich das nicht hineinzwängen, ohne beiden zu
  schaden.

  **Bern steht auf `aktiv: true`.** Alle fünf Bereiche sind vollständig
  bespielt:

  | Bereich | Stand |
  |---|---|
  | Mathematik GYM 1 / FMS | **42/42** Unterthemen · 31 Vorlagen + 1 Block · 61 von 61 Punkten |
  | Deutsch Textverständnis | **12/12** · 10 Blöcke, 123 Aufgaben · 20 von 20 Punkten |
  | Deutsch Sprache | **16/16** · 13 Blöcke, 164 Aufgaben · 8 von 8 Punkten |
  | Französisch | **15/15** · 10 Blöcke, 124 Aufgaben · 60 von 60 Punkten |
  | Mathematik GYM 3 | **26/26** · 26 Vorlagen + 3 Blöcke · 59 von 59 Punkten |

  Grundlage sind sechs eigene deutsche und zwei eigene französische
  Lesetexte im Zuschnitt der Berner Prüfung. Die Mathematik nutzt sieben
  Aufgabenarten, darunter den **Zahlenstrahl** — ein Gitter ohne Höhe.

  Die Berner Aufsatzarten tragen jetzt Themen: **Schreibauftrag 8**
  (Titel, drei Teile mit Wortzahl, wie es die Berner Prüfung vorgibt),
  **Bildimpuls 6**, **Brief 8**, **Erörterung 8**, **Interpretation 6** —
  zusammen 36 neue Themen.

  **Was das Umlegen des Schalters freigelegt hat.** Solange Bern
  ausgegraut war, lief kein Screen je mit einem Kanton, dessen Bereiche
  anders heissen als seine Fächer. Drei Fehler kamen dabei heraus, alle drei
  von der Sorte «leere Karte»:

  1. **«Deine Fächer» zählte über die Fächer statt über die Bereiche.**
     `fortschritte()` schlägt jeden Eintrag im Themenbaum nach, und dort
     stehen Bereiche. In Zürich heisst der Mathematik-Bereich zufällig gleich
     wie das Fach, darum ging es gut; in Bern heisst er
     `mathematik-bern-gym3`, und die Karte zeigte «0 von 0 Themen».
  2. **Ein Fach, das nur aus dem Aufsatz besteht, führte ins Leere.**
     An der FMS Bern und am GYM 3 ist Deutsch genau das. Die Karte zeigte
     «0 von 0 Themen» und verwies auf einen Themenbaum, den es nicht gibt;
     Selbsttest und Standortbestimmung boten ein Fach mit null Themen an.
     Jetzt führt die Karte zum Aufsatz, und geprüft werden nur Fächer mit
     Themenbaum (`pruefbareFaecher` in der Vorschau, der Filter in
     `LernService.standortFaecher`).
  3. **«Zentrale Aufnahmeprüfung» stand fest im Screen.** Das ist der
     Zürcher Name. Der Katalog liefert jetzt `kuerzel` bis in die App
     durch; wo keines steht — Bern führt keines —, steht das neutrale Wort
     «Aufnahmeprüfung», nie eine erfundene Abkürzung. Splash und Onboarding
     laufen, bevor ein Kanton gewählt ist, und behaupten dort nichts
     Kantonales mehr.

  **Die mündliche Französischprüfung war falsch abgebildet.** An der FMS und
  am GYM 3 ist Französisch eine **mündliche Einzelprüfung von 15 Minuten**
  anhand eines Textes von 20 bis 30 Zeilen — der Katalog führte 30 Minuten
  und 20 schriftliche Aufgaben und zeigte auf den schriftlichen Themenbaum.
  Wer danach übte, bereitete sich auf eine Prüfung vor, die es nicht gibt.
  Jetzt stehen dort 15 Minuten, eine Aufgabe, Wörterbuch erlaubt — und der
  Bereich `franzoesisch-muendlich-be` mit dem ganzen Ablauf: still lesen,
  erzählen, **fragen** (ein eigener Prüfungspunkt, den viele liegen lassen),
  vorlesen, Gespräch. Das GYM 1 hat eine andere Form — Dreiergruppe,
  Bildimpuls, fünf Minuten Vorbereitung — und darum eine eigene Seite
  `franzoesisch-bildimpuls-be`.

  **Was in Bern noch offen ist:**

  - **Die GYM-3-Prüfung stellt auch Trigonometrie** (Aufgaben 19 und 20 der
    (Aufgaben 19 und 20 der Serie 2025: Winkel im rechtwinkligen Dreieck,
    Schattenlänge). Der Themenbaum `mathematik-bern-gym3.json` führt dafür
    kein Unterthema. Das ist keine Vergesslichkeit, sondern ein offener
    Entscheid: entweder ein siebtes Oberthema anlegen oder festhalten, dass
    die App diesen Teil nicht abdeckt.
  - **Das Feld `bild` eines Aufsatzthemas wird nirgends angezeigt** — weder
    in der Vorschau noch in Flutter noch im Backend. Ein Bildimpuls ohne
    Bild ist keine Aufgabe; darum steht die Bildbeschreibung bei den sechs
    Berner Themen zusätzlich im `auftrag`, wo sie ankommt. Das Feld bleibt
    für den Tag, an dem ein echtes Bild dazukommt. Zu entscheiden ist, ob
    der Screen es anzeigen soll — dann kann es aus dem Auftrag heraus.

  **St. Gallen steht auf `aktiv: true` und ist vollständig.** Alle vier
  Bereiche sind bespielt, jeder Prüfungsteil zeigt auf einen Baum, und
  `pruefe8.js` läuft den Weg jedes der vier Schultypen durch die echten
  Screens.

  | Bereich | Stand | Punkte |
  |---|---|---|
  | `mathematik-sg` | **46/46** Unterthemen · 23 Vorlagen + 8 Blöcke | 82 (M I 41 + M II 41) |
  | `sprache-sg` | **46/46** · 17 Blöcke, 208 Aufgaben | 35 (Teil B) |
  | `textverstaendnis-sg` | **23/23** · 8 Blöcke, 96 Aufgaben | 20 (Teil A) |
  | `franzoesisch-sg` | **28/28** · 9 Blöcke, 114 Aufgaben | 45 (Teile B, C, D) |

  Grundlage sind **zwei eigene deutsche und zwei eigene französische
  Lesetexte**. Die deutschen tragen Personifikation, Vergleich und Metapher,
  weil Teil A der Sprachprüfung genau danach fragt; die französischen liegen
  im Zuschnitt von Dis donc! 7 und 8.

  Die Bäume folgen dem Aufbau der Prüfungsserien, nicht dem Lehrplan: Was in
  der Prüfung eine eigene Aufgabe mit eigener Punktzahl ist, ist im Baum ein
  Oberthema. Bei der Sprachprüfung heissen die Oberthemen darum «Gross- und
  Kleinschreibung», «Vor- und Nachmorpheme», «Kommaregeln» — genau die zehn
  Aufgabenblöcke von Teil B.

  **Die Gymnasialprüfung und die Einheitsaufnahmeprüfung zählen verschieden.**
  Deutsch Teil A zählt 27 statt 20 Punkte, Teil B 44 statt 35, Französisch
  100 statt 75, Mathematik I 55 statt 41 und Mathematik II 51 statt 41. Die
  Gewichtung der Oberthemen ist in beiden dieselbe, darum genügt ein Baum je
  Bereich; die Zahlen der Einheitsaufnahmeprüfung stehen darin, die
  Unterschiede als `bemerkung` daneben.

  **Was in St. Gallen offen bleibt:**

  - **Hörverstehen** ist Teil A der Französischprüfung und zählt 15 von 75
    beziehungsweise 20 von 100 Punkten. Eine fünfzehnte Aufgabenart braucht es
    dafür **nicht** — der Bereich `franzoesisch-hoeren-sg` trägt `art: "tipps"`
    und führt auf eine Seite mit Ablauf, Tipps, Redemitteln und Verweisen auf
    die Unterthemen, die sich schriftlich üben lassen. Offen bleibt nur, ob je
    echtes Audio dazukommt.
  - **Die Einheitsaufnahmeprüfung findet im Herbst statt**, der Katalog führt
    für sie bisher nur einen Frühlingstermin. Für das Gymnasium sind beide
    Sessionen erfasst. Wer den Herbsttermin der EAP kennt, trägt ihn nach —
    erfunden wird er nicht.
  - **Ein Block deckt mehrere Unterthemen ab, aber höchstens vier.** Wer
    «Passé composé mit avoir» antippt, kann eine Aufgabe zum Präsens
    bekommen, weil beide im selben Block liegen. Das gilt im ganzen Repo so
    und ist der Preis dafür, dass ein Block mindestens zwölf Aufgaben braucht
    (T11). Ein Block mit zehn Unterthemen war dieser Preis aber nicht mehr
    wert: Wer eines davon antippt, bekommt zu neun Zehnteln etwas anderes,
    und der Fortschritt zählt Treffer, die gar nicht geübt wurden. Alle
    Blöcke im Repo tragen darum inzwischen **höchstens vier Unterthemen** —
    aus 331 Blöcken wurden 405. Wo mehr nötig wäre, wird der Block geteilt
    und jede Hälfte auf zwölf Aufgaben gebracht.

  **Die Textproduktion verlangt vier Textsorten** — Erzählung, Bericht,
  **Votum** und persönlicher Brief. Alle vier tragen jetzt Themen: Votum 8
  (neu in `aufsatz/arten.json`) und Bericht 8. Damit ist auch die alte Zürcher
  Lücke geschlossen — **jede Aufsatzart hat Themen**; inzwischen sind es
  dreizehn Arten, und `aufsatz/themen.json` führt 150.

  Weil es keine Art ohne Themen mehr gibt, verlor `pruefe7.js` seinen
  Testfall für Punkt 19 («eine Art ohne Themen erscheint als *Themen
  folgen*»). Statt den Punkt zu streichen, stellt die Runde den Fall jetzt
  selbst her: Sie nimmt einer Art vorübergehend die Themen weg und prüft den
  Screen. So bleibt die Zusicherung geprüft, auch ohne echtes Loch.

  **Basel-Stadt steht auf `aktiv: true` und ist vollständig.** Die Annahme,
  es gebe dort keine alten Prüfungen, stimmte nicht: Unter
  `kantone/basel-stadt/Musterpruefungen_Aufnahmepruefung_BS/` liegen die
  Serien März 2021 und März 2022 in Deutsch und Mathematik, je mit Lösungen.
  Sie sind die Grundlage, zusammen mit den Prüfungsanforderungen 2026.

  | Bereich | Stand | Punkte |
  |---|---|---|
  | `mathematik-bs` | **56/56** Unterthemen · 37 Vorlagen + 17 Blöcke | 69 |
  | `textverstaendnis-bs` | **16/16** · 6 Blöcke, 72 Aufgaben | 28 |
  | `aufsatz` (geteilt) | 5 Arten, alle mit Themen | 24 |

  **Eine Prüfung für fünf Schulen, und zwar wörtlich dieselbe.** Gymnasium,
  FMS, WMS, IMS und BM 1 schreiben dasselbe Heft; unterschiedlich ist nur die
  Punktzahl, die für den Übertritt reicht. Die App bildet das nicht ab — sie
  gibt keine Noten (§9) und rechnet niemandem vor, ob es reicht.

  Der Mathematikbaum folgt darum den sechs Teilen des Aufgabenhefts (A
  Bruchrechnen · B Algebra · C Geometrie · D Konstruktionen · E Grössen,
  Funktionen, Daten · F Sachrechnen), nicht dem Lehrplan: Was auf dem Blatt
  ein eigener Teil mit eigener Punktzahl ist, ist im Baum ein Oberthema.

  **Drei Dinge sind in Basel anders als überall sonst:**

  1. **Ein Taschenrechner ist erlaubt** — ein einfacher, nicht
     programmierbarer; das Anforderungsprofil bildet sogar die zugelassenen
     Modelle ab und verlangt ausdrücklich, dass man mit ihm umgehen kann.
     **Tor T6 bleibt trotzdem in Kraft.** Zahlen, die im Kopf aufgehen, sind
     nie falsch, nur leichter; ein gelockertes Tor liesse sich später nicht
     mehr einfangen (§9). Wo die Prüfung selbst auf zwei Stellen runden lässt
     — Höhensatz, Kegelmantel, Umrechnung m/s in km/h —, tun das die Vorlagen
     ebenfalls, mit `dezimal2`.
  2. **Deutsch hat keine Sprachbetrachtung.** Das Anforderungsprofil sagt es
     so: Geprüft werden Lesen und Schreiben, «Grammatik- und
     Rechtschreibkompetenzen werden in der Anwendung mitgeprüft». Es gibt
     darum keinen Bereich `sprache-bs`, und das ist kein Loch, sondern die
     Prüfung.
  3. **Teil D verlangt Konstruktionen mit Zirkel und Lineal.** Fünf von 69
     Punkten. Auf einem Telefon lässt sich das nicht nachstellen — Zürich
     lässt das eine solche Unterthema darum bewusst leer (7.12). In Basel
     geht das nicht, dazu ist der Teil zu gross. Geübt wird deshalb, was sich
     ohne Zirkel üben lässt und woran die meisten scheitern: welche Ortslinie
     zu welcher Angabe gehört, in welcher Reihenfolge konstruiert wird, und
     **wie viele Lösungen es gibt**. Das Aufgabenheft fragt genau danach
     («Falls sich mehrere Lösungen ergeben, sind alle zu konstruieren»).

  **Was in Basel-Stadt offen bleibt:**

  - **Der Termin ist ein Fenster, kein Datum.** Die Richtlinien sagen nur
    «zwischen den Sportferien und den Frühjahrsferien». Ausgeliefert wird
    nach §3.1 der letzte Tag des Fensters; sobald das Erziehungsdepartement
    ein Datum veröffentlicht, gehört es in `termine`.
  - **Ob die App die Freiwilligkeit erwähnen soll.** In Basel schreibt die
    Prüfung nur, wer die Noten für den Übertritt nicht erreicht hat. Das
    steht heute nirgends in der App. Ein Satz dazu könnte entlasten — oder
    beschämen. Das ist ein Entscheid, keine Datenlücke.

  **Solothurn steht auf `aktiv: true` und ist vollständig.** Grundlage sind
  die Prüfungseckwerte ab 2026 und die Aufnahmeprüfungen für BM, FMS und
  Gymnasium unter `kantone/solothurn/`. Gymnasium, FMS und BM schreiben
  dieselbe Prüfung.

  | Bereich | Stand | Punkte |
  |---|---|---|
  | `mathematik-so` | **48/48** Unterthemen · 26 Vorlagen + 11 Blöcke | 35 |
  | `textverstaendnis-so` | **14/14** · 4 Blöcke, 48 Aufgaben | 10 |
  | `sprache-so` | **19/19** · 6 Blöcke, 72 Aufgaben | 10 |
  | `franzoesisch-so` | **28/28** · 8 Blöcke, 96 Aufgaben | 29 |
  | `englisch-so` | **28/28** · 9 Blöcke, 108 Aufgaben | 40 |

  Grundlage sind vier eigene Lesetexte: «Was die Dinge erzählen» für den
  deutschen Sprachbogen, «Le vide-grenier de Nina» für Französisch und
  «Milo's roof garden» für Englisch.

  **Solothurn prüft Englisch — als einziger erfasster Kanton.** Beide
  Fremdsprachen werden geschrieben, und beide haben einen Hörteil: 14 von 43
  Punkten in Französisch, 15 von 55 in Englisch. Wie in St. Gallen tragen
  diese Teile `art: "tipps"` (§3.1.1) und führen auf eine Seite mit Ablauf,
  Redemitteln und Verweisen auf die Unterthemen, die sich schriftlich üben
  lassen.

  **Der Aufsatz kennt drei Arten, und eine davon gab es so noch nicht:**
  freie Erörterung, Stellungnahme und **eine begonnene Erzählung
  weiterführen**. Die dritte trug anfangs die Sorte «Erzählung» und zeigte
  damit dieselben Themen wie die freie Erzählung — Titel ohne Textanfang.
  Damit liess sich die Art nicht üben, denn ihre ganze Schwierigkeit ist,
  Erzählzeit, Perspektive und Figuren eines fremden Anfangs durchzuhalten.
  Sie hat jetzt die eigene Sorte «Erzählung weiterführen» und **acht eigene
  Themen**, jedes mit einem Anfang von vier bis fünf Sätzen im Auftrag.

  **Was in Solothurn offen bleibt:**

  - **Der Aufsatz zählt im Katalog 0 Punkte.** Die Eckwerte nennen für die
    Textproduktion keine Punktzahl, sondern beurteilen sie als Ganzes. Eine
    erfundene Zahl wäre schlimmer als keine.
  - **Ein Lösungsweg, mehr nicht.** Die Mathematikprüfung bewertet eine
    Aufgabe nicht, wenn zwei Lösungswege dastehen. Die App kann das nicht
    nachstellen — sie prüft Ergebnisse, keine Blätter. Der Hinweis steht als
    `bemerkung` am Prüfungsteil und erscheint auf `SelbsttestStart`.

  **Thurgau steht auf `aktiv: true` und ist vollständig.** Grundlage sind der
  «Wegweiser Mittelschulen Thurgau» 2026/27 und die Prüfungsarchive der
  Kantonsschule Frauenfeld von 2017 bis 2026.

  | Bereich | Stand | Punkte |
  |---|---|---|
  | `mathematik-tg` | **78/78** Unterthemen · 54 Vorlagen + 5 Blöcke | 48 (M I 24 + M II 24) |
  | `textverstaendnis-tg` | **12/12** · 4 Blöcke, 48 Aufgaben | 19 |
  | `sprache-tg` | **36/36** · 12 Blöcke, 144 Aufgaben | 56 |

  Grundlage der Deutschblöcke ist ein eigener Lesetext, «Die Schicht am
  Sonntag».

  **Vier Prüfungen, nicht eine.** Wer aus der 2. Sek kommt, schreibt im März
  an seiner Kantonsschule; wer aus der 3. Sek kommt, im Januar an der PMS
  Kreuzlingen — und dort ist der Stoff grösser, weil ein Jahr mehr
  Sekundarschule vorausgesetzt wird. Für die FMS gilt dasselbe noch einmal
  getrennt, mit noch etwas mehr Stoff. Abgebildet ist das mit **einem** Baum
  je Bereich und `nurGeprueftIn` an den Unterthemen (§3.2): Zins und Binome
  etwa stehen nur in `tg-fms3`. Vier Bäume hätten viermal dasselbe gepflegt.

  **Französisch wird nur mündlich geprüft — und nur, wenn es knapp wird.**
  Wer die schriftliche Prüfung nicht besteht und mindestens einen Schnitt von
  3.5 hat, tritt zu einer Viertelstunde in drei Teilen an: vorbereitete
  Präsentation, Bildbeschreibung, Rollenspiel. Der Bereich trägt darum
  `art: "tipps"` (§3.1.1) und ist der erste im Repo, bei dem ein Fach
  **ausschliesslich** aus einer Tipps-Seite besteht.

  **Die Schreibaufgabe ist eine eigene Aufsatzart.** Seit März 2023 geht sie
  von einem vorgelegten Text aus: vier Aufträge stehen zur Wahl, einer wird
  bearbeitet, und der eigene Text muss sich inhaltlich auf den vorgelegten
  beziehen. Dafür gibt es die Art `textbezogen` mit acht eigenen Themen —
  jedes bringt seinen eigenen Text mit, denn ohne Text ist die Aufgabe nicht
  übbar.

  **Was in Thurgau offen bleibt:**

  - **Die Punktzahlen unterscheiden sich je Prüfung**: Die Sprachprüfung
    zählt 75 Punkte am Gymnasium aus der 2. Sek, 58 aus der 3. Sek, 72 und 73
    an der FMS; Mathematik 24 je Teil aus der 2. Sek, 50 aus der 3. Sek. Im
    Katalog stehen alle vier Sätze; die Themenbäume führen die Zahlen der
    Gymnasialprüfung aus der 2. Sek, wie es St. Gallen für seine zwei
    Prüfungen ebenso hält.
  - **Konstruktionen mit Zirkel** kommen in den Prüfungen vor (2026 etwa eine
    Spiegelung mit Konstruktion aller Lösungen). Wie in Basel-Stadt wird
    geübt, was sich ohne Zirkel üben lässt; die Konstruktion selbst bleibt
    Papierarbeit.

- **Vornoten und Bestehensregeln sind bewusst nicht abgebildet.** St. Gallen
  rechnet vier Vornoten und vier Prüfungsnoten zu einer Notensumme zusammen,
  Basel-Stadt legt Punktzahlen je Schule fest. Die App gibt **keine Noten**
  (§9) — sie kann und will nicht vorrechnen, ob jemand bestehen wird. Was sie
  abbildet, ist der Stoff und die Prüfungsform, nicht das Verfahren.

---

## 11. Einen Kanton hinzufügen

**Ein Kanton ist reine Datenlage.** Es gibt keinen Codepfad, der Kantone
aufzählt — nicht im Backend, nicht in der App, nicht in der Vorschau. Wer das
ändert, nimmt dem Ganzen seine einzige Eigenschaft, die den nächsten Kanton
billig macht.

Der Weg, in dieser Reihenfolge:

1. **Quellen ablegen** unter `kantone/<name>/` — alte Prüfungen mit Lösungen,
   Lehrplan, Richtlinien. Sie sind Referenz, kein Build-Input; nichts darin
   wird verändert und **kein Wortlaut daraus wird übernommen** (§4.6).

2. **Die Prüfung in `katalog.json` eintragen**: `pruefungen` bekommt einen
   Eintrag mit `teile`, und `schultypen` verweist darauf. Mehrere Schultypen
   dürfen auf dieselbe Prüfung zeigen — in Basel-Stadt tun es fünf.

3. **Termine** eintragen, an der Prüfung. Mehrere Sessions sind erlaubt; wo
   nur ein Fenster feststeht, `von`/`bis` statt `datum`.

4. **Bereiche und Themenbäume** anlegen, sofern der Kanton eigene braucht.
   Ein Bereich, dessen Stoff mit einem bestehenden übereinstimmt, benutzt den
   bestehenden — zwei Bäume mit demselben Inhalt sind zwei Baustellen. Neuen
   Baum in `themen/index.json` eintragen, neue Bereichszeile in `bereiche`.
   **Lernziel-IDs sind über alle Bäume eindeutig** und werden nie geändert.

5. **Aufsatzarten** prüfen: Jede Art, die eine Prüfung nennt, muss in
   `aufsatz/arten.json` stehen. Trägt die Prüfung einen Aufsatzteil, gehört
   ein `aufsatzrahmen` dazu — sonst korrigiert das Sprachmodell nach dem
   Massstab eines fremden Kantons und liefert trotzdem eine ordentlich
   aussehende Antwort. Ein Fehler, den niemand sieht, ist der schlimmste.

6. **Aufgaben schreiben**, Vorlagendatei in `vorlagen.index.json` oder
   `bloecke.index.json` eintragen.

7. **`app/pruefung/kantone.py`** laufen lassen. Er sagt Zeile für Zeile, was
   noch fehlt, und listet den Weg jedes Schultyps mit Dauer, Hilfsmitteln und
   Anzahl bespielter Unterthemen auf.

8. **Erst dann `aktiv: true`** setzen — und `app/pruefung/pruefen.sh` grün
   sehen. Vorher steht der Kanton ausgegraut mit «bald», und das ist die
   ehrliche Auskunft.

Was dabei **nicht** anzufassen ist: Kotlin, Dart, die Vorschau. Musste
trotzdem Code geändert werden, ist das ein Zeichen, dass eine Angabe im Code
steht, die in die Daten gehört — dann gehört sie dorthin verschoben, statt
den Sonderfall einzubauen.

---

## 12. Zusammenarbeit

- Templates eines Fachs liegen thematisch sortiert. Neues Template beim
  passenden Oberthema einfügen, **nicht am Dateiende** — sonst kollidieren zwei
  Leute im selben Zweig.
- Ein PR ändert **entweder** Engine **oder** Templates **oder** UI. Nicht alles
  zusammen.
- Nach jeder Template-Änderung `./gradlew tore`. Rot blockiert.
- Neue Screens brauchen ihr Gegenstück in der Vorschau.
