/* StudySwiss — Vorschau ohne Server
   ==================================================================
   Damit man die Website anschauen und die ganze Schul-Strecke
   durchklicken kann, ohne dass ein Backend läuft. Dieselbe Rolle wie
   `StudySwiss-Vorschau.html` für die App.

   Zwei Regeln, die hier zählen:

   1. **Die Demo lügt nie über sich selbst.** Jede Offerte und jede
      Rechnung aus diesem Modul trägt `muster: true`, und die
      Oberfläche schreibt es sichtbar aufs Papier. Eine Musterrechnung,
      die aussieht wie eine echte, wird irgendwann bezahlt — und dann
      ist das Geld bei niemandem.
   2. **Die Inhalte sind echt.** Kantone, Fächer und Themen kommen aus
      `demo-daten.js`, das `website_bauen.py` aus den Ressourcen
      erzeugt. Erfundene Kantone in der Vorschau wären eine Falle: Man
      prüft die Seite, findet sie gut, und im Betrieb steht etwas
      anderes da.                                                      */

const DEMO_SPEICHER = 'studyswiss.vorschau';

function demoStand() {
  try { return JSON.parse(sessionStorage.getItem(DEMO_SPEICHER)) || {}; }
  catch (e) { return {}; }
}
function demoMerken(stand) {
  try { sessionStorage.setItem(DEMO_SPEICHER, JSON.stringify(stand)); } catch (e) {}
  return stand;
}

/** Lesbare Kennungen. Kein I, O, 1 und 0 — wer einen Code von einem
 *  Blatt abtippt, verwechselt sie sonst, und dann ruft die Schule an. */
const ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function demoCode(laenge = 8) {
  let s = '';
  for (let i = 0; i < laenge; i++) s += ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];
  return 'SSW-' + s.slice(0, 4) + '-' + s.slice(4);
}
function demoNummer(praefix) {
  const j = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `${praefix}-${j}-${n}`;
}

/** Die 27-stellige QR-Referenz mit Prüfziffer nach Modulo 10 rekursiv.
 *  Auch im Muster richtig gerechnet: Eine Referenz mit falscher
 *  Prüfziffer sähe echt aus und wäre es nicht — und der Unterschied
 *  fiele erst der Bank auf. */
const M10 = [[0,9,4,6,8,2,7,1,3,5],[9,4,6,8,2,7,1,3,5,0],[4,6,8,2,7,1,3,5,0,9],
             [6,8,2,7,1,3,5,0,9,4],[8,2,7,1,3,5,0,9,4,6],[2,7,1,3,5,0,9,4,6,8],
             [7,1,3,5,0,9,4,6,8,2],[1,3,5,0,9,4,6,8,2,7],[3,5,0,9,4,6,8,2,7,1],
             [5,0,9,4,6,8,2,7,1,3]];
function pruefziffer(ziffern) {
  let uebertrag = 0;
  for (const z of String(ziffern)) uebertrag = M10[uebertrag][+z];
  return [0,9,8,7,6,5,4,3,2,1][uebertrag];
}
function qrReferenz(laufnummer) {
  const kern = String(laufnummer).replace(/\D/g, '').padStart(26, '0').slice(-26);
  return kern + pruefziffer(kern);
}
function referenzGruppiert(ref) {
  return String(ref).replace(/^(\d{2})(\d{5})(\d{5})(\d{5})(\d{5})(\d{5})$/,
                             '$1 $2 $3 $4 $5 $6');
}

