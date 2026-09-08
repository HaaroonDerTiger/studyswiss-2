/* StudySwiss — der Aufgabenlauf
   ==================================================================
   Ein Set holen, Aufgabe für Aufgabe zeichnen, Antwort einsammeln,
   prüfen lassen, Rückmeldung zeigen.

   **Ein Läufer, drei Modi.** Übung, Selbsttest und Standortbestimmung
   zeigen dieselben vierzehn Eingabeflächen und unterscheiden sich in
   genau drei Punkten. Die App hält das ebenso (`laufAnsicht` in der
   Vorschau); drei Kopien wären drei Stellen, an denen ein neues Format
   vergessen wird.

   | | Übung | Selbsttest | Standortbestimmung |
   |---|---|---|---|
   | Rückmeldung | sofort | erst bei der Abgabe | erst am Schluss |
   | Hinweise | ja | nach Katalog | nein |
   | Uhr | nein | ja, hält im Hintergrund an | nein |
   | Zurückblättern | nein, es geht ja weiter | nach Katalog | ja |
   | Themen-Titel | ja | nein | nein |

   Der Themen-Titel fehlt in den Prüfmodi mit Absicht (§6, Screen 14):
   An der Prüfung steht auch nicht daneben, worum es geht.

   **Geprüft wird nie hier.** Die Aufgabe kommt ohne ihre Lösung an
   (§4.10), und ob eine Antwort stimmt, entscheidet der Server. Ohne
   Server antwortet `demo.js` — mit derselben Engine, aber ebenfalls
   ausserhalb dieser Datei. Wer die Lösung im Quelltext des
   Übungsschirms nachlesen könnte, übt nicht mehr ehrlich.

   Die Rückmeldung steht unter der Aufgabe statt als Blatt von unten:
   Das Blatt ist die Geste eines Telefons; am Laptop wandert der Blick
   ohnehin dorthin, wo eben getippt wurde.                             */

let lauf = null;

/** Was in welchem Modus gilt. Steht hier einmal, statt als `if` verstreut. */
const MODI = {
  uebung:     { sofort: true,  uhr: false, titelZeigen: true,  abgabeWeg: null },
  selbsttest: { sofort: false, uhr: true,  titelZeigen: false,
                abgabeWeg: id => `/selbsttest/${id}/abgabe` },
  standort:   { sofort: false, uhr: false, titelZeigen: false,
                abgabeWeg: id => `/standort/${id}/abschluss` },
};

const modus = () => MODI[(lauf && lauf.modus) || 'uebung'];

/* --- Start ------------------------------------------------------------ */

/** Eine Übung zu einem Unterthema. Der übliche Weg. */
async function uebungStarten(fach, unterthema, titel) {
  lernZeige('uebung');
  $('#uebungInhalt').innerHTML = '<p class="bd">Wird vorbereitet …</p>';
  $('#uebungTitel').textContent = titel || '';
  try {
    const s = await api('/uebung/start', { body: { fach, unterthema } });
    if (!s || !(s.aufgaben || []).length) {
      $('#uebungInhalt').innerHTML = `<div class="karte"><p class="bd">
        Für dieses Thema gibt es noch keine Aufgaben.</p></div>`;
      return;
    }
    laufSetzen({ modus: 'uebung', id: s.id, aufgaben: s.aufgaben, titel });
    aufgabeZeichnen();
  } catch (e) { fehlerZeigen('#uebungInhalt', e); }
}

/**
 * Einen Lauf aufsetzen.
 *
 * `zustaende` ist der Grund, warum Zurückblättern überhaupt geht: Jede
 * Aufgabe behält ihren eigenen Eingabezustand. Ohne das stünde man beim
 * Zurückblättern vor einem leeren Feld und müsste die Antwort neu
 * tippen — und genau das ist der Unterschied zum Prüfungsblatt, das
 * vor einem liegt.
 */
