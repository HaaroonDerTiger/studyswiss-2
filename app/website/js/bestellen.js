/* StudySwiss — die Bestellstrecke
   ==================================================================
   Angaben → Offerte → Bestellung → Bestätigung → Rechnung.

   Der Zustand steht in der Adresszeile, nicht nur im Speicher: Eine
   Offerte ist ein Link, den die Lehrperson der Schulleitung schickt.
   Was nur im Sitzungsspeicher stünde, wäre nach dem Schliessen des
   Tabs weg — und niemand füllt ein Bestellformular zweimal aus.       */

const SCHRITTE = ['daten', 'offerte', 'bestellung', 'bestaetigung', 'rechnung'];
let vorgang = { };   // die laufende Offerte bzw. Bestellung

/* --- Adresszeile ----------------------------------------------------- */
function param(name, standard = '') {
  return new URLSearchParams(location.search).get(name) || standard;
}
function gehZu(schritt, zusatz = {}) {
  const p = new URLSearchParams(location.search);
  p.set('schritt', schritt);
  Object.entries(zusatz).forEach(([k, v]) => v == null ? p.delete(k) : p.set(k, v));
  history.pushState({ schritt }, '', location.pathname + '?' + p);
  zeigeSchritt(schritt);
}

function zeigeSchritt(schritt) {
  if (!SCHRITTE.includes(schritt)) schritt = 'daten';
  $$('[data-schritt]').forEach(s => { s.hidden = s.dataset.schritt !== schritt; });
  const i = SCHRITTE.indexOf(schritt);
  $$('#schritte .schritt').forEach((s, j) => {
    s.classList.toggle('jetzt',   j === i);
    s.classList.toggle('fertig',  j <  i);
    s.setAttribute('aria-current', j === i ? 'step' : 'false');
  });
  $('#meldung').innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'instant' });
  ({ offerte: zeichneOfferte, bestellung: zeichneBestellung,
     bestaetigung: zeichneBestaetigung, rechnung: zeichneRechnung }[schritt] || (() => {}))();
}

function schuleAus(d) {
  return { name: d.schulname, strasse: d.strasse, plz: d.plz, ort: d.ort,
           kanton: d.kanton, land: 'Schweiz' };
}
function kontaktAus(d) {
  return { vorname: d.vorname, nachname: d.nachname, funktion: d.funktion,
           email: d.email, telefon: d.telefon };
}

/* --- 1 · Angaben ------------------------------------------------------ */
async function schrittDaten() {
  const form = $('#formDaten');
  if (!form) return;

  /* Die Kantonsliste kommt aus dem Katalog, nicht aus einer zweiten Liste
     im Quelltext (§9: kein Kanton im Code). */
  const wahl = $('#kantonWahl');
  const kantone = await api('/katalog/kantone').catch(() => []);
  wahl.innerHTML = '<option value="">Bitte wählen</option>' +
    (kantone || []).map(k =>
      `<option value="${sicher(k.id || k.kuerzel || k.name)}">${sicher(k.name)}</option>`).join('');

  const anzahl = $('#anzahlDaten'), start = $('#startDaten');
  anzahl.value = Math.max(1, +param('anzahl', 24) || 24);
  start.value = param('start') || new Date().toISOString().slice(0, 10);

  const nach = () => {
    const r = rechne(+anzahl.value);
    $('#summeDaten').innerHTML = `
      <div><dt>${zahl(r.anzahl)} Lizenzen à ${franken(r.einzelpreis)}</dt>
           <dd class="zahl">${franken(r.netto)}</dd></div>
      ${mwstZeile(r, 'dl')}
      <div class="total"><dt>Total</dt><dd class="zahl">${franken(r.total)}</dd></div>`;
  };
  anzahl.addEventListener('input', nach);
  await preiseLaden(); nach();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!pruefeFormular(form)) return;
    const d = werte(form);
    const knopf = $('button[type=submit]', form);
    knopf.disabled = true; knopf.textContent = 'Wird erstellt …';
    try {
      const o = await Schule.offerte({
        schule: schuleAus(d), kontakt: kontaktAus(d),
        anzahl: +d.anzahl, start: d.start, bemerkung: d.bemerkung,
      });
      vorgang.offerte = o; vorgangMerken();
      gehZu('offerte', { nr: o.nummer, s: o.schluessel });
    } catch (err) {
      fehlerZeigen('#meldung', err);
    } finally {
      knopf.disabled = false; knopf.textContent = 'Offerte erstellen';
    }
  });
}