/* --- Die Demo-Antworten ---------------------------------------------- */
async function demoAntwort(pfad, opt) {
  /* Ein Hauch Wartezeit, damit die Vorschau sich anfühlt wie ein echter
     Aufruf und ein Ladezustand überhaupt sichtbar wird. Wo es kein
     Fenster gibt — in der Prüfung mit JavaScriptCore —, entfällt sie:
     Dort gibt es `setTimeout` zwar, aber keine Schleife, die es je
     aufruft. Die Prüfung liefe ins Leere und sähe aus wie bestanden. */
  if (typeof document !== 'undefined') await new Promise(r => setTimeout(r, 120));
  const [weg, frage] = pfad.split('?');
  const p = new URLSearchParams(frage || '');
  const koerper = opt && opt.body;
  const stand = demoStand();
  const D = (typeof DEMO_DATEN !== 'undefined') ? DEMO_DATEN : {};

  /* --- Konto und Katalog --- */
  if (weg === '/profil')            return stand.profil || null;
  if (weg === '/auth/gast' || weg === '/auth/web/start') {
    stand.profil = stand.profil || demoProfil();
    demoMerken(stand);
    return { accessToken: 'vorschau', nutzer: stand.profil };
  }
  if (weg === '/profil/aendern' && koerper) {
    stand.profil = Object.assign(stand.profil || demoProfil(), koerper);
    demoMerken(stand); Z.profil = stand.profil;
    return stand.profil;
  }
  if (weg === '/katalog/kantone')   return D.kantone || [];
  if (weg === '/katalog/faecher')   return demoFaecher();
  if (weg.startsWith('/katalog/themen')) return demoBaum(p.get('fach'));

  /* --- Lernen ---------------------------------------------------------
     Ohne Server zieht die Vorschau die Aufgaben selbst — mit derselben
     Engine, die auch die App benutzt (`js/engine.js`, wörtlich aus der
     App-Vorschau geholt). Dieselbe `templateId:seed` ergibt hier
     dieselbe Aufgabe wie am Telefon; das ist keine Nachbildung, sondern
     dieselbe Rechnung.

     Geprüft wird hier auch die Antwort, weil kein Server da ist. Im
     Betrieb geschieht das auf dem Server und muss es: Die Lösung reist
     nie zum Client (§4.10). Darum steht dieser Code nur hier und nicht
     in `uebung.js`. */
  if (weg === '/uebung/vorschlag') return demoVorschlag();

  if (weg === '/uebung/start') {
    /* `setZiehen` braucht ein bestimmtes Unterthema — ohne eines gäbe es
       kein Set. Kommt keines mit (etwa beim Knopf «Üben» ohne Auswahl),
       nimmt die Vorschau das, was auch «Zuerst dran» vorschlagen würde. */
    let unterthema = (koerper || {}).unterthema || null;
    let fach = (koerper || {}).fach || null;
    if (!unterthema) {
      /* `demoVorschlag` liefert die Form des Servers: eine Liste mit
         `zuerst` und `danach`. Wer hier das Objekt selbst nimmt, holt
         sich `undefined` als Unterthema — und es kommt kein Set
         zustande. */
      const v = demoVorschlag().zuerst;
      if (!v) return null;
      unterthema = v.unterthema; fach = fach || v.fach;
    }
    const set = setZiehen(fach || demoFachVon(unterthema), unterthema, 10);
    if (!set || !set.length) return null;
    stand.lauf = { id: 'vorschau-' + Date.now(), refs: set.map(a => a.ref) };
    demoMerken(stand);
    const u = unterthemaVon(fach || demoFachVon(unterthema), unterthema);
    return {
      id: stand.lauf.id,
      unterthema, unterthemaName: (u && u.name) || unterthema,
      einfuehrung: null,
      aufgaben: set.map(demoOhneLoesung),
    };
  }

  if (/^\/uebung\/[^/]+\/antwort$/.test(weg)) {
    /* Die Antwort kommt FLACH, so wie `model/Dto.kt` sie erwartet:
       `{aufgabeRef, eingabe, optionId, …}`. Sie war einmal unter
       `antwort` verschachtelt — der Server hätte davon kein einziges
       Feld gesehen und jede Antwort als leer bewertet. */
    const a = demoAufgabeZu((koerper || {}).aufgabeRef);
    if (!a) return { richtig: false, feedback: 'Diese Aufgabe kennt die Vorschau nicht mehr.',
                     diagnoseId: null, loesung: '', loesungsweg: [] };
    const ergebnis = bewerteAlles(a, demoAntwortZurueck(a, koerper || {}));
    Fortschritt.verbuchen(a, ergebnis);
    const u = unterthemaVon(a.fach, (a.unterthemen || [a.unterthema])[0]);
    return {
      richtig: !!ergebnis.richtig,
      feedback: ergebnis.feedback || '',
      diagnoseId: ergebnis.diagnoseId || null,
      loesung: ergebnis.richtig ? '' : (a.loesungText || ''),
      loesungsweg: ergebnis.richtig ? [] : (a.loesungsweg || []),
      geloestImThema: Fortschritt.geloest(a.fach, (a.unterthemen || [a.unterthema])[0]),
      pflichtset: (u && u.pflichtset) || 20,
      feldFehler: ergebnis.feldFehler || [],
    };
  }

  if (/^\/uebung\/[^/]+\/hinweis$/.test(weg)) {
    const a = demoAufgabeZu((koerper || {}).aufgabeRef);
    const stufe = Math.max(1, (koerper || {}).stufe || 1);
    const alle = (a && a.hinweise) || [];
    return { stufe, text: alle[stufe - 1] || 'Mehr Hinweise gibt es nicht.',
             weitere: stufe < alle.length };
  }
  if (/^\/uebung\/[^/]+\/abschluss$/.test(weg)) return { fertig: true };

  if (weg === '/fortschritt') return demoFortschritt();
  if (weg === '/fehler') return demoFehlerarchiv();
  if (weg === '/fehler/nochmal') {
    const a = demoAufgabeZu((koerper || {}).aufgabeRef);
    return a ? demoOhneLoesung(a) : null;
  }
  if (weg === '/lernpfad') return demoLernpfad();
  /* --- Selbsttest ------------------------------------------------------
     Der Selbsttest ist keine Übung mit anderer Beschriftung. Drei Dinge
     sind wirklich anders, und alle drei stehen in §6, Screen 21:
     die Uhr läuft, es gibt kein Feedback zwischendurch, und **bewertet
     wird erst bei der Abgabe, alles auf einmal**. Darum nimmt
     `/antwort` hier nur entgegen und schweigt; gerechnet wird in
     `/abgabe`. Wer zwischendurch bewertete, zählte eine geänderte
     Antwort zweimal. */
  if (weg === '/selbsttest/faecher' || weg === '/standort/faecher')
    return pruefbareFaecher().map(f => ({
    fach: f, name: fachName(f),
    untertitel: (fachInfo(f) || {}).untertitel || '',
    icon: (fachInfo(f) || {}).icon || '',
    bereiche: bereicheVon(f).map(bereichKurz),
    bereichIds: bereicheVon(f),
    themen: bereicheVon(f).reduce((a, b) => a + bespielt(b).size, 0),
    /* Der Aufsatz gehört an der Prüfung zum Fach, ist aber keine Aufgabe,
       die man in einer halben Stunde ankreuzt. Wo es einen gibt, sagt das
       der Hinweis — verschweigen wäre eine Lücke im Bild der Prüfung. */
    aufsatz: bereicheVonFach(f).some(b => bereichInfo(b)?.art === 'aufsatz'),
  }));

  if (weg.startsWith('/selbsttest/bedingungen')) {
    const f = p.get('fach') || null;
    return Object.assign({ fach: f }, bedingungen(f));
  }

  if (weg === '/selbsttest/start' && koerper) {
    const s = demoTestsatz(koerper.fach, koerper.umfang, koerper.themen);
    if (!s) return null;
    stand.test = { id: 'test-' + Date.now(), fach: koerper.fach,
                   umfang: koerper.umfang, refs: s.aufgaben.map(a => a.ref),
                   gegeben: [] };
    demoMerken(stand);
    return { id: stand.test.id, fach: koerper.fach, fachName: fachName(koerper.fach),
             umfang: koerper.umfang, minuten: s.minuten, bedingungen: s.B,
             aufgaben: s.aufgaben.map(demoOhneLoesung) };
  }

  if (/^\/selbsttest\/[^/]+\/antwort$/.test(weg)) {
    /* Nur merken. Keine Rückmeldung — das ist der Punkt. */
    const t = stand.test;
    if (!t) return { angenommen: false };
    const i = t.refs.indexOf((koerper || {}).aufgabeRef);
    if (i < 0) return { angenommen: false };
    t.gegeben[i] = koerper || null;
    demoMerken(stand);
    return { angenommen: true, beantwortet: t.gegeben.filter(Boolean).length };
  }

  if (/^\/selbsttest\/[^/]+\/abgabe$/.test(weg)) {
    const t = stand.test;
    if (!t) return null;
    const e = demoAuswerten(t.refs, t.gegeben, t.fach);
    stand.tests = (stand.tests || []).concat([{ ...e, zeit: Date.now() }]);
    stand.test = null;
    demoMerken(stand);
    return e;
  }
  if (weg === '/selbsttest/versuche') return stand.tests || [];

  /* --- Standortbestimmung ----------------------------------------------
     24 Aufgaben JE FACH, quer über alle Oberthemen. Getrennt, weil
     Mathematik und Deutsch an der Prüfung getrennt geprüft werden — eine
     gemeinsame Zahl sagt niemandem, wo er steht (§4.7). */
  if (weg === '/standort/start') {
    /* Das Fach steht in der FRAGEZEILE, nicht im Körper — so nimmt die
       Route es entgegen. */
    const gewuenscht = p.get('fach') || (koerper || {}).fach;
    const fach = pruefbareFaecher().includes(gewuenscht)
      ? gewuenscht : pruefbareFaecher()[0];
    if (!fach) return null;
    const bereiche = bereicheVon(fach);
    const proBereich = Math.max(6, Math.floor(24 / Math.max(1, bereiche.length)));
    let aufgaben = [];
    bereiche.forEach(b => {
      aufgaben = aufgaben.concat(mischsatz(b, [...bespielt(b)].sort(), proBereich));
    });
    if (!aufgaben.length) return null;
    aufgaben = aufgaben.slice(0, 24);
    stand.standort = { id: 'standort-' + Date.now(), fach,
                       refs: aufgaben.map(a => a.ref), gegeben: [] };
    demoMerken(stand);
    return { id: stand.standort.id, fach, fachName: fachName(fach),
             minuten: 25, aufgaben: aufgaben.map(demoOhneLoesung) };
  }

  if (/^\/standort\/[^/]+\/antwort$/.test(weg)) {
    const s = stand.standort;
    if (!s) return { angenommen: false };
    const i = s.refs.indexOf((koerper || {}).aufgabeRef);
    if (i < 0) return { angenommen: false };
    s.gegeben[i] = koerper || null;
    demoMerken(stand);
    return { angenommen: true };
  }

  if (/^\/standort\/[^/]+\/abschluss$/.test(weg)) {
    const s = stand.standort;
    if (!s) return null;
    const start = demoStartpunkt(s.refs, s.gegeben, s.fach);
    stand.standort = null;
    demoMerken(stand);
    return start;
  }

  /* --- Aufsatz ----------------------------------------------------------
     Arten und Themen kommen aus den Ressourcen. Die Korrektur nicht: Sie
     ist die einzige Stelle im ganzen Haus, an der ein Sprachmodell
     arbeitet (§2.5), und ohne Server gibt es keines. Die Vorschau sagt
     das darum geradeheraus, statt eine Rückmeldung zu erfinden. Eine
     erfundene Korrektur wäre schlimmer als keine: Sie sieht aus wie
     eine Beurteilung und ist keine. */
  if (weg === '/aufsatz/arten') return demoAufsatzArten();
  if (weg.startsWith('/aufsatz/themen')) {
    const sorte = demoSorteVon(p.get('art'));
    return (typeof AUFSATZ === 'undefined' ? [] : AUFSATZ)
      .filter(t => !sorte || t.sorte === sorte);
  }
  if (weg === '/aufsatz/entwurf' && koerper) {
    stand.aufsatz = Object.assign({ id: 'entwurf-1' }, stand.aufsatz || {}, koerper,
                                  { gespeichert: Date.now() });
    demoMerken(stand);
    return stand.aufsatz;
  }
  if (/^\/aufsatz\/[^/]+\/korrektur$/.test(weg)) {
    /* Eine feste Beispielkorrektur, und der Screen sagt es auch so — genau
       wie die App-Vorschau. Eine erfundene Beurteilung, die nicht als
       solche zu erkennen wäre, ist schlimmer als gar keine: Sie sieht aus
       wie eine Rückmeldung zum eigenen Text und ist keine. */
    return typeof DEMO_KORREKTUR === 'undefined' ? null
         : Object.assign({ muster: true }, DEMO_KORREKTUR);
  }
  if (/^\/aufsatz\/[^/]+$/.test(weg)) return stand.aufsatz || null;

  /* --- Tipps-Seiten -----------------------------------------------------
     Hörverstehen und mündliche Prüfungen. Ein Video hat die Vorschau
     nicht und ein Gegenüber auch nicht — das Verfahren lässt sich
     trotzdem vermitteln (§3.1.1). */
  if (weg.startsWith('/katalog/tipps')) {
    const b = p.get('bereich');
    return (typeof TIPPS === 'undefined' ? null : TIPPS[b]) || null;
  }

  /* --- Preise --- */
  if (weg === '/schule/preise') return null;   // Vorschau-Tabelle gilt

  /* --- Offerte --- */
  if (weg === '/schule/offerte' && koerper) {
    const r = rechne(koerper.anzahl);
    const heute = new Date();
    const offerte = {
      muster: true,
      nummer: demoNummer('OFF'),
      schluessel: demoCode(8).replace(/-/g, ''),
      erstellt: heute.toISOString(),
      gueltigBis: plusTage(heute, PREISE.offerteGueltigTage).toISOString(),
      schule: koerper.schule, kontakt: koerper.kontakt,
      anzahl: r.anzahl, rechnung: r,
      start: koerper.start || heute.toISOString(),
      ende: schuljahrEnde(koerper.start || heute).toISOString(),
      bemerkung: koerper.bemerkung || '',
    };
    stand.offerten = Object.assign(stand.offerten || {}, { [offerte.nummer]: offerte });
    demoMerken(stand);
    return offerte;
  }
  if (weg.startsWith('/schule/offerte/')) {
    const nr = decodeURIComponent(weg.split('/').pop());
    return (stand.offerten || {})[nr] || null;
  }

  /* --- Bestellung: erzeugt Auftrag, Lizenzen und Rechnung --- */
  if (weg === '/schule/bestellung' && koerper) {
    const r = rechne(koerper.anzahl);
    const heute = new Date();
    const laufnummer = Date.now();
    const bestellung = {
      muster: true,
      nummer: demoNummer('BES'),
      schluessel: (stand.schluessel ||= demoCode(8).replace(/-/g, '')),
      erstellt: heute.toISOString(),
      schule: koerper.schule, kontakt: koerper.kontakt,
      rechnungsadresse: koerper.rechnungsadresse || koerper.schule,
      bestellnummer: koerper.bestellnummer || '',
      anzahl: r.anzahl, rechnung: r,
      start: koerper.start || heute.toISOString(),
      ende: schuljahrEnde(koerper.start || heute).toISOString(),
      ausOfferte: koerper.ausOfferte || null,
    };
    const rechnung = {
      muster: true,
      nummer: demoNummer('RG'),
      schluessel: bestellung.schluessel,
      bestellnummer: bestellung.nummer,
      bestellnummerKunde: bestellung.bestellnummer,
      datum: heute.toISOString(),
      faellig: plusTage(heute, PREISE.zahlungsfristTage).toISOString(),
      referenz: qrReferenz(laufnummer),
      bezahlt: false,
      schule: bestellung.schule,
      rechnungsadresse: bestellung.rechnungsadresse,
      anzahl: r.anzahl, rechnung: r,
      start: bestellung.start, ende: bestellung.ende,
    };
    const codes = Array.from({ length: r.anzahl }, (_, i) => ({
      code: demoCode(8),
      eingeloest: i < Math.min(r.anzahl, Math.floor(r.anzahl * 0.0)),
      klasse: '',
    }));
    Object.assign(stand, {
      bestellung, rechnung, codes,
      schluessel: bestellung.schluessel,
      belege: [...(stand.belege || []), { art: 'Rechnung', nummer: rechnung.nummer,
              datum: rechnung.datum, betrag: r.total, bezahlt: false }],
    });
    demoMerken(stand);
    return { bestellung, rechnung };
  }

  /* --- Rechnung, Lizenzen, Bericht, Belege --- */
  if (weg.startsWith('/schule/rechnung/')) return stand.rechnung || null;
  if (weg === '/schule/lizenzen') {
    return { schule: (stand.bestellung || {}).schule || null,
             codes: stand.codes || [],
             start: (stand.bestellung || {}).start,
             ende:  (stand.bestellung || {}).ende };
  }
  if (weg.startsWith('/schule/lizenzen/')) {
    const code = decodeURIComponent(weg.split('/').pop());
    const c = (stand.codes || []).find(x => x.code === code);
    if (c && koerper) {
      if (koerper.klasse !== undefined) c.klasse = koerper.klasse;
      if (koerper.gesperrt !== undefined) c.gesperrt = koerper.gesperrt;
      demoMerken(stand);
    }
    return null;
  }
  if (weg === '/schule/belege')  return stand.belege || [];
  if (weg === '/schule/bericht') return demoBericht(stand, D);

  return null;
}

