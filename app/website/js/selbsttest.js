/* StudySwiss — der Selbsttest
   ==================================================================
   Wie am Prüfungstag: Uhr, keine Rückmeldung zwischendurch, bewertet
   wird bei der Abgabe. Der Lauf selbst steht in `uebung.js` — er ist
   derselbe wie in der Übung, nur in einem anderen Modus. Hier stehen
   die vier Schirme drumherum: Fach, Umfang, Bedingungen, Ergebnis.

   Zwei Dinge, die man beim Lesen leicht übersieht:

   **Auf der ersten Ebene steht das FACH, nie einer seiner Teile.**
   «Deutsch Sprachbetrachtung» neben «Mathematik» wäre, als wäre das
   eine so gross wie das andere. Ein Deutsch-Selbsttest mischt
   Sprachbetrachtung und Textverständnis nach ihrem Punkteanteil,
   genau wie die Prüfung (§3.1.1).

   **Keine Bedingung steht in diesem Screen.** Dauer, Taschenrechner,
   Zurückblättern und die Bemerkungen kommen aus dem Katalog, vom
   Prüfungsteil. Ein Screen, der sie fest aufzählt, lügt beim ersten
   Kanton mit anderen Regeln (§9).                                     */

let stFach = null;
let stUmfang = null;
let stThemen = [];

const ST_UMFANG = [
  ['alle',      'Alle Themen',            'Zwölf Aufgaben quer durch das Fach.'],
  ['einzelne',  'Einzelne Themen wählen', 'Du bestimmst, was geprüft wird.'],
  ['pruefung',  'Ganze Prüfung',          null],   // Text kommt aus dem Katalog
];

/* --- 1 · Fach und Umfang ---------------------------------------------- */

async function zeichneSelbsttest() {
  const wo = $('#selbsttestInhalt');
  wo.innerHTML = '<p class="bd">Wird geladen …</p>';
  const faecher = await api('/selbsttest/faecher').catch(() => []);
  if (!faecher || !faecher.length) {
    wo.innerHTML = `<div class="karte"><p class="bd">Der Selbsttest braucht ein
      Fach mit Themenbaum. Für diese Prüfung ist noch keiner hinterlegt.</p></div>`;
    return;
  }
  if (!faecher.some(f => f.fach === stFach)) stFach = null;

  /* Die Zeile «Ganze Prüfung» nennt Zahlen, und die kommen aus dem
     Katalog des gewählten Fachs — in Bern dauert Deutsch doppelt so
     lang wie in Zürich. Ohne Fach steht dort noch nichts. */
  let B = null;
  if (stFach) B = await api('/selbsttest/bedingungen?fach='
                            + encodeURIComponent(stFach)).catch(() => null);

  const wahl = (an, titel, unter, kennung, art) => `
    <button class="wahl ${an ? 'an' : ''}" data-${art}="${sicher(kennung)}">
      <div class="reihe">
        <div style="flex:1">
          <b class="stark">${sicher(titel)}</b>
          ${unter ? `<div class="sm" style="margin-top:6px">${sicher(unter)}</div>` : ''}
        </div>
        ${an ? icon('haken', 20) : ''}
      </div>
    </button>`;

  const aufsatzFach = faecher.find(f => f.fach === stFach && f.aufsatz);

  wo.innerHTML = `
    <p class="eyebrow">1 · Fach</p>
    <div class="stapel eng" style="margin-top:10px">
      ${faecher.map(f => wahl(stFach === f.fach, f.name,
          `${(f.bereiche || []).join(' · ')} · ${zahl(f.themen || 0)} Themen mit Aufgaben`,
          f.fach, 'stfach')).join('')}
    </div>

    ${aufsatzFach ? `
      <div class="karte eng" style="margin-top:12px">
        <p class="sm">An der Prüfung kommt zum ${sicher(aufsatzFach.name)}-Teil noch
        der Aufsatz dazu. Den schreibst du separat — unter «Aufsatz».</p>
      </div>` : ''}

    <p class="eyebrow" style="margin-top:26px">2 · Umfang</p>
    <div class="stapel eng" style="margin-top:10px">
      ${ST_UMFANG.map(([id, t, u]) => wahl(stUmfang === id, t,
          id === 'pruefung'
            ? (B ? `${zahl(B.anzahlAufgaben)} Aufgaben, ${zahl(B.dauerMinuten)} Minuten, wie am Prüfungstag.`
                 : 'Wie am Prüfungstag. Wähle zuerst ein Fach.')
            : u,
          id, 'stumfang')).join('')}
    </div>

    <div id="stThemenwahl"></div>

    <div class="knopfreihe" style="margin-top:22px">
      <button class="btn bp" id="stWeiter" ${stFach && stUmfang ? '' : 'disabled'}>
        Bedingungen ansehen</button>
    </div>`;

  $$('[data-stfach]').forEach(b => b.onclick = () => {
    stFach = b.dataset.stfach; stThemen = []; zeichneSelbsttest();
  });
  $$('[data-stumfang]').forEach(b => b.onclick = () => {
    stUmfang = b.dataset.stumfang; zeichneSelbsttest();
  });
  $('#stWeiter').onclick = () => zeichneBedingungen();

  if (stUmfang === 'einzelne' && stFach) await zeichneThemenwahl();
}

