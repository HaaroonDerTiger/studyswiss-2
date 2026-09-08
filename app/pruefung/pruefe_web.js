/* ======================================================================
   Der Lernbereich der Website, wirklich ausgeführt.
   ======================================================================

   Sechs Runden durch die echten Schirme: Übersicht, Bereiche, Übung,
   Selbsttest, Standortbestimmung, Aufsatz und Tipps. Getippt wird auf
   die Knöpfe, die auch ein Mensch antippt — nicht auf Funktionen
   dahinter. Ein Knopf, der an nichts hängt, fällt nur so auf.

   Was hier NICHT geprüft wird: wie es aussieht. Dafür gibt es Augen.  */

var WFEHLER = [], WSCHRITTE = 0;

function pruefe(was, fn) {
  WSCHRITTE++;
  try { fn(); }
  catch (e) { WFEHLER.push(was + ' → ' + (e && e.message ? e.message : String(e))); }
}
function behaupte(was, bedingung, zusatz) {
  WSCHRITTE++;
  if (!bedingung) WFEHLER.push('BEHAUPTUNG: ' + was + (zusatz ? ' (' + zusatz + ')' : ''));
}

/* --- Werkzeuge -------------------------------------------------------- */

/** Den Lernbereich frisch aufbauen, wie ein Seitenaufruf im Browser. */
function seiteAufbauen() {
  document.kinder = [];
  document.innerHTML = LERNEN_MARKUP;
  seiteNeuAufbauen();          // ruft, was `seiteBereit` gesammelt hat
  abwarten(40);
}

function sichtbar() {
  return document.querySelectorAll('section[data-lern]')
    .filter(function (s) { return !s.hidden; })
    .map(function (s) { return s.attrs['data-lern']; });
}

/** Der Text des gerade sichtbaren Teils. */
function schirm() {
  return document.querySelectorAll('section[data-lern]')
    .filter(function (s) { return !s.hidden; })
    .map(function (s) { return s.innerHTML; }).join('\n');
}

function tippe(wahl, was) {
  var el = document.querySelector(wahl);
  if (!el) throw new Error('kein Element für ' + wahl + (was ? ' (' + was + ')' : ''));
  if (typeof el.onclick !== 'function')
    throw new Error('toter Knopf: ' + wahl + ' hängt an nichts');
  el.klick();
  abwarten(40);
  return el;
}

function daIst(wahl) { return !!document.querySelector(wahl); }

/** Der Wegweiser der Seitenleiste hängt am Behälter, nicht am Knopf —
 *  wie im Browser. Darum wird hier der Behälter gerufen. */
function navTippe(teil) {
  var a = document.querySelector('.seitenleiste a[data-lern=' + teil + ']');
  if (!a) throw new Error('kein Navigationspunkt «' + teil + '»');
  var nav = document.querySelector('.seitenleiste');
  if (typeof nav.onclick !== 'function') throw new Error('Seitenleiste hört nicht zu');
  nav.onclick({ target: a, preventDefault: function () { } });
  abwarten(40);
}

/** Kein Schirm darf Programmiererreste zeigen. Das sind die drei, die
 *  bei einer Zeichenkettenvorlage wirklich vorkommen. */
function sauber(was) {
  var h = schirm();
  ['undefined', '[object Object]', 'NaN', '{{'].forEach(function (schrott) {
    if (h.indexOf(schrott) >= 0)
      WFEHLER.push(was + ' → zeigt «' + schrott + '»');
    WSCHRITTE++;
  });
}

/** Den Eingabezustand so füllen, wie jemand tippt.
 *
 *  Das ist die Probe, auf die es ankommt (§5.6): Die Ansicht baut den
 *  Zustand, die Engine bewertet ihn. Baute die Fläche fürs Sortieren
 *  `{elemente}` statt `{reihenfolge}`, wäre jede Antwort falsch — die
 *  Aufgabe sähe richtig aus, das Kind rechnete richtig, und der
 *  Bildschirm sagte trotzdem «danebengelegen». */
