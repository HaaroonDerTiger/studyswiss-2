/* StudySwiss — der Draht zum Backend
   ==================================================================
   Die Website ist ein zweiter Client desselben `/v1` (§4.10), nicht
   ein zweites Backend. Fortschritt, Fehlerarchiv, Aufsätze und der
   Abo-Status liegen am Konto auf dem Server. Wer am Telefon übt und
   dann den Laptop aufklappt, sieht denselben Stand — ohne dass irgend
   etwas synchronisiert werden müsste.

   Möglich macht das der Determinismus (§2.4): Gespeichert wird nie
   eine Aufgabe, sondern `rabatt-rueckwaerts:8812`. Diese Zeile ergibt
   auf jedem Gerät dieselbe Aufgabe mit denselben Zahlen.

   ------------------------------------------------------------------
   ZUM TOKEN, und warum es hier anders läuft als in der App

   Die App legt den Refresh-Token in `flutter_secure_storage`. Ein
   Browser hat nichts Vergleichbares: `localStorage` liest jedes Skript,
   das auf die Seite gelangt, und ein Token mit 60 Tagen Laufzeit ist
   ein lohnendes Ziel — bei Minderjährigen erst recht (§2.6).

   Darum hier:
   - Der **Access-Token** lebt nur in dieser Variable, nie im Speicher
     des Browsers. Ein neuer Tab holt sich einen neuen.
   - Der **Refresh-Token** kommt als `httpOnly`-Cookie vom Server und
     ist für JavaScript unsichtbar. Kein Skript kann ihn lesen, auch
     unseres nicht.
   - Gegen Cross-Site-Anfragen schützt der Kopf `X-Client: web`: Einen
     eigenen Kopf kann eine fremde Seite nur mit Vorabanfrage senden,
     und die lässt unser CORS nur für die eigene Herkunft zu.

   Dafür muss das Backend beim Web-Client das Cookie setzen, statt den
   Refresh-Token im Rumpf zu schicken. Siehe `AuthService`.            */

const API_BASIS = (() => {
  if (typeof STUDYSWISS_API !== 'undefined' && STUDYSWISS_API) return STUDYSWISS_API;
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:8080/v1';
  return '/v1';
})();

/** Im Demo-Betrieb antwortet `demo.js` statt des Servers. Das ist der
 *  Zustand der Einzeldatei-Vorschau und der Notnagel, wenn kein Server
 *  erreichbar ist. Die Oberfläche sagt es dann auch. */
let DEMO = (typeof STUDYSWISS_DEMO !== 'undefined') ? !!STUDYSWISS_DEMO
         : location.protocol === 'file:';

/* Beide bewusst `let` im Modulraum und nicht in einem Objekt: Die
   Website ist ein einziges Skript, und ein Zustand, den man von
   ausserhalb setzen muss (etwa nach `/auth/gast`), soll aussehen wie
   das, was er ist — eine Variable, kein verstecktes Fach. */
let accessToken = null;
let angemeldet  = null;   // das Profil, sobald bekannt

/** Ein Fehler, den die Oberfläche anzeigen darf. Das Backend liefert
 *  RFC 9457 mit deutschem `detail` — genau das gehört auf den Schirm,
 *  nicht «Error 500». */
class ApiFehler extends Error {
  constructor(status, problem) {
    super((problem && (problem.detail || problem.title)) || 'Da ist etwas schiefgelaufen.');
    this.status = status;
    this.titel = (problem && problem.title) || 'Es hat nicht geklappt';
    this.problem = problem || null;
  }
}

/**
 * Eine Anfrage an `/v1`.
 *
 * Läuft der Access-Token ab, wird **einmal** erneuert und die Anfrage
 * wiederholt. Nur einmal: Sonst dreht sich die Seite im Kreis, wenn
 * auch das Erneuern 401 gibt, und der Nutzer sieht ein hängendes Rad
 * statt der Anmeldemaske.
 */
async function api(pfad, opt = {}) {
  if (DEMO) return demoAntwort(pfad, opt);

  const antwort = await roh(pfad, opt);
  if (antwort.status !== 401 || opt._wiederholt) return auswerten(antwort);

  const erneuert = await erneuere();
  if (!erneuert) { abmeldenLokal(); return auswerten(antwort); }
  return api(pfad, Object.assign({}, opt, { _wiederholt: true }));
}