/* --- 1b · Einzelne Themen --------------------------------------------- */

async function zeichneThemenwahl() {
  const baum = await api('/katalog/themen?fach=' + encodeURIComponent(stFach))
                     .catch(() => null);
  const ober = (baum && baum.oberthemen) || [];
  if (!ober.length) return;
  $('#stThemenwahl').innerHTML = `
    <p class="eyebrow" style="margin-top:26px">Welche Themen?</p>
    <p class="sm" style="margin-top:6px">${zahl(stThemen.length)} gewählt</p>
    <div style="margin-top:12px">
      ${ober.map((o, i) => `
        <details class="karte" style="margin-bottom:10px" ${i === 0 ? 'open' : ''}>
          <summary style="cursor:pointer;list-style:none">
            <div class="reihe" style="justify-content:space-between">
              <b class="stark">${sicher(o.name)}</b>
              <span class="chip">${zahl((o.unterthemen || []).length)}</span>
            </div>
          </summary>
          <div class="stapel eng" style="margin-top:14px">
            ${(o.unterthemen || []).map(u => {
              const an = stThemen.some(t => t.code === u.code && t.fach === u.fach);
              return `<button class="wahl ${an ? 'an' : ''}"
                        data-stthema="${sicher(u.code)}" data-stbereich="${sicher(u.fach)}">
                <div class="reihe"><span style="flex:1">${sicher(u.name)}</span>
                ${an ? icon('haken', 18) : ''}</div></button>`;
            }).join('')}
          </div>
        </details>`).join('')}
    </div>`;

  $$('[data-stthema]').forEach(b => b.onclick = () => {
    const code = b.dataset.stthema, fach = b.dataset.stbereich;
    const i = stThemen.findIndex(t => t.code === code && t.fach === fach);
    /* Ein zweites Antippen nimmt die Wahl zurück — dieselbe Regel wie
       überall sonst (§4.5). */
    if (i >= 0) stThemen.splice(i, 1); else stThemen.push({ code, fach });
    zeichneSelbsttest();
  });
}

/* --- 2 · Bedingungen ---------------------------------------------------
   Jede Zeile kommt aus dem Katalog und beschreibt, was der Selbsttest
   wirklich tut. «Taschenrechner erlaubt» allein wäre für St. Gallen
   irreführend: Dort ist einer erlaubt, aber kein programmierbarer,
   kein grafikfähiger und keiner mit CAS.                              */

async function zeichneBedingungen() {
  const wo = $('#selbsttestInhalt');
  wo.innerHTML = '<p class="bd">Wird geladen …</p>';
  const B = await api('/selbsttest/bedingungen?fach=' + encodeURIComponent(stFach))
                  .catch(() => null) || {};

  const zeilen = [
    ['uhr', `${zahl(B.dauerMinuten || 0)} Minuten`,
     B.uhrPausiert !== false
       ? 'Die Uhr hält an, wenn du das Fenster wechselst, und läuft weiter, sobald du zurück bist.'
       : 'Die Uhr läuft weiter, auch wenn du das Fenster wechselst.'],
    ['info', B.hilfsmittelText || (B.taschenrechner ? 'Taschenrechner erlaubt'
                                                    : 'Kein Taschenrechner'),
     B.taschenrechner ? 'An dieser Prüfung ist einer erlaubt.'
                      : 'An dieser Prüfung ist auch keiner erlaubt.'],
    ['warn', B.hinweise ? 'Tipps erlaubt' : 'Keine Tipps',
     B.hinweise ? 'Wie beim Üben.' : 'Hinweise gibt es erst wieder beim Üben.'],
    ['zurueck', B.zurueckblaettern !== false ? 'Zurückblättern möglich' : 'Kein Zurück',
     B.zurueckblaettern !== false
       ? 'Du kannst zu früheren Aufgaben zurück und deine Antwort ändern, wie am Prüfungstag, wo das Blatt vor dir liegt.'
       : 'Eine abgegebene Antwort bleibt stehen.'],
  ];

  wo.innerHTML = `
    <button class="btn bt klein" id="stZurueck" style="padding-left:0">
      ${icon('zurueck', 16)} Zurück</button>
    <h2 style="margin-top:10px">So läuft der Selbsttest</h2>
    <div class="stapel" style="margin-top:20px">
      ${zeilen.map(([ic, t, u]) => `
        <div class="reihe" style="align-items:flex-start;gap:14px">
          <span class="ic">${icon(ic, 20)}</span>
          <div style="flex:1"><b class="stark">${sicher(t)}</b>
            <div class="sm" style="margin-top:5px">${sicher(u)}</div></div>
        </div>`).join('')}
    </div>
    ${(B.bemerkungen || []).length ? `
      <div class="karte" style="margin-top:22px">
        <p class="eyebrow">Was an dieser Prüfung sonst noch gilt</p>
        ${B.bemerkungen.map(x => `<p class="sm" style="margin-top:8px">${sicher(x)}</p>`).join('')}
      </div>` : ''}
    <div class="knopfreihe" style="margin-top:24px">
      <button class="btn bp" id="stBeginnen">Selbsttest beginnen</button>
    </div>`;

  $('#stZurueck').onclick = () => zeichneSelbsttest();
  $('#stBeginnen').onclick = () => selbsttestStarten(B);
}