/**
 * Der Schul-Bericht — und hier ist Vorsicht wichtiger als Vollständigkeit.
 *
 * §2.6: Die Nutzer sind minderjährig. Eine Lehrperson bekommt darum
 * **Kennzahlen über die Klasse**, nie den Stand einer einzelnen
 * Schülerin und nie einen Aufsatztext. Das ist keine technische Hürde,
 * sondern der Grund, warum eine Schule das Werkzeug überhaupt einsetzen
 * darf. Wer hier eine Namensliste mit Trefferquoten hinstellt, macht aus
 * einem Lernmittel ein Überwachungswerkzeug.
 *
 * Was die Lehrperson wirklich braucht, ist ohnehin etwas anderes: die
 * Themen, an denen die Klasse hängt. Das ist aggregiert und didaktisch
 * das Wertvollste, was hier entstehen kann.
 */
const MINDESTGRUPPE = 5;

function demoBericht(stand, D) {
  const codes = stand.codes || [];
  const eingeloest = codes.filter(c => c.eingeloest).length;

  /* Dieselbe Schwelle wie im Backend (`SchulService.MINDESTGRUPPE`).
     Die Vorschau darf hier nicht grosszügiger sein als der Betrieb: Wer
     sie prüft und einen Bericht mit drei Kindern sieht, hält das für die
     Funktion — und im Betrieb steht dann etwas anderes da. */
  if (eingeloest < MINDESTGRUPPE) {
    return {
      muster: true, lizenzen: codes.length, eingeloest,
      aktivLetzteWoche: 0, pflichtaufgabenWoche: 0,
      zeitraum: 'KW ' + kalenderwoche(new Date()),
      schwacheThemen: [],
      hinweis: `Ab ${MINDESTGRUPPE} eingelösten Lizenzen erscheinen hier Kennzahlen. `
             + 'Vorher wären es keine Zahlen über die Gruppe mehr, sondern '
             + 'Aussagen über einzelne Kinder — und die sieht die Schule nie.',
    };
  }

  return {
    muster: true,
    lizenzen: codes.length,
    eingeloest,
    aktivLetzteWoche: Math.round(eingeloest * 0.72),
    pflichtaufgabenWoche: 14,
    zeitraum: 'KW ' + kalenderwoche(new Date()),
    schwacheThemen: (D.schwacheThemen || []),
    hinweis: 'Alle Zahlen beziehen sich auf die ganze Gruppe. Einzelne '
           + 'Schülerinnen und Schüler sind hier nicht sichtbar — auch '
           + 'nicht für die Schule.',
  };
}
/**
 * Die Aufgabe, wie sie der Client sieht — **in der Form des Servers**.
 *
 * Das ist der Punkt, an dem diese Datei am meisten leisten muss. Sie ist
 * nicht «die Engine mit weggelassener Lösung», sondern **die Antwort des
 * Servers**, nachgebaut: dieselben Feldnamen wie `AufgabeDto` in
 * `model/Dto.kt`, dieselben Formen, dieselbe Mischung.
 *
 * Vorher gab sie die Engine-Form weiter — `paare`, `elemente`,
 * `wertetabelle`, `indizes`. Der Server sendet `ziele`, `zuOrdnen`,
 * `tabelle`, `anzahlGesucht`. Die Vorschau lief damit tadellos, und
 * **im Betrieb wäre kein einziges dieser Formate bedienbar gewesen**:
 * Zuordnen, Sortieren, Wertetabelle und Markieren hätten leere oder
 * abstürzende Flächen gezeigt. Eine Vorschau, die sich anders verhält
 * als der Betrieb, ist schlimmer als keine — sie bestätigt einen
 * Fehler, statt ihn zu zeigen.
 *
 * Gestrichen wird alles, woraus sich die Lösung ablesen liesse (§4.10).
 */