function zustandFuellen(voll, z) {
  var a = richtigeAntwort(voll);
  /* Beim Zuordnen und Sortieren tippt ein Mensch auf ANZEIGEPOSITIONEN,
     nicht auf die Nummern der Engine. Dazwischen liegt die Mischung, und
     der Client kennt sie nicht — sonst kennte er die halbe Lösung. Der
     Prüfer muss darum denselben Weg gehen wie ein Finger auf dem Schirm,
     sonst prüft er eine Bedienung, die es nicht gibt. */
  var m = voll.mischung || [];
  var pos = function (k) { var i = m.indexOf(k); return i < 0 ? k : i; };
  switch (voll.format) {
    case 'einfachauswahl':  z.wahl = a.optionId; break;
    case 'mehrfachauswahl': z.mehrfach = a.optionIds.slice(); break;
    case 'markieren':
    case 'kommas':          z.stellen = a.stellen.slice(); break;
    case 'tabelle_auswahl': z.zeilen = a.zeilen; break;
    case 'mehrfeld':        z.felder = a.felder; break;
    case 'gitter':          z.punkte = a.punkte; break;
    case 'zuordnen':
      z.zuordnung = {};
      Object.keys(a.zuordnung).forEach(function (ziel) {
        z.zuordnung[ziel] = pos(a.zuordnung[ziel]);
      });
      break;
    case 'sortieren':       z.reihenfolge = a.reihenfolge.map(pos); break;
    case 'wertetabelle':    z.paare = a.paare.slice(); break;
    case 'faerben':         z.rasterFelder = a.felder.slice(); break;
    default:                z.eingabe = String(a.eingabe); break;
  }
  return a;
}

/** Einen laufenden Lauf Aufgabe für Aufgabe richtig beantworten. */
function laufDurchspielen(was, richtigLoesen) {
  var gesehen = {}, schritte = 0;
  while (lauf && schritte < 60) {
    schritte++;
    var a = lauf.aufgaben[lauf.nr];
    if (!a) break;
    gesehen[a.format] = (gesehen[a.format] || 0) + 1;
    var voll = demoAufgabeZu(a.ref);
    if (!voll) { WFEHLER.push(was + ' → Aufgabe ' + a.ref + ' nicht herstellbar'); break; }
    if (richtigLoesen) zustandFuellen(voll, lauf.zustaende[lauf.nr]);

    var weiter = document.querySelector('#laufWeiter') || document.querySelector('#pruefen');
    if (!weiter) { WFEHLER.push(was + ' → kein Knopf unter der Aufgabe'); break; }
    if (typeof weiter.onclick !== 'function') {
      WFEHLER.push(was + ' → toter Knopf unter der Aufgabe'); break;
    }
    var letzte = lauf.nr + 1 >= lauf.aufgaben.length;
    weiter.klick();
    abwarten(40);

    // In der Übung kommt erst die Rückmeldung, dann «Weiter».
    var w = document.querySelector('#weiter');
    if (w && typeof w.onclick === 'function') { w.klick(); abwarten(40); }
    if (letzte) break;
  }
  return gesehen;
}

/* ======================================================================
   1) Der Lernbereich baut sich auf
   ====================================================================== */
print('1) Lernbereich aufbauen');

/* Ohne Sitzung zeigt der Lernbereich «Zuerst anmelden» — und das ist
   richtig so: Der Fortschritt hängt am Konto. Geprüft wird darum
   beides, die Sperre und der Weg hinein. */
seiteAufbauen();
behaupte('ohne Konto steht die Anmeldung da',
         sichtbar().indexOf('anmelden') >= 0, sichtbar().join(','));
behaupte('die Anmeldung verweist aufs Konto',
         schirm().indexOf('konto.html') >= 0);

/* «Ohne Konto weiterlernen» — derselbe Aufruf, den die Konto-Seite
   macht. Ein Vierzehnjähriger soll nicht an einer Anmeldemaske
   scheitern (§4.8). */
api('/auth/gast', { body: {} });
abwarten(40);
seiteAufbauen();
behaupte('ein Profil ist da', !!Z.profil, String(Z.profil && Z.profil.kanton));
behaupte('die Übersicht ist sichtbar', sichtbar().indexOf('uebersicht') >= 0,
         sichtbar().join(','));
behaupte('der Prüfungstermin steht da', schirm().indexOf('Tage bis zur Prüfung') >= 0);
behaupte('«Zuerst dran» steht da mit Begründung',
         schirm().indexOf('Zuerst dran') >= 0);
behaupte('es gibt Fächerkarten', document.querySelectorAll('[data-fach]').length > 0,
         String(document.querySelectorAll('[data-fach]').length));