/* --- 2 · Offerte ------------------------------------------------------ */
async function zeichneOfferte() {
  const o = await offerteHolen();
  if (!o) { gehZu('daten'); return; }
  $('#offerteEinleitung').innerHTML =
    `Gültig bis zum <b class="stark">${sicher(datum(o.gueltigBis))}</b>.
     Drucken Sie sie aus oder schicken Sie den Link weiter — die Offerte
     ist unter derselben Adresse jederzeit wieder da.`;
  $('#offertePapier').innerHTML = offertePapier(o);

  $('#offerteLink').onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      $('#offerteLink').innerHTML = icon('haken', 16) + ' Link kopiert';
    } catch (e) {
      prompt('Diesen Link weitergeben:', location.href);
    }
  };
  $('#zurBestellung').onclick = () => gehZu('bestellung');
}

async function offerteHolen() {
  if (vorgang.offerte) return vorgang.offerte;
  const nr = param('nr'), s = param('s');
  if (!nr) return null;
  try { vorgang.offerte = await Schule.offerteHolen(nr, s); vorgangMerken(); }
  catch (e) { fehlerZeigen('#meldung', e); }
  return vorgang.offerte;
}

/* --- 3 · Bestellung --------------------------------------------------- */
async function zeichneBestellung() {
  const o = await offerteHolen();
  const form = $('#formBestellung');
  if (!form) return;

  /* Ohne Offerte darf man trotzdem bestellen — dann kommen die Angaben
     aus der Adresszeile. Sonst müsste jemand, der vom Rechner direkt
     bestellen will, den Umweg über ein Papier machen, das er nicht braucht. */
  const anzahl = o ? o.anzahl : Math.max(1, +param('anzahl', 24) || 24);
  const start  = o ? o.start  : (param('start') || new Date().toISOString().slice(0, 10));
  const r = rechne(anzahl);

  $('#bestellUebersicht').innerHTML = `
    <table class="t">
      <tbody>
        <tr><td>Schullizenzen</td><td class="rechts stark">${zahl(r.anzahl)}</td></tr>
        <tr><td>Preis je Lizenz (Stufe «${sicher(r.stufe.name)}»)</td>
            <td class="rechts stark zahl">${franken(r.einzelpreis)}</td></tr>
        <tr><td>Laufzeit</td><td class="rechts stark">${sicher(datum(start, true))} –
            ${sicher(datum(schuljahrEnde(start), true))}</td></tr>
        ${mwstZeile(r, 'tr2')}
      </tbody>
      <tfoot><tr class="total"><td>Total</td>
        <td class="rechts zahl">${franken(r.total)}</td></tr></tfoot>
    </table>`;

  const haken = $('#gleicheAdresse'), block = $('#abweichend');
  const um = () => { block.hidden = haken.checked;
                     $$('input', block).forEach(i => i.required = !haken.checked); };
  haken.onchange = um; um();

  const zurueck = $('#zurueckOfferte');
  zurueck.hidden = !o;
  zurueck.onclick = e => { e.preventDefault(); gehZu('offerte'); };

  form.onsubmit = async e => {
    e.preventDefault();
    if (!pruefeFormular(form)) return;
    const d = werte(form);
    const knopf = $('button[type=submit]', form);
    knopf.disabled = true; knopf.textContent = 'Wird bestellt …';
    try {
      const antwort = await Schule.bestellen({
        ausOfferte: o ? o.nummer : null,
        schule:  o ? o.schule  : null,
        kontakt: o ? o.kontakt : null,
        anzahl, start,
        bestellnummer: d.bestellnummer || '',
        versandart: d.versandart, rechnungsEmail: d.reEmail || '',
        rechnungsadresse: haken.checked ? null : {
          name: d.reName, zusatz: d.reZusatz, strasse: d.reStrasse,
          plz: d.rePlz, ort: d.reOrt, land: 'Schweiz' },
      });
      vorgang.bestellung = antwort.bestellung;
      vorgang.rechnung   = antwort.rechnung;
      vorgangMerken();
      gehZu('bestaetigung', { nr: antwort.bestellung.nummer,
                              s: antwort.bestellung.schluessel });
    } catch (err) {
      fehlerZeigen('#meldung', err);
    } finally {
      knopf.disabled = false; knopf.textContent = 'Kostenpflichtig bestellen';
    }
  };
}

/* --- 4 · Bestätigung --------------------------------------------------
   Der Verwaltungsschlüssel ist das Einzige, was die Schule aufbewahren
   muss. Er steht darum gross da, mit einem Knopf zum Kopieren und dem
   Hinweis, dass er auch per E-Mail kommt. Ein Schlüssel, den man nur
   einmal sieht und nirgends wiederfindet, erzeugt einen Anruf. */