function laufSetzen(opt) {
  laufUhrStoppen();
  lauf = {
    modus: opt.modus || 'uebung',
    id: opt.id, aufgaben: opt.aufgaben, titel: opt.titel || '',
    nr: 0, richtig: 0, versuche: 0,
    bedingungen: opt.bedingungen || {},
    zustaende: opt.aufgaben.map(() => Antwort.leer()),
    gesendet: opt.aufgaben.map(() => false),
    rest: opt.dauerMinuten ? opt.dauerMinuten * 60 : null,
    uhrId: null,
  };
  lauf.zustand = lauf.zustaende[0];

  /* Der Abbrechen-Knopf hing bisher an nichts: Er stand da, sah aus wie
     ein Knopf und tat nichts. Wohin er führt, hängt vom Modus ab — aus
     dem Selbsttest zurück zur Selbsttest-Wahl, aus der Übung zur
     Themenliste, aus der ich gekommen bin. */
  const schliessen = $('#uebungSchliessen');
  if (schliessen) {
    schliessen.onclick = () => { laufUhrStoppen(); lernZeige(herkunft()); };
  }

  if (modus().uhr && lauf.rest) laufUhrStarten();
}

/* --- Die Uhr ----------------------------------------------------------
   Sie hält an, wenn das Fenster in den Hintergrund geht — sonst bestraft
   der Selbsttest einen Anruf. Ob sie das tut, sagt der Katalog, nicht
   dieser Screen (§9: keine Prüfungsbedingung im Screen).              */

function laufUhrStarten() {
  lauf.uhrId = setInterval(() => {
    if (!lauf || !modus().uhr) return laufUhrStoppen();
    if (lauf.bedingungen.uhrPausiert !== false
        && typeof document !== 'undefined' && document.hidden) return;
    lauf.rest--;
    uhrZeichnen();
    if (lauf.rest <= 0) { laufUhrStoppen(); laufAbgeben(true); }
  }, 1000);
}

function laufUhrStoppen() {
  if (lauf && lauf.uhrId) clearInterval(lauf.uhrId);
  if (lauf) lauf.uhrId = null;
}