sauber('Übersicht');

/* Jeder Punkt der Seitenleiste muss einen Schirm zeigen — und keiner
   davon darf leer bleiben. Eine leere Karte ist der Fehler, der ohne
   Compiler am ehesten durchrutscht. */
print('2) Jeder Punkt der Seitenleiste');
['uebersicht', 'pfad', 'standort', 'selbsttest', 'aufsatz', 'fortschritt',
 'fehler', 'einstellungen'].forEach(function (teil) {
  pruefe('Navigation zu ' + teil, function () {
    navTippe(teil);
    if (sichtbar().indexOf(teil) < 0)
      throw new Error('zeigt ' + sichtbar().join(',') + ' statt ' + teil);
    var h = schirm().replace(/<[^>]*>/g, '').trim();
    if (h.length < 40) throw new Error('bleibt so gut wie leer (' + h.length + ' Zeichen)');
  });
  sauber('Schirm ' + teil);
});

/* ======================================================================
   3) Der Lernpfad rechnet
   ====================================================================== */
print('3) Lernpfad');
navTippe('pfad');
behaupte('der Lernpfad nennt ein Wochenpensum',
         /Pflichtaufgaben/.test(schirm()), schirm().slice(0, 120));
behaupte('der Lernpfad zeigt Abschnitte',
         document.querySelectorAll('#pfadInhalt .karte').length > 0,
         String(document.querySelectorAll('#pfadInhalt .karte').length));
sauber('Lernpfad');

/* ======================================================================
   4) Eine Übung von vorn bis hinten
   ====================================================================== */
print('4) Übung');
navTippe('uebersicht');
pruefe('«Üben» aus «Zuerst dran»', function () { tippe('[data-uebe]', 'Zuerst dran'); });
behaupte('die Übung läuft', !!lauf && lauf.modus === 'uebung',
         lauf ? lauf.modus : 'kein Lauf');
behaupte('die Übung hat Aufgaben', !!lauf && lauf.aufgaben.length > 0,
         lauf ? String(lauf.aufgaben.length) : '-');
behaupte('das Oberthema steht über der Aufgabe (Übung, nicht Prüfung)',
         schirm().indexOf('eyebrow') >= 0);
behaupte('«Abbrechen» hängt an etwas',
         typeof document.querySelector('#uebungSchliessen').onclick === 'function');
sauber('Übung, erste Aufgabe');

var vorher = Z.versuche.length;
var formate = laufDurchspielen('Übung', true);
behaupte('die Übung endet im Ergebnis', schirm().indexOf('richtig') >= 0);
behaupte('der Fortschritt ist verbucht', Z.versuche.length > vorher,
         Z.versuche.length + ' statt mehr als ' + vorher);
behaupte('alle Antworten wurden angenommen',
         Z.versuche.slice(vorher).every(function (v) { return v.richtig; }),
         'falsch bewertet: ' + Z.versuche.slice(vorher)
           .filter(function (v) { return !v.richtig; })
           .map(function (v) { return v.ref; }).join(', '));
sauber('Übungsergebnis');

/* ======================================================================
   5) Der Selbsttest — der Teil, den es vorher gar nicht gab
   ====================================================================== */
print('5) Selbsttest');
navTippe('selbsttest');
behaupte('der Selbsttest bietet Fächer an',
         document.querySelectorAll('[data-stfach]').length > 0,
         String(document.querySelectorAll('[data-stfach]').length));
pruefe('Fach wählen', function () { tippe('[data-stfach]', 'Fach'); });
pruefe('Umfang «alle Themen» wählen', function () {
  tippe('[data-stumfang=alle]', 'Umfang');
});
behaupte('der Weiter-Knopf ist jetzt frei',
         document.querySelector('#stWeiter').disabled === false ||
         !document.querySelector('#stWeiter').attrs.disabled);
pruefe('zu den Bedingungen', function () { tippe('#stWeiter'); });

behaupte('die Bedingungen nennen eine Dauer', /Minuten/.test(schirm()));
behaupte('die Bedingungen nennen den Taschenrechner',
         /Taschenrechner/.test(schirm()));
behaupte('die Bedingungen sagen etwas zum Zurückblättern',
         /Zurückblättern|Kein Zurück/.test(schirm()));
sauber('Selbsttest-Bedingungen');

