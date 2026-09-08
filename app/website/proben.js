/* StudySwiss — die Proben der Website
   ==================================================================
   Sie laufen in `website.py` mit und damit in `pruefen.sh`.

   Was hier geprüft wird, ist das, was auf einer Rechnung stehen wird:
   Beträge, Rundung auf fünf Rappen, die Prüfziffer der QR-Referenz und
   die Schwelle, unter der es keinen Schul-Bericht gibt. Ein Fehler in
   einer dieser Zahlen sieht auf dem Schirm aus wie kein Fehler.

   Läuft mit JavaScriptCore, also ohne Browser: `document`,
   `sessionStorage` und `URLSearchParams` gibt es dort nicht und werden
   hier ersetzt — genau so weit, wie die Prüfung sie braucht.          */

/* jsc ist kein Browser. */
if (typeof URLSearchParams === 'undefined') {
  URLSearchParams = function (roh) {
    this._m = {};
    String(roh || '').split('&').filter(Boolean).forEach(function (t) {
      var i = t.indexOf('=');
      this._m[t.slice(0, i)] = decodeURIComponent(t.slice(i + 1));
    }, this);
  };
  URLSearchParams.prototype.get = function (k) {
    return this._m[k] === undefined ? null : this._m[k];
  };
}
var localStorage = {
  _m: {},
  getItem: function (k) { return this._m[k] === undefined ? null : this._m[k]; },
  setItem: function (k, v) { this._m[k] = String(v); },
  removeItem: function (k) { delete this._m[k]; },
};
/* Ein Fenster und ein Dokument, gerade so weit, dass sich eine
   Eingabefläche zeichnen lässt. Angetippt wird hier nichts — geprüft
   wird, dass sie sich überhaupt bauen lässt und was ihr Zustand ergibt. */
var window = { };
function knoten(name) {
  return {
    tagName: name || 'div', _html: '', className: '', style: {}, dataset: {},
    value: '', disabled: false, textContent: '',
    set innerHTML(v) { this._html = String(v); },
    get innerHTML() { return this._html; },
    querySelector: function () { return knoten(); },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}, appendChild: function () {},
    insertAdjacentHTML: function () {}, focus: function () {},
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 100, height: 100 }; },
    closest: function () { return null; }, remove: function () {},
    setAttribute: function () {}, removeAttribute: function () {},
    getAttribute: function () { return null; },
    classList: { add: function () {}, remove: function () {},
                 toggle: function () {}, contains: function () { return false; } },
  };
}
var document = {
  readyState: 'complete',
  createElement: function (t) { return knoten(t); },
  querySelector: function () { return knoten(); },
  querySelectorAll: function () { return []; },
  addEventListener: function () {}, body: knoten('body'),
};
var sessionStorage = {
  _m: {},
  getItem: function (k) { return this._m[k] === undefined ? null : this._m[k]; },
  setItem: function (k, v) { this._m[k] = String(v); },
  removeItem: function (k) { delete this._m[k]; },
};

/* Die Vorschau zieht ihre Aufgaben aus derselben Engine wie die App.
   Die Proben laufen darum über genau diese Dateien — nicht über eine
   Nachbildung, die sich anders verhalten könnte. */
load('js/inhalt.js'); load('js/engine.js');
/* `helfer.js` baut zu jeder Aufgabe die richtige und eine knapp falsche
   Antwort, in allen vierzehn Formaten. Er gehört den Prüfungen der App —
   und genau darum wird er hier geladen und nicht abgeschrieben: Die
   Website muss dieselbe Antwort erzeugen wie die App, sonst ist sie
   nicht dieselbe App. */
load('../pruefung/helfer.js');
load('js/hilfen.js'); load('js/zustand.js'); load('js/preise.js');
load('js/demo-daten.js'); load('js/demo.js'); load('js/antwort.js');
var DEMO = true;

