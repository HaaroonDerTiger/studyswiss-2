/* StudySwiss — der Lernbereich im Browser
   ==================================================================
   Dieselben Screens wie in der App, dasselbe `/v1`, derselbe
   Fortschritt. Was hier steht, ist Darstellung — gerechnet und
   ausgewertet wird auf dem Server.

   Der wichtigste Satz aus §4.10 gilt auch hier: **Die Aufgabe reist nie
   mit ihrer Lösung.** Was ankommt, ist `aufgabeRef`, Stamm, Optionen
   und die Anzahl Hinweise. Ob eine Antwort stimmt, entscheidet
   `POST /uebung/{id}/antwort`. Wer das im Browser täte, könnte die
   Lösung im Quelltext nachlesen — und ein Kind, das das einmal merkt,
   übt nie wieder ehrlich.                                            */

const LERN_TEILE = ['uebersicht', 'bereiche', 'fach', 'uebung', 'fortschritt',
                    'fehler', 'pfad', 'selbsttest', 'standort', 'aufsatz',
                    'tipps', 'einstellungen', 'anmelden'];
let profil = null;
let faecher = [];

/* Woher man in den Lauf gekommen ist. Der Abbrechen-Knopf führt dorthin
   zurück — ein fester Zielschirm liesse jemanden, der über «Zuerst dran»
   eingestiegen ist, auf einer Themenliste landen, die er nie geöffnet
   hat und die darum leer ist. */
let letzterTeil = 'uebersicht';
const herkunft = () => letzterTeil;

function lernZeige(teil) {
  if (!LERN_TEILE.includes(teil)) teil = 'uebersicht';
  /* Ein Wechsel weg vom Lauf hält die Uhr an. Ohne das liefe sie im
     Hintergrund weiter, und wer im Fortschritt nachschaut, käme zu einem
     abgelaufenen Selbsttest zurück. */
  if (teil !== 'uebung' && typeof laufUhrStoppen === 'function') laufUhrStoppen();
  $$('[data-lern]').forEach(x => {
    if (x.tagName === 'A') x.setAttribute('aria-current',
      x.dataset.lern === teil ? 'page' : 'false');
    else x.hidden = x.dataset.lern !== teil;
  });
  if (teil !== 'uebung') letzterTeil = teil;
  window.scrollTo({ top: 0, behavior: 'instant' });
  ({ uebersicht: zeichneUebersicht, fortschritt: zeichneFortschritt,
     fehler: zeichneFehler, pfad: zeichnePfad, selbsttest: zeichneSelbsttest,
     standort: zeichneStandort, aufsatz: zeichneAufsatz,
     einstellungen: zeichneEinstellungen }[teil] || (() => {}))();
}