pruefe('Selbsttest beginnen', function () { tippe('#stBeginnen'); });
behaupte('der Selbsttest läuft', !!lauf && lauf.modus === 'selbsttest',
         lauf ? lauf.modus : 'kein Lauf');
behaupte('der Selbsttest hat zwölf Aufgaben',
         !!lauf && lauf.aufgaben.length === 12,
         lauf ? String(lauf.aufgaben.length) : '-');
behaupte('die Uhr läuft', !!lauf && lauf.rest > 0, lauf ? String(lauf.rest) : '-');
behaupte('es gibt KEINEN Prüfen-Knopf — bewertet wird bei der Abgabe',
         !daIst('#pruefen'));
behaupte('es gibt einen Weiter-Knopf', daIst('#laufWeiter'));
behaupte('auf der ersten Aufgabe gibt es kein Zurück', !daIst('#laufZurueck'));
behaupte('kein Themen-Titel im Selbsttest (wie an der Prüfung)',
         schirm().indexOf('<p class="eyebrow" style="margin:0"></p>') >= 0 ||
         !/eyebrow[^>]*>\s*[A-ZÄÖÜ]/.test(schirm()));
sauber('Selbsttest, erste Aufgabe');

/* Zurückblättern: die Antwort muss stehen bleiben. Genau das ist der
   Unterschied zum Prüfungsblatt, das vor einem liegt. */
var ersteAufgabe = lauf.aufgaben[0];
var vollErste = demoAufgabeZu(ersteAufgabe.ref);
zustandFuellen(vollErste, lauf.zustaende[0]);
var merkmal = JSON.stringify(Antwort.antwort(vollErste, lauf.zustaende[0]));
pruefe('eine Aufgabe weiter', function () { tippe('#laufWeiter'); });
behaupte('jetzt gibt es ein Zurück', daIst('#laufZurueck'));
pruefe('zurückblättern', function () { tippe('#laufZurueck'); });
behaupte('nach dem Zurückblättern steht die Antwort noch da',
         JSON.stringify(Antwort.antwort(vollErste, lauf.zustaende[0])) === merkmal,
         merkmal);

var vorherST = Z.versuche.length;
laufDurchspielen('Selbsttest', true);
abwarten(60);
behaupte('das Selbsttest-Ergebnis nennt Punkte',
         /von \d+/.test(schirm()), schirm().slice(0, 150));
behaupte('das Ergebnis schlüsselt nach Oberthema auf',
         schirm().indexOf('Nach Oberthema') >= 0);
behaupte('der Selbsttest hat zwölf Versuche verbucht',
         Z.versuche.length - vorherST === 12,
         String(Z.versuche.length - vorherST));
behaupte('«Meine Fehler ansehen» hängt an etwas',
         daIst('#stFehler') &&
         typeof document.querySelector('#stFehler').onclick === 'function');
sauber('Selbsttest-Ergebnis');

/* Die Uhr muss ablaufen können, ohne dass jemand neunzig Minuten wartet. */
print('6) Die Uhr läuft ab');
navTippe('selbsttest');
tippe('[data-stfach]'); tippe('[data-stumfang=alle]'); tippe('#stWeiter');
tippe('#stBeginnen');
behaupte('vor dem Ablauf läuft der Test', !!lauf && lauf.rest > 0);
lauf.rest = 2;
uhrenTicken(3);
abwarten(60);
behaupte('nach Ablauf der Zeit steht das Ergebnis da',
         schirm().indexOf('Zeit ist abgelaufen') >= 0 ||
         schirm().indexOf('Nach Oberthema') >= 0,
         schirm().slice(0, 150));

/* ======================================================================
   7) Standortbestimmung
   ====================================================================== */
print('7) Standortbestimmung');
navTippe('standort');
behaupte('sie heisst nie «Test»', schirm().indexOf('Test</') < 0);
behaupte('sie sagt ausdrücklich, dass es keine Note gibt',
         /keine Note/.test(schirm()));
behaupte('sie bietet Fächer an',
         document.querySelectorAll('[data-sbfach]').length > 0);
pruefe('Fach wählen', function () { tippe('[data-sbfach]'); });
pruefe('«Später machen» hängt an etwas', function () {
  if (typeof document.querySelector('#sbSpaeter').onclick !== 'function')
    throw new Error('toter Knopf');
});
pruefe('loslegen', function () { tippe('#sbStart'); });
behaupte('die Standortbestimmung läuft', !!lauf && lauf.modus === 'standort');
behaupte('sie stellt bis zu 24 Aufgaben',
         !!lauf && lauf.aufgaben.length > 0 && lauf.aufgaben.length <= 24,
         lauf ? String(lauf.aufgaben.length) : '-');
