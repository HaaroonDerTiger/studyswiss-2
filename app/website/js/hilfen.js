/* StudySwiss — kleine Helfer
   ==================================================================
   Nur Dinge, die mehr als eine Seite braucht. Wer etwas nur einmal
   benutzt, schreibt es dort hin, wo es gebraucht wird.               */

/** Franken in Schweizer Schreibweise: Fr. 24'000.–, Fr. 12.50.
 *  Ganze Beträge enden auf «.–», nicht auf «.00» — so steht es in
 *  §2.1 und so sieht es jede Rechnung im Land. */
function franken(betrag, mitZeichen = true) {
  const neg = betrag < 0;
  const rp = Math.round(Math.abs(betrag) * 100);
  const gz = Math.floor(rp / 100), rest = rp % 100;
  const mitApostroph = String(gz).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const schwanz = rest === 0 ? '.–' : '.' + String(rest).padStart(2, '0');
  return (neg ? '−' : '') + (mitZeichen ? 'Fr. ' : '') + mitApostroph + schwanz;
}

/** Eine Zahl mit Tausender-Apostroph, ohne Währung: 7'537 */
function zahl(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

/** Datum als 3. September 2026 — ausgeschrieben, weil eine Offerte
 *  kein Formular ist. `kurz` gibt 03.09.2026 für Tabellen. */
const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli',
                'August','September','Oktober','November','Dezember'];
function datum(d, kurz = false) {
  const t = (d instanceof Date) ? d : new Date(d);
  if (isNaN(t)) return '';
  if (kurz) return String(t.getDate()).padStart(2,'0') + '.' +
                   String(t.getMonth()+1).padStart(2,'0') + '.' + t.getFullYear();
  return t.getDate() + '. ' + MONATE[t.getMonth()] + ' ' + t.getFullYear();
}

/** Tage auf ein Datum rechnen, ohne das übergebene zu verändern. */
function plusTage(d, tage) {
  const t = new Date(d instanceof Date ? d.getTime() : Date.parse(d));
  t.setDate(t.getDate() + tage);
  return t;
}

/** Das Ende des laufenden Schuljahrs: der 31. Juli. Wer im Mai kauft,
 *  bekommt zwei Monate — darum läuft eine Lizenz, die nach dem
 *  1. Februar beginnt, bis zum 31. Juli des Folgejahres. */
function schuljahrEnde(start) {
  const d = start instanceof Date ? start : new Date(start);
  const jahr = (d.getMonth() >= 1) ? d.getFullYear() + (d.getMonth() >= 7 ? 1 : 0)
                                   : d.getFullYear();
  const ende = new Date(jahr, 6, 31);
  return (ende - d) / 86400000 < 150 ? new Date(jahr + 1, 6, 31) : ende;
}


/* --- Wann eine Seite bereit ist --------------------------------------
   Die echte Website lädt je Seite neu, die Einzeldatei-Vorschau tauscht
   den Inhalt aus. `DOMContentLoaded` gibt es dort nur einmal — wer sich
   nur darauf verlässt, hat nach dem ersten Klick eine tote Seite.
   Darum registrieren alle Seitenskripte hier, und der Rahmen ruft es
   bei beidem auf. */
const _bereitHandler = [];
function seiteBereit(fn) {
  _bereitHandler.push(fn);
  if (document.readyState !== 'loading') queueMicrotask(() => fn());
  else document.addEventListener('DOMContentLoaded', () => fn(), { once: true });
}
/** Ruft die Einzeldatei-Vorschau nach jedem Seitenwechsel auf. */
function seiteNeuAufbauen() { _bereitHandler.forEach(fn => { try { fn(); } catch (e) {} }); }

/* --- DOM ------------------------------------------------------------ */
const $  = (w, wo = document) => wo.querySelector(w);
const $$ = (w, wo = document) => Array.from(wo.querySelectorAll(w));

/** Text, der aus Daten kommt, wird maskiert. Auf einer Website steht in
 *  einem Feld irgendwann `<script>` — spätestens dann, wenn jemand es
 *  darauf anlegt. */
/* Die MWST-Zeile auf Rechner, Offerte, Bestellung und Rechnung.
   ==================================================================
   Sie steht an vier Stellen und darf darum nur an EINER entschieden
   werden — §5.7: «Vier eigene Rechnungen liefen frueher oder spaeter
   auseinander.»

   Bei einem Satz von 0 faellt die Zeile ganz weg. Eine Zeile
   «Mehrwertsteuer 0 % — Fr. 0.–» sieht aus wie ein Rechenfehler, und
   auf einer Rechnung ohne Steuerpflicht hat ein ausgewiesener
   Steuerbetrag ohnehin nichts verloren. Der Satz kommt vom Server
   (`GET /v1/schule/preise`), nicht aus dieser Datei.                  */