/* --- Übersicht -------------------------------------------------------- */
async function zeichneUebersicht() {
  const tage = profil && profil.pruefungsdatum
    ? Math.ceil((new Date(profil.pruefungsdatum) - new Date()) / 86400000) : null;
  $('#terminKarte').innerHTML = tage != null && tage > 0
    ? `<p class="eyebrow">Nächster Prüfungstermin</p>
       <div class="num zahl">${zahl(tage)}</div>
       <p class="bd14">Tage bis zur Prüfung am ${sicher(datum(profil.pruefungsdatum))}</p>`
    : `<p class="eyebrow">Prüfungstermin</p>
       <h3 style="color:var(--cream)">Noch keiner gesetzt</h3>
       <p class="bd14" style="margin-top:6px">Ohne Termin kann der Lernpfad
       kein Wochenpensum rechnen.</p>`;

  /* «Zuerst dran» — mit Begründung, wie in der App. Ein Vorschlag ohne
     Grund ist eine Anweisung, und die befolgt niemand zweimal. */
  /* Der Server liefert eine `VorschlagsListe` mit `zuerst` und `danach` —
     nie mehr als zwei (§4.6). Der Grund heisst dort `begruendung`. */
  const liste = await api('/uebung/vorschlag').catch(() => null);
  const v = liste && liste.zuerst;
  const zweiter = liste && liste.danach;
  $('#zuerstDran').innerHTML = v ? `
    <div class="karte">
      <p class="eyebrow">Zuerst dran</p>
      <h3>${sicher(v.name || v.unterthema)}</h3>
      <p class="bd14" style="margin-top:8px">${sicher(v.begruendung || '')}</p>
      <p class="sm" style="margin-top:8px">${zahl(v.geloest || 0)} von
      ${zahl(v.pflichtset || 0)} Pflichtaufgaben</p>
      <div class="knopfreihe" style="margin-top:16px">
        <button class="btn bp klein" data-uebe="${sicher(v.unterthema || '')}"
          data-fach="${sicher(v.fach || '')}" data-name="${sicher(v.name || '')}">Üben</button>
        ${zweiter ? `<button class="btn bs klein"
          data-uebe="${sicher(zweiter.unterthema || '')}"
          data-fach="${sicher(zweiter.fach || '')}"
          data-name="${sicher(zweiter.name || '')}">
          Lieber ${sicher(zweiter.name || '')}</button>` : ''}
      </div>
      <p class="sm" style="margin-top:12px">Die Reihenfolge rechnet sich nach
      jeder Übung neu.</p>
    </div>` : '';

  /* Die Fächer mit ihrem Stand kommen aus `/fortschritt`, nicht aus
     `/katalog/faecher`: Der Katalog kennt den Nutzer gar nicht und
     liefert `{faecher, bereiche}` — die Liste aller Fächer, ohne Stand
     und ohne Bezug auf die eigene Prüfung. */
  const fortschritt = await api('/fortschritt').catch(() => null);
  faecher = (fortschritt && fortschritt.faecher) || [];
  $('#faecher').innerHTML = faecher.map(x => `
    <button class="karte" data-fach="${sicher(x.fach)}" style="text-align:left">
      <div class="reihe" style="justify-content:space-between">
        <h3>${sicher(x.name)}</h3>${icon('pfeil', 18)}
      </div>
      <p class="bd14" style="margin-top:8px">${sicher(
        (x.bereiche || []).map(b => b.kurzname || b.name).join(' · '))}</p>
      <div class="bar" style="margin-top:14px">
        <i style="width:${Math.round(100 * (x.abgeschlossen || 0) / Math.max(1, x.total || 1))}%"></i></div>
      <p class="sm" style="margin-top:8px">${zahl(x.abgeschlossen || 0)} von
      ${zahl(x.total || 0)} Themen abgeschlossen</p>
    </button>`).join('') || '<p class="bd14">Noch keine Fächer — zuerst Kanton und Schule wählen.</p>';

  $$('[data-fach]').forEach(b => b.onclick = () => oeffneFachEbene(b.dataset.fach));
  $$('[data-uebe]').forEach(b => b.onclick = () =>
    starteUebung(b.dataset.uebe, b.dataset.fach, b.dataset.name));
}

/* --- Die Fach-Ebene ---------------------------------------------------
   Zwischen Fach und Themenbaum liegt bei Deutsch noch eine Ebene: der
   Bereich. «Deutsch» heisst in Zürich Sprachbetrachtung plus
   Textverständnis plus Aufsatz, an der FMS Bern nur den Aufsatz.

   Ein Fach mit genau einem Bereich überspringt diesen Schirm — bei
   Mathematik fallen Fach und Bereich zusammen, und eine Liste mit einem
   einzigen Eintrag ist ein Klick ohne Aussage.                        */
function oeffneFachEbene(fachId) {
  const f = faecher.find(x => x.fach === fachId);
  const alle = (f && f.bereiche) || [];
  if (alle.length <= 1) {
    const b = alle[0];
    if (!b) return;
    return oeffneBereich(b);
  }
  lernZeige('bereiche');
  $('#bereicheTitel').textContent = (f && f.name) || fachId;
  $('#bereicheInhalt').innerHTML = alle.map(b => `
    <button class="karte" data-bereich="${sicher(b.bereich)}" data-art="${sicher(b.art || '')}"
            style="text-align:left">
      <div class="reihe" style="justify-content:space-between">
        <h3>${sicher(b.name)}</h3>${icon('pfeil', 18)}
      </div>
      ${b.art === 'aufsatz'
        ? '<p class="bd14" style="margin-top:8px">Schreiben und korrigieren lassen.</p>'
        : b.art === 'tipps'
        ? '<p class="bd14" style="margin-top:8px">Ablauf, Tipps und Redemittel — dieser Prüfungsteil lässt sich nicht antippen.</p>'
        : `<div class="bar" style="margin-top:14px"><i style="width:${
             Math.round(100 * (b.abgeschlossen || 0) / Math.max(1, b.total || 1))}%"></i></div>
           <p class="sm" style="margin-top:8px">${zahl(b.abgeschlossen || 0)} von
           ${zahl(b.total || 0)} Themen abgeschlossen</p>`}
    </button>`).join('');
  $$('[data-bereich]').forEach(b => b.onclick = () =>
    oeffneBereich({ id: b.dataset.bereich, art: b.dataset.art }));
  $('#zurueckVonBereichen').onclick = () => lernZeige('uebersicht');
}

