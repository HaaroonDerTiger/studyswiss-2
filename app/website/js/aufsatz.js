/* StudySwiss — der Aufsatz
   ==================================================================
   Vier Schirme: die Arten, die Themen einer Art, die Schreibfläche und
   die Korrektur.

   **Keine Note** (§9). Die Korrektur nennt vier Kriterien mit einer
   beschreibenden Stufe und die abzählbare Grösse «3 von 4 Kriterien
   erreicht». Eine Ziffer sagt einer Vierzehnjährigen, wo sie steht,
   aber nicht, was sie tun soll.

   Die Korrektur ist die **einzige** Stelle im ganzen Haus, an der ein
   Sprachmodell arbeitet (§2.5). Ohne Server gibt es keines; dann steht
   hier eine feste Beispielkorrektur, und der Schirm sagt das auch so.

   Die zwei Hilfen beim Schreiben sind bewusst getrennt: Aufbau und
   Satzstarter zusammen in einem Kasten wären eine Wand aus Text genau
   dann, wenn jemand nicht weiterweiss.                                */

let auArt = null;      // die gewählte Art
let auThema = null;    // das gewählte Thema
let auText = '';
let auHaken = new Set();
let auUhr = null;
let auRest = 90 * 60;

/* --- 26 · Die Arten ---------------------------------------------------- */

async function zeichneAufsatz() {
  const wo = $('#aufsatzInhalt');
  wo.innerHTML = '<p class="bd">Wird geladen …</p>';
  const arten = await api('/aufsatz/arten').catch(() => []);
  if (!arten || !arten.length) {
    wo.innerHTML = `<div class="karte"><p class="bd">Diese Prüfung kennt keinen
      Aufsatzteil.</p></div>`;
    return;
  }
  wo.innerHTML = `
    <p class="bd" style="max-width:58ch">An der Prüfung stehen mehrere Themen zur
    Wahl. Hier übst du gezielt die Art, die dir noch schwerfällt.</p>
    <div class="stapel" style="margin-top:20px">
      ${arten.map(a => a.themen ? `
        <button class="karte" data-auart="${sicher(a.id)}" style="text-align:left">
          <div class="reihe" style="justify-content:space-between">
            <h3>${sicher(a.name)}</h3>${icon('pfeil', 18)}
          </div>
          <p class="bd14" style="margin-top:8px">${sicher(a.beschreibung || '')}</p>
          <div class="reihe" style="margin-top:12px">
            <span class="chip">${zahl(a.themen)} Themen</span></div>
        </button>`
      : `<div class="karte" style="opacity:.5">
          <h3>${sicher(a.name)}</h3>
          <p class="bd14" style="margin-top:8px">${sicher(a.beschreibung || '')}</p>
          <p class="sm" style="margin-top:10px">Themen folgen. Diese Art kommt an
          deiner Prüfung vor, wir haben aber noch keine Aufgaben dazu.</p>
        </div>`).join('')}
    </div>`;
  $$('[data-auart]').forEach(b => b.onclick = () => {
    auArt = arten.find(a => a.id === b.dataset.auart) || null;
    zeichneAufsatzThemen();
  });
}

/* --- 26b · Die Themen einer Art ---------------------------------------- */

async function zeichneAufsatzThemen() {
  const wo = $('#aufsatzInhalt');
  wo.innerHTML = '<p class="bd">Wird geladen …</p>';
  const themen = await api('/aufsatz/themen?art=' + encodeURIComponent(auArt.id))
                       .catch(() => []);
  const zeigen = mischeThemen(themen).slice(0, 4);
  wo.innerHTML = `
    <button class="btn bt klein" id="auZurueck" style="padding-left:0">
      ${icon('zurueck', 16)} Alle Arten</button>
    <h2 style="margin-top:10px">${sicher(auArt.name)}</h2>
    <p class="bd" style="margin-top:8px;max-width:58ch">${sicher(auArt.beschreibung || '')}</p>
    <div class="stapel" style="margin-top:22px">
      ${zeigen.map(t => `
        <button class="karte" data-authema="${t.id}" style="text-align:left">
          <div class="reihe" style="justify-content:space-between">
            <h3>${sicher(t.titel)}</h3>${icon('pfeil', 18)}
          </div>
          <p class="bd14" style="margin-top:8px">${sicher(
            String(t.auftrag || '').slice(0, 180))}…</p>
        </button>`).join('')}
    </div>
    <div class="knopfreihe" style="margin-top:18px">
      <button class="btn bs klein" id="auWuerfeln">Andere Themen zeigen</button>
    </div>`;
  $('#auZurueck').onclick = () => zeichneAufsatz();
  $('#auWuerfeln').onclick = () => zeichneAufsatzThemen();
  $$('[data-authema]').forEach(b => b.onclick = () => {
    auThema = themen.find(t => String(t.id) === b.dataset.authema) || null;
    auText = ''; auHaken = new Set(); auRest = 90 * 60;
    zeichneAufsatzSchreiben();
  });
}

