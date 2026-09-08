/* StudySwiss — die Preisseite
   ==================================================================
   Die drei Produkte kommen vom Server, damit die Website nicht etwas
   anderes anzeigt als die Kaufbestätigung (§9: kein Preis im Code).
   Ohne Server steht die Vorschau-Tabelle da, und sie sagt es dazu.    */

const PRODUKTE_VORSCHAU = [
  { id: 'ch.studyswiss.plus.pass', name: 'Prüfungs-Pass', preis: 129, art: 'einmalig',
    laeuft: '30 Tage nach der Prüfung', empfohlen: true,
    merkmale: ['Alle Fächer der Prüfung', 'Selbsttest über die ganze Prüfung',
               'Aufsatzkorrektur', 'Eltern-Report', 'Kein Abo, keine Kündigung'] },
  { id: 'ch.studyswiss.plus.familie', name: 'Familien-Pass', preis: 189, art: 'einmalig',
    laeuft: 'je bis zur eigenen Prüfung',
    merkmale: ['Alles aus dem Prüfungs-Pass', 'Drei Zugänge', 'Zwei Codes zum Weitergeben',
               'Jedes Kind bis zu seiner eigenen Prüfung'] },
  { id: 'ch.studyswiss.plus.monat', name: 'Monatlich', preis: 19, art: 'Abo',
    laeuft: '31 Tage, erneuert sich',
    merkmale: ['Alles aus dem Prüfungs-Pass', 'Monatlich kündbar',
               'Lohnt sich bei weniger als sieben Monaten'] },
];

async function preisseite() {
  const kasten = $('#produkte');
  if (!kasten) return;

  let produkte = PRODUKTE_VORSCHAU, ausServer = false;
  try {
    const p = await api('/abo/produkte');
    if (Array.isArray(p) && p.length) { produkte = p; ausServer = true; }
  } catch (e) { /* Vorschau-Tabelle bleibt */ }

  kasten.innerHTML = produkte.map(p => `
    <div class="karte preiskarte${p.empfohlen ? ' empfohlen' : ''}">
      ${p.empfohlen ? '<span class="marke">Meistens richtig</span>' : ''}
      <h3>${sicher(p.name)}</h3>
      <div class="preis"><span class="num zahl">${franken(p.preis)}</span>
        <span class="sm">${sicher(p.art)}</span></div>
      <p class="sm">Läuft ${sicher(p.laeuft)}</p>
      <ul>${(p.merkmale || []).map(m =>
        `<li>${icon('haken', 16)}<span>${sicher(m)}</span></li>`).join('')}</ul>
      <a class="btn ${p.empfohlen ? 'bp' : 'bs'} voll" style="margin-top:20px"
         href="kaufen.html?produkt=${encodeURIComponent(p.id)}">Auswählen</a>
    </div>`).join('');

  if (!ausServer) {
    kasten.insertAdjacentHTML('afterend',
      `<p class="sm" style="margin-top:12px">${icon('warn', 13)}
       Vorschau ohne Server: Diese Preise sind ein Muster. Massgeblich ist,
       was im Kauf steht.</p>`);
  }

  terminRechnung(produkte);
}

/** §4.9: Der Kauf-Screen rechnet vor, welcher Weg beim eigenen Termin
 *  günstiger ist. Das gehört auf die Karte, nicht ins Kleingedruckte —
 *  und es ist die Auskunft, die gegen uns ausfallen darf. */
function terminRechnung(produkte) {
  const feld = $('#terminWahl'), rat = $('#terminRat');
  if (!feld || !rat) return;
  const pass  = produkte.find(p => p.art === 'einmalig') || PRODUKTE_VORSCHAU[0];
  const monat = produkte.find(p => p.art === 'Abo')      || PRODUKTE_VORSCHAU[2];

  const nach = () => {
    if (!feld.value) { rat.innerHTML = ''; return; }
    const tage = Math.ceil((new Date(feld.value) - new Date()) / 86400000);
    if (tage <= 0) {
      rat.innerHTML = `<div class="hinweis" style="margin-top:14px">${icon('info',18)}
        <div>Dieser Termin liegt in der Vergangenheit.</div></div>`;
      return;
    }
    const monate = Math.max(1, Math.ceil(tage / 30));
    const abo = monate * monat.preis;
    const passBesser = pass.preis <= abo;
    rat.innerHTML = `<div class="hinweis ${passBesser ? 'gut' : ''}" style="margin-top:14px">
      ${icon(passBesser ? 'haken' : 'info', 18)}
      <div>Bis dahin sind es <b>${zahl(tage)} Tage</b>, also rund
      ${zahl(monate)} Monate. Monatlich wären das ${franken(abo)},
      der Pass kostet ${franken(pass.preis)} —
      <b>${passBesser ? 'der Pass ist günstiger' : 'monatlich ist günstiger'}</b>.</div></div>`;
  };
  feld.addEventListener('change', nach);
  nach();
}

seiteBereit(preisseite);