/** Ein Bereich führt je nach `art` woandershin. Der Rückfall auf den
 *  Themenbaum wäre hier falsch: Ein Aufsatzbereich hat keinen, und ein
 *  Tipps-Bereich verspräche Aufgaben, die es nicht gibt. */
function oeffneBereich(b) {
  if (b.art === 'aufsatz') return lernZeige('aufsatz');
  if (b.art === 'tipps')   return oeffneTipps(b.id);
  return oeffneFach(b.id);
}

/* --- Ein Bereich ------------------------------------------------------ */
async function oeffneFach(id) {
  lernZeige('fach');
  const baum = await api('/katalog/themen?fach=' + encodeURIComponent(id)).catch(() => null);
  $('#fachTitel').textContent = (baum && baum.name) || id;
  $('#fachZeile').textContent = baum && baum.oberthemen
    ? `${zahl(baum.oberthemen.length)} Oberthemen. Alle sind von Anfang an offen.` : '';

  /* Zuerst nur die Oberthemen; die Unterthemen klappen über den Pfeil
     auf — wie in der App. Eine Liste mit 87 Zeilen findet niemand. */
  $('#themenbaum').innerHTML = ((baum && baum.oberthemen) || []).map((o, i) => `
    <details class="karte" style="margin-bottom:12px" ${i === 0 ? 'open' : ''}>
      <summary style="cursor:pointer;list-style:none">
        <div class="reihe" style="justify-content:space-between">
          <h3>${sicher(o.name)}</h3>
          <span class="chip">${zahl((o.unterthemen || []).length)} Themen</span>
        </div>
      </summary>
      <div class="stapel eng" style="margin-top:16px">
        ${(o.unterthemen || []).map(u => u.hatAufgaben === false ? `
          <div class="karte eng" style="opacity:.5">
            <b class="stark">${sicher(u.name)}</b>
            <div class="sm">Aufgaben folgen</div>
          </div>` : `
          <button class="karte eng" data-uebe="${sicher(u.code)}"
                  data-fach="${sicher(id)}" data-name="${sicher(u.name)}"
                  style="text-align:left">
            <div class="reihe" style="justify-content:space-between">
              <div><b class="stark">${sicher(u.name)}</b>
                <div class="sm">${zahl(u.pflichtset || 20)} Pflichtaufgaben</div></div>
              ${icon('pfeil', 16)}
            </div>
          </button>`).join('')}
      </div>
    </details>`).join('');
  $$('[data-uebe]').forEach(b => b.onclick = () =>
    starteUebung(b.dataset.uebe, b.dataset.fach, b.dataset.name));
  $('#zurueckUebersicht').onclick = () => lernZeige('uebersicht');
}

/* --- Tipps: Hörverstehen und mündliche Prüfungen ----------------------
   Es gibt Prüfungsteile, die man nicht antippen kann. Ein Video hat die
   Website nicht, ein Gegenüber auch nicht. Was sie hat, ist das
   Verfahren: was in welcher Reihenfolge geschieht, worauf es dabei
   ankommt und welche Sätze man vorher können sollte.

   Der Schirm verspricht keine Aufgaben und sagt darum auch nie «Aufgaben
   folgen» — er zeigt zum Schluss die Unterthemen, die sich sehr wohl
   üben lassen (§3.1.1).                                                */
