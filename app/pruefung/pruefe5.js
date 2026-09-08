/* ======================================================================
   Runde 5 — jeder Screen einzeln, mit den Augen einer Schülerin.

   Die bisherigen Runden prüfen Verhalten: Wird richtig bewertet, läuft ein
   Weg durch. Diese Runde fragt etwas anderes — ergibt das, was dasteht,
   überhaupt Sinn?

   · Steht auf jedem Screen ein Titel und ein Weg weiter oder zurück?
   · Bleibt eine Zahl eine Zahl — oder steht dort «NaN», «undefined»,
     «null», «Infinity», «-0»?
   · Sind Platzhalter ersetzt?
   · Steht irgendwo eine Umschrift statt eines Umlauts?
   · Ist ein Knopf beschriftet, oder nur ein Symbol ohne Bedeutung?
   · Ist der Text lesbar — keine doppelten Leerzeichen, keine Sätze, die
     mit einem Komma anfangen, keine leeren Klammern?
   ====================================================================== */
var F5 = [], N5 = 0;
function m5(t){ if(F5.length < 40) F5.push(t); }

var SCHLECHT = [
  [/undefined/, '«undefined» im Text'],
  [/\bNaN\b/, '«NaN» im Text'],
  [/\bInfinity\b/, '«Infinity» im Text'],
  // «null» ist auch ein deutsches Wort: «manchmal ist die richtige Zahl
  // null». Die reine Zeichensuche schlug darauf an, und ein Prüfer mit
  // falschem Alarm ist schlimmer als keiner. Gesucht wird darum ein
  // durchgesickerter WERT: einer, der dort steht, wo eine Zahl oder ein
  // Name hingehört — am Anfang, nach einem Doppelpunkt, vor einer Einheit,
  // oder als ganze Angabe für sich.
  [/^null\b|:\s*null\b|\bnull\s*(?:%|Fr\.|von\b|Punkte?\b|Aufgaben?\b|Minuten\b|Tagen?\b)/,
   '«null» als durchgesickerter Wert'],
  [/\[object [A-Z]/, 'ein Objekt statt eines Textes'],
  [/\{[a-zA-Z_]\w*(?:[.:][^}]*)?\}/, 'ein nicht ersetzter Platzhalter'],
  [/-0(?![.\d])/, 'die Zahl «-0»'],
  [/\bue(?:ber|bung|brig)|\bLoesung|\bPruefung|\bZurueck|Groesse|Waehl|Praes|Praet|Praep/,
   'eine Umschrift statt eines Umlauts'],
  // Nicht nach Leerzeichen vor Satzzeichen suchen: Das Entfernen der Tags
  // setzt selbst welche ein, und die Lückenmarkierung «___» sieht danach wie
  // eine Lücke im Satz aus. Beides wäre Fehlalarm. Gesucht wird stattdessen,
  // was wirklich auf einen Fehler hindeutet: leere Klammern, doppelte
  // Satzzeichen, ein leeres Zitat.
  // Punktreihen fallen darunter: Auslassungspunkte werden im ganzen Repo als
  // «…» gesetzt, nicht als zwei oder drei getippte Punkte.
  [/\(\s*\)|«\s*»|\.{2}|,,|\s—\s—/, 'eine leere Stelle im Text'],
];