behaupte('keine Uhr in der Standortbestimmung', !lauf.rest);
behaupte('keine Tipps in der Standortbestimmung', !daIst('#tippKnopf'));
sauber('Standortbestimmung, erste Aufgabe');

laufDurchspielen('Standortbestimmung', true);
abwarten(60);
behaupte('am Schluss steht «Dein Startpunkt»',
         schirm().indexOf('Dein Startpunkt') >= 0, schirm().slice(0, 150));
behaupte('der Startpunkt zeigt drei abzählbare Grössen',
         /Sitzen/.test(schirm()) && /Zuerst üben/.test(schirm())
           && /Noch offen/.test(schirm()));
behaupte('der Startpunkt verspricht keine Reihenfolge',
         schirm().indexOf('In dieser Reihenfolge') < 0);
behaupte('der Startpunkt gibt keine Note', schirm().indexOf('Note') < 0
         || /keine Note/.test(schirm()));
sauber('Startpunkt');

/* ======================================================================
   8) Aufsatz
   ====================================================================== */
print('8) Aufsatz');
navTippe('aufsatz');
behaupte('es gibt Aufsatzarten',
         document.querySelectorAll('[data-auart]').length > 0,
         String(document.querySelectorAll('[data-auart]').length));
behaupte('keine Art sagt «Aufgaben folgen»', schirm().indexOf('Aufgaben folgen') < 0);
pruefe('eine Art wählen', function () { tippe('[data-auart]'); });
behaupte('die Art zeigt Themen',
         document.querySelectorAll('[data-authema]').length > 0,
         String(document.querySelectorAll('[data-authema]').length));
pruefe('«Andere Themen zeigen» hängt an etwas', function () {
  tippe('#auWuerfeln');
});
pruefe('ein Thema wählen', function () { tippe('[data-authema]'); });
behaupte('die Schreibfläche ist da', daIst('#auText'));
behaupte('es gibt einen Wortzähler', daIst('#auWorte'));
behaupte('die Uhr steht auf 90 Minuten',
         document.querySelector('#auUhrAnzeige').textContent === '90:00',
         document.querySelector('#auUhrAnzeige').textContent);
behaupte('die Teilaufträge lassen sich abhaken',
         document.querySelectorAll('[data-auteil]').length > 0);
sauber('Aufsatz schreiben');

pruefe('Tipp öffnen', function () { tippe('#auTipp'); });
behaupte('die zwei Hilfen stehen getrennt da',
         daIst('[data-autipp=aufbau]') && daIst('[data-autipp=saetze]'));
pruefe('Aufbau zeigen', function () { tippe('[data-autipp=aufbau]'); });
behaupte('der Aufbau nennt Schritte',
         document.querySelectorAll('#auTippKasten .liste li').length > 0);
pruefe('schliessen', function () { tippe('#auTippZu'); });

pruefe('einen Teilauftrag abhaken', function () { tippe('[data-auteil]'); });
pruefe('etwas schreiben', function () {
  var f = document.querySelector('#auText');
  f.value = 'Handys gehören für mich nicht ins Schulzimmer. '
          + 'Zuerst schildere ich, wie der Morgen heute aussieht.';
  f.oninput();
  abwarten(20);
});
behaupte('der Wortzähler zählt',
         /1[0-9] Wörter/.test(document.querySelector('#auWorte').textContent),
         document.querySelector('#auWorte').textContent);
pruefe('Korrektur anfordern', function () { tippe('#auAbgeben'); });
abwarten(60);
behaupte('die Korrektur zählt Kriterien statt zu benoten',
         /Kriterien erreicht/.test(schirm()), schirm().slice(0, 200));
behaupte('die Korrektur sagt, dass sie ein Muster ist',
         /Beispielkorrektur/.test(schirm()));
behaupte('die Korrektur nennt keine Note',
         !/Note \d|\d von 6/.test(schirm()));
sauber('Aufsatzkorrektur');