async function oeffneTipps(bereich) {
  lernZeige('tipps');
  $('#tippsInhalt').innerHTML = '<p class="bd">Wird geladen …</p>';
  const t = await api('/katalog/tipps?bereich=' + encodeURIComponent(bereich))
                  .catch(() => null);
  if (!t) {
    $('#tippsInhalt').innerHTML = `<div class="karte"><p class="bd">
      Für diesen Prüfungsteil ist noch keine Seite hinterlegt.</p></div>`;
    return;
  }
  $('#tippsInhalt').innerHTML = `
    <p class="eyebrow">${sicher(t.eyebrow || '')}</p>
    <h1 style="margin-top:4px">${sicher(t.titel || '')}</h1>
    <p class="bd" style="margin-top:12px;max-width:60ch">${sicher(t.einleitung || '')}</p>

    ${(t.ablauf || []).length ? `
      <p class="eyebrow" style="margin-top:32px">So läuft die Prüfung ab</p>
      <div class="stapel eng" style="margin-top:12px">
        ${t.ablauf.map((a, i) => `
          <div class="karte eng">
            <div class="reihe" style="align-items:flex-start;gap:12px">
              <span class="kuerzel">${i + 1}</span>
              <div style="flex:1">
                <b class="stark">${sicher(a.titel || a.was || '')}</b>
                ${a.dauer ? `<span class="chip" style="margin-left:8px">${sicher(a.dauer)}</span>` : ''}
                <p class="sm" style="margin-top:6px">${sicher(a.text || a.beschreibung || '')}</p>
              </div>
            </div>
          </div>`).join('')}
      </div>` : ''}

    ${(t.abschnitte || []).map(ab => `
      <p class="eyebrow" style="margin-top:32px">${sicher(ab.titel || '')}</p>
      <div class="stapel eng" style="margin-top:12px">
        ${(ab.tipps || []).map(x => `
          <div class="karte eng">
            <b class="stark">${sicher(x.regel || '')}</b>
            <p class="sm" style="margin-top:6px">${sicher(x.warum || '')}</p>
          </div>`).join('')}
      </div>`).join('')}

    ${(t.redemittel || []).length ? `
      <p class="eyebrow" style="margin-top:32px">Zum Auswendiglernen</p>
      <div class="stapel eng" style="margin-top:12px">
        ${t.redemittel.map(r => typeof r === 'string'
          ? `<p class="sm">${sicher(r)}</p>`
          : `<div class="karte eng"><b class="stark">${sicher(r.zweck || r.abschnitt || '')}</b>
             ${(r.saetze || []).map(s => `<p class="sm" style="margin-top:6px">${sicher(s)}</p>`).join('')}
             </div>`).join('')}
      </div>` : ''}

    ${(t.uebungen || []).length ? `
      <p class="eyebrow" style="margin-top:32px">Das lässt sich üben</p>
      <div class="stapel eng" style="margin-top:12px">
        ${t.uebungen.map(u => `
          <button class="karte eng" data-uebe="${sicher(u.code || u.unterthema || '')}"
                  data-fach="${sicher(u.fach || '')}" data-name="${sicher(u.name || '')}"
                  style="text-align:left">
            <div class="reihe" style="justify-content:space-between">
              <div><b class="stark">${sicher(u.name || u.code || '')}</b>
                ${u.warum ? `<div class="sm">${sicher(u.warum)}</div>` : ''}</div>
              ${icon('pfeil', 16)}
            </div>
          </button>`).join('')}
      </div>` : ''}`;

  $$('#tippsInhalt [data-uebe]').forEach(b => b.onclick = () =>
    starteUebung(b.dataset.uebe, b.dataset.fach, b.dataset.name));
  $('#zurueckVonTipps').onclick = () => lernZeige('bereiche');
}

/* --- Übung -----------------------------------------------------------
   Der ganze Ablauf steht in `uebung.js`: Set holen, zeichnen, prüfen
   lassen, Rückmeldung. Hier bleibt nur der Einstieg. */
function starteUebung(unterthema, fach, titel) {
  uebungStarten(fach, unterthema, titel);
}