/** Prüft das Markup eines Screens. `roh` ist HTML. */
function screenPruefen(name, roh){
  N5++;
  if(!roh || roh.length < 60) return m5(name + ': der Screen ist leer');
  // Der sichtbare Text, ohne Markup, Stile und Skript.
  var text = roh
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/style="[^"]*"/g, ' ')
    .replace(/onclick="[^"]*"/g, ' ')
    .replace(/oninput="[^"]*"/g, ' ')
    .replace(/onchange="[^"]*"/g, ' ')
    .replace(/onkeydown="[^"]*"/g, ' ')
    .replace(/class="[^"]*"/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    // Leerraum aus dem Markup zusammenziehen — sonst hält jede eingerückte
    // Zeile für eine Lücke im Satz her, und der Prüfer schlägt falschen Alarm.
    .replace(/\s+/g, ' ')
    .trim()
    // Die Aufgabennummer `templateId:seed` steht bewusst unten auf jedem
    // Übungsscreen (Screen 14). Sie ist ein BEZEICHNER, und §2.1 nimmt
    // Bezeichner ausdrücklich von der Umlautregel aus: «sachrechnen-
    // ueberschlag:691380921» ist richtig so. Ohne diese Zeile meldete der
    // Prüfer dort eine Umschrift — ein Fehlalarm, der schlimmer ist als
    // keine Prüfung, weil man ihn nur wegschauen kann.
    .replace(/\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*:\d+\b/g, ' ');
  SCHLECHT.forEach(function(p){
    var m = p[0].exec(text);
    if(m) m5(name + ': ' + p[1] + ' — «' + text.slice(Math.max(0, m.index-40), m.index+40).replace(/\s+/g,' ').trim() + '»');
  });
  // Ein Screen ohne Überschrift lässt niemanden wissen, wo er ist.
  if(!/class="(?:h1|h2|h3|h4|display|eyebrow)/.test(roh) && !/appbar/.test(roh))
    m5(name + ': keine Überschrift und keine Kopfleiste');
  // Und ohne einen Weg weiter ist er eine Sackgasse.
  var wege = (roh.match(/onclick=/g) || []).length;
  if(wege === 0) m5(name + ': kein einziger Knopf — eine Sackgasse');
  // Ein Knopf ohne Beschriftung und ohne Bedeutungsangabe.
  // Jedes Bild muss wirklich eines sein. `studi('tippfehler')` ergibt
  // `src="undefined"` — der Screen zeichnet sich, und die Stelle bleibt
  // einfach leer. Genau so verschwand eine Illustration, ohne dass eine
  // Prüfung anschlug.
  (roh.match(/<img[^>]*>/g) || []).forEach(function(tag){
    var m = /src="([^"]*)"/.exec(tag);
    if(!m || !m[1]) return m5(name + ': ein Bild ohne Quelle');
    if(m[1] === 'undefined' || m[1] === 'null')
      m5(name + ': ein Bild mit «' + m[1] + '» als Quelle');
    else if(m[1].indexOf('data:image/') !== 0)
      m5(name + ': ein Bild aus einer fremden Quelle — ' + m[1].slice(0, 40));
    else if(m[1].length < 500)
      m5(name + ': ein Bild mit nur ' + m[1].length + ' Zeichen Daten');
  });
  // Und die Marke muss ihre Pfade tragen, nicht nur ein leeres SVG.
  (roh.match(/<svg[^>]*aria-label="StudySwiss"[\s\S]*?<\/svg>/g) || []).forEach(function(svg){
    if((svg.match(/<path/g) || []).length < 2)
      m5(name + ': die Eule hat ihre Pfade verloren');
  });

  // Ein Knopf, der nur ein Symbol zeigt, braucht eine Bedeutungsangabe —
  // sonst weiss weder ein Vorleseprogramm noch ein Kind, was er tut.
  var symbolknoepfe = roh.match(/<button[^>]*>\s*<svg[\s\S]*?<\/svg>\s*<\/button>/g) || [];
  var ohneSinn = symbolknoepfe.filter(function(b){
    return !/aria-label=|title=/.test(b.slice(0, b.indexOf('>') + 1));
  });
  if(ohneSinn.length)
    m5(name + ': ' + ohneSinn.length + ' Symbolknopf/-knöpfe ohne aria-label');
}

/* --- Alle Screens in einem sinnvollen Zustand durchgehen ----------- */
/** Geht auf einen Screen und prüft, was dabei WIRKLICH gezeichnet wird —
 *  über `App.geh`, nicht über `S.x()` direkt. Nur so laufen die Weichen mit,
 *  die einen Screen ohne seinen Zustand auffangen. */
function hin(ziel, name){
  App.geh(ziel);
  screenPruefen(name || ziel, bildschirm());
  return Z.screen;
}

App.zuruecksetzen();
['Start','Onboarding','Anmeldung'].forEach(function(n){ hin(n); });

App.anmelden('apple');
hin('KantonWahl');
App.waehleKanton('ZH');
hin('SchulWahl');
App.waehleSchule('fms');
hin('PruefungTermin');
App.datumWaehler(); screenPruefen('PruefungTermin (Wähler offen)', bildschirm()); App.datumSchliessen();

['Diagnosetest','Lernen','Lernpfad','Selbsttest','Fortschritt','Einstellungen',
 'EinstellungenPruefung','Profil','Plus','ElternReport','Fehlerarchiv',
 'AufsatzArten'].forEach(function(n){
  var wo = hin(n);
  if(wo !== n) m5(n + ': landet unerwartet auf ' + wo);
});

// Screens, die einen Zustand brauchen: Ohne ihn MUSS die App auffangen,
// statt eine weisse Seite zu zeigen.
[['AufsatzSchreiben','AufsatzArten'], ['AufsatzKorrektur','AufsatzArten'],
 ['UebungFrage','Lernen'], ['UebungErgebnis','Lernen'],
 ['DiagnoseLauf','Diagnosetest'], ['SelbsttestLauf','Selbsttest'],
 ['Fach','Lernen']].forEach(function(p){
  Z.lauf = null; Z.aufsatz = null; Z.fachOffen = null; Z.aufsatzArt = null;
  var wo = hin(p[0], p[0] + ' ohne Zustand');
  if(wo !== p[1]) m5(p[0] + ' ohne Zustand: landet auf ' + wo + ' statt ' + p[1]);
});