function demoOhneLoesung(a) {
  const code = (a.unterthemen || [a.unterthema])[0];
  const u = unterthemaVon(a.fach, code);
  const o = oberthemaVon(a.fach, code);
  const dto = {
    ref: a.ref,
    fach: a.fach,
    unterthema: code,
    unterthemaName: (u && u.name) || '',
    /* Der kleine, leise Titel über der Aufgabe nennt das OBERTHEMA, nicht
       das Unterthema: «Bruchrechnen» statt «Brüche mit ungleichem Nenner
       addieren» — kurz genug, dass die Aufgabe im Blick bleibt. */
    themaKurz: (o && o.name) || '',
    lesetext: a.lesetext || null,
    format: a.format,
    stamm: a.stamm,
    einheit: a.einheit || null,
    optionen: (a.optionen || []).map(x => ({ id: x.id, text: x.text })),
    hinweiseVerfuegbar: (a.hinweise || []).length,
    woerter: a.woerter || [],
    /* Wie viele Wörter gesucht sind, darf der Client wissen — sonst wüsste
       niemand, wann er fertig ist. Welche es sind, nicht. */
    anzahlGesucht:
      (a.format === 'markieren' || a.format === 'kommas') ? (a.indizes || []).length
      : a.format === 'mehrfachauswahl' ? (a.loesungWorte || []).length
      : 0,
    felder: [], gitter: null, ziele: [], elemente: [], zuOrdnen: [],
    tabelle: null, raster: null, zeilen: [],
    darstellung: a.darstellung || null,
  };

  if (a.felder) {
    /* `text: true` heisst «hier gehört ein Wort hin, keine Zahl». Der
       Server leitet es daraus ab, ob das Feld eine Zahlenlösung hat. */
    dto.felder = a.felder.map(f => ({
      name: f.name, label: f.label || f.name, einheit: f.einheit || '',
      text: f.loesung == null,
    }));
  }

  if (a.gitter) {
    dto.gitter = {
      xvon: a.gitter.xvon, xbis: a.gitter.xbis,
      yvon: a.gitter.yvon, ybis: a.gitter.ybis,
      punkte: (a.gitter.punkte || []).map(p => ({ name: p.name, label: p.label })),
      vorgabe: (a.gitter.vorgabe || []).map(v => ({ text: v.text, x: v.x, y: v.y })),
      /* Flach, nicht verschachtelt: Der Server schickt `vonX`/`vonY`, weil
         ein Punktobjekt in der Serialisierung nichts gewinnt. */
      strecken: (a.gitter.strecken || []).map(st => ({
        text: st.text, stil: st.stil,
        vonX: st.von[0], vonY: st.von[1], bisX: st.bis[0], bisY: st.bis[1],
      })),
    };
  }

  /* ZUORDNEN und SORTIEREN: Die Ziele stehen in ihrer festen Reihenfolge,
     die Elemente GEMISCHT. Der Client meldet Ziel-Nummer →
     Anzeigeposition; zurückgerechnet wird über die Mischung, und zwar
     hier, nicht im Client — genau wie auf dem Server. Wer dem Client die
     Mischung gäbe, gäbe ihm die halbe Lösung. */
  if (a.format === 'zuordnen' && a.paare) {
    dto.ziele = a.paare.map((p, i) => ({ id: 'z' + i, text: p.ziel }));
    dto.elemente = (a.mischung || a.paare.map((_, i) => i))
      .map((k, pos) => ({ id: 'e' + pos, text: a.paare[k].element }));
  }
  if (a.format === 'sortieren' && a.elemente) {
    dto.zuOrdnen = (a.mischung || a.elemente.map((_, i) => i))
      .map((k, pos) => ({ id: 's' + pos, text: a.elemente[k].text }));
  }

  if (a.wertetabelle) {
    dto.tabelle = {
      spalten: a.wertetabelle.spalten.map(sp => ({
        name: sp.name, kopf: sp.kopf, von: sp.von, bis: sp.bis })),
      zeilen: (a.wertetabelle.paare || []).length,
    };
  }
  if (a.raster) dto.raster = { spalten: a.raster.spalten, zeilen: a.raster.zeilen };
  if (a.format === 'tabelle_auswahl' && a.zeilen) {
    dto.zeilen = a.zeilen.map((r, i) => ({ id: 'r' + i, text: r.text }));
  }
  return dto;
}

