/* StudySwiss — die Standortbestimmung
   ==================================================================
   24 Aufgaben je Fach, quer über alle Oberthemen, gewichtet nach
   Prüfungsanteil. Zwanzig bis fünfundzwanzig Minuten, unterbrechbar.

   **Sie heisst überall «Standortbestimmung», nie «Test».** Das ist
   keine Wortklauberei: «Test» weckt genau die Erwartung, die der
   Ergebnis-Schirm gleich darauf verneinen muss.

   Und sie gibt **keine Note, keine Einstufung und keine verbindliche
   Reihenfolge** (§4.7). Was sie zeigen kann, ist genau eines: wo es
   gehakt hat. Die Reihenfolge legt der Lernpfad fest — eine halbe
   Stunde Aufgaben trägt keine.

   Mathematik und Deutsch werden an der Prüfung getrennt geprüft, also
   werden sie hier auch getrennt angeboten. Eine gemeinsame Zahl sagt
   niemandem, wo er steht.                                             */

let sbFach = null;

async function zeichneStandort() {
  const wo = $('#standortInhalt');
  wo.innerHTML = '<p class="bd">Wird geladen …</p>';
  const faecher = await api('/standort/faecher').catch(() => []);
  if (!faecher || !faecher.length) {
    wo.innerHTML = `<div class="karte"><p class="bd">Die Standortbestimmung
      braucht ein Fach mit Themenbaum. Für diese Prüfung ist noch keiner
      hinterlegt.</p></div>`;
    return;
  }
  if (!faecher.some(f => f.fach === sbFach)) sbFach = null;

  wo.innerHTML = `
    <p class="bd" style="max-width:58ch">
      24 Aufgaben, 20 bis 25 Minuten. Du kannst jederzeit aufhören und später
      weitermachen. Am Schluss steht <b class="stark">keine Note</b> — sondern,
      welche Themen sitzen und welche du zuerst anschauen solltest.</p>

    <p class="eyebrow" style="margin-top:26px">Welches Fach?</p>
    <div class="stapel eng" style="margin-top:10px">
      ${faecher.map(f => `
        <button class="wahl ${sbFach === f.fach ? 'an' : ''}" data-sbfach="${sicher(f.fach)}">
          <div class="reihe">
            <div style="flex:1"><b class="stark">${sicher(f.name)}</b>
              <div class="sm" style="margin-top:6px">${sicher(
                (f.bereiche || []).join(' · '))}</div></div>
            ${sbFach === f.fach ? icon('haken', 20) : ''}
          </div>
        </button>`).join('')}
    </div>

    <div class="knopfreihe" style="margin-top:22px">
      <button class="btn bp" id="sbStart" ${sbFach ? '' : 'disabled'}>Loslegen</button>
      <button class="btn bt" id="sbSpaeter">Später machen</button>
    </div>`;

  $$('[data-sbfach]').forEach(b => b.onclick = () => {
    sbFach = b.dataset.sbfach; zeichneStandort();
  });
  $('#sbStart').onclick = () => standortStarten();
  $('#sbSpaeter').onclick = () => lernZeige('uebersicht');
}

async function standortStarten() {
  lernZeige('uebung');
  $('#uebungTitel').textContent = 'Standortbestimmung';
  $('#uebungInhalt').innerHTML = '<p class="bd">Wird vorbereitet …</p>';
  try {
    /* Das Fach steht in der Fragezeile — so nimmt die Route es entgegen.
       Im Körper käme es nie an. */
    const s = await api('/standort/start?fach=' + encodeURIComponent(sbFach),
                        { body: {} });
    if (!s || !(s.aufgaben || []).length) {
      $('#uebungInhalt').innerHTML = `<div class="karte"><p class="bd">
        Für dieses Fach gibt es noch keine Aufgaben.</p></div>`;
      return;
    }
    /* Kein Zeitdruck: Die Standortbestimmung ist unterbrechbar, und wer
       sie unter der Uhr macht, misst seine Nervosität statt seines
       Standes. Zurückblättern ist erlaubt. */
    laufSetzen({
      modus: 'standort', id: s.id, aufgaben: s.aufgaben,
      titel: 'Standortbestimmung',
      bedingungen: { zurueckblaettern: true, hinweise: false },
    });
    aufgabeZeichnen();
  } catch (e) { fehlerZeigen('#uebungInhalt', e); }
}

/* --- «Dein Startpunkt» ------------------------------------------------
   Drei abzählbare Grössen, darunter die Themen mit der höchsten
   Fehlerquote — ohne Rangnummern und ohne «in dieser Reihenfolge».  */

function startpunktZeichnen(e) {
  $('#uebungTitel').textContent = '';
  const empf = e.empfehlungen || [];
  $('#uebungInhalt').innerHTML = `
    <p class="eyebrow">${sicher(e.fachName || '')}</p>
    <h1 style="margin-top:4px">Dein Startpunkt</h1>

    <div class="raster drei" style="margin-top:24px">
      <div class="karte"><p class="eyebrow">Sitzen</p>
        <div class="num2 zahl">${zahl(e.sitzen || 0)}</div>
        <p class="sm">Themen</p></div>
      <div class="karte"><p class="eyebrow">Zuerst üben</p>
        <div class="num2 zahl">${zahl(e.zuerstUeben || 0)}</div>
        <p class="sm">Themen</p></div>
      <div class="karte"><p class="eyebrow">Noch offen</p>
        <div class="num2 zahl">${zahl(e.offen || 0)}</div>
        <p class="sm">Themen</p></div>
    </div>

    ${empf.length ? `
      <p class="eyebrow" style="margin-top:32px">Diese Themen zuerst üben</p>
      <div class="stapel eng" style="margin-top:12px">
        ${empf.map(t => `
          <button class="karte eng" data-uebe="${sicher(t.unterthema)}"
                  data-fach="${sicher(t.fach)}" data-name="${sicher(t.name)}"
                  style="text-align:left">
            <div class="reihe" style="justify-content:space-between">
              <div><b class="stark">${sicher(t.name)}</b>
                <div class="sm">${sicher(t.begruendung || '')}</div></div>
              ${icon('pfeil', 16)}
            </div>
          </button>`).join('')}
      </div>
      <p class="sm" style="margin-top:14px">Keine Reihenfolge, keine Note — nur,
      wo es gehakt hat. Die Reihenfolge legt der Lernpfad fest.</p>`
    : `<p class="bd" style="margin-top:24px">Es hat nirgends deutlich gehakt.
       Schau unter «Zuerst dran», womit du weitermachst.</p>`}

    <div class="knopfreihe" style="margin-top:26px">
      <button class="btn bp" id="sbZumLernen">Zum Lernen</button>
      <button class="btn bs" id="sbZumPfad">Lernpfad ansehen</button>
    </div>`;

  $$('[data-uebe]').forEach(b => b.onclick = () =>
    uebungStarten(b.dataset.fach, b.dataset.uebe, b.dataset.name));
  $('#sbZumLernen').onclick = () => lernZeige('uebersicht');
  $('#sbZumPfad').onclick = () => lernZeige('pfad');
}
