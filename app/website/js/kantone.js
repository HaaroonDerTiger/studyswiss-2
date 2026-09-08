/* StudySwiss — die Kantonsliste
   ==================================================================
   Aus dem Katalog, nicht aus einer zweiten Liste im Quelltext (§9).
   Ein Kanton mit `aktiv: false` steht blass da und sagt «bald» — das
   ist die ehrliche Auskunft und dieselbe wie in der App.             */

async function kantonsliste() {
  const kasten = $('#kantonsliste');
  if (!kasten) return;
  kasten.innerHTML = '<p class="bd14">Wird geladen …</p>';

  let liste = [];
  try { liste = await api('/katalog/kantone') || []; }
  catch (e) { fehlerZeigen(kasten, e); return; }

  /* Aktive zuerst, danach alphabetisch. Wer sucht, findet seinen Kanton
     am Namen — nicht daran, an welcher Stelle wir ihn erfasst haben. */
  liste = liste.slice().sort((a, b) =>
    (b.aktiv - a.aktiv) || String(a.name).localeCompare(String(b.name), 'de-CH'));

  kasten.innerHTML = liste.map(k => {
    const pruefungen = (k.pruefungen || []).filter(Boolean);
    return `
    <div class="karte" ${k.aktiv ? '' : 'style="opacity:.55"'}>
      <div class="reihe" style="justify-content:space-between;align-items:flex-start">
        <h3>${sicher(k.name)}</h3>
        ${k.aktiv ? '<span class="chip gruen">bespielt</span>'
                  : '<span class="chip">bald</span>'}
      </div>
      ${pruefungen.length ? `<p class="bd14" style="margin-top:10px">
         ${pruefungen.map(p => sicher(p)).join(' · ')}</p>` : ''}
      ${k.aktiv ? `<a class="btn bs klein" style="margin-top:16px"
         href="lernen.html?kanton=${encodeURIComponent(k.id)}">Stoff ansehen</a>` : ''}
    </div>`;
  }).join('');

  const aktiv = liste.filter(k => k.aktiv).length;
  $('#kantonsfuss').textContent =
    `${zahl(aktiv)} von ${zahl(liste.length)} Kantonen sind vollständig bespielt. `
    + 'Ein Kanton erscheint hier erst, wenn für jedes Fach seiner Prüfung '
    + 'wirklich Aufgaben da sind.';
}

seiteBereit(kantonsliste);
