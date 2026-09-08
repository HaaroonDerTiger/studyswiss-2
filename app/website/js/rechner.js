/* StudySwiss — der Lizenzrechner
   ==================================================================
   Eine Schule soll den Preis sehen, bevor sie ein Formular ausfüllt.
   Ein «Preis auf Anfrage» kostet beide Seiten eine Woche und verrät
   ausserdem, dass der Preis verhandelbar ist — was er hier nicht ist. */

function rechnerStarten() {
  const feld     = $('#anzahl');
  const schieber = $('#schieber');
  if (!feld || !schieber) return;

  const start = $('#start');
  if (start && !start.value) start.value = new Date().toISOString().slice(0, 10);

  /* Der Schieber geht bis 300, das Feld bis 2000. Wer eine ganze Schule
     erfasst, tippt die Zahl; wer eine Klasse plant, schiebt. Beide
     Wege sind dieselbe Zahl, darum halten sie sich gegenseitig nach. */
  const setze = (n, quelle) => {
    n = Math.max(1, Math.min(2000, Math.round(n || 1)));
    if (quelle !== 'feld')     feld.value = n;
    if (quelle !== 'schieber') schieber.value = Math.min(n, +schieber.max);
    zeichne(n);
  };

  feld.addEventListener('input',  () => setze(+feld.value, 'feld'));
  schieber.addEventListener('input', () => setze(+schieber.value, 'schieber'));
  if (start) start.addEventListener('change', () => setze(+feld.value, 'start'));

  preiseLaden().then(() => setze(+feld.value || 24));
}

function zeichne(n) {
  const r = rechne(n);

  /* --- Die Staffel offen hinlegen ---------------------------------
     Nicht als Verkaufstrick, sondern damit die Schule die Zahl im
     Budgetantrag begründen kann. */
  const staffel = $('#staffel');
  if (staffel) {
    staffel.innerHTML = PREISE.staffel.map(s => {
      const an = s === r.stufe;
      const bis = PREISE.staffel[PREISE.staffel.indexOf(s) + 1];
      const spanne = bis ? `${s.ab}–${bis.ab - 1}` : `ab ${s.ab}`;
      return `<span class="chip${an ? ' an' : ''}" title="${sicher(s.name)}">
                ${spanne} · ${franken(s.preis)}</span>`;
    }).join('');
  }

  /* --- Die Summe --------------------------------------------------- */
  const summe = $('#summe');
  if (summe) {
    summe.innerHTML = `
      <div><dt>${zahl(r.anzahl)} Lizenzen à ${franken(r.einzelpreis)}</dt>
           <dd class="zahl">${franken(r.netto)}</dd></div>
      <div><dt>Mehrwertsteuer ${String(r.mwstSatz).replace('.', ',')} %</dt>
           <dd class="zahl">${franken(r.mwst)}</dd></div>
      <div class="total"><dt>Total</dt><dd class="zahl">${franken(r.total)}</dd></div>
      <div><dt class="sm">je Lizenz und Schuljahr, inkl. MwSt</dt>
           <dd class="sm zahl">${franken(r.proLizenz)}</dd></div>`;
  }

  /* --- Der Hinweis auf die nächste Stufe ---------------------------
     Wer bei 47 Lizenzen steht, soll sehen, dass drei mehr den Preis je
     Lizenz senken. Das zu verschweigen wäre die schlechtere Auskunft. */
  const hinweis = $('#stufenhinweis');
  if (hinweis) {
    const n = naechsteStufe(r.anzahl);
    if (n) {
      const dann = rechne(n.stufe.ab);
      hinweis.innerHTML = `${icon('info', 14)} Ab ${n.stufe.ab} Lizenzen kostet
        eine ${franken(n.stufe.preis)} statt ${franken(r.einzelpreis)} —
        bei ${n.stufe.ab} wären es ${franken(dann.total)} für alle zusammen.`;
    } else {
      hinweis.innerHTML = `${icon('haken', 14)} Sie sind auf der günstigsten Stufe.`;
    }
  }

  /* --- Laufzeit ----------------------------------------------------- */
  const start = $('#start'), lz = $('#laufzeit');
  if (lz) {
    const s = start && start.value ? new Date(start.value) : new Date();
    lz.innerHTML = `Die Lizenz läuft vom ${sicher(datum(s))} bis zum
      ${sicher(datum(schuljahrEnde(s)))}. Sie verlängert sich nicht
      selbsttätig und muss nicht gekündigt werden.`;
  }

  /* --- Woher der Preis kommt ---------------------------------------- */
  const h = $('#preisherkunft');
  if (h) {
    h.innerHTML = r.herkunft === 'server'
      ? `Preise vom ${sicher(datum(new Date()))}. Massgeblich ist die Offerte.`
      : `${icon('warn', 13)} Vorschau ohne Server: Diese Zahlen sind ein Muster.`;
  }

  /* --- Die Auswahl an die Bestellstrecke weiterreichen --------------
     Über die Adresszeile, nicht über den Sitzungsspeicher: So kann die
     Schule den Link mit ihrer Zahl an die Schulleitung schicken, und
     der zeigt dort dasselbe. */
  const p = new URLSearchParams({ anzahl: r.anzahl });
  if (start && start.value) p.set('start', start.value);
  const o = $('#zurOfferte'), b = $('#direktBestellen');
  if (o) o.href = 'bestellen.html?' + p;
  if (b) { p.set('schritt', 'bestellung'); b.href = 'bestellen.html?' + p; }
}

seiteBereit(rechnerStarten);