/* --- Fortschritt, Fehler, Pfad, Selbsttest, Einstellungen ------------- */
async function zeichneFortschritt() {
  const f = await api('/fortschritt').catch(() => null);
  const pflicht = ((f && f.faecher) || []).reduce((s, x) => ({
    geloest: s.geloest + (x.pflichtGeloest || 0),
    total: s.total + (x.pflichtTotal || 0),
  }), { geloest: 0, total: 0 });
  /* Jede Kennzahl trägt Zeitraum und Fachbezug (§6, Screen 23) — und
     keine Prozentzahl als Hauptaussage. */
  $('#fortschrittInhalt').innerHTML = f ? `
    <div class="raster vier">
      <div class="karte"><p class="eyebrow">Themen abgeschlossen</p>
        <div class="num2 zahl">${zahl(f.themenAbgeschlossen || 0)}</div>
        <p class="sm">von ${zahl(f.themenTotal || 0)} · alle Fächer, seit Beginn</p></div>
      <div class="karte"><p class="eyebrow">Pflichtaufgaben</p>
        <div class="num2 zahl">${zahl(pflicht.geloest)}</div>
        <p class="sm">von ${zahl(pflicht.total)} · alle Fächer, seit Beginn</p></div>
      <div class="karte"><p class="eyebrow">Stärkstes Thema</p>
        <div class="h3">${sicher((f.staerkstes || {}).name || '–')}</div>
        <p class="sm">${sicher((f.staerkstes || {}).fachName || '')}${
          f.staerkstes ? ` · ${zahl(f.staerkstes.quote)} % aus ${zahl(f.staerkstes.versuche)} Versuchen` : ''}</p></div>
      <div class="karte"><p class="eyebrow">Schwächstes Thema</p>
        <div class="h3">${sicher((f.schwaechstes || {}).name || '–')}</div>
        <p class="sm">${sicher((f.schwaechstes || {}).fachName || '')}${
          f.schwaechstes ? ` · ${zahl(f.schwaechstes.quote)} % aus ${zahl(f.schwaechstes.versuche)} Versuchen` : ''}</p></div>
    </div>
    ${f.aussage ? `<div class="hinweis gut" style="margin-top:20px">${icon('chart', 18)}
      <div>${sicher(f.aussage)}</div></div>` : ''}

    <p class="eyebrow" style="margin-top:30px">Je Fach</p>
    <div class="stapel eng" style="margin-top:12px">
      ${(f.faecher || []).map(x => `
        <div class="karte eng">
          <div class="reihe" style="justify-content:space-between">
            <b class="stark">${sicher(x.name)}</b>
            <span class="sm">${zahl(x.abgeschlossen)} von ${zahl(x.total)} Themen</span>
          </div>
          <div class="bar" style="margin-top:10px"><i style="width:${
            Math.round(100 * (x.abgeschlossen || 0) / Math.max(1, x.total || 1))}%"></i></div>
          <p class="sm" style="margin-top:8px">${sicher(
            (x.bereiche || []).map(b => `${b.kurzname}: ${b.abgeschlossen}/${b.total}`).join(' · '))}</p>
        </div>`).join('')}
    </div>`
    : '<p class="bd14">Noch keine Daten. Nach der ersten Übung steht hier etwas.</p>';
}

