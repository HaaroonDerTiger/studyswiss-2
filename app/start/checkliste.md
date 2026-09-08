# Vor der Veröffentlichung

Was hier steht, kann kein Code erledigen: Es braucht Konten, Schlüssel,
Entscheide und einen Menschen, der unterschreibt. Der Rest der App ist fertig
und geprüft.

Reihenfolge ist Absicht — jeder Block setzt den vorigen voraus.

---

## 0. Zuerst das Gerüst — sonst lässt sich nichts bauen

Drei Dinge fehlen, und keines davon ist eine Kleinigkeit. Solange sie fehlen,
ist «der erste Build bringt Meldungen» zu optimistisch: Es gibt noch gar
keinen Build.

**Das Flutter-Projekt hat keine Plattformordner.** `frontend/ios/` und
`frontend/android/` enthalten nur Notizen und ein paar Icon-Dateien — kein
Xcode-Projekt, kein `Info.plist`, kein `AndroidManifest.xml`, keine
Gradle-Dateien. `flutter run` findet nichts zum Starten.

```bash
cd app/frontend
flutter create . --platforms=ios,android --org ch.studyswiss
```

Danach die beiden `*.ergaenzungen.md` von Hand einarbeiten — sie beschreiben
genau, was in die erzeugten Dateien gehört. Der Befehl überschreibt `lib/`
und `pubspec.yaml` nicht, aber prüfen Sie es nach.

**Der Gradle-Wrapper fehlt.** `./gradlew` steht in dieser Datei, in CLAUDE.md
und in `backend/Dockerfile` — die Datei gibt es nicht. Das Docker-Bild
scheitert schon beim Kopieren.

```bash
cd app/backend
gradle wrapper --gradle-version 8.10
```

**Das Repo ist kein Git-Repo.** Es liegt ein `.gitignore` daneben, aber kein
`.git`. Rund 14'000 Zeilen ohne einen einzigen Stand, auf den man zurück
kann — und ohne Möglichkeit zu sehen, was sich zwischen zwei Rückmeldungen
geändert hat.

```bash
cd "$(dirname app)" && git init && git add . && git commit -m "Stand vor der Veröffentlichung"
```

---

## 1. Zuerst: das Fachreview

**Kein Template und kein Block steht auf `live`.** Alle tragen `review` oder
`importiert`. Das ist der einzige Schritt, den keine Prüfung dieses Repos
ersetzen kann: Eine Lehrperson mit ZAP-Erfahrung muss die Aufgaben durchsehen.

Was sie prüft — die Tore prüfen es ausdrücklich **nicht**:

- Ist die Aufgabe **fachlich richtig**? Die Tore prüfen die Rechnung gegen
  eine zweite Formel, nicht gegen den Lehrplan.
- Ist sie **prüfungsnah**? Kommt so etwas in der ZAP wirklich vor?
- Ist die Sprache **altersgerecht**? Versteht eine Zwölfjährige den Satz beim
  ersten Lesen?
- Benennt das Feedback den **richtigen** Denkfehler? Ein Distraktor kann
  rechnerisch stimmen und trotzdem die falsche Erklärung tragen.

Erst danach wird `status` auf `live` gesetzt. Bis dahin sieht niemand
ausserhalb des Teams die App.

**Aufwand:** rund 90 Zahlen-Vorlagen und 89 Blöcke. Die Blöcke gehen schnell
(je ein Rahmen, viele gleichartige Sätze); die Vorlagen brauchen je zehn bis
zwanzig Minuten, weil man ein paar Ziehungen durchrechnen muss.
`pruefung/vorschau_bauen.py` und die Vorschau eignen sich dafür — dort sieht
man die Aufgaben so, wie das Kind sie sieht.

---

## 2. Konten und Schlüssel

| Was | Wo | Wofür |
|---|---|---|
| Apple Developer Program | developer.apple.com · Fr. ~99/Jahr | App Store, Sign in with Apple |
| App Store Connect API Key | App Store Connect → Benutzer & Zugriff → Integrationen | **Serverseitige Quittungsprüfung** |
| Google Play Developer | play.google.com/console · einmalig ~25 USD | Play Store |
| Google Cloud Service Account | Play Console → API-Zugriff | **Serverseitige Quittungsprüfung** |
| Google OAuth Web-Client-ID | Google Cloud Console | Google Sign-In prüfen |
| Sprachmodell-Zugang | Anbieter Ihrer Wahl | **nur** die Aufsatzkorrektur |

> **Ohne die beiden Quittungsschlüssel lehnt der Server in Produktion jeden
> Kauf ab.** Das ist Absicht: Lieber kein Plus als eines, das sich jeder
> selbst ausstellt.

Die Werte kommen als Umgebungsvariablen; sie gehören **nicht** ins Repo.
Welche Namen der Server erwartet, steht in `backend/.../Konfig.kt`.

---

## 3. Der Vertrag mit dem Modellanbieter