async function roh(pfad, opt) {
  const kopf = { 'X-Client': 'web' };
  if (opt.body !== undefined) kopf['Content-Type'] = 'application/json';
  if (accessToken) kopf['Authorization'] = 'Bearer ' + accessToken;
  return fetch(API_BASIS + pfad, {
    method: opt.method || (opt.body !== undefined ? 'POST' : 'GET'),
    headers: Object.assign(kopf, opt.headers || {}),
    body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined,
    credentials: 'include',      // das Refresh-Cookie muss mitreisen
  });
}

async function auswerten(antwort) {
  if (antwort.status === 204) return null;
  const text = await antwort.text();
  let daten = null;
  try { daten = text ? JSON.parse(text) : null; } catch (e) { /* kein JSON */ }
  if (!antwort.ok) throw new ApiFehler(antwort.status, daten);
  return daten;
}

/** Holt einen frischen Access-Token. Der Refresh-Token steht im
 *  Cookie und wird darum nicht mitgegeben. */
async function erneuere() {
  try {
    const a = await roh('/auth/refresh', { method: 'POST', body: {} });
    if (!a.ok) return false;
    const s = await a.json();
    accessToken = s.accessToken;
    return true;
  } catch (e) { return false; }
}

function abmeldenLokal() { accessToken = null; angemeldet = null; }

/** Beim Laden einer Seite: Gibt es ein gültiges Cookie, ist man
 *  angemeldet, ohne etwas zu tippen. Gibt es keines, ist das kein
 *  Fehler — dann ist man eben nicht angemeldet. */
async function sitzungAufnehmen() {
  if (DEMO) { angemeldet = await demoAntwort('/profil', {}); }
  else if (!await erneuere()) { angemeldet = null; }
  else { try { angemeldet = await api('/profil'); } catch (e) { angemeldet = null; } }
  uebernimm(angemeldet);
  return angemeldet;
}

/** Das Profil an den Zustand weitergeben, den die Engine liest.
 *
 *  Die Engine entscheidet daraus, welche Bereiche jemand hat und welche
 *  Unterthemen seine Prüfung überhaupt stellt (§3.2). Ohne diesen einen
 *  Schritt zieht `setZiehen` gar nichts, und der Lernbereich bliebe
 *  leer — ohne Fehlermeldung, weil ja nichts kaputt ist. */
function uebernimm(profil) {
  if (typeof Z === 'undefined') return;
  Z.profil = profil || null;
  if (typeof Fortschritt !== 'undefined') Fortschritt.laden();
}

async function abmelden() {
  try { await api('/auth/abmelden', { method: 'POST', body: {} }); } catch (e) {}
  abmeldenLokal();
}

/* --- Schul-Endpunkte -------------------------------------------------
   Eigener Zweig, weil eine Schule kein Schülerkonto ist: Sie meldet
   sich mit einer Bestellnummer und einem Verwaltungsschlüssel an, den
   sie mit der Bestellbestätigung bekommt. Kein Apple, kein Google —
   eine Schulsekretärin hat dafür kein Konto und soll keines brauchen. */
const Schule = {
  preise:        ()      => api('/schule/preise'),
  offerte:       (d)     => api('/schule/offerte', { body: d }),
  offerteHolen:  (nr, s) => api(`/schule/offerte/${encodeURIComponent(nr)}?schluessel=${encodeURIComponent(s)}`),
  bestellen:     (d)     => api('/schule/bestellung', { body: d }),
  rechnung:      (nr, s) => api(`/schule/rechnung/${encodeURIComponent(nr)}?schluessel=${encodeURIComponent(s)}`),
  lizenzen:      (s)     => api(`/schule/lizenzen?schluessel=${encodeURIComponent(s)}`),
  codeAendern:   (s, code, d) => api(
      `/schule/lizenzen/${encodeURIComponent(code)}?schluessel=${encodeURIComponent(s)}`,
      { method: 'PATCH', body: d }),
  bericht:       (s)     => api(`/schule/bericht?schluessel=${encodeURIComponent(s)}`),
  belege:        (s)     => api(`/schule/belege?schluessel=${encodeURIComponent(s)}`),
  /** Der Zahlteil wird auf dem Server erzeugt, nicht hier. Ein QR-Code,
   *  der nicht stimmt, ist schlimmer als keiner — die Bank weist ihn
   *  zurück, und die Schule merkt es erst bei der Mahnung. */
  qrBild:        (nr, s) => `${API_BASIS}/schule/rechnung/${encodeURIComponent(nr)}/zahlteil.svg?schluessel=${encodeURIComponent(s)}`,
};