var fehler = 0;
function pruefe(name, ist, soll) {
  var gut = String(ist) === String(soll);
  if (!gut) fehler++;
  print((gut ? 'ok    ' : 'FEHLER') + '  ' + name + ': ' + ist +
        (gut ? '' : '   (erwartet ' + soll + ')'));
}
function p(n, b, z) {
  if (!b) fehler++;
  print((b ? 'ok      ' : 'FEHLER  ') + n + (z ? ' — ' + z : ''));
}

print('--- Franken ---');
pruefe('ganze Zahl',       franken(129),       'Fr. 129.–');
pruefe('mit Rappen',       franken(12.5),      'Fr. 12.50');
pruefe('Tausender',        franken(24000),     "Fr. 24'000.–");
pruefe('gross mit Rappen', franken(1234.55),   "Fr. 1'234.55");
pruefe('null',             franken(0),         'Fr. 0.–');
pruefe('ohne Zeichen',     franken(45, false), '45.–');

print('--- Zahl ---');
pruefe('Tausender', zahl(7537), "7'537");

print('--- Pruefziffer QR-Referenz ---');
pruefe('Guidelines-Beispiel', pruefziffer('21000000000313947143000901'), 7);
pruefe('Referenzlaenge', qrReferenz('123').length, 27);
pruefe('Gruppierung', referenzGruppiert('210000000003139471430009017'),
       '21 00000 00003 13947 14300 09017');

print('--- Preisstaffel ---');
[[1,89],[19,89],[20,69],[49,69],[50,55],[199,55],[200,45],[5000,45]].forEach(function(p){
  pruefe('Stufe bei ' + p[0], stufeFuer(p[0]).preis, p[1]);
});

print('--- Rechnung ---');
var r = rechne(24);
pruefe('netto 24', r.netto, 1656);
print('  24 Lizenzen: netto ' + franken(r.netto) + ' · MwSt ' + franken(r.mwst) +
      ' · Total ' + franken(r.total) + ' · je Lizenz ' + franken(r.proLizenz));
var r2 = rechne(200);
print('  200 Lizenzen: Total ' + franken(r2.total) + ' · je ' + franken(r2.proLizenz) +
      ' · gespart gegenüber Einzelkauf ' + franken(r2.gespartGegenEinzeln));
pruefe('naechste Stufe bei 47 fehlen', naechsteStufe(47).fehlen, 3);
pruefe('keine naechste bei 300', naechsteStufe(300), 'null');

print('--- Schuljahr ---');
pruefe('Sept 2026', datum(schuljahrEnde('2026-09-03')), '31. Juli 2027');
pruefe('Maerz 2026', datum(schuljahrEnde('2026-03-01')), '31. Juli 2026');
pruefe('Juni 2026', datum(schuljahrEnde('2026-06-15')), '31. Juli 2027');



/* ==================================================================
   Die Übungen — der Beweis, dass jedes Format wirklich lösbar ist.

   Geprüft wird nicht die Engine (das tun `pruefe2.js` und `pruefe3.js`
   für die App), sondern das Bindeglied: **Führt der Zustand der
   Eingabefläche zu der Antwort, die die Engine annimmt?**

   Genau dort sitzt der Fehler, den niemand sieht: Baut die Fläche für
   das Sortieren `{reihenfolge}` statt `{elemente}`, ist jede Antwort
   falsch — die Aufgabe sieht richtig aus, das Kind rechnet richtig, und
   der Bildschirm sagt trotzdem «danebengelegen».

   **Die Fläche bekommt die Aufgabe OHNE Lösung**, so wie im Betrieb.
   Hier stand einmal die volle Aufgabe der Engine — und damit prüfte
   diese Datei eine Form, die am Client nie ankommt. Sie sah dabei grün
   aus, während im Betrieb die halbe Bedienung gebrochen wäre.
   ================================================================== */
print('');
print('--- Die vierzehn Formate ---');

var FORMATE = ['zahl_eingeben', 'mehrfeld', 'gitter', 'zuordnen', 'sortieren',
               'wertetabelle', 'faerben', 'loesungsmenge', 'einfachauswahl',
               'mehrfachauswahl', 'luecke', 'markieren', 'kommas', 'tabelle_auswahl'];