/* --- 3 · Der Lauf ----------------------------------------------------- */

async function selbsttestStarten(B) {
  lernZeige('uebung');
  $('#uebungTitel').textContent = 'Selbsttest';
  $('#uebungInhalt').innerHTML = '<p class="bd">Wird vorbereitet …</p>';
  try {
    const s = await api('/selbsttest/start', {
      /* `themen` ist eine Liste von CODES, keine Objekte — so steht es
         in `SelbsttestStart`. Objekte kämen als leere Liste an. */
      body: { fach: stFach, umfang: stUmfang, themen: stThemen.map(t => t.code) },
    });
    if (!s || !(s.aufgaben || []).length) {
      $('#uebungInhalt').innerHTML = `<div class="karte"><p class="bd">
        Für dieses Fach gibt es noch keine Aufgaben.</p></div>`;
      return;
    }
    laufSetzen({
      modus: 'selbsttest', id: s.id, aufgaben: s.aufgaben, titel: 'Selbsttest',
      bedingungen: s.bedingungen || B || {},
      dauerMinuten: s.minuten || (B && B.dauerMinuten) || 30,
    });
    aufgabeZeichnen();
  } catch (e) { fehlerZeigen('#uebungInhalt', e); }
}

/* --- 4 · Ergebnis ------------------------------------------------------
   Punkte nach Prüfungsschema und die Aufschlüsselung nach Oberthema.
   **Keine Note** (§9) — die Punktzahl ist das, was die Prüfung selbst
   ausweist, und sie steht ohne Umrechnung da.                         */

function selbsttestErgebnisZeichnen(e, zeitAbgelaufen) {
  const proOber = e.proOberthema || [];
  $('#uebungTitel').textContent = '';
  $('#uebungInhalt').innerHTML = `
    ${zeitAbgelaufen ? `<div class="hinweis" style="margin-bottom:18px">
      ${icon('uhr', 18)}<div>Die Zeit ist abgelaufen. Bewertet ist, was dastand —
      wie an der Prüfung.</div></div>` : ''}
    <p class="eyebrow">Selbsttest beendet</p>
    <div class="num zahl" style="margin-top:6px">${zahl(e.punkte)} von ${zahl(e.maximum)}</div>
    <p class="bd" style="margin-top:4px">Punkten</p>

    <p class="eyebrow" style="margin-top:30px">Nach Oberthema</p>
    <div class="stapel eng" style="margin-top:12px">
      ${proOber.map(o => `
        <div class="karte eng">
          <div class="reihe" style="justify-content:space-between">
            <b class="stark">${sicher(o.name)}</b>
            <span class="sm">${zahl(o.erreicht)} von ${zahl(o.moeglich)}</span>
          </div>
          <div class="bar" style="margin-top:10px"><i class="${
            o.erreicht * 2 < o.moeglich ? 'schwach' : ''}" style="width:${
            o.moeglich ? Math.round(100 * o.erreicht / o.moeglich) : 0}%"></i></div>
        </div>`).join('') || '<p class="bd14">Keine Aufschlüsselung vorhanden.</p>'}
    </div>

    <div class="knopfreihe" style="margin-top:26px">
      <button class="btn bp" id="stFehler">Meine Fehler ansehen</button>
      <button class="btn bs" id="stFertig">Fertig</button>
    </div>`;
  $('#stFehler').onclick = () => lernZeige('fehler');
  $('#stFertig').onclick = () => lernZeige('selbsttest');
}