/* ======================================================================
   8b) Alle vierzehn Formate — mit einer Aufgabe OHNE Lösung
   ======================================================================

   Die Probe, auf die es ankommt (§5.6). Die Fläche bekommt im Betrieb
   NICHT die volle Aufgabe, sondern das, was `demoOhneLoesung` übrig
   lässt — dasselbe, was der Server schickt: kein `loesung`, keine
   `fehler`, keine Lösungspaare. Wer eine Fläche gegen die volle Aufgabe
   baut, merkt nichts, bis die erste echte Aufgabe kommt.

   Genau das war bei `wertetabelle` passiert: Die Fläche las
   `wertetabelle.paare.length` — ein Feld, das der Server streicht. Der
   ganze Aufgabenschirm blieb mit «Es hat nicht geklappt» stehen, und
   zwar nur bei diesem einen Format.

   Zweitens wird geprüft, dass die Fläche einen Zustand baut, den die
   Engine annimmt. Baute sie fürs Sortieren `{elemente}` statt
   `{reihenfolge}`, wäre jede Antwort falsch — die Aufgabe sähe richtig
   aus, das Kind rechnete richtig, und der Bildschirm sagte trotzdem
   «danebengelegen».                                                  */
print('8b) Die vierzehn Formate ohne Lösung');
var ALLE_FORMATE = ['zahl_eingeben', 'mehrfeld', 'gitter', 'zuordnen', 'sortieren',
                    'wertetabelle', 'faerben', 'loesungsmenge', 'einfachauswahl',
                    'mehrfachauswahl', 'luecke', 'markieren', 'kommas',
                    'tabelle_auswahl'];
var beispiele = {};
alleBereicheMitAufgaben().forEach(function (bereich) {
  [...bespielt(bereich)].forEach(function (code) {
    if (Object.keys(beispiele).length === ALLE_FORMATE.length) return;
    var satz = setZiehen(bereich, code, 3) || [];
    satz.forEach(function (a) { if (!beispiele[a.format]) beispiele[a.format] = a; });
  });
});

ALLE_FORMATE.forEach(function (format) {
  var voll = beispiele[format];
  if (!voll) { WFEHLER.push('Format ' + format + ' → keine Aufgabe gefunden'); return; }
  pruefe('Fläche für ' + format + ' (ohne Lösung)', function () {
    var ohne = demoOhneLoesung(voll);
    var z = Antwort.leer();
    var kasten = new Knoten('div');
    window._antwortMeldung = function () { };
    Antwort.zeichne(kasten, ohne, z, function () { });
    if (!kasten.innerHTML || kasten.innerHTML.length < 10)
      throw new Error('zeichnet nichts');
    if (kasten.innerHTML.indexOf('undefined') >= 0)
      throw new Error('zeigt «undefined»');
  });
  pruefe('Antwort für ' + format + ' wird angenommen', function () {
    var ohne = demoOhneLoesung(voll);
    var z = Antwort.leer();
    zustandFuellen(voll, z);
    if (!Antwort.abgebbar(ohne, z))
      throw new Error('die gefüllte Antwort gilt als nicht abgebbar');
    var u = bewerteAlles(voll, demoAntwortZurueck(voll, Antwort.antwort(ohne, z)));
    if (!u.richtig)
      throw new Error('die richtige Antwort wird abgelehnt — Fläche und Engine '
                    + 'sprechen verschiedene Formen');
  });
});

/* ======================================================================
   8c) Der Vertrag mit dem Server
   ======================================================================

   Die Website ist der zweite Client von `/v1`. Sie hat keinen Compiler
   und keine Typen — ein Feld, das anders heisst, fällt darum nirgends
   auf, bis im Betrieb ein leerer Schirm dasteht. Hier wird beides gegen
   die Quelle geprüft: was die Vorschau als Aufgabe ausliefert (muss
   `AufgabeDto` sein) und was der Client als Antwort sendet (muss
   `Antwort` sein).

   Genau hier lag der grösste Fehler dieses Repos: Die Website sprach die
   Formen der ENGINE — `paare`, `wertetabelle`, `indizes`, dazu eine
   unter `antwort` verschachtelte Antwort. Der Server sendet `ziele`,
   `tabelle`, `anzahlGesucht` und erwartet die Antwort flach. Die
   Vorschau lief tadellos, weil sie beide Enden selbst hielt.          */