function beispielFuer(format) {
  for (var i = 0; i < TEMPLATES.length; i++) {
    if (TEMPLATES[i].format !== format) continue;
    for (var s = 3; s < 40; s++) {
      try { var a = ziehe(TEMPLATES[i], s); if (a) return a; } catch (e) {}
    }
  }
  for (var j = 0; j < TEXTBLOECKE.length; j++) {
    if (TEXTBLOECKE[j].format !== format) continue;
    for (var t = 3; t < 40; t++) {
      try { var b = ziehText(TEXTBLOECKE[j], t); if (b) return b; } catch (e) {}
    }
  }
  return null;
}

/** Den Zustand so füllen, wie es jemand täte, der alles richtig antippt.
 *
 *  Beim Zuordnen und Sortieren tippt ein Mensch auf ANZEIGEPOSITIONEN.
 *  Dazwischen liegt die Mischung, die der Client nicht kennt — sonst
 *  kennte er die halbe Lösung. */
function tippeRichtig(a) {
  var z = Antwort.leer();
  var soll = richtigeAntwort(a);
  var m = a.mischung || [];
  var pos = function (k) { var i = m.indexOf(k); return i < 0 ? k : i; };
  switch (a.format) {
    case 'einfachauswahl':  z.wahl = soll.optionId; break;
    case 'mehrfachauswahl': z.mehrfach = soll.optionIds.slice(); break;
    case 'markieren':
    case 'kommas':          z.stellen = soll.stellen.slice(); break;
    case 'tabelle_auswahl': z.zeilen = soll.zeilen; break;
    case 'mehrfeld':        z.felder = soll.felder; break;
    case 'gitter':          z.punkte = soll.punkte; break;
    case 'zuordnen':
      z.zuordnung = {};
      Object.keys(soll.zuordnung).forEach(function (ziel) {
        z.zuordnung[ziel] = pos(soll.zuordnung[ziel]);
      });
      break;
    case 'sortieren':       z.reihenfolge = soll.reihenfolge.map(pos); break;
    case 'wertetabelle':    z.paare = soll.paare.map(function (p) { return p.slice(); }); break;
    case 'faerben':         z.rasterFelder = soll.felder.slice(); break;
    default:                z.eingabe = soll.eingabe; break;
  }
  return z;
}

var ohneBeispiel = [];
FORMATE.forEach(function (format) {
  var a = beispielFuer(format);
  if (!a) { ohneBeispiel.push(format); return; }

  // Die Aufgabe, wie sie im Betrieb ankommt: ohne Lösung, in der Form
  // des Servers.
  var ohne = demoOhneLoesung(a);

  // 1. Die Fläche lässt sich bauen.
  var wo = knoten('div');
  var gebaut = true;
  try { Antwort.zeichne(wo, ohne, Antwort.leer(), function () {}); }
  catch (e) { gebaut = false; p(format + ': Fläche baut', false, String(e)); }
  if (gebaut) p(format.padEnd(16) + ' Fläche baut', wo.innerHTML.length > 20,
               wo.innerHTML.length + ' Zeichen');

  // 2. Leer ist nichts abgebbar, richtig getippt schon.
  p(format.padEnd(16) + ' leer nicht abgebbar',
    Antwort.abgebbar(ohne, Antwort.leer()) === false);
  var z = tippeRichtig(a);
  p(format.padEnd(16) + ' richtig ist abgebbar', Antwort.abgebbar(ohne, z) === true);

  // 3. Der Kern: Der Zustand ergibt die Antwort, die der Server annimmt.
  //    `demoAntwortZurueck` rechnet die Mischung zurück — genau das tut
  //    der `AufgabenService` auch.
  var koerper = Antwort.antwort(ohne, z);
  var ergebnis = bewerteAlles(a, demoAntwortZurueck(a, koerper));
  p(format.padEnd(16) + ' richtig wird angenommen', ergebnis.richtig === true,
    ergebnis.richtig ? '' : (ergebnis.feedback || '').slice(0, 60));

  // 4. Und eine falsche Antwort wird auch als solche erkannt.
  var falsch = falscheAntwort(a);
  if (falsch) {
    var e2 = bewerteAlles(a, falsch);
    p(format.padEnd(16) + ' falsch wird abgelehnt', e2.richtig === false);
  }
});
if (ohneBeispiel.length) {
  p('für jedes Format gibt es ein Beispiel', false, 'ohne: ' + ohneBeispiel.join(', '));
} else {
  p('für jedes Format gibt es ein Beispiel', true, FORMATE.length + ' Formate');
}