async function zeichneFehler() {
  const liste = await api('/fehler').catch(() => []);
  /* Gruppiert nach Unterthema — im Archiv sucht man nach Themen, nicht
     nach Aufgaben. Die Nummer der Aufgabe steht hier und NUR hier: unter
     der Aufgabe selbst wäre sie das Erste, was einer Schülerin
     entgegenspringt, und sie erklärt sich nicht (§9). */
  $('#fehlerInhalt').innerHTML = (liste && liste.length) ? liste.map(g => `
    <div class="karte" style="margin-bottom:12px">
      <b class="stark">${sicher(g.name || g.unterthema || '')}</b>
      <div class="stapel eng" style="margin-top:12px">
        ${(g.eintraege || []).map(e => `
          <div class="reihe" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div style="flex:1;min-width:200px">
              <div class="sm">${sicher(e.stamm || '')}</div>
              <div class="sm" style="color:var(--red)">${sicher(e.denkfehler || '')}</div>
            </div>
            <div class="reihe" style="gap:8px">
              <span class="chip">${sicher(e.aufgabeRef || '')}</span>
              <button class="btn bs klein"
                data-nochmal="${sicher(e.aufgabeRef || '')}">Nochmal</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('')
    : `<div class="karte" style="text-align:center;padding:36px">
        <p class="bd">Noch keine Fehler. Das ist entweder sehr gut oder sehr früh.</p></div>`;
  /* Der Server stellt die Aufgabe aus ihrer Ref wieder her — genau
     dieselbe, mit denselben Zahlen. Dafuer speichern wir Refs statt
     Aufgaben (§2.4). */
  $$('[data-nochmal]').forEach(b => b.onclick = async () => {
    const a = await api('/fehler/nochmal', { body: { aufgabeRef: b.dataset.nochmal } })
                    .catch(e => { fehlerZeigen('#lernMeldung', e); return null; });
    if (!a) return;
    /* Dieselbe Ref ergibt exakt dieselbe Aufgabe — mit denselben Zahlen,
       auch Wochen später und auf jedem Gerät. Genau dafür speichern wir
       Refs statt Aufgaben (§2.4). */
    lernZeige('uebung');
    $('#uebungTitel').textContent = 'Aus dem Fehlerarchiv';
    lauf = { id: 'archiv', aufgaben: [a], nr: 0, richtig: 0, versuche: 0,
             zustand: Antwort.leer() };
    aufgabeZeichnen();
  });
}

/* --- Der Lernpfad -----------------------------------------------------
   Er beantwortet die Frage, die jedes Kind und jedes Elternteil zuerst
   stellt: **Reicht die Zeit?** Offene Pflichtaufgaben geteilt durch die
   Wochen bis zur Prüfung.

   Der Pfad ist selbstheilend: Er wird bei jedem Aufruf neu gerechnet, es
   gibt keinen gespeicherten Plan, der veralten könnte. Wer eine Woche
   auslässt, findet keinen roten Rückstand vor, sondern ein etwas
   grösseres Pensum in den übrigen Wochen (§5.5).

   Die Felder hier hiessen einmal `wochenpensum` und `abschnitte`. So
   heissen sie nirgends: Der Server liefert `pensumDieseWoche`, `etappen`
   und `wochen`. Der Schirm zeigte darum «0 Pflichtaufgaben» und keinen
   einzigen Abschnitt — und sah dabei aus, als sei einfach nichts zu tun.
   Genau die leere Karte, die ohne Compiler niemand bemerkt.           */
async function zeichnePfad() {
  const p = await api('/lernpfad').catch(() => null);

  if (!p || !p.aktiv) {
    $('#pfadInhalt').innerHTML = `
      <div class="karte">
        <p class="bd">${sicher((p && p.grund) || 'Ohne Prüfungstermin kann der '
          + 'Pfad kein Pensum rechnen. Setz den Termin in den Einstellungen.')}</p>
        <div class="knopfreihe" style="margin-top:16px">
          <button class="btn bs klein" id="pfadZuEinstellungen">Termin setzen</button>
        </div>
      </div>`;
    const k = $('#pfadZuEinstellungen');
    if (k) k.onclick = () => lernZeige('einstellungen');
    return;
  }

  const wochen = p.wochen || [];
  const dieseWoche = wochen.find(w => w.istDieseWoche) || wochen[0];

  $('#pfadInhalt').innerHTML = `
    <div class="dunkel">
      <p class="eyebrow">Diese Woche</p>
      <div class="num zahl">${zahl(p.pensumDieseWoche || 0)}</div>
      <p class="bd14">Pflichtaufgaben — ${zahl(p.geloestDieseWoche || 0)} davon
      hast du schon</p>
      <p class="bd14" style="margin-top:12px">${sicher(p.hinweis || '')}</p>
    </div>

    <p class="eyebrow" style="margin-top:30px">Die vier Abschnitte</p>
    <div class="stapel eng" style="margin-top:12px">
      ${(p.etappen || []).map(e => `
        <div class="karte eng">
          <div class="reihe" style="justify-content:space-between">
            <b class="stark">${sicher(e.nummer)} · ${sicher(e.titel)}</b>
            <span class="chip">${e.vonWoche
              ? `Woche ${zahl(e.vonWoche)}–${zahl(e.bisWoche)}`
              : 'keine Zeit mehr dafür'}</span>
          </div>
          <p class="bd14" style="margin-top:8px">${sicher(e.beschreibung)}</p>
          ${e.total ? `<div class="bar" style="margin-top:12px"><i style="width:${
            Math.round(100 * e.abgeschlossen / e.total)}%"></i></div>
            <p class="sm" style="margin-top:8px">${zahl(e.abgeschlossen)} von
            ${zahl(e.total)} Themen abgeschlossen</p>` : ''}
        </div>`).join('')}
    </div>

    <p class="eyebrow" style="margin-top:30px">Woche für Woche</p>
    <div class="wochenlinie" style="margin-top:14px">
      ${wochen.map(w => `
        <div class="woche ${w.istDieseWoche ? 'jetzt' : ''} ${
          w.istVergangen ? 'vorbei' : ''}">
          <div class="reihe" style="justify-content:space-between">
            <b class="stark">${sicher(w.titel)}</b>
            <span class="sm">${sicher(kurzDatum(w.von))} – ${sicher(kurzDatum(w.bis))}</span>
          </div>
          ${w.auftrag ? `<p class="sm" style="margin-top:6px">${sicher(w.auftrag)}</p>` : ''}
          ${(w.themen || []).length ? `
            <p class="sm" style="margin-top:6px">${zahl(w.pensum)} Pflichtaufgaben:
            ${w.themen.map(t => sicher(t.name)).join(' · ')}</p>` : ''}
        </div>`).join('')}
    </div>`;

  /* Das Ziel der ganzen Rechnung steht nur da, wenn es etwas zu tun gibt.
     «0 Pflichtaufgaben» als Kopfzahl wäre kein Ergebnis, sondern ein
     Fehler, der wie ein Ergebnis aussieht. */
  if (dieseWoche && !dieseWoche.pensum && !(p.offenTotal || 0)) {
    $('#pfadInhalt').insertAdjacentHTML('afterbegin',
      `<div class="hinweis gut" style="margin-bottom:18px">${icon('haken', 18)}
       <div>Alle Pflichtsets sind voll. Jetzt zählt Wiederholen.</div></div>`);
  }
}