print('8c) Vertrag mit dem Server');
behaupte('die Feldliste des Servers ist da',
         SERVER_AUFGABE.length > 5 && SERVER_ANTWORT.length > 5,
         SERVER_AUFGABE.length + '/' + SERVER_ANTWORT.length);

ALLE_FORMATE.forEach(function (format) {
  var voll = beispiele[format];
  if (!voll) return;
  pruefe('Aufgabe für ' + format + ' hält den Vertrag', function () {
    var dto = demoOhneLoesung(voll);
    var fremd = Object.keys(dto).filter(function (k) {
      return SERVER_AUFGABE.indexOf(k) < 0;
    });
    if (fremd.length)
      throw new Error('sendet Felder, die `AufgabeDto` nicht hat: ' + fremd.join(', '));
    /* Und andersherum: Kein Feld, das der Server sendet, darf eine
       Lösung enthalten. Stichprobe auf die Namen, die es je gab. */
    ['loesung', 'loesungText', 'loesungWorte', 'fehler', 'indizes',
     'reihenfolge', 'mischung', 'paare', 'wertetabelle'].forEach(function (verboten) {
      if (Object.prototype.hasOwnProperty.call(dto, verboten))
        throw new Error('gibt «' + verboten + '» an den Client weiter');
    });
  });
  pruefe('Antwort für ' + format + ' hält den Vertrag', function () {
    var ohne = demoOhneLoesung(voll);
    var z = Antwort.leer();
    zustandFuellen(voll, z);
    var koerper = Antwort.antwort(ohne, z);
    var fremd = Object.keys(koerper).filter(function (k) {
      return SERVER_ANTWORT.indexOf(k) < 0;
    });
    if (fremd.length)
      throw new Error('sendet Felder, die `Antwort` nicht hat: ' + fremd.join(', '));
    if (Object.prototype.hasOwnProperty.call(koerper, 'antwort'))
      throw new Error('verschachtelt die Antwort unter «antwort» — der Server '
                    + 'liest sie flach und sähe kein einziges Feld');
  });
});

/* ======================================================================
   9) Fehlerarchiv und Tipps
   ====================================================================== */
print('9) Fehlerarchiv');
navTippe('fehler');
sauber('Fehlerarchiv');
var nochmal = document.querySelector('[data-nochmal]');
if (nochmal) {
  var ref = nochmal.attrs['data-nochmal'];
  pruefe('«Nochmal» aus dem Fehlerarchiv', function () { tippe('[data-nochmal]'); });
  behaupte('«Nochmal» stellt GENAU dieselbe Aufgabe her',
           !!lauf && lauf.aufgaben[0] && lauf.aufgaben[0].ref === ref,
           lauf && lauf.aufgaben[0] ? lauf.aufgaben[0].ref + ' statt ' + ref : '-');
}

print('10) Tipps-Seiten');
/* Zürich stellt keine Fremdsprache, hat also keine Tipps-Seite. Geprüft
   wird darum ein Kanton, der eine hat — sonst prüfte diese Runde nichts
   und sähe trotzdem grün aus. */
var mitTipps = Object.keys(typeof TIPPS === 'undefined' ? {} : TIPPS);
behaupte('es gibt Tipps-Seiten', mitTipps.length > 0, String(mitTipps.length));
if (mitTipps.length) {
  var eineSeite = TIPPS[mitTipps[0]];
  pruefe('eine Tipps-Seite zeichnen', function () {
    oeffneTipps(mitTipps[0]);
    abwarten(40);
    var h = schirm();
    if (h.indexOf('So läuft die Prüfung ab') < 0 && (eineSeite.ablauf || []).length)
      throw new Error('der Ablauf fehlt');
    if (h.indexOf('Aufgaben folgen') >= 0)
      throw new Error('verspricht Aufgaben, die es nicht gibt');
  });
  sauber('Tipps-Seite');
  behaupte('die Tipps-Seite verweist auf übbare Unterthemen',
           (eineSeite.uebungen || []).length === 0 ||
           document.querySelectorAll('#tippsInhalt [data-uebe]').length > 0);
}

/* ======================================================================
   Schluss
   ====================================================================== */
print('');
print('Schritte: ' + WSCHRITTE);
if (WFEHLER.length) {
  print(WFEHLER.length + ' WFEHLER');
  WFEHLER.forEach(function (f) { print('  · ' + f); });
} else {
  print('KEINE WFEHLER');
}
