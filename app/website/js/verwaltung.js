/* StudySwiss — Schulverwaltung
   ==================================================================
   Codes verteilen, Bericht lesen, Rechnungen wiederfinden.

   Der Verwaltungsschlüssel steht in der Adresszeile (`?s=…`), damit die
   Schule ein Lesezeichen setzen kann, und zusätzlich im
   `sessionStorage`, damit ein Klick im Menü ihn nicht verliert. Nicht
   in `localStorage`: Ein Schulzimmer-Rechner wird von vielen benutzt,
   und ein Schlüssel, der dort liegen bleibt, gehört bald allen.       */

let schluessel = null;
let daten = { codes: [], schule: null };

function schluesselAus() {
  const p = new URLSearchParams(location.search).get('s');
  if (p) return p;
  try { return sessionStorage.getItem('studyswiss.schulschluessel'); } catch (e) { return null; }
}
function schluesselMerken(s) {
  schluessel = s;
  try { sessionStorage.setItem('studyswiss.schulschluessel', s); } catch (e) {}
}

async function verwaltungStarten() {
  if (!$('#formSchluessel')) return;
  await preiseLaden();

  $('#formSchluessel').onsubmit = async e => {
    e.preventDefault();
    const s = $('input[name=schluessel]', e.target).value.trim();
    if (!s) return;
    schluesselMerken(s);
    await oeffnen();
  };
  $('#abmeldenKnopf').onclick = () => {
    try { sessionStorage.removeItem('studyswiss.schulschluessel'); } catch (e) {}
    schluessel = null;
    history.replaceState({}, '', location.pathname);
    umschalten(false);
  };

  unternavVerdrahten();

  const s = schluesselAus();
  if (s) { schluesselMerken(s); await oeffnen(); }
  else umschalten(false);
}

function umschalten(offen) {
  $('#anmeldung').hidden = offen;
  $('#verwaltung').hidden = !offen;
}

async function oeffnen() {
  try {
    const l = await Schule.lizenzen(schluessel);
    if (!l || !l.codes) throw new ApiFehler(404, {
      title: 'Kein Zugang', detail: 'Zu diesem Schlüssel finden wir keine Lizenzen. '
        + 'Bitte prüfen Sie die Schreibweise.' });
    daten = l;
    umschalten(true);
    zeichneKopf(); zeichneCodes(); zeichneAufstocken();
  } catch (e) {
    umschalten(false);
    fehlerZeigen('#meldungAnmeldung', e);
  }
}

/* --- Kopfzahlen ------------------------------------------------------- */
function zeichneKopf() {
  const c = daten.codes || [];
  const ein = c.filter(x => x.eingeloest).length;
  $('#schulname').textContent = (daten.schule && daten.schule.name) || 'Ihre Schule';
  $('#zLizenzen').textContent   = zahl(c.length);
  $('#zEingeloest').textContent = zahl(ein);
  $('#zFrei').textContent       = zahl(c.length - ein);
  $('#zEnde').textContent       = daten.ende ? datum(daten.ende) : '–';
  $('#laufzeitZeile').textContent = daten.start
    ? `Lizenz vom ${datum(daten.start)} bis ${datum(daten.ende)}` : '';
}

/* --- Die Unterseiten -------------------------------------------------- */
function unternavVerdrahten() {
  const nav = $('#unternav');
  if (!nav) return;
  nav.addEventListener('click', e => {
    const a = e.target.closest('a[data-teil]');
    if (!a) return;
    e.preventDefault();
    zeigeTeil(a.dataset.teil);
  });
  zeigeTeil((location.hash || '#codes').slice(1));
}
function zeigeTeil(teil) {
  const gueltig = ['codes', 'bericht', 'belege', 'aufstocken'];
  if (!gueltig.includes(teil)) teil = 'codes';
  $$('[data-teil]').forEach(x => {
    if (x.tagName === 'A') x.setAttribute('aria-current', x.dataset.teil === teil ? 'page' : 'false');
    else x.hidden = x.dataset.teil !== teil;
  });
  if (teil === 'bericht') zeichneBericht();
  if (teil === 'belege')  zeichneBelege();
}