/**
 * Die Antwort des Clients in die Form bringen, die die Engine erwartet.
 *
 * Der Client rechnet in ANZEIGEPOSITIONEN, die Engine in ihren eigenen
 * Nummern. Dazwischen liegt die Mischung, und sie liegt auf dieser
 * Seite — beim Server ebenso (`AufgabenService`, «Der Client meldet
 * Ziel-Nummer → Anzeigeposition»).
 */
function demoAntwortZurueck(a, antwort) {
  const ein = Object.assign({}, antwort || {});
  const mischung = a.mischung || null;
  if (a.format === 'zuordnen' && mischung) {
    const z = {};
    Object.keys(ein.zuordnung || {}).forEach(ziel => {
      const pos = ein.zuordnung[ziel];
      const k = mischung[pos];
      if (k != null) z[ziel] = k;
    });
    ein.zuordnung = z;
  }
  if (a.format === 'sortieren' && mischung) {
    ein.reihenfolge = (ein.reihenfolge || [])
      .map(pos => mischung[pos]).filter(k => k != null);
  }
  /* FÄRBEN heisst beim Server `gefaerbt`; die Engine liest `felder`.
     Zwei Namen für dieselbe Sache sind ein Ärgernis — aber der Name des
     Servers ist der, den der Client kennen muss. */
  if (a.format === 'faerben') ein.felder = ein.gefaerbt || [];
  return ein;
}

/** Ein Profil für die Vorschau. Zürich und die FMS, weil das der
 *  Referenzkanton ist und dort alle drei Bereiche bespielt sind — wer
 *  die Vorschau öffnet, soll etwas zu üben finden. */
function demoProfil() {
  return { vorname: 'Lena', kanton: 'ZH', schultyp: 'fms',
           pruefungsdatum: '2027-03-07', plus: false, muster: true };
}

