/* StudySwiss — Kauf auf der Website (privat)
   ==================================================================
   Produkt → Angaben → Zahlung → Code.

   Was hier bewusst NICHT passiert: Kartendaten anfassen. Die Zahlung
   läuft über den Anbieter, wir bekommen die Bestätigung. Steht auch so
   im Datenschutz, und es ist der Grund, warum diese Seite so kurz ist. */

const KAUF_SCHRITTE = ['produkt', 'angaben', 'zahlung', 'fertig'];
let kauf = { produkt: null, angaben: null, art: 'karte' };

function kaufZeige(schritt) {
  if (!KAUF_SCHRITTE.includes(schritt)) schritt = 'produkt';
  $$('[data-kauf]').forEach(s => { s.hidden = s.dataset.kauf !== schritt; });
  const i = KAUF_SCHRITTE.indexOf(schritt);
  $$('#kaufSchritte .schritt').forEach((s, j) => {
    s.classList.toggle('jetzt',  j === i);
    s.classList.toggle('fertig', j <  i);
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
  ({ produkt: kaufProdukte, angaben: kaufAngaben,
     zahlung: kaufZahlung, fertig: kaufFertig }[schritt])();
}

async function kaufProdukte() {
  const kasten = $('#kaufProdukte');
  let liste = PRODUKTE_VORSCHAU;
  try {
    const p = await api('/abo/produkte');
    if (Array.isArray(p) && p.length) liste = p;
  } catch (e) {}
  kasten.innerHTML = liste.map(p => `
    <button class="karte preiskarte${p.empfohlen ? ' empfohlen' : ''}"
            data-produkt="${sicher(p.id)}" style="text-align:left">
      ${p.empfohlen ? '<span class="marke">Meistens richtig</span>' : ''}
      <h3>${sicher(p.name)}</h3>
      <div class="preis"><span class="num zahl">${franken(p.preis)}</span>
        <span class="sm">${sicher(p.art)}</span></div>
      <p class="sm">Läuft ${sicher(p.laeuft)}</p>
      <ul>${(p.merkmale || []).map(m =>
        `<li>${icon('haken', 16)}<span>${sicher(m)}</span></li>`).join('')}</ul>
      <span class="btn ${p.empfohlen ? 'bp' : 'bs'} voll" style="margin-top:20px">
        Auswählen</span>
    </button>`).join('');
  $$('[data-produkt]', kasten).forEach(k => k.onclick = () => {
    kauf.produkt = liste.find(x => x.id === k.dataset.produkt);
    kaufZeige('angaben');
  });
}

function kaufUebersichtHtml() {
  const p = kauf.produkt;
  if (!p) return '';
  return `<div class="karte eng" style="background:var(--tan1);border-color:var(--tan3)">
    <div class="reihe" style="justify-content:space-between">
      <div><b class="stark">${sicher(p.name)}</b>
        <div class="sm">Läuft ${sicher(p.laeuft)}</div></div>
      <div class="num2 zahl">${franken(p.preis)}</div>
    </div></div>`;
}

function kaufAngaben() {
  if (!kauf.produkt) { kaufZeige('produkt'); return; }
  $('#kaufUebersicht').innerHTML = kaufUebersichtHtml();
  const form = $('#formKauf');
  form.onsubmit = e => {
    e.preventDefault();
    if (!pruefeFormular(form)) return;
    kauf.angaben = werte(form);
    kaufZeige('zahlung');
  };
}

function kaufZahlung() {
  if (!kauf.produkt || !kauf.angaben) { kaufZeige('produkt'); return; }
  const arten = [
    { id: 'karte', name: 'Karte', hinweis: 'Visa, Mastercard, American Express' },
    { id: 'twint', name: 'TWINT', hinweis: 'Mit dem Telefon bestätigen' },
    { id: 'postfinance', name: 'PostFinance', hinweis: 'Card oder E-Finance' },
  ];
  $('#zahlungsarten').innerHTML = arten.map(a => `
    <label class="haken" style="border:1.5px solid var(--line);border-radius:12px;
           padding:14px;margin:0">
      <input type="radio" name="zahlart" value="${a.id}"
             ${a.id === kauf.art ? 'checked' : ''}
             style="width:20px;height:20px;accent-color:var(--ink)">
      <span><b class="stark">${sicher(a.name)}</b><br>
        <span class="sm">${sicher(a.hinweis)}</span></span></label>`).join('');
  $$('input[name=zahlart]').forEach(r => r.onchange = () => kauf.art = r.value);
  $('#zahlungUebersicht').innerHTML = kaufUebersichtHtml();
  $('#zurueckAngaben').onclick = e => { e.preventDefault(); kaufZeige('angaben'); };

  $('#jetztZahlen').onclick = async () => {
    const knopf = $('#jetztZahlen');
    knopf.disabled = true; knopf.textContent = 'Wird weitergeleitet …';
    try {
      const a = await api('/abo/web/start', { body: {
        produktId: kauf.produkt.id, zahlungsart: kauf.art,
        email: kauf.angaben.email, name: kauf.angaben.name || '',
      }});
      /* Im Betrieb schickt der Server eine Adresse beim Zahlungsanbieter.
         Ohne Server tut die Vorschau so, als wäre man zurück. */
      if (a && a.weiterleitung) { location.href = a.weiterleitung; return; }
      kauf.ergebnis = a || demoKaufErgebnis();
      kaufZeige('fertig');
    } catch (err) {
      fehlerZeigen('#kaufMeldung', err);
    } finally {
      knopf.disabled = false;
      knopf.innerHTML = icon('schloss', 18) + ' Zahlungspflichtig bestellen';
    }
  };
}

function demoKaufErgebnis() {
  return { muster: true, code: demoCode(8), quittung: demoNummer('QU'),
           produkt: kauf.produkt, email: (kauf.angaben || {}).email };
}

function kaufFertig() {
  const e = kauf.ergebnis || demoKaufErgebnis();
  $('#kaufFertig').innerHTML = `
    <div class="karte">
      <p class="bd14">Geben Sie diesen Code dem Kind. Es tippt ihn in der App
        oder auf dieser Website unter «Code einlösen» ein — ein Konto braucht
        es dafür nicht.</p>
      <div class="reihe" style="margin-top:16px;gap:10px;flex-wrap:wrap">
        <code class="chip" style="font:700 18px 'Bitter',Georgia,serif;height:48px;
              padding:0 18px;letter-spacing:.08em">${sicher(e.code)}</code>
        <button class="btn bs klein" id="codeKopieren">Kopieren</button>
      </div>
      <p class="sm" style="margin-top:14px">
        Der Code und die Quittung ${sicher(e.quittung)} gehen zusätzlich an
        ${sicher(e.email || 'Ihre Adresse')}.</p>
    </div>
    ${e.muster ? `<div class="hinweis wichtig" style="margin-top:18px">
      ${icon('warn', 18)}<div><b>Muster.</b> Es wurde nichts belastet und
      nichts freigeschaltet.</div></div>` : ''}
    <div class="knopfreihe">
      <a class="btn bp" href="lernen.html">Code jetzt einlösen</a>
      <a class="btn bt" href="index.html">Zur Startseite</a>
    </div>`;
  const k = $('#codeKopieren');
  if (k) k.onclick = async () => {
    try { await navigator.clipboard.writeText(e.code); k.textContent = 'Kopiert'; }
    catch (x) { prompt('Code:', e.code); }
  };
}

seiteBereit(async () => {
  if (!$('#kaufSchritte')) return;
  const gewuenscht = new URLSearchParams(location.search).get('produkt');
  if (gewuenscht) {
    let liste = PRODUKTE_VORSCHAU;
    try { const p = await api('/abo/produkte'); if (Array.isArray(p) && p.length) liste = p; }
    catch (e) {}
    kauf.produkt = liste.find(x => x.id === gewuenscht) || null;
  }
  kaufZeige(kauf.produkt ? 'angaben' : 'produkt');
});