/** Ein kurzes Datum für die Wochenlinie: «13.10.» — mehr braucht eine
 *  Zeile nicht, die zwanzigmal untereinander steht. */
function kurzDatum(d) {
  const x = (d instanceof Date) ? d : new Date(d);
  return `${x.getDate()}.${x.getMonth() + 1}.`;
}

async function zeichneEinstellungen() {
  $('#einstellungenInhalt').innerHTML = `
    <div class="karte">
      <h3>Prüfung und Kanton</h3>
      <p class="bd14" style="margin-top:6px">
        ${profil ? sicher([profil.kanton, profil.schultyp].filter(Boolean).join(' · ')) : '–'}
        ${profil && profil.pruefungsdatum
          ? ' · Termin ' + sicher(datum(profil.pruefungsdatum)) : ''}</p>
    </div>
    <div class="karte" style="margin-top:14px">
      <h3>Konto</h3>
      <p class="bd14" style="margin-top:6px">${DEMO || !(profil && profil.anbieter)
        ? 'Du lernst ohne Konto. Der Fortschritt bleibt <b class="stark">auf diesem '
          + 'Gerät</b> — er wandert mit, sobald du ein Konto verknüpfst, aber er '
          + 'kommt nicht von selbst auf dein Telefon.'
        : 'Der Fortschritt liegt am Konto. Wer sich am Telefon mit demselben Konto '
          + 'anmeldet, sieht denselben Stand.'}</p>
      <div class="knopfreihe">
        <button class="btn bs klein" id="abmeldenLern">Abmelden</button>
        <button class="btn bt klein" id="fortschrittLoeschen">Fortschritt löschen</button>
      </div>
    </div>`;
  const a = $('#abmeldenLern');
  if (a) a.onclick = async () => { await abmelden(); location.href = 'index.html'; };
  /* Auf einem Schulzimmer-Rechner übt nicht immer dieselbe Person. Wer
     ohne Konto gelernt hat, muss seinen Stand löschen können, ohne den
     Browser aufzuräumen. */
  const l = $('#fortschrittLoeschen');
  if (l) l.onclick = () => {
    if (typeof Fortschritt === 'undefined') return;
    Fortschritt.loeschen();
    l.textContent = 'Gelöscht';
    setTimeout(() => lernZeige('uebersicht'), 900);
  };
}

/* --- Start ------------------------------------------------------------ */
seiteBereit(async () => {
  if (!$('.werkflaeche')) return;
  $('.seitenleiste').addEventListener('click', e => {
    const a = e.target.closest('a[data-lern]');
    if (!a) return;
    e.preventDefault();
    history.replaceState({}, '', '#' + a.dataset.lern);
    lernZeige(a.dataset.lern);
  });
  profil = await sitzungAufnehmen().catch(() => null);
  if (!profil) { lernZeige('anmelden'); return; }
  lernZeige((location.hash || '#uebersicht').slice(1));
});