/* --- Codes ------------------------------------------------------------ */
function gefilterteCodes() {
  const suche = ($('#codeSuche').value || '').trim().toUpperCase();
  const filter = $('#codeFilter').value;
  return (daten.codes || []).filter(c => {
    if (filter === 'frei' && c.eingeloest) return false;
    if (filter === 'eingeloest' && !c.eingeloest) return false;
    if (!suche) return true;
    return (c.code + ' ' + (c.klasse || '')).toUpperCase().includes(suche);
  });
}

function zeichneCodes() {
  const koerper = $('#codeTabelle tbody');
  const liste = gefilterteCodes();
  koerper.innerHTML = liste.map(c => `
    <tr>
      <td class="stark" style="font-family:'Bitter',Georgia,serif;letter-spacing:.04em">
        ${sicher(c.code)}</td>
      <td><input class="klassenfeld" data-code="${sicher(c.code)}"
                 value="${sicher(c.klasse || '')}" placeholder="—"
                 aria-label="Klasse für ${sicher(c.code)}"
                 style="height:34px;border:1px solid var(--line);border-radius:8px;
                        padding:0 8px;width:110px;font:400 13px 'Nunito Sans';
                        background:var(--paper)"></td>
      <td>${c.eingeloest
            ? '<span class="chip gruen">eingelöst</span>'
            : '<span class="chip">frei</span>'}</td>
      <td class="rechts">
        <button class="btn bt klein sperren" data-code="${sicher(c.code)}"
                style="height:32px">${c.gesperrt ? 'Entsperren' : 'Sperren'}</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="4" class="sm">Keine Codes gefunden.</td></tr>';

  $('#codeFuss').textContent =
    `${zahl(liste.length)} von ${zahl((daten.codes || []).length)} Codes angezeigt.`;

  /* Die Klasse ist eine Notiz der Schule für sich selbst. Sie liegt beim
     Code, nicht beim Kind — wir wissen nicht, wer welchen Code hat, und
     das soll so bleiben. */
  $$('.klassenfeld', koerper).forEach(f => {
    f.addEventListener('change', async () => {
      const c = (daten.codes || []).find(x => x.code === f.dataset.code);
      if (!c) return;
      const alt = c.klasse || '';
      c.klasse = f.value.trim();
      /* Erst anzeigen, dann sichern — und bei einem Fehler zurücknehmen.
         Eine Notiz, die nur so lange bleibt, bis jemand die Seite neu
         lädt, ist schlimmer als gar keine: Sie sieht aus, als wäre sie
         gespeichert. */
      try { await Schule.codeAendern(schluessel, c.code, { klasse: c.klasse }); }
      catch (e) { c.klasse = alt; f.value = alt; fehlerZeigen('#meldung', e); }
    });
  });
  $$('.sperren', koerper).forEach(b => {
    b.addEventListener('click', async () => {
      const c = (daten.codes || []).find(x => x.code === b.dataset.code);
      if (!c) return;
      const neu = !c.gesperrt;
      b.disabled = true;
      try {
        await Schule.codeAendern(schluessel, c.code, { gesperrt: neu });
        c.gesperrt = neu;
      } catch (e) { fehlerZeigen('#meldung', e); }
      finally { b.disabled = false; zeichneCodes(); }
    });
  });
}

function codesVerdrahten() {
  const s = $('#codeSuche'), f = $('#codeFilter');
  if (s) s.addEventListener('input', zeichneCodes);
  if (f) f.addEventListener('change', zeichneCodes);

  const csv = $('#codesCsv');
  if (csv) csv.onclick = async () => {
    const zeilen = [['Code', 'Klasse', 'Stand'].join(';')].concat(
      (daten.codes || []).map(c =>
        [c.code, c.klasse || '', c.eingeloest ? 'eingelöst' : 'frei'].join(';')));
    /* Der Vorspann (BOM) muss sein: Ohne ihn zeigt Excel in der Schweiz
       «eingelöst» als «eingelÃ¶st» an, und dann glaubt niemand mehr der
       Datei. */
    const text = '\ufeff' + zeilen.join('\r\n');
    if (await datenSichern('studyswiss-codes.csv', text, 'text/csv;charset=utf-8')) return;
    /* Wo der Browser keine Datei annimmt — in einer eingebetteten
       Ansicht etwa —, darf der Knopf nicht einfach nichts tun. Dann
       kommt die Liste in die Zwischenablage, und der Hinweis sagt es. */
    try {
      await navigator.clipboard.writeText(text);
      csv.innerHTML = icon('haken', 16) + ' In die Zwischenablage';
      setTimeout(() => csv.innerHTML = icon('laden', 16) + ' CSV', 2500);
    } catch (e) {
      fehlerZeigen('#meldung', { titel: 'Herunterladen geht hier nicht',
        message: 'Öffnen Sie die Seite in einem eigenen Fenster, dann klappt es.' });
    }
  };

  const dr = $('#codesDrucken');
  if (dr) dr.onclick = () => { druckblattBauen(); window.print(); };
}

/* --- Das Druckblatt ---------------------------------------------------
   Ein Abschnitt je Kind, zum Auseinanderschneiden. Darauf steht der
   Code, die Adresse und drei Sätze Anleitung — mehr braucht es nicht,
   und mehr liest ohnehin niemand. */
function druckblattBauen() {
  const liste = gefilterteCodes();
  const bis = daten.ende ? datum(daten.ende) : '';
  $('#druckblatt').innerHTML = `
    <style>
      #druckblatt .blatt{display:grid;grid-template-columns:1fr 1fr;gap:0}
      #druckblatt .zettel{border:1px dashed #999;padding:14mm 10mm;min-height:62mm;
        break-inside:avoid}
      #druckblatt .zettel h3{font:700 15px 'Bitter',Georgia,serif;margin:0 0 4px}
      #druckblatt .zettel .code{font:700 22px 'Bitter',Georgia,serif;letter-spacing:.08em;
        margin:10px 0;display:block}
      #druckblatt .zettel p{font:400 11px/1.5 'Nunito Sans';color:#444;margin:0}
    </style>
    <div class="blatt">${liste.map(c => `
      <div class="zettel">
        <h3>StudySwiss</h3>
        <p>Vorbereitung auf die Aufnahmeprüfung</p>
        <span class="code">${sicher(c.code)}</span>
        <p><b>So geht es:</b> studyswiss.ch öffnen, «Code einlösen» wählen und
        den Code eintippen. Danach den Kanton und die Prüfung wählen.</p>
        <p style="margin-top:8px">Gültig bis ${sicher(bis)}.
        ${c.klasse ? 'Klasse ' + sicher(c.klasse) + '.' : ''}</p>
      </div>`).join('')}</div>`;
}

/* --- Bericht -----------------------------------------------------------
   §2.6: Die Nutzer sind minderjährig. Die Schule bekommt Kennzahlen
   über die Gruppe, nie den Stand einer einzelnen Person. Der Hinweis
   dazu steht auf dem Bericht selbst, nicht nur in den AGB — wer ihn
   liest, soll wissen, warum hier keine Namensliste steht. */
async function zeichneBericht() {
  const ziel = $('#berichtInhalt');
  ziel.innerHTML = '<p class="bd14">Wird geladen …</p>';
  let b;
  try { b = await Schule.bericht(schluessel); }
  catch (e) { fehlerZeigen(ziel, e); return; }
  if (!b) { ziel.innerHTML = '<p class="bd14">Noch keine Daten.</p>'; return; }

  ziel.innerHTML = `
    <div class="raster vier">
      <div class="karte"><p class="eyebrow">Eingelöst</p>
        <div class="num2 zahl">${zahl(b.eingeloest)}</div>
        <p class="sm">von ${zahl(b.lizenzen)} Lizenzen</p></div>
      <div class="karte"><p class="eyebrow">Aktiv, ${sicher(b.zeitraum)}</p>
        <div class="num2 zahl">${zahl(b.aktivLetzteWoche)}</div>
        <p class="sm">haben diese Woche geübt</p></div>
      <div class="karte"><p class="eyebrow">Pensum</p>
        <div class="num2 zahl">${zahl(b.pflichtaufgabenWoche)}</div>
        <p class="sm">Pflichtaufgaben je Woche im Mittel</p></div>
      <div class="karte"><p class="eyebrow">Themen offen</p>
        <div class="num2 zahl">${zahl((b.schwacheThemen || []).length)}</div>
        <p class="sm">mit auffälliger Fehlerquote</p></div>
    </div>

    <div class="karte" style="margin-top:20px">
      <h3>Woran die Gruppe hängt</h3>
      <p class="bd14" style="margin-top:4px">Die Themen mit der höchsten
        Fehlerquote in Ihrer Gruppe. Das ist die Angabe, die den Unterricht
        verändert — und sie ist zusammengefasst.</p>
      <div class="tabellenrahmen" style="margin-top:18px">
        <table class="t"><thead><tr>
          <th>Thema</th><th>Bereich</th><th class="rechts">Fehlerquote</th>
        </tr></thead><tbody>
        ${(b.schwacheThemen || []).map(t => `
          <tr><td class="stark">${sicher(t.name)}</td>
              <td>${sicher(t.oberthema || t.fach || '')}</td>
              <td class="rechts">
                <div class="reihe" style="justify-content:flex-end;gap:10px">
                  <div class="bar" style="width:90px"><i style="width:${
                    Math.max(4, Math.min(100, t.fehlerquote))}%;background:var(--red)"></i></div>
                  <span class="zahl">${t.fehlerquote} %</span>
                </div></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>

    <div class="hinweis ruhig" style="margin-top:18px">${icon('schloss', 18)}
      <div>${sicher(b.hinweis || '')}</div></div>`;
}

/* --- Belege ------------------------------------------------------------ */
async function zeichneBelege() {
  const koerper = $('#belegTabelle tbody');
  koerper.innerHTML = '<tr><td colspan="5" class="sm">Wird geladen …</td></tr>';
  let liste = [];
  try { liste = await Schule.belege(schluessel) || []; }
  catch (e) { fehlerZeigen('#meldung', e); }
  koerper.innerHTML = liste.length ? liste.map(b => `
    <tr>
      <td class="stark">${sicher(b.art)} ${sicher(b.nummer)}</td>
      <td>${sicher(datum(b.datum, true))}</td>
      <td class="rechts zahl">${franken(b.betrag)}</td>
      <td>${b.bezahlt ? '<span class="chip gruen">bezahlt</span>'
                      : '<span class="chip gelb">offen</span>'}</td>
      <td class="rechts">
        <a class="btn bt klein" style="height:32px"
           href="bestellen.html?schritt=rechnung&nr=${encodeURIComponent(b.nummer)}&s=${encodeURIComponent(schluessel)}">
           Ansehen</a></td>
    </tr>`).join('')
    : '<tr><td colspan="5" class="sm">Noch keine Belege.</td></tr>';
}

/* --- Aufstocken -------------------------------------------------------- */
function zeichneAufstocken() {
  const feld = $('#zusatzAnzahl');
  if (!feld) return;
  const nach = () => {
    const bisher = (daten.codes || []).length;
    const dazu = Math.max(1, +feld.value || 1);
    const alt = rechne(bisher), neu = rechne(bisher + dazu);
    const differenz = Math.round((neu.total - alt.total) * 20) / 20;
    const besser = neu.einzelpreis < alt.einzelpreis;
    $('#zusatzSumme').innerHTML = `
      <div><dt>Bisher ${zahl(bisher)} Lizenzen à ${franken(alt.einzelpreis)}</dt>
           <dd class="zahl">${franken(alt.total)}</dd></div>
      <div><dt>Neu ${zahl(bisher + dazu)} Lizenzen à ${franken(neu.einzelpreis)}</dt>
           <dd class="zahl">${franken(neu.total)}</dd></div>
      <div class="total"><dt>Nachbelastung</dt>
           <dd class="zahl">${franken(differenz)}</dd></div>
      ${besser ? `<div><dt class="sm">Die günstigere Stufe gilt rückwirkend für alle
        ${zahl(bisher + dazu)} Lizenzen.</dt><dd class="sm"></dd></div>` : ''}`;
  };
  feld.addEventListener('input', nach); nach();

  $('#zusatzBestellen').onclick = () => {
    const p = new URLSearchParams({ schritt: 'bestellung',
      anzahl: (daten.codes || []).length + Math.max(1, +feld.value || 1) });
    location.href = 'bestellen.html?' + p;
  };
}

seiteBereit(() => { verwaltungStarten(); codesVerdrahten(); });