print('');
print('--- Ein ganzes Übungsset ---');
(async function () {
  /* Ohne Profil weiss die Engine nicht, welche Bereiche jemand hat —
     `meineBereiche()` bliebe leer, und es käme kein Set zustande. In der
     Website setzt das Profil die Anmeldung; hier setzen wir es direkt. */
  Z.profil = { vorname: 'Lena', kanton: 'ZH', schultyp: 'fms',
               pruefungsdatum: '2027-03-07', plus: false };
  p('Profil ergibt Bereiche', meineBereiche().length > 0,
    meineBereiche().join(', '));

  var set = await demoAntwort('/uebung/start', { body: { unterthema: null } });
  p('Set kommt zustande', set && (set.aufgaben || []).length > 0,
    set ? set.aufgaben.length + ' Aufgaben' : 'kein Set');
  if (set && set.aufgaben.length) {
    var a = set.aufgaben[0];
    p('Aufgabe hat einen Stamm', !!a.stamm, String(a.stamm).slice(0, 44).replace(/\n/g, ' '));
    /* §4.10: Die Aufgabe reist nie mit ihrer Lösung. Das ist die
       wichtigste Probe dieser Datei — sie schützt davor, dass ein Kind
       die Antwort im Quelltext nachliest. */
    p('KEINE Lösung im Client', a.loesung === undefined && a.loesungText === undefined
      && a.loesungWorte === undefined && a.fehler === undefined && a.indizes === undefined,
      Object.keys(a).filter(function (k) {
        return /loesung|fehler|indizes|reihenfolge/.test(k); }).join(',') || 'sauber');

    var voll = demoAufgabeZu(a.ref);
    p('Aufgabe lässt sich aus der Ref wiederherstellen', !!voll, a.ref);
    /* Flach, wie `model/Dto.kt::Antwort` — nicht unter `antwort`
       verschachtelt. */
    var r1 = await demoAntwort('/uebung/' + set.id + '/antwort',
      { body: Object.assign({ aufgabeRef: a.ref }, richtigeAntwort(voll)) });
    p('richtige Antwort wird angenommen', r1.richtig === true,
      r1.richtig ? '' : (r1.feedback || '').slice(0, 60));
    var fa = falscheAntwort(voll);
    if (fa) {
      var r2 = await demoAntwort('/uebung/' + set.id + '/antwort',
        { body: { aufgabeRef: a.ref, antwort: fa } });
      p('falsche Antwort wird abgelehnt', r2.richtig === false);
      p('Denkfehler wird benannt', (r2.feedback || '').length > 20,
        (r2.feedback || '').slice(0, 56));
      /* Der Server nennt sie `loesung` (`Rueckmeldung` in Dto.kt), nicht
         `loesungText` — das ist der Name der Engine. */
      p('die Lösung steht in der Rückmeldung', !!r2.loesung,
        String(r2.loesung || '').slice(0, 30));
    }
    p('der Versuch ist verbucht', Z.versuche.length >= 2, Z.versuche.length + ' Versuche');
    var fo = await demoAntwort('/fortschritt', {});
    /* `FortschrittDto`: `themenAbgeschlossen`/`themenTotal`, und die
       Pflichtaufgaben stehen je Fach in `faecher`. */
    var pflicht = ((fo && fo.faecher) || []).reduce(function (acc, x) {
      return { g: acc.g + (x.pflichtGeloest || 0), t: acc.t + (x.pflichtTotal || 0) };
    }, { g: 0, t: 0 });
    p('Fortschritt rechnet', fo && fo.themenTotal > 0,
      fo ? pflicht.g + ' von ' + pflicht.t + ' Pflichtaufgaben' : '');
    var fe = await demoAntwort('/fehler', {});
    p('Fehlerarchiv füllt sich', (fe || []).length >= 1, (fe || []).length + ' Einträge');
  }

  /* Der Katalog: Fächer und Themenbaum kommen aus den Daten, nicht aus
     einer Liste im Quelltext (§9: kein Kanton im Code). */
  var faecher = await demoAntwort('/katalog/faecher', {});
  p('Fächer kommen aus dem Katalog', (faecher || []).length > 0,
    (faecher || []).map(function (f) { return f.name; }).join(', '));
  if ((faecher || []).length) {
    var baum = await demoAntwort('/katalog/themen?fach=' + faecher[0].id, {});
    p('Themenbaum hat Oberthemen', (baum.oberthemen || []).length > 0,
      (baum.oberthemen || []).length + ' Oberthemen in ' + baum.name);
    var anzahlU = (baum.oberthemen || []).reduce(function (n, o) {
      return n + o.unterthemen.length; }, 0);
    p('Themenbaum hat Unterthemen', anzahlU > 0, anzahlU + ' Unterthemen');
    p('jedes Unterthema kennt seinen Bereich',
      (baum.oberthemen || []).every(function (o) {
        return o.unterthemen.every(function (u) { return !!u.fach; }); }));
    /* Ein Fach mit mehreren Bereichen — in Zürich ist Deutsch genau das.
       Ohne die Bereichsangabe im Oberthema wüsste niemand, ob «Wortarten»
       zur Sprachbetrachtung oder zum Textverständnis gehört. */
    var deutsch = (faecher || []).find(function (f) { return f.bereiche.length > 1; });
    if (deutsch) {
      var b2 = await demoAntwort('/katalog/themen?fach=' + deutsch.id, {});
      p('Fach mit mehreren Bereichen zeigt sie getrennt',
        (b2.oberthemen || []).some(function (o) { return o.name.indexOf('·') > 0; }),
        deutsch.bereiche.map(function (x) { return x.name; }).join(' + '));
    }
  }

  print('');
  print('--- Schul-Strecke ---');
  var o = await demoAntwort('/schule/offerte', { body: { schule: { name: 'Sek Musterhausen' },
    kontakt: { vorname: 'A', nachname: 'B', email: 'a@b.ch' }, anzahl: 24 } });
  p('Offerte entsteht', !!o.nummer, o.nummer + ' · ' + franken(o.rechnung.total));
  p('Offerte ist als Muster gekennzeichnet', o.muster === true);
  var b = await demoAntwort('/schule/bestellung', { body: { schule: o.schule,
    kontakt: o.kontakt, anzahl: 24 } });
  p('Bestellung und Rechnung', !!b.bestellung.nummer && !!b.rechnung.nummer,
    b.bestellung.nummer + ' / ' + b.rechnung.nummer);
  var l = await demoAntwort('/schule/lizenzen', {});
  p('so viele Codes wie Lizenzen', l.codes.length === 24, l.codes.length + ' Codes');
  p('QR-Referenz hat 27 Stellen', b.rechnung.referenz.length === 27, b.rechnung.referenz);
  p('Pruefziffer stimmt',
    pruefziffer(b.rechnung.referenz.slice(0, 26)) === +b.rechnung.referenz.slice(26));
  var ber = await demoAntwort('/schule/bericht', {});
  p('Bericht schweigt unter der Mindestgruppe', ber.schwacheThemen.length === 0,
    ber.hinweis.slice(0, 60));

  print('');
  print(fehler === 0 ? '════ alle Proben bestanden ════'
                     : fehler + ' Proben fehlgeschlagen');
})().catch(function (e) {
  fehler++;
  print('FEHLER  Abbruch im Ablauf: ' + e);
  print(fehler + ' Proben fehlgeschlagen');
});
drainMicrotasks();