/** Die volle Aufgabe zu einer Ref — nur hier, wo geprüft wird. */
function demoAufgabeZu(ref) {
  if (!ref) return null;
  const [id, seedTeil] = String(ref).split(':');
  const seed = +seedTeil;
  const vorlage = TEMPLATES.find(t => t.templateId === id);
  if (vorlage) { try { return ziehe(vorlage, seed); } catch (e) { return null; } }
  const block = TEXTBLOECKE.find(t => t.templateId === id);
  if (block) { try { return ziehText(block, seed); } catch (e) { return null; } }
  return null;
}

/** Zu welchem Bereich gehört ein Unterthema? Ohne diese Angabe wüsste
 *  `setZiehen` nicht, in welchem Baum es suchen soll. */
function demoFachVon(code) {
  if (!code) return (meineBereiche()[0] || 'mathematik');
  for (const fach of Object.keys(THEMEN)) {
    if (unterthemaVon(fach, code)) return fach;
  }
  return meineBereiche()[0] || 'mathematik';
}

/** «Zuerst dran» — mit Begründung.
 *
 *  `rangliste()` rechnet die Reihenfolge und schreibt die Begründung
 *  gleich mit; hier wird nichts neu gerechnet. Der Server rechnet
 *  dasselbe (`Scheduler.kt`), und beide müssen dieselbe Reihenfolge
 *  geben — darum wäre eine zweite Rechnung an dieser Stelle genau der
 *  Fehler, den niemand bemerkt. */
function demoVorschlag() {
  const liste = rangliste();
  if (!liste || !liste.length) return { zuerst: null, danach: null };
  /* Die Form des Servers: `VorschlagsListe{zuerst, danach}` mit je einem
     `Vorschlag`. Der Grund heisst dort `begruendung` — hier stand einmal
     `grund`, und der Screen zeigte eine Karte ohne Begründung. Ein
     Vorschlag ohne Grund ist eine Anweisung, und die befolgt niemand
     zweimal (§4.6). */
  const alsVorschlag = b => b && {
    unterthema: b.unterthema, name: b.name,
    oberthema: (oberthemaVon(b.fach, b.unterthema) || {}).name || '',
    fach: b.fach, begruendung: b.begruendung || '',
    geloest: b.geloest || 0, pflichtset: b.pflichtset || 20,
  };
  return { zuerst: alsVorschlag(liste[0]), danach: alsVorschlag(liste[1]) };
}

/** Der Fortschritt in der Form des Servers (`FortschrittDto`).
 *
 *  Gegliedert wird nach PRÜFUNGSFACH — «Deutsch», nicht «Deutsch
 *  Sprachbetrachtung» —, und die Bereiche hängen darunter. Die Liste der
 *  Bereiche enthält AUCH die ohne Themenbaum, mit ihrer `art`: Der
 *  Aufsatz ist an der FMS Bern die ganze Deutschprüfung. */
function demoFortschritt() {
  const alle = fortschritte(meineBereiche()) || [];
  const zaehle = teil => ({
    abgeschlossen: teil.filter(x => x.abgeschlossen).length,
    total: teil.length,
    pflichtGeloest: teil.reduce((s, x) => s + Math.min(x.geloest, x.pflichtset), 0),
    pflichtTotal: teil.reduce((s, x) => s + (x.pflichtset || 0), 0),
  });
  const faecher = meineFaecher().map(fachId => {
    const meine = bereicheVon(fachId);
    const alleMeine = alleBereicheVonFach(fachId);
    if (!alleMeine.length) return null;
    const fachThemen = alle.filter(x => meine.includes(x.fach));
    const z = zaehle(fachThemen);
    return Object.assign({ fach: fachId, name: fachName(fachId) }, z, {
      bereiche: alleMeine.map(b => {
        const teil = alle.filter(x => x.fach === b);
        return Object.assign({
          bereich: b, name: bereichName(b), kurzname: bereichKurz(b),
          art: (bereichInfo(b) || {}).art || (b in THEMEN ? 'themenbaum' : 'themenbaum'),
        }, zaehle(teil));
      }),
      bereichIds: alleMeine,
    });
  }).filter(Boolean);

  return {
    themenAbgeschlossen: alle.filter(x => x.abgeschlossen).length,
    themenTotal: alle.length,
    faecher,
    verlauf: [],
    aussage: Z.versuche.length
      ? `${zahl(Z.versuche.filter(v => v.richtig).length)} von ${zahl(Z.versuche.length)} `
        + 'Aufgaben richtig, seit du hier übst.'
      : 'Noch zu wenig Übung für einen Vergleich. Ab der zweiten Woche steht hier deine Entwicklung.',
    staerkstes: demoExtrem(true), schwaechstes: demoExtrem(false),
  };
}

/** Das stärkste oder schwächste Thema — über alle Fächer, mit Fachangabe. */
function demoExtrem(stark) {
  const nach = {};
  Z.versuche.forEach(v => {
    const s = v.fach + '|' + v.unterthema;
    (nach[s] ||= { fach: v.fach, code: v.unterthema, richtig: 0, gesamt: 0 });
    nach[s].gesamt++; if (v.richtig) nach[s].richtig++;
  });
  const liste = Object.values(nach).filter(x => x.gesamt >= 3);
  if (!liste.length) return null;
  liste.sort((a, b) => (a.richtig / a.gesamt) - (b.richtig / b.gesamt));
  const t = stark ? liste[liste.length - 1] : liste[0];
  const u = unterthemaVon(t.fach, t.code);
  /* `ThemenZeile` des Servers: mit `fachName`, `quote` und `versuche`. */
  return {
    unterthema: t.code, name: (u && u.name) || t.code, fach: t.fach,
    fachName: bereichName(t.fach) || t.fach,
    quote: Math.round(100 * t.richtig / Math.max(1, t.gesamt)),
    versuche: t.gesamt, zeitraum: 'seit Beginn',
  };
}

/** Das Fehlerarchiv, gruppiert nach Unterthema — so wie der Server es
 *  liefert (`FehlerGruppe` mit `eintraege`). Vorher war es eine flache
 *  Liste mit einem Feld `ref`; der Server nennt es `aufgabeRef` und
 *  gruppiert, weil man im Archiv nach THEMEN sucht, nicht nach Aufgaben. */