Die Aufsatzkorrektur schickt Schülertexte an ein Sprachmodell. Das ist die
**einzige** Stelle, an der Nutzerdaten das Backend verlassen. Der Vertrag muss
zusichern:

- Die Texte werden **nicht zum Training** verwendet.
- Sie werden nach der Verarbeitung **gelöscht**, nicht auf Vorrat gespeichert.
- Die Verarbeitung findet in der **Schweiz oder der EU** statt.

Bekommen Sie das nicht schriftlich, schalten Sie die Aufsatzkorrektur ab. Der
Rest der App läuft ohne sie unverändert — sie ist ein einzelner, abschaltbarer
Dienst.

---

## 4. Server

- **PostgreSQL 16** statt H2. Flyway bringt das Schema mit.
- **Standort Schweiz oder EU.** Steht so in der Datenschutzerklärung, also
  muss es auch stimmen.
- **Sicherung täglich**, Rückspielung einmal geprüft. Eine Sicherung, die man
  noch nie zurückgespielt hat, ist keine.
- **HTTPS**, keine Ausnahme.
- Ein Weg, wie eine Kontolöschung innert 30 Tagen wirklich alles entfernt —
  auch aus den Sicherungen.

---

## 4a. Website und Schulverkauf

Die Website liegt unter `app/website/` und wird von Caddy ausgeliefert;
nur `/v1` geht ans Backend. Beides unter **derselben Adresse** — sonst ist
das Cookie mit dem Refresh-Token ein Drittanbieter-Cookie, und die Browser,
die solche blockieren, melden jeden nach fünfzehn Minuten wieder ab.

**Damit die Anmeldung im Browser überhaupt geht:**

- **Apple Service-ID** anlegen (nicht die Bundle-ID! Im Web ist es eine
  eigene Kennung) und als `APPLE_SERVICE_ID` setzen. Dazu die Domain und
  die Rückkehradresse bei Apple eintragen.
- **Google Web-Client-ID** anlegen und als `GOOGLE_WEB_CLIENT_ID` setzen,
  mit der Website als autorisierter Herkunft.
- `WEB_HERKUNFT` auf die Adressen setzen, unter denen die Website läuft.
  Fehlt eine, blockiert der Browser sie **stumm** — kein Fehler im
  Protokoll, nur eine leere Seite.

**Damit eine Rechnung buchbar ist:**

- `RECHNUNG_ABSENDER`, `RECHNUNG_ZUSATZ`, `RECHNUNG_STRASSE`,
  `RECHNUNG_PLZ`, `RECHNUNG_ORT`, `RECHNUNG_UID` setzen. Solange sie
  fehlen, erscheinen auf Offerte und Rechnung sichtbare Platzhalter in
  eckigen Klammern. Das ist Absicht: Ein Beleg mit erfundenen Angaben ist
  schlimmer als einer, dem man ansieht, dass er noch nicht fertig ist.
- **`RECHNUNG_IBAN`** — eine QR-IBAN, nicht die gewöhnliche. Ohne sie
  erzeugt der Server **bewusst keinen** Zahlteil: Ein QR-Code ohne
  gültiges Konto sieht aus wie einer mit, und die Schule merkt es erst
  bei der Mahnung.
- **Mehrwertsteuer klären.** Der Normalsatz von 8,1 % ist eingestellt
  (`MWST_SATZ`). Ob digitale Lernmittel als Bildungsleistung ausgenommen
  sind, entscheidet die Treuhandstelle — nicht dieser Text.
- **Einen Weg, wie eine Zahlung als eingegangen markiert wird.** Heute
  steht jede Rechnung auf «offen», bis jemand sie umstellt. Bevor die
  erste Mahnung fällig wäre, braucht es dafür einen Ablauf.

**Was noch nicht eingerichtet ist und darum ehrlich «501» meldet:**

- `/v1/abo/web/start` — der Kauf auf der Website. Es fehlt der
  Zahlungsanbieter (Datatrans oder Stripe). Der Server täuscht keinen
  Kauf vor; §4.9 gilt für die Web-Kasse genauso wie für die Läden.
- `/v1/auth/web/start` — die Weiterleitung zu Apple und Google, solange
  die beiden Kennungen oben fehlen.

**Zum Verkauf auf der Website und den Läden.** Der Verkauf auf der eigenen
Website ist erlaubt und war es immer — Apples Guideline 3.1.3(b)
«Multiplatform Services» deckt es ausdrücklich. Was in der Schweiz **nicht**
erlaubt ist, ist das Hinweisen aus der App heraus: kein Link, kein
Web-Preis, kein «günstiger auf unserer Website». Die Lockerungen von 2025
(das US-Urteil in Epic gegen Apple, die DMA-Regeln in der EU) gelten hier
nicht. Der Weg über einen **Code** umgeht das Problem ganz: Das Elternteil
kauft auf der Website, das Kind löst den Code ein.

> Diese Regeln bewegen sich schnell. Vor der Veröffentlichung im aktuellen
> Wortlaut nachlesen.