function zeichneBestaetigung() {
  const b = vorgang.bestellung, r = vorgang.rechnung;
  if (!b) { gehZu('daten'); return; }
  $('#bestaetigung').innerHTML = `
    <div class="karte">
      <div class="reihe" style="align-items:flex-start">
        <div class="ic gross">${icon('schloss', 24)}</div>
        <div>
          <h3>Ihr Verwaltungsschlüssel</h3>
          <p class="bd14" style="margin-top:6px">Damit verwalten Sie die Lizenzen,
          holen Codes und finden Rechnungen wieder. Bewahren Sie ihn auf — er
          geht zusätzlich an ${sicher((b.kontakt || {}).email || 'Ihre Adresse')}.</p>
        </div>
      </div>
      <div class="reihe" style="margin-top:16px;gap:10px;flex-wrap:wrap">
        <code class="chip" style="font:700 16px 'Bitter',Georgia,serif;height:44px;
              padding:0 16px;letter-spacing:.06em">${sicher(b.schluessel)}</code>
        <button class="btn bs klein" id="schluesselKopieren">Kopieren</button>
      </div>
    </div>

    <div class="raster zwei" style="margin-top:20px">
      <div class="karte">
        <p class="eyebrow">Bestellung</p>
        <h4>${sicher(b.nummer)}</h4>
        <p class="bd14" style="margin-top:8px">
          ${zahl(b.anzahl)} Lizenzen, gültig ab sofort bis
          ${sicher(datum(b.ende))}.</p>
      </div>
      <div class="karte">
        <p class="eyebrow">Rechnung</p>
        <h4>${sicher(r.nummer)}</h4>
        <p class="bd14" style="margin-top:8px">
          ${franken(r.rechnung.total)}, zahlbar bis
          ${sicher(datum(r.faellig))}.</p>
      </div>
    </div>

    <div class="hinweis" style="margin-top:20px">${icon('info', 18)}
      <div>Die Zugänge sind <b>jetzt schon gültig</b>. Sie müssen nicht warten,
      bis die Rechnung bezahlt ist — niemand soll auf die Buchhaltung warten.</div></div>

    <div class="knopfreihe">
      <a class="btn bp" href="verwaltung.html?s=${encodeURIComponent(b.schluessel)}">
        Lizenzen verteilen</a>
      <button class="btn bs" id="zurRechnung">Rechnung ansehen</button>
    </div>`;

  $('#schluesselKopieren').onclick = async () => {
    try { await navigator.clipboard.writeText(b.schluessel);
          $('#schluesselKopieren').textContent = 'Kopiert'; }
    catch (e) { prompt('Verwaltungsschlüssel:', b.schluessel); }
  };
  $('#zurRechnung').onclick = () => gehZu('rechnung',
    { nr: vorgang.rechnung.nummer, s: b.schluessel });
}

/* --- 5 · Rechnung ------------------------------------------------------ */
async function zeichneRechnung() {
  let r = vorgang.rechnung;
  if (!r) {
    const nr = param('nr'), s = param('s');
    if (!nr) { gehZu('daten'); return; }
    try { r = vorgang.rechnung = await Schule.rechnung(nr, s); vorgangMerken(); }
    catch (e) { fehlerZeigen('#meldung', e); return; }
  }
  $('#rechnungPapier').innerHTML = rechnungPapier(r, param('s'));
}

/* --- Zustand zwischen den Schritten ------------------------------------
   Nur für den Komfort; der Wahrheitsgehalt kommt aus der Adresszeile
   und vom Server. `sessionStorage`, nicht `localStorage`: Eine
   Bestellung gehört nicht in den Browser eines Schulzimmer-Rechners,
   wenn der Tab zu ist. */
const VORGANG = 'studyswiss.bestellung';
function vorgangMerken() {
  try { sessionStorage.setItem(VORGANG, JSON.stringify(vorgang)); } catch (e) {}
}
function vorgangHolen() {
  try { vorgang = JSON.parse(sessionStorage.getItem(VORGANG)) || {}; } catch (e) { vorgang = {}; }
}

seiteBereit(async () => {
  if (!$('#schritte')) return;
  vorgangHolen();
  await schrittDaten();
  zeigeSchritt(param('schritt', 'daten'));
  window.addEventListener('popstate', () => zeigeSchritt(param('schritt', 'daten')));
});