/** Vier Themen aus dem Topf. An der Prüfung steht auch eine Auswahl da,
 *  nicht der ganze Katalog — und wer alle 150 sieht, wählt keines. */
function mischeThemen(liste) {
  const kopie = (liste || []).slice();
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/* --- 27 · Schreiben ----------------------------------------------------
   Wortzähler, Uhr, Teilaufträge zum Abhaken, automatisch gespeichert.
   Der Tipp-Knopf steht oben rechts — an derselben Stelle wie in der
   Mathematik-Übung. Wer ihn dort einmal gefunden hat, sucht ihn nicht
   ein zweites Mal.                                                    */

function zeichneAufsatzSchreiben() {
  const t = auThema;
  const wo = $('#aufsatzInhalt');
  wo.innerHTML = `
    <div class="reihe" style="justify-content:space-between;align-items:flex-start">
      <button class="btn bt klein" id="auZurueckThemen" style="padding-left:0">
        ${icon('zurueck', 16)} Anderes Thema</button>
      <div class="reihe" style="gap:10px">
        <span class="uhr" id="auUhrAnzeige">90:00</span>
        <button class="btn bt klein" id="auTipp" style="padding:0 8px">Tipp</button>
      </div>
    </div>

    <h2 style="margin-top:12px">${sicher(t.titel)}</h2>
    <p class="bd" style="margin-top:10px;max-width:64ch">${sicher(t.auftrag || '')}</p>

    ${(t.teile || []).length ? `
      <div class="karte" style="margin-top:18px">
        <p class="eyebrow">Diese Teile gehören hinein</p>
        <div class="stapel eng" style="margin-top:12px">
          ${(t.teile || []).map((teil, i) => `
            <button class="teilhaken ${auHaken.has(i) ? 'an' : ''}" data-auteil="${i}">
              <span class="kasten">${auHaken.has(i) ? icon('haken', 14) : ''}</span>
              <span>${sicher(teil)}</span>
            </button>`).join('')}
        </div>
      </div>` : ''}

    <div id="auTippKasten"></div>

    <label class="feld" style="margin-top:20px">
      <span class="lb">Dein Text</span>
      <textarea id="auText" rows="16" placeholder="Fang an zu schreiben …"
        style="width:100%">${sicher(auText)}</textarea>
    </label>

    <div class="reihe" style="justify-content:space-between;margin-top:10px">
      <span class="sm" id="auWorte">0 Wörter</span>
      <span class="sm" id="auGespeichert"></span>
    </div>

    <div class="knopfreihe" style="margin-top:20px">
      <button class="btn bp" id="auAbgeben">Korrektur anfordern</button>
    </div>`;

  $('#auZurueckThemen').onclick = () => { auUhrStoppen(); zeichneAufsatzThemen(); };
  $$('[data-auteil]').forEach(b => b.onclick = () => {
    const i = +b.dataset.auteil;
    auHaken.has(i) ? auHaken.delete(i) : auHaken.add(i);
    /* Nur den einen Knopf umzeichnen: Ein Neuaufbau der ganzen Seite
       nähme dem Textfeld den Schreibpunkt mitten im Satz. */
    b.classList.toggle('an', auHaken.has(i));
    b.querySelector('.kasten').innerHTML = auHaken.has(i) ? icon('haken', 14) : '';
  });

  const feld = $('#auText');
  feld.oninput = () => { auText = feld.value; worteZaehlen(); speichernSpaeter(); };
  worteZaehlen();

  $('#auTipp').onclick = () => tippKastenZeichnen();
  $('#auAbgeben').onclick = () => aufsatzAbgeben();
  auUhrStarten();
}

function worteZaehlen() {
  const n = auText.trim() ? auText.trim().split(/\s+/).length : 0;
  const z = $('#auWorte');
  if (z) z.textContent = `${zahl(n)} ${n === 1 ? 'Wort' : 'Wörter'}`;
}

/** Automatisch speichern, aber nicht bei jedem Tastendruck: Ein Aufruf je
 *  Buchstabe wäre eine Anfrage je Buchstabe. Zwei Sekunden Ruhe genügen. */
let auSpeicherUhr = null;
function speichernSpaeter() {
  clearTimeout(auSpeicherUhr);
  auSpeicherUhr = setTimeout(async () => {
    await api('/aufsatz/entwurf', {
      body: { themaId: auThema && auThema.id, text: auText },
    }).catch(() => null);
    const z = $('#auGespeichert');
    if (z) z.textContent = 'gespeichert';
  }, 2000);
}

function auUhrStarten() {
  auUhrStoppen();
  auUhr = setInterval(() => {
    auRest--;
    const z = $('#auUhrAnzeige');
    if (!z) return auUhrStoppen();
    z.textContent = uhrText(auRest);
    z.classList.toggle('knapp', auRest < 300);
    if (auRest <= 0) auUhrStoppen();
  }, 1000);
}
function auUhrStoppen() { if (auUhr) clearInterval(auUhr); auUhr = null; }

/* --- Die zwei Hilfen --------------------------------------------------- */

function tippKastenZeichnen(welche) {
  const wo = $('#auTippKasten');
  if (!welche) {
    wo.innerHTML = `
      <div class="karte" style="margin-top:16px">
        <div class="reihe" style="justify-content:space-between">
          <p class="eyebrow">Womit hakt es?</p>
          <button class="btn bt klein" id="auTippZu" style="padding:0">Schliessen</button>
        </div>
        <div class="knopfreihe" style="margin-top:12px">
          <button class="btn bs klein" data-autipp="aufbau">Aufbau &amp; Checkliste</button>
          <button class="btn bs klein" data-autipp="saetze">Satzstarter</button>
        </div>
      </div>`;
  } else if (welche === 'aufbau') {
    wo.innerHTML = `
      <div class="karte" style="margin-top:16px">
        <div class="reihe" style="justify-content:space-between">
          <p class="eyebrow">Aufbau</p>
          <button class="btn bt klein" id="auTippZu" style="padding:0">Schliessen</button>
        </div>
        <ol class="liste" style="margin-top:12px">
          ${((auArt && auArt.aufbau) || []).map(s =>
            `<li>${sicher(s)}</li>`).join('') || '<li>Für diese Art ist kein Aufbau hinterlegt.</li>'}
        </ol>
      </div>`;
  } else {
    const gruppen = (auArt && auArt.satzstarter) || [];
    wo.innerHTML = `
      <div class="karte" style="margin-top:16px">
        <div class="reihe" style="justify-content:space-between">
          <p class="eyebrow">Satzstarter</p>
          <button class="btn bt klein" id="auTippZu" style="padding:0">Schliessen</button>
        </div>
        ${gruppen.map(g => `
          <div style="margin-top:14px">
            <b class="stark">${sicher(g.abschnitt)}</b>
            <div class="stapel eng" style="margin-top:8px">
              ${(g.saetze || []).map(s =>
                `<p class="sm">${sicher(s)}</p>`).join('')}
            </div>
          </div>`).join('') || '<p class="sm" style="margin-top:12px">Für diese Art sind keine Satzstarter hinterlegt.</p>'}
      </div>`;
  }
  const zu = $('#auTippZu');
  if (zu) zu.onclick = () => { wo.innerHTML = ''; };
  $$('[data-autipp]').forEach(b => b.onclick = () => tippKastenZeichnen(b.dataset.autipp));
}

/* --- 28 · Korrektur ---------------------------------------------------- */

const STUFEN = {
  noch_nicht: { text: 'noch nicht erreicht', klasse: 'stufe-rot',  erreicht: false },
  teilweise:  { text: 'teilweise erreicht',  klasse: 'stufe-gelb', erreicht: false },
  erreicht:   { text: 'erreicht',            klasse: 'stufe-gruen', erreicht: true },
  sicher:     { text: 'sicher erreicht',     klasse: 'stufe-gruen', erreicht: true },
};

async function aufsatzAbgeben() {
  auUhrStoppen();
  const wo = $('#aufsatzInhalt');
  if (!auText.trim()) {
    return fehlerZeigen('#aufsatzInhalt',
      new Error('Schreib zuerst etwas — auch ein Anfang genügt für eine Rückmeldung.'));
  }
  wo.innerHTML = '<p class="bd">Dein Text wird gelesen …</p>';
  const gespeichert = await api('/aufsatz/entwurf', {
    body: { themaId: auThema && auThema.id, text: auText },
  }).catch(() => null);
  const id = (gespeichert && gespeichert.id) || 'entwurf-1';
  const k = await api(`/aufsatz/${id}/korrektur`, { body: {} }).catch(() => null);
  if (!k) {
    return fehlerZeigen('#aufsatzInhalt',
      new Error('Die Korrektur hat nicht geklappt. Dein Text ist gespeichert.'));
  }
  korrekturZeichnen(k);
}

function korrekturZeichnen(k) {
  const kriterien = k.kriterien || [];
  const erreicht = kriterien.filter(kr => (STUFEN[kr.stufe] || {}).erreicht).length;
  $('#aufsatzInhalt').innerHTML = `
    <button class="btn bt klein" id="auZurueckText" style="padding-left:0">
      ${icon('zurueck', 16)} Zurück zum Text</button>

    ${k.muster ? `<div class="hinweis" style="margin-top:16px">${icon('warn', 18)}
      <div>In dieser Vorschau steht eine feste Beispielkorrektur. Angemeldet
      liest ein Sprachmodell deinen Text und beurteilt ihn nach denselben vier
      Kriterien.</div></div>` : ''}

    <div class="dunkel" style="margin-top:18px">
      <p class="eyebrow">Rückmeldung</p>
      <div class="num zahl">${zahl(erreicht)} von ${zahl(kriterien.length)}</div>
      <p class="bd14">Kriterien erreicht</p>
      ${k.gesamt ? `<p class="bd14" style="margin-top:12px">${sicher(k.gesamt)}</p>` : ''}
    </div>

    <p class="eyebrow" style="margin-top:30px">Die vier Kriterien</p>
    <div class="stapel eng" style="margin-top:12px">
      ${kriterien.map(kr => {
        const st = STUFEN[kr.stufe] || STUFEN.erreicht;
        return `<div class="karte eng">
          <div class="reihe" style="gap:12px;align-items:flex-start">
            <span class="kuerzel">${sicher(kr.kuerzel || '')}</span>
            <b class="stark" style="flex:1">${sicher(kr.name)}</b>
          </div>
          <span class="stufe ${st.klasse}">${st.text}</span>
          <p class="bd14" style="margin-top:10px">${sicher(kr.kommentar || '')}</p>
        </div>`;
      }).join('')}
    </div>

    ${(k.textstellen || []).length ? `
      <p class="eyebrow" style="margin-top:30px">Stellen in deinem Text</p>
      <div class="stapel eng" style="margin-top:12px">
        ${k.textstellen.map(s => `
          <div class="karte eng">
            <span class="chip">${sicher(s.art)}</span>
            <p class="bd14" style="margin-top:10px;font-style:italic">«${sicher(s.zitat)}»</p>
            <p class="sm" style="margin-top:6px">${sicher(s.problem)}</p>
            <div class="besser">${sicher(s.besser)}</div>
          </div>`).join('')}
      </div>` : ''}

    ${(k.naechsteSchritte || []).length ? `
      <p class="eyebrow" style="margin-top:30px">Beim nächsten Mal</p>
      <div class="stapel eng" style="margin-top:12px">
        ${k.naechsteSchritte.map(s => `
          <div class="karte eng"><b class="stark">${sicher(s.fokus)}</b>
            <p class="sm" style="margin-top:6px">${sicher(s.uebung)}</p></div>`).join('')}
      </div>` : ''}

    <div class="knopfreihe" style="margin-top:26px">
      <button class="btn bs" id="auNeu">Anderen Aufsatz schreiben</button>
    </div>`;
  $('#auZurueckText').onclick = () => zeichneAufsatzSchreiben();
  $('#auNeu').onclick = () => zeichneAufsatz();
}