---

## 5. Rechtliches

`datenschutz.md` und `agb.md` liegen als **Entwurf** daneben. Sie sind
sorgfältig geschrieben und decken die Punkte ab, die bei einer App für
Minderjährige zählen — **aber sie sind keine Rechtsberatung.** Eine Anwältin
oder ein Anwalt muss sie vor der Veröffentlichung durchsehen. Zwei Punkte
verdienen dabei besondere Aufmerksamkeit:

1. **Einwilligung Minderjähriger.** Nutzerinnen sind 12 bis 16. Ob und ab
   welchem Alter sie selbst einwilligen können und wann die Eltern
   einwilligen müssen, ist die Kernfrage.
2. **Der Eltern-Report.** Er ist Opt-in **durch das Kind**. Das ist bewusst
   so — aber es ist auch die Stelle, an der Datenschutz und Elternrecht
   aufeinandertreffen.

Dazu gehört ein **Impressum** mit ladungsfähiger Adresse.

---

## 5.1 Die alte App

Es gibt eine ältere Anwendung auf DigitalOcean. Sie trägt keine laufenden
Abos und keine Daten, die erhalten bleiben müssen — damit entfallen die
Migration und die Übergabe von Abonnements, die sonst der heikelste Teil
wären.

Was bleibt, steht in `digitalocean.md`, Abschnitt «Die alte App ablösen».
Kurz: Neues Backend aufsetzen, App veröffentlichen, alten Ladeneintrag
zurückziehen, alte Anwendung abschalten. Ein neuer Ladeneintrag ist dabei
der einfachere Weg als eine Aktualisierung des bestehenden — er erspart die
Suche nach dem alten Android-Signaturschlüssel.

## 6. Die beiden Läden

**Produkt-IDs in beiden Läden identisch anlegen** — sonst braucht der Code
eine Fallunterscheidung:

```
ch.studyswiss.plus.pass       Fr. 129.–   einmalig
ch.studyswiss.plus.familie    Fr. 189.–   einmalig
ch.studyswiss.plus.monat      Fr.  19.–   Abo, monatlich
```

Von Hand einzurichten, mit Anleitung daneben:
`frontend/ios/Runner/Info.plist.ergaenzungen.md` und
`frontend/android/app/src/main/AndroidManifest.xml.ergaenzungen.md`.

**Zwei Regeln, an denen Einreichungen scheitern:**

- **Sign in with Apple ist auf iOS Pflicht**, sobald ein zweiter Anbieter da
  ist (Review Guideline 4.8). Ist eingebaut.
- **«Kauf wiederherstellen» ist Pflicht** (Review Guideline 3.1.1). Ist
  eingebaut.

Icons liegen in `marke/` und werden alle aus denselben Eulenpfaden erzeugt.
Beim adaptiven Android-Icon gilt: Alles Wichtige muss in den inneren Kreis
mit 66 dp Durchmesser — sonst wird die Eule beschnitten.

Store-Texte: `store-texte.md`.

---

## 7. Erst danach

- **Testflight / interner Test** mit fünf bis zehn echten Schülerinnen und
  Schülern. Nicht mit Erwachsenen: Die Bedienung wurde für Daumen auf kleinen
  Geräten gebaut, und das merkt man erst, wenn ein Kind sie benutzt.
- Achten Sie auf die **Aufgabennummer im Fehlerarchiv**. Unter der Aufgabe
  selbst steht sie nicht mehr — dort war sie das Erste, was einem Kind
  entgegensprang, und sie erklärte sich nicht. Wenn jemand etwas meldet, ist
  sie trotzdem das Einzige, was Sie brauchen: Dieselbe Kennung ergibt überall
  dieselbe Aufgabe.
- **Der erste echte Build.** Auf dem Entwicklungsrechner gab es weder einen
  Kotlin- noch einen Flutter-Compiler; abgesichert wurde über die sieben
  Prüfungen. Der erste `./gradlew build` und `flutter run` werden trotzdem
  Meldungen bringen. Das ist erwartet und schnell behoben — aber es ist der
  eine Punkt, den keine Prüfung vorwegnehmen kann.

  **Vorher fehlt allerdings noch das Gerüst selbst** — siehe Abschnitt 0.

---

## Was Sie nicht tun müssen

Damit die Liste nicht länger aussieht, als sie ist — das ist fertig und
geprüft:

- alle 14 Aufgabenformate, in Backend, App und Vorschau
- Mathematik und Sprachbetrachtung vollständig belegt (92 von 92 Punkten);
  Textverständnis angefangen, 7 von 24 Unterthemen
- Anmeldung mit Apple, Google und ohne Konto, samt Verknüpfung
- Kaufabwicklung für beide Läden, mit serverseitiger Prüfung
- Lernpfad, Scheduler, Standortbestimmung, Selbsttest, Fehlerarchiv,
  Eltern-Report
- das ganze Design, aus derselben Quelle wie die Vorlage