function mwstZeile(r, form) {
  if (!r.mwstSatz) return '';
  const satz = String(r.mwstSatz).replace('.', ',');
  const betrag = franken(r.mwst);
  if (form === 'dl') {
    return `<div><dt>Mehrwertsteuer ${satz} %</dt>` +
           `<dd class="zahl">${betrag}</dd></div>`;
  }
  if (form === 'tr2') {
    return `<tr><td>Mehrwertsteuer ${satz} %</td>` +
           `<td class="rechts stark zahl">${betrag}</td></tr>`;
  }
  return `<tr><td colspan="3" class="r">Mehrwertsteuer ${satz} %</td>` +
         `<td class="r">${betrag}</td></tr>`;
}

function sicher(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

/** Ein Element bauen. `html` wird NICHT maskiert — wer Daten einsetzt,
 *  nimmt `sicher()`. */
function el(tag, klasse, html) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (html != null) e.innerHTML = html;
  return e;
}

/* --- Formulare ------------------------------------------------------- */
function werte(form) {
  const d = {};
  new FormData(form).forEach((v, k) => { d[k] = typeof v === 'string' ? v.trim() : v; });
  return d;
}

/** Prüft die Pflichtfelder und schreibt die Meldung unter das Feld,
 *  nicht in einen Kasten oben: Wer zehn Felder ausgefüllt hat, soll
 *  nicht suchen müssen, welches gemeint ist. */
function pruefeFormular(form) {
  let erstes = null;
  $$('.fehler', form).forEach(f => f.remove());
  $$('[required]', form).forEach(feld => {
    const leer = feld.type === 'checkbox' ? !feld.checked : !feld.value.trim();
    const musterFalsch = !leer && feld.pattern &&
                         !new RegExp('^(?:' + feld.pattern + ')$').test(feld.value.trim());
    const mailFalsch = !leer && feld.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(feld.value);
    if (!leer && !musterFalsch && !mailFalsch) { feld.removeAttribute('aria-invalid'); return; }
    feld.setAttribute('aria-invalid', 'true');
    const text = leer ? 'Bitte ausfüllen.'
               : mailFalsch ? 'Diese E-Mail-Adresse sieht nicht vollständig aus.'
               : 'Bitte im erwarteten Format eingeben.';
    const hinweis = el('span', 'fehler', text);
    (feld.closest('.feld') || feld.closest('.haken') || feld).appendChild(hinweis);
    if (!erstes) erstes = feld;
  });
  if (erstes) { erstes.focus(); erstes.scrollIntoView({ behavior:'smooth', block:'center' }); }
  return !erstes;
}

/** Eine Datei zum Sichern anbieten. Gibt `false` zurück, wenn der
 *  Browser sie nicht annimmt — dann muss der Aufrufer einen anderen Weg
 *  anbieten, statt den Knopf stumm ins Leere laufen zu lassen. */
async function datenSichern(name, text, art) {
  try {
    const blob = new Blob([text], { type: art });
    const adresse = URL.createObjectURL(blob);
    const a = el('a');
    a.href = adresse; a.download = name; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(adresse); a.remove(); }, 2000);
    return true;
  } catch (e) { return false; }
}

/* --- Icons ----------------------------------------------------------
   Lucide, Strichstärke 1.8, runde Enden — dieselbe Familie wie in der
   App. Nur die paar, die die Website wirklich braucht. */
const ICON = {
  haken:  'M20 6L9 17l-5-5',
  pfeil:  'M5 12h14M13 6l6 6-6 6',
  zurueck:'M19 12H5M11 18l-6-6 6-6',
  schule: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5',
  buch:   'M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z',
  pfad:   'M12 2v20M2 12h20',
  test:   'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  chart:  'M3 3v18h18M7 16v-5M12 16V8M17 16v-3',
  zahn:   'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6h.09A1.65 1.65 0 0010 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9v.09a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  leute:  'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  beleg:  'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  info:   'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  warn:   'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  druck:  'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z',
  laden:  'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  schloss:'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  uhr:    'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
};
function icon(name, groesse = 20, farbe = 'currentColor') {
  const d = ICON[name] || ICON.info;
  return `<svg width="${groesse}" height="${groesse}" viewBox="0 0 24 24" fill="none"
    stroke="${farbe}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="${d}"/></svg>`;
}