function uhrText(sek) {
  const s = Math.max(0, sek | 0);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function uhrZeichnen() {
  const u = $('#uebungUhr');
  if (!u || lauf.rest == null) return;
  u.textContent = uhrText(lauf.rest);
  /* Die letzten fünf Minuten werden rot. Nicht als Schmuck: Wer den
     Blick auf dem Blatt hat, soll die Zeit am Rand bemerken, ohne
     hinzusehen. */
  u.classList.toggle('knapp', lauf.rest < 300);
}

/* --- Eine Aufgabe zeichnen -------------------------------------------- */

function aufgabeZeichnen() {
  const a = lauf.aufgaben[lauf.nr];
  if (!a) return laufAbgeben();
  const M = modus();
  lauf.zustand = lauf.zustaende[lauf.nr];

  const gesamt = lauf.aufgaben.length;
  $('#uebungStand').innerHTML = `${lauf.nr + 1} von ${gesamt}`
    + (lauf.rest != null
       ? ` <span class="uhr" id="uebungUhr">${uhrText(lauf.rest)}</span>` : '');
  $('#uebungBalken').style.width = Math.round(100 * lauf.nr / gesamt) + '%';
  uhrZeichnen();

  /* Beim Textverständnis stehen Lesetext und Frage nebeneinander, sobald
     Platz da ist. Auf dem Telefon schöbe der Text die Frage aus dem
     Bild — dort bleibt er einklappbar darüber. */
  const text = a.lesetext;
  const hinweise = a.hinweiseVerfuegbar || 0;
  const zeigTipp = M.sofort ? hinweise > 0
                            : (hinweise > 0 && lauf.bedingungen.hinweise === true);

  $('#uebungInhalt').innerHTML = `
    <div class="${text ? 'mit-lesetext' : ''}">
      ${text ? `<div class="lesetext"><h4>Lesetext</h4>${sicher(text)}</div>` : ''}
      <div>
        <div class="aufgabenkopf">
          <p class="eyebrow" style="margin:0">${
            M.titelZeigen ? sicher(a.themaKurz || '') : ''}</p>
          ${zeigTipp ? `<button class="btn bt klein" id="tippKnopf"
            style="padding:0 8px">Tipp</button>` : ''}
        </div>
        <h2 class="aufgabenstamm">${anzeigeText(a.stamm)}</h2>
        <div id="antwortflaeche"></div>
        <div id="hinweise"></div>
        <div class="knopfreihe" id="laufKnoepfe"></div>
        <div id="rueckmeldung"></div>
      </div>
    </div>`;

  const flaeche = $('#antwortflaeche');
  const gemeldet = () => knoepfeZeichnen(a);
  /* Beim Tippen in ein Textfeld wird die Fläche NICHT neu gezeichnet —
     der Schreibpunkt spränge an den Anfang. Gemeldet wird trotzdem. */
  window._antwortMeldung = gemeldet;
  Antwort.zeichne(flaeche, a, lauf.zustand, gemeldet);
  knoepfeZeichnen(a);

  if (zeigTipp) hinweisKnopf(a);
}

/** Die Knöpfe unter der Aufgabe. Sie unterscheiden die Modi mehr als
 *  alles andere: In der Übung steht «Prüfen», in den Prüfmodi «Weiter»
 *  — und daneben «Zurück», wo die Prüfung das Blättern erlaubt. */
function knoepfeZeichnen(a) {
  const M = modus();
  const wo = $('#laufKnoepfe');
  if (!wo) return;
  const letzte = lauf.nr + 1 >= lauf.aufgaben.length;

  if (M.sofort) {
    wo.innerHTML = '<button class="btn bp" id="pruefen">Prüfen</button>';
    $('#pruefen').disabled = !Antwort.abgebbar(a, lauf.zustand);
    $('#pruefen').onclick = () => antwortPruefen(a);
    return;
  }

  /* In der Prüfung zählt die Aufgabe als Ganzes (§4.5, `streng`). Wer
     nichts eingetippt hat, darf trotzdem weiter — eine Aufgabe
     auszulassen ist an der Prüfung erlaubt und zählt als falsch. */
  const zurueck = lauf.bedingungen.zurueckblaettern !== false && lauf.nr > 0;
  wo.innerHTML = `
    ${zurueck ? '<button class="btn bs" id="laufZurueck">Zurück</button>' : ''}
    <button class="btn bp" id="laufWeiter">${letzte ? 'Abgeben' : 'Weiter'}</button>`;
  if (zurueck) $('#laufZurueck').onclick = () => laufSchritt(-1);
  $('#laufWeiter').onclick = () => letzte ? laufAbgeben() : laufSchritt(1);
}

function hinweisKnopf(a) {
  const tipp = $('#tippKnopf');
  if (!tipp) return;
  let stufe = 0;
  tipp.onclick = async () => {
    stufe++;
    const h = await api(`/uebung/${lauf.id}/hinweis`,
                        { body: { aufgabeRef: a.ref, stufe } }).catch(() => null);
    if (h && h.text) {
      $('#hinweise').insertAdjacentHTML('beforeend',
        `<div class="hinweis" style="margin-top:14px">${icon('info', 18)}
         <div>${sicher(h.text)}</div></div>`);
    }
    /* Ob noch einer kommt, sagt der Server — nicht eine Zählung hier.
       Der letzte Hinweis ist nicht immer der letzte der Vorlage. */
    if (!h || h.weitere === false) tipp.disabled = true;
  };
}

/* --- Übung: sofort prüfen --------------------------------------------- */

async function antwortPruefen(a) {
  const knopf = $('#pruefen');
  knopf.disabled = true;
  lauf.versuche++;
  try {
    const r = await api(`/uebung/${lauf.id}/antwort`, {
      body: Object.assign({ aufgabeRef: a.ref }, Antwort.antwort(a, lauf.zustand)),
    });
    rueckmeldungZeichnen(a, r);
  } catch (e) {
    fehlerZeigen('#rueckmeldung', e);
    knopf.disabled = false;
  }
}

function rueckmeldungZeichnen(a, r) {
  if (r.richtig) lauf.richtig++;
  const weg = (r.loesungsweg || []).filter(Boolean);
  $('#laufKnoepfe').innerHTML = '';
  $('#rueckmeldung').innerHTML = `
    <div class="rueckmeldung ${r.richtig ? 'richtig' : 'falsch'}">
      <h3>${r.richtig ? 'Richtig' : 'Danebengelegen'}</h3>
      <p>${sicher(r.feedback || '')}</p>
      ${!r.richtig && r.loesung
        ? `<p><b>Richtig ist:</b> ${anzeigeText(r.loesung)}</p>` : ''}
      ${!r.richtig && weg.length ? `<div class="weg">
        <b>So kommst du hin:</b><ol>${weg.map(s =>
          `<li>${anzeigeText(s)}</li>`).join('')}</ol></div>` : ''}
      <div class="knopfreihe">
        ${!r.richtig ? '<button class="btn bs" id="nochmal">Nochmal versuchen</button>' : ''}
        <button class="btn bp" id="weiter">${
          lauf.nr + 1 < lauf.aufgaben.length ? 'Weiter' : 'Ergebnis'}</button>
      </div>
    </div>`;
  const n = $('#nochmal');
  if (n) n.onclick = () => {
    /* Nochmal heisst: dieselbe Aufgabe, leeres Feld. Den alten Zustand
       stehen zu lassen hiesse, dass man dieselbe falsche Antwort noch
       einmal abschickt, ohne sie anzufassen. */
    lauf.zustaende[lauf.nr] = Antwort.leer();
    aufgabeZeichnen();
  };
  $('#weiter').onclick = () => laufSchritt(1);
  $('#weiter').focus();
}

/* --- Prüfmodi: blättern und abgeben ----------------------------------- */

/** Einen Schritt vor oder zurück. Vorher wird die Antwort gemeldet —
 *  gerechnet wird damit nichts, sie liegt nur beim Server, damit ein
 *  geschlossener Deckel den Lauf nicht wegwirft. */
async function laufSchritt(richtung) {
  await antwortMelden();
  const neu = lauf.nr + richtung;
  if (neu < 0) return;
  if (neu >= lauf.aufgaben.length) return laufAbgeben();
  lauf.nr = neu;
  aufgabeZeichnen();
}

async function antwortMelden() {
  const M = modus();
  if (M.sofort) return;
  const a = lauf.aufgaben[lauf.nr];
  const z = lauf.zustaende[lauf.nr];
  if (!a || !Antwort.abgebbar(a, z)) return;
  const weg = lauf.modus === 'selbsttest'
    ? `/selbsttest/${lauf.id}/antwort` : `/standort/${lauf.id}/antwort`;
  await api(weg, { body: Object.assign({ aufgabeRef: a.ref }, Antwort.antwort(a, z)) })
    .catch(() => null);
  lauf.gesendet[lauf.nr] = true;
}

/**
 * Abgeben.
 *
 * In der Übung ist das nur das Ergebnis; in den Prüfmodi wird hier
 * überhaupt erst bewertet — alles auf einmal, mit der Antwort, die am
 * Schluss dasteht. Bewertete man zwischendurch, zählte eine geänderte
 * Antwort zweimal (§6, Screen 21).
 */
async function laufAbgeben(zeitAbgelaufen) {
  const M = modus();
  laufUhrStoppen();

  if (M.sofort) return ergebnisZeichnen();

  await antwortMelden();
  $('#uebungInhalt').innerHTML = '<p class="bd">Wird ausgewertet …</p>';
  $('#uebungStand').textContent = '';
  $('#uebungBalken').style.width = '100%';

  const e = await api(M.abgabeWeg(lauf.id), { body: {} })
    .catch(err => { fehlerZeigen('#uebungInhalt', err); return null; });
  if (!e) return;

  if (lauf.modus === 'selbsttest') selbsttestErgebnisZeichnen(e, zeitAbgelaufen);
  else startpunktZeichnen(e);
}

/* --- Ergebnis der Übung ----------------------------------------------- */

async function ergebnisZeichnen() {
  const gesamt = lauf.aufgaben.length;
  $('#uebungBalken').style.width = '100%';
  $('#uebungStand').textContent = '';
  await api(`/uebung/${lauf.id}/abschluss`, { body: {} }).catch(() => null);

  /* Die verpassten Themen, nicht die verpassten Aufgaben: Was jemand
     wieder anschauen soll, ist ein Thema. */
  const offen = [...new Set(lauf.aufgaben.slice(0, lauf.nr)
    .map(a => a.thema || a.oberthema).filter(Boolean))];

  $('#uebungInhalt').innerHTML = `
    <div class="karte" style="text-align:center;padding:40px 24px">
      <div class="num zahl">${zahl(lauf.richtig)} von ${zahl(gesamt)}</div>
      <p class="bd" style="margin-top:6px">richtig</p>
      ${offen.length ? `<p class="sm" style="margin-top:16px">Geübt:
        ${offen.map(t => sicher(t)).join(' · ')}</p>` : ''}
      <div class="knopfreihe" style="justify-content:center;margin-top:26px">
        <button class="btn bp" id="nochEins">Weiterüben</button>
        <button class="btn bs" id="fertig">Fertig</button>
      </div>
    </div>`;
  $('#fertig').onclick = () => lernZeige('uebersicht');
  $('#nochEins').onclick = () => {
    const a = lauf.aufgaben[0];
    uebungStarten(a && a.fach, a && a.unterthema, $('#uebungTitel').textContent);
  };
}