// Und mit Zustand. Erst die Aufsatzart, dann das Thema — beides muss
// gesetzt sein, sonst faellt der Schreib-Screen sauber zurueck.
var ersteArt = meineAufsatzarten().filter(function(a){ return a.themen; })[0];
if(!ersteArt) m5('keine einzige Aufsatzart hat Themen');
App.geh('AufsatzThemen:' + ersteArt.id);
if(Z.screen !== 'AufsatzThemen') m5('AufsatzThemen mit Art landet auf ' + Z.screen);
App.aufsatzWaehlen(Z.aufsatz.blatt[0].id);
hin('AufsatzSchreiben');
// Die zwei Hilfen hinter dem Tipp-Knopf muessen sich zeichnen lassen.
['aufbau','starter'].forEach(function(w){
  App.aufsatzTipp(w);
  var h = S.AufsatzSchreiben();
  if(h.indexOf('Satzstarter') < 0) m5('Aufsatz-Tipp «' + w + '»: die zwei Reiter fehlen');
  if(h.indexOf('undefined') >= 0) m5('Aufsatz-Tipp «' + w + '»: «undefined» im Markup');
});
App.aufsatzTippZu();
Z.aufsatz.text = 'Ein Probetext. '.repeat(40);
hin('AufsatzKorrektur');
meineBereiche().forEach(function(f){
  var wo = hin('Fach:' + f, 'Fach ' + f);
  if(wo !== 'Fach') m5('Fach ' + f + ': landet auf ' + wo);
});
// Und die neuen Zwischenebenen: Fach → Bereiche, Fortschritt → Fach.
meineFaecher().forEach(function(f){
  if(hin('Bereiche:' + f, 'Bereiche ' + f) !== 'FachBereiche')
    m5('Bereiche ' + f + ': landet auf ' + Z.screen);
  if(hin('FortschrittFach:' + f, 'Fortschritt ' + f) !== 'FortschrittFach')
    m5('FortschrittFach ' + f + ': landet auf ' + Z.screen);
});

/* --- Und jetzt jede Aufgabenart in jedem Zustand ------------------- */
App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
var gesehen = {};
alleBereicheMitAufgaben().forEach(function(fach){
  Array.from(bespielt(fach)).forEach(function(u){
    App.uebungStarten(fach, u);
    if(!Z.lauf || !Z.lauf.aufgaben.length) return;
    screenPruefen('UebungIntro/' + u, S.UebungIntro());
    App.introFertig();
    // Das GANZE Set durchsehen, nicht nur die erste Aufgabe.
    //
    // Vorher stand hier `Z.lauf.aufgaben[Z.lauf.bei]` — also immer Aufgabe 1.
    // Welche Arten dabei herauskamen, hing daran, welche Vorlage `setZiehen`
    // zuerst erwischte: eine Aenderung an der Ziehung liess die Abdeckung
    // still von 14 auf 13 Arten fallen, ohne dass etwas rot wurde. Ein
    // Pruefer, dessen Abdeckung vom Zufall abhaengt, prueft nicht.
    var k = Z.lauf.aufgaben.findIndex(function(x){ return !gesehen[x.format]; });
    if(k < 0) return;
    Z.lauf.bei = k;
    var a = Z.lauf.aufgaben[k];
    gesehen[a.format] = true;
    screenPruefen('UebungFrage leer/' + a.format, S.UebungFrage());
    // Mit Tipp
    App.tipp();
    screenPruefen('UebungFrage mit Tipp/' + a.format, S.UebungFrage());
    // Richtig beantwortet
    antwortSetzen(Z.lauf, a, richtigeAntwort(a));
    App.antworten();
    screenPruefen('UebungRichtig/' + a.format, S.UebungFrage());
    App.weiter();
    // Falsch beantwortet
    if(Z.screen === 'UebungFrage'){
      var b = Z.lauf.aufgaben[Z.lauf.bei], w = falscheAntwort(b);
      if(w){
        antwortSetzen(Z.lauf, b, w);
        App.antworten();
        screenPruefen('UebungFalsch/' + b.format, S.UebungFrage());
      }
    }
  });
});

/* Die vierzehn Aufgabenarten aus CLAUDE.md §4.5. Fehlt eine, wurde sie in
   keinem Zustand gezeichnet — und das muss auffallen, statt in einer
   kleiner gewordenen Zahl in der Ausgabe zu verschwinden. */
var ARTEN = ['zahl_eingeben','mehrfeld','gitter','zuordnen','sortieren','wertetabelle',
             'faerben','loesungsmenge','einfachauswahl','mehrfachauswahl','luecke',
             'markieren','kommas','tabelle_auswahl'];
ARTEN.forEach(function(f){
  if(!gesehen[f]) m5('Aufgabenart «' + f + '» wurde in keinem Screen gezeichnet');
});
Object.keys(gesehen).forEach(function(f){
  if(ARTEN.indexOf(f) < 0) m5('Unbekannte Aufgabenart «' + f + '» — gehoert sie in ARTEN?');
});

print('Runde 5: ' + N5 + ' Screens durchgesehen (' +
      Object.keys(gesehen).length + ' von ' + ARTEN.length + ' Aufgabenarten)');
if(F5.length){ print('FEHLER: ' + F5.length); F5.forEach(function(t){ print('   ' + t); }); }
else print('Runde 5 ohne Fehler.');
