# Das Backend auf DigitalOcean

Zwei Wege. **App Platform** ist der einfachere und für den Anfang der
richtige; ein **Droplet** gibt mehr Kontrolle und kostet weniger, sobald
mehrere hundert Leute üben.

> **Region: Frankfurt (`fra1`).** DigitalOcean hat keine Region in der
> Schweiz. Frankfurt erfüllt, was die Datenschutzerklärung zusagt
> («Schweiz oder EU») — Amsterdam (`ams3`) ebenfalls. Schreiben Sie nirgends
> «Server in der Schweiz», solange das nicht stimmt.

---

## Weg 1: App Platform

DigitalOcean baut aus dem `Dockerfile`, betreibt den Container, erneuert das
TLS-Zertifikat und startet neu, wenn der Gesundheitsprüfpunkt nicht antwortet.

**1. Datenbank anlegen**

Managed Databases → PostgreSQL 16 → Frankfurt. Die kleinste Grösse genügt
für den Anfang. DigitalOcean nennt Ihnen danach `host`, `port`, `database`,
`user`, `password`.

**2. App anlegen**

App Platform → Create App → Ihr Git-Repository → Verzeichnis `app/backend`.
DigitalOcean erkennt das `Dockerfile` von selbst.

**3. Umgebungsvariablen setzen**

Alles, was ein Geheimnis ist, als **encrypted** markieren.

| Name | Wert | Geheim |
|---|---|---|
| `STUDYSWISS_UMGEBUNG` | `produktion` | nein |
| `DB_URL` | `jdbc:postgresql://HOST:PORT/DATENBANK?sslmode=require` | nein |
| `DB_BENUTZER` | aus der Datenbank | nein |
| `DB_PASSWORT` | aus der Datenbank | **ja** |
| `JWT_GEHEIMNIS` | `openssl rand -base64 48` | **ja** |
| `JWT_ISSUER` | `studyswiss` | nein |
| `JWT_AUDIENCE` | `studyswiss-app` | nein |
| `APPLE_BUNDLE_ID` | Ihre Bundle ID | nein |
| `ANDROID_PAKET` | Ihre applicationId | nein |
| `GOOGLE_CLIENT_ID` | Web-Client-ID aus der Google Cloud Console | nein |
| `APPLE_SERVER_TOKEN` | App Store Server API Key | **ja** |
| `GOOGLE_SERVER_TOKEN` | Play Developer Service Account | **ja** |
| `ANTHROPIC_API_KEY` | nur für die Aufsatzkorrektur | **ja** |
| `STUDYSWISS_VERSION` | z. B. `2.0.0` | nein |

> **`STUDYSWISS_UMGEBUNG=produktion` ist der wichtigste Eintrag.** Ohne ihn
> läuft der Server im Entwicklungsmodus: H2 im Speicher, Demo-Daten, und das
> voreingestellte JWT-Geheimnis, das im Quellcode steht.

**4. Gesundheitsprüfpunkt eintragen**

Settings → Health Check → HTTP, Pfad `/gesundheit`.

Er prüft nicht nur, ob der Prozess läuft, sondern ob die Datenbank
erreichbar ist und die Aufgaben geladen sind. Fehlt eines, antwortet er mit
503 und DigitalOcean nimmt die Instanz aus dem Verkehr.

**5. Prüfen**

```bash
curl -s https://IHRE-DOMAIN/gesundheit | jq
```

Sie sollten sehen: `"status": "ok"`, `"datenbank": "erreichbar"`,
`"vorlagen": "90"`, `"deutschbloecke": "82"`. Steht dort weniger, wurden die
Aufgaben nicht mitgepackt.

---

## Weg 2: Droplet

```bash
# Auf dem Droplet, einmalig
apt update && apt install -y docker.io docker-compose-plugin
git clone IHR-REPO && cd IHR-REPO/app
cp start/umgebung.beispiel .env && nano .env     # Werte eintragen
docker compose up -d
```

`docker-compose.yml` liegt daneben und bringt PostgreSQL und Caddy mit.
Caddy holt das TLS-Zertifikat von Let's Encrypt selbst — Sie tragen nur Ihre
Domain ein.

**Danach nicht vergessen:**

- Firewall: nur 80, 443 und SSH offen (`ufw allow 80,443,22/tcp`)
- Tägliche Sicherung der Datenbank, und **einmal zurückspielen**, um zu
  sehen, dass sie taugt. Eine ungeprüfte Sicherung ist keine.
- Automatische Sicherheitsaktualisierungen (`unattended-upgrades`)

---

## Die alte App ablösen

**Ihr Fall ist der einfache:** Die alte App ist nicht wichtig, und es laufen
keine Abos. Damit entfallen die beiden Dinge, die sonst am meisten Sorgfalt
brauchen — die Datenmigration und die Übergabe laufender Abonnements.

Es bleibt:

1. **Das neue Backend aufsetzen**, wie oben beschrieben. Die alte Anwendung
   darf dabei ruhig weiterlaufen; sie stört nicht.
2. **Prüfen**, dass `/gesundheit` sauber antwortet.
3. **Die App veröffentlichen** — siehe unten, welchen Weg Sie wählen.
4. **Die alte Anwendung abschalten** und den alten Ladeneintrag zurückziehen.
   Ohne laufende Abos und ohne Daten, die jemand vermisst, geht das sofort.
   Ziehen Sie trotzdem eine letzte Sicherung, bevor Sie löschen — die kostet
   nichts und Sie brauchen sie genau dann, wenn Sie sie nicht haben.

### Neuer Ladeneintrag oder Aktualisierung?

Beides geht. Der Unterschied:

| | Neuer Eintrag | Aktualisierung des bestehenden |
|---|---|---|
| Signaturschlüssel der alten App nötig | nein | **ja, zwingend** |
| Bewertungen und Downloads | fangen bei null an | bleiben |
| Bestehende Installationen | bekommen nichts | bekommen das Update |
| Aufwand | gering | Archäologie in alten Konten |

**Ohne wichtige Altlasten ist der neue Eintrag der einfachere Weg.** Er
erspart Ihnen die Suche nach dem alten Android-Signaturschlüssel — und wenn
der verloren ist, gibt es ohnehin keine Wahl.

Nehmen Sie den bestehenden Eintrag nur dann, wenn dort schon nennenswert
viele Bewertungen oder Installationen stehen, die Sie behalten wollen.

**In beiden Fällen: Ziehen Sie den alten Eintrag zurück, sobald der neue
draussen ist.** Zwei ähnliche Apps derselben Herausgeberin verwirren, und
Apple beanstandet das gelegentlich als doppelte Einreichung.

## Was das kostet

Ungefähr, Stand 2026:

| | monatlich |
|---|---|
| App Platform, Basic | ~ 12 USD |
| Managed PostgreSQL, kleinste | ~ 15 USD |
| **oder** Droplet 2 GB + eigene DB | ~ 12 USD |
| Sicherungen | ~ 20 % des Droplets |

Für die ersten paar hundert Nutzer reicht das. Die Aufgaben werden bei jeder
Anfrage neu gerechnet statt gespeichert — das kostet fast nichts an Speicher
und wenig an Rechenzeit.
