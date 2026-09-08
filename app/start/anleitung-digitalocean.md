# Schritt für Schritt: die App auf Ihr DigitalOcean

Einfach erklärt. Sie brauchen: ein DigitalOcean-Konto, ein GitHub-Konto und
etwa eine Stunde.

---

## Was hier passiert, in einem Satz

Auf DigitalOcean kommt der **Server** (er rechnet die Aufgaben aus und merkt
sich den Fortschritt). Die **App** fürs Telefon kommt später zu Apple und
Google. Diese Anleitung ist nur für den Server.

---

## Schritt 1 — Den Code auf GitHub legen

DigitalOcean baut die App aus einem Git-Repository. Falls der Code noch nicht
dort liegt:

```bash
cd "/Users/mokdad/Desktop/komplette app"
git init
git add .
git commit -m "StudySwiss"
```

Dann auf github.com ein **privates** Repository anlegen und hochladen — GitHub
zeigt Ihnen nach dem Anlegen die zwei Befehle dafür.

> Die Datei `.gitignore` liegt schon bereit. Sie sorgt dafür, dass Passwörter
> und Schlüssel **nicht** mit hochgeladen werden.

---

## Schritt 2 — Die Datenbank anlegen

Im DigitalOcean-Menü: **Databases → Create Database Cluster**

- PostgreSQL, Version 16
- Region: **Frankfurt (FRA1)**
- Die kleinste Grösse genügt

Nach ein paar Minuten steht dort «Connection Details». Notieren Sie sich:
`host`, `port`, `database`, `user`, `password`.

---

## Schritt 3 — Die App anlegen

**Apps → Create App → GitHub → Ihr Repository**

Wichtig bei der Einrichtung:

| Feld | Was eintragen |
|---|---|
| Source Directory | `app/backend` |
| Type | wird als **Dockerfile** erkannt — so lassen |
| HTTP Port | `8080` |
| Region | Frankfurt |

---

## Schritt 4 — Die Werte eintragen

Bei der App: **Settings → App-Level Environment Variables**.

Die mit **Encrypt** markieren Sie als verschlüsselt.

```
STUDYSWISS_UMGEBUNG = produktion
DB_URL              = jdbc:postgresql://HOST:PORT/DATENBANK?sslmode=require
DB_BENUTZER         = doadmin
DB_PASSWORT         = ………                        ← Encrypt
JWT_GEHEIMNIS       = ………                        ← Encrypt
APPLE_BUNDLE_ID     = ch.studyswiss.app
ANDROID_PAKET       = ch.studyswiss.app
```

Das `JWT_GEHEIMNIS` erzeugen Sie sich selbst — auf Ihrem Mac im Terminal:

```bash
openssl rand -base64 48
```

Das Ergebnis kopieren Sie ins Feld. Es ist der Schlüssel, mit dem der Server
seine Anmeldungen unterschreibt. **Merken müssen Sie es sich nicht**, aber wer
es ändert, meldet damit alle Nutzer ab.

> **`STUDYSWISS_UMGEBUNG = produktion` ist der wichtigste Eintrag.**
> Ohne ihn läuft der Server im Testmodus, mit Demo-Daten und einem Passwort,
> das im Quellcode steht.

Die Schlüssel von Apple und Google tragen Sie später nach — solange sie fehlen,
funktioniert alles ausser dem Bezahlen.

---

## Schritt 5 — Gesundheitsprüfung eintragen

**Settings → Health Checks → Edit**

- Protokoll: HTTP
- Pfad: `/gesundheit`

Damit merkt DigitalOcean von selbst, wenn etwas nicht stimmt, und startet neu.

---

## Schritt 6 — Prüfen, ob es läuft

DigitalOcean gibt Ihnen eine Adresse wie
`studyswiss-abc123.ondigitalocean.app`. Rufen Sie im Browser auf:

```
https://IHRE-ADRESSE/gesundheit
```

Da muss ungefähr das stehen:

```json
{
  "status": "ok",
  "datenbank": "erreichbar",
  "vorlagen": "90",
  "deutschbloecke": "82"
}
```

**Wenn dort etwas anderes steht:**

| Was dort steht | Was los ist |
|---|---|
| `"datenbank": "nicht erreichbar"` | `DB_URL`, Benutzer oder Passwort stimmen nicht |
| `"vorlagen": "0"` | Die Aufgaben wurden nicht mitgepackt — Source Directory prüfen |
| Gar nichts, Seite lädt nicht | Im Reiter **Runtime Logs** nachschauen |

---

## Schritt 7 — Die eigene Adresse

**Settings → Domains → Add Domain**, z. B. `api.ihre-domain.ch`.

DigitalOcean nennt Ihnen einen CNAME-Eintrag, den Sie bei Ihrem
Domain-Anbieter hinterlegen. Das TLS-Zertifikat holt DigitalOcean selbst —
Sie müssen nichts weiter tun.

Diese Adresse tragen Sie danach in der App ein:
`app/frontend/lib/core/net/api.dart`.

---

# Später: die App aktualisieren

Das ist der einfache Teil. **Sie ändern etwas, laden es hoch, fertig.**

```bash
cd "/Users/mokdad/Desktop/komplette app"

# 1. Prüfen, dass alles noch stimmt — dauert etwa zwei Minuten
app/pruefung/pruefen.sh

# 2. Nur hochladen, wenn oben «Alles grün» stand
git add .
git commit -m "Was Sie geändert haben"
git push
```

DigitalOcean merkt den neuen Stand von selbst, baut neu und schaltet um —
**ohne Unterbruch**. Die alte Fassung läuft weiter, bis die neue antwortet.

Im Reiter **Activity** sehen Sie den Fortschritt. Nach zwei bis drei Minuten
prüfen Sie wieder `/gesundheit`.

**Wenn etwas schiefgeht:** Bei der App auf **Activity** → die letzte
funktionierende Fassung auswählen → **Rollback**. Das dauert eine Minute.

---

## Die goldene Regel

> **Erst `pruefen.sh`, dann `git push`.**

Der Prüflauf macht rund 62'000 Kontrollen — er findet in zwei Minuten, was
sonst eine Schülerin am Abend vor der Prüfung findet.

---

## Was Sie NICHT tun müssen

- Kein Server einrichten, kein Linux, kein nginx
- Keine Zertifikate erneuern
- Keine Aufgaben in die Datenbank laden — sie stecken im Programm und werden
  bei jeder Anfrage neu gerechnet

---

## Und die alte Anwendung?

Sie kann während der ganzen Einrichtung weiterlaufen; sie stört nicht. Wenn
die neue App im Laden ist und funktioniert:

1. Letzte Sicherung der alten Datenbank ziehen — kostet nichts.
2. Alte Anwendung abschalten.
3. Alten Ladeneintrag zurückziehen.

Da keine Abos laufen und keine Daten erhalten bleiben müssen, geht das
sofort — Sie müssen nicht warten.