function demoFehlerarchiv() {
  const gesehen = new Set();
  const gruppen = new Map();
  Z.versuche.slice().reverse()
    .filter(v => !v.richtig && !gesehen.has(v.ref) && gesehen.add(v.ref))
    .slice(0, 40)
    .forEach(v => {
      const schluessel = v.fach + '|' + v.unterthema;
      if (!gruppen.has(schluessel)) {
        const u = unterthemaVon(v.fach, v.unterthema);
        gruppen.set(schluessel, {
          unterthema: v.unterthema, name: (u && u.name) || v.unterthema,
          fach: v.fach, eintraege: [],
        });
      }
      const a = demoAufgabeZu(v.ref);
      gruppen.get(schluessel).eintraege.push({
        aufgabeRef: v.ref, stamm: (a && a.stamm) || '',
        denkfehler: v.diagnoseId || 'danebengelegen',
        feedback: '', datum: new Date(v.zeit || Date.now()).toISOString().slice(0, 10),
      });
    });
  return [...gruppen.values()];
}

/** Der Lernpfad, unveraendert aus der Engine.
 *
 *  Hier stand einmal ein Ersatz mit `wochenpensum` und `abschnitte` —
 *  Feldern, die es nirgends gibt. Der Schirm las sie, fand nichts und
 *  zeigte «0 Pflichtaufgaben». Ein Ersatzwert, der anders heisst als das
 *  Echte, ist schlimmer als gar keiner: Er macht aus einem Fehler eine
 *  Zahl, die niemand anzweifelt. */
function demoLernpfad() {
  return typeof lernpfad === 'function' ? lernpfad() : null;
}

/* --- Selbsttest und Standortbestimmung -------------------------------- */

/**
 * Der Aufgabensatz eines Selbsttests.
 *
 * Ein Deutsch-Selbsttest enthält Sprachbetrachtung UND Textverständnis,
 * wie die Prüfung. Die Plätze verteilen sich nach dem **Punkteanteil der
 * Bereiche**, nicht gleichmässig: Zwei Bereiche mit 52 und 30 Punkten
 * sollen nicht gleich viele Aufgaben stellen, nur weil es zwei sind.
 * Dieselbe Rechnung steht in `App.selbsttestStarten` der App-Vorschau.
 */
function demoTestsatz(fach, umfang, themen) {
  const gewaehlt = pruefbareFaecher().includes(fach) ? fach : pruefbareFaecher()[0];
  if (!gewaehlt) return null;
  Z.selbsttestFach = gewaehlt;
  const B = bedingungen(gewaehlt);
  const anzahl = umfang === 'pruefung' ? (B.anzahlAufgaben || 20) : 12;
  const minuten = umfang === 'pruefung' ? (B.dauerMinuten || 90) : 30;

  const bereiche = bereicheVon(gewaehlt);
  let aufgaben = [];

  if (umfang === 'einzelne' && (themen || []).length) {
    /* Bei einzeln gewählten Themen zählt die Wahl, nicht die Gewichtung —
       wer drei Themen ankreuzt, will diese drei geprüft haben. */
    const proThema = Math.max(1, Math.round(anzahl / themen.length));
    themen.forEach(t => {
      const b = t.fach || demoFachVon(t.code || t);
      aufgaben = aufgaben.concat(setZiehen(b, t.code || t, proThema));
    });
  } else {
    const punkte = bereiche.map(b => Math.max(1,
      (THEMEN[b].oberthemen || []).reduce((a, o) => a + (o.punkte || 0), 0)));
    const summe = punkte.reduce((a, b) => a + b, 0);
    bereiche.forEach((b, i) => {
      const platz = i === bereiche.length - 1
        ? anzahl - aufgaben.length
        : Math.floor(anzahl * punkte[i] / summe);
      if (platz > 0) aufgaben = aufgaben.concat(
        mischsatz(b, [...bespielt(b)].sort(), platz));
    });
  }
  if (!aufgaben.length) return null;
  aufgaben = new Rng(seed()).shuffle(aufgaben).slice(0, anzahl);
  return { aufgaben, minuten, B };
}

/**
 * Die Auswertung eines Selbsttests — erst bei der Abgabe, alles auf einmal.
 *
 * Eine unbeantwortete Aufgabe zählt als falsch. Das ist keine Härte,
 * sondern die Prüfung: Ein leeres Feld gibt dort auch keine Punkte.
 * Gleichgewichtet je Aufgabe.
 * OFFEN: Die echte ZAP gewichtet nach Aufgabe.
 */
function demoAuswerten(refs, gegeben, fach) {
  const proOberthema = {};
  let richtig = 0;
  refs.forEach((ref, i) => {
    const a = demoAufgabeZu(ref);
    if (!a) return;
    const antwort = (gegeben || [])[i];
    const u = antwort ? bewerteAlles(a, demoAntwortZurueck(a, antwort))
                      : { richtig: false, diagnoseId: null };
    Fortschritt.verbuchen(a, u);
    if (u.richtig) richtig++;
    const o = (oberthemaVon(a.fach, a.unterthema) || {}).name || 'Übrige';
    (proOberthema[o] ||= { erreicht: 0, moeglich: 0 });
    proOberthema[o].moeglich++;
    if (u.richtig) proOberthema[o].erreicht++;
  });
  return {
    fach, punkte: richtig, maximum: refs.length,
    proOberthema: Object.entries(proOberthema)
      .map(([name, x]) => ({ name, ...x }))
      .sort((a, b) => b.moeglich - a.moeglich),
  };
}

/**
 * «Dein Startpunkt» — das Ergebnis der Standortbestimmung.
 *
 * **Keine Note, keine Einstufung, keine verbindliche Reihenfolge** (§4.7).
 * Drei Zahlen und die Themen mit der höchsten Fehlerquote. Eine Rangliste
 * behauptete eine Reihenfolge, und die legt der Lernpfad fest, nicht eine
 * halbe Stunde Aufgaben.
 */
function demoStartpunkt(refs, gegeben, fach) {
  refs.forEach((ref, i) => {
    const a = demoAufgabeZu(ref);
    if (!a) return;
    const antwort = (gegeben || [])[i];
    Fortschritt.verbuchen(a, antwort ? bewerteAlles(a, demoAntwortZurueck(a, antwort))
                                     : { richtig: false, diagnoseId: null });
  });
  const bereiche = fach ? bereicheVon(fach) : meineBereiche();
  const alle = fortschritte(bereiche.length ? bereiche : meineBereiche());
  const beruehrt = new Set();
  refs.forEach(ref => {
    const a = demoAufgabeZu(ref);
    if (a) beruehrt.add(a.fach + '|' + a.unterthema);
  });
  const angefasst = f => beruehrt.has(f.fach + '|' + f.unterthema);
  const sitzen = alle.filter(f => angefasst(f) && f.quote >= 0.6);
  const ueben  = alle.filter(f => angefasst(f) && f.quote < 0.6);
  const empfehlungen = ueben.slice()
    .sort((a, b) => (b.quote === a.quote)
      ? pruefungsgewicht(b.fach, b.unterthema) - pruefungsgewicht(a.fach, a.unterthema)
      : a.quote - b.quote)
    .slice(0, 3)
    .map(f => ({
      unterthema: f.unterthema, name: f.name,
      oberthema: (oberthemaVon(f.fach, f.unterthema) || {}).name || '',
      fach: f.fach,
      begruendung: bereichKurz(f.fach) + ' · ' + f.richtigeLetzte10
                 + ' von ' + f.versucheLetzte10 + ' getroffen',
      geloest: f.geloest || 0, pflichtset: f.pflichtset || 20,
    }));
  return {
    fach, fachName: fachName(fach) || fach,
    sitzen: sitzen.length, zuerstUeben: ueben.length,
    offen: alle.length - sitzen.length - ueben.length,
    empfehlungen, sitzenListe: [],
    hinweis: 'Keine Note, keine Einstufung. Die Reihenfolge legt der Lernpfad fest.',
  };
}

/* --- Aufsatz ---------------------------------------------------------- */

/** Die Aufsatzarten DIESER Prüfung, mit der Zahl ihrer Themen.
 *
 *  Massgeblich ist der Schultyp: Bern kennt den Schreibauftrag und die
 *  Erörterung, Zürich vier andere Arten. Eine feste Liste im Quelltext
 *  wäre ein Kanton im Code (§9). */
function demoAufsatzArten() {
  if (typeof AUFSATZARTEN === 'undefined') return [];
  const erlaubt = mySchultyp()?.aufsatzarten || AUFSATZARTEN.map(a => a.id);
  return AUFSATZARTEN.filter(a => erlaubt.includes(a.id)).map(a => ({
    ...a, themen: (typeof AUFSATZ === 'undefined' ? []
                 : AUFSATZ.filter(t => t.sorte === a.sorte)).length,
  }));
}

/** Von der Kennung einer Art zu ihrer Sorte. Die Themen tragen die Sorte,
 *  nicht die Kennung — zwei Arten können sich eine Sorte teilen. */
function demoSorteVon(artId) {
  if (!artId || typeof AUFSATZARTEN === 'undefined') return null;
  return (AUFSATZARTEN.find(a => a.id === artId) || {}).sorte || null;
}

/** Die Fächer dieser Prüfung, mit dem Stand.
 *
 *  Aus dem Katalog und dem Themenbaum, nicht aus einer Liste im
 *  Quelltext (§9: kein Kanton im Code). Wer die FMS in Zürich wählt,
 *  sieht die Bereiche der ZAP 3 — und wer Bern wählt, andere. */
function demoFaecher() {
  return meineFaecher().map(id => {
    const bereiche = bereicheVonFach(id).filter(b => b in THEMEN);
    const stand = fortschritte(bereiche);
    return {
      id, name: fachName(id),
      bereiche: bereiche.map(b => ({ id: b, name: bereichName(b) })),
      /* Auch die Bereiche OHNE Themenbaum: der Aufsatz und die
         Tipps-Seiten für Hörverstehen und mündliche Prüfungen. Sie sind
         Teil der Prüfung, und ein Fach, das sie verschweigt, zeigt ein
         falsches Bild davon — an der FMS Bern besteht Deutsch sogar
         ausschliesslich aus dem Aufsatz (§3.1.1). */
      alleBereiche: alleBereicheVonFach(id).map(b => {
        const s = (b in THEMEN) ? fortschritte([b]) : [];
        return {
          id: b, name: bereichName(b), kurz: bereichKurz(b),
          art: bereichInfo(b)?.art || (b in THEMEN ? 'themenbaum' : null),
          themen: s.length,
          erledigt: s.filter(x => x.abgeschlossen).length,
        };
      }),
      themen: stand.length,
      erledigt: stand.filter(x => x.abgeschlossen).length,
      offen: stand.filter(x => !x.abgeschlossen).length,
    };
  });
}

/** Der echte Themenbaum eines Fachs, mit dem Stand je Unterthema.
 *
 *  Ein Fach kann mehrere Bereiche haben — Deutsch heisst in Zürich
 *  Sprachbetrachtung plus Textverständnis plus Aufsatz (§3.1.1). Die
 *  Oberthemen aller Bereiche stehen darum untereinander, mit dem
 *  Bereichsnamen davor, statt dass man erst noch eine Ebene wählen muss. */
function demoBaum(fach) {
  const bereiche = (fach && fach in THEMEN) ? [fach]
                 : bereicheVonFach(fach).filter(b => b in THEMEN);
  if (!bereiche.length) return { name: fachName(fach) || fach, oberthemen: [] };
  const oberthemen = [];
  bereiche.forEach(b => {
    const bes = bespielt(b);
    (THEMEN[b].oberthemen || []).forEach(o => {
      const unterthemen = (o.unterthemen || [])
        .filter(u => bes.has(u.code))
        .map(u => ({
          code: u.code, name: u.name, fach: b,
          pflichtset: u.pflichtset || 20,
          geloest: Fortschritt.geloest(b, u.code),
        }));
      if (unterthemen.length) {
        oberthemen.push({
          name: bereiche.length > 1 ? `${bereichKurz(b)} · ${o.name}` : o.name,
          punkte: o.punkte, fach: b, unterthemen,
        });
      }
    });
  });
  return { name: fachName(fach) || bereichName(fach) || fach, oberthemen };
}

function kalenderwoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const jahresanfang = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - jahresanfang) / 86400000 + 1) / 7);
}
