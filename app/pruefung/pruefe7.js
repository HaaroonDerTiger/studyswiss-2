/* ======================================================================
   Runde 7 — die Rueckmeldungen aus «Rueckmeldungen_Hinweise_StudySwiss».
   
   Jede Zeile hier ist ein Punkt aus dem Dokument. Sie stehen als Pruefung
   da und nicht als Haken auf einer Liste, weil eine Umsetzung, die
   niemand nachprueft, beim naechsten Umbau still wieder verschwindet.
   Die Nummer vor dem Text ist die Reihenfolge im Dokument.
   ====================================================================== */
function t(h){ return h.replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,' | ')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
  .replace(/\s+/g,' '); }
var N=0, BAD=[];
function pruef(nr, was, bed){ N++; if(!bed) BAD.push(nr + ' ' + was); }

App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH');
pruef(1,'Kantonswahl nennt die Aufnahmeprüfung',
      t(S.KantonWahl()).indexOf('Wo schreibst du deine Aufnahmeprüfung?')>=0);
App.waehleSchule('fms');
Z.profil.schultyp=null; Z.screen='SchulWahl';
var sw=t(S.SchulWahl());
pruef(2,'Schulwahl: neue Frage', sw.indexOf('Welche Aufnahmeprüfung möchtest du machen?')>=0);
// Gefragt ist, dass die Fächer dastehen — nicht, mit welchem Wort sie
// verbunden sind. Bei drei Fächern las sich «und» schlecht.
pruef(2,'Schulwahl: Fächer stehen dabei',
      sw.indexOf('Mathematik')>=0 && sw.indexOf('Deutsch')>=0);
// Diese Pruefung fragte frueher, ob Bern LEER ist. Das war nie die
// Anforderung, sondern nur der damalige Zustand — und sobald Bern seine
// Schultypen mitbrachte, schlug sie an, ohne dass etwas kaputt war.
// Gefragt ist: Zeigt der Screen genau die Schulen DIESES Kantons?
pruef(2,'Schulwahl: nur Prüfungen dieses Kantons', (function(){
  var meine = KATALOG.schultypen.ZH || [];
  if(!meine.length) return false;
  for(var i=0;i<meine.length;i++) if(sw.indexOf(meine[i].name)<0) return false;
  // Kein Schultyp eines anderen Kantons darf auftauchen. Verglichen werden
  // nur Namen, die es woanders gibt und hier nicht.
  var meineNamen = meine.map(function(x){return x.name;});
  for(var k in KATALOG.schultypen){
    if(k==='ZH') continue;
    var fremd = KATALOG.schultypen[k];
    for(var j=0;j<fremd.length;j++){
      if(meineNamen.indexOf(fremd[j].name)>=0) continue;
      if(sw.indexOf(fremd[j].name)>=0) return false;
    }
  }
  return true;
})());
App.waehleSchule('fms');

var dt=t(S.Diagnosetest());
pruef(3,'Standort: Fachwahl', dt.indexOf('Welches Fach?')>=0);
pruef(3,'Standort: Fächer getrennt', dt.indexOf('Mathematik')>=0 && dt.indexOf('Deutsch')>=0);
pruef(6,'Standort: heisst nie «Test»', dt.indexOf('Test')<0);
pruef(6,'Standort: neuer Erklärungstext',
      dt.indexOf('Die Standortbestimmung gibt')>=0 && dt.indexOf('keine Note')>=0
      && dt.indexOf('welche du noch üben solltest')>=0);
pruef(5,'Standort verspricht keine Reihenfolge', dt.indexOf('Reihenfolge')<0);

Z.standortFach='mathematik'; App.standortStarten();
var n=0;
while(Z.screen==='DiagnoseLauf' && n++<40){
  var a=Z.lauf.aufgaben[Z.lauf.bei];
  antwortSetzen(Z.lauf,a,(n%4===0)?richtigeAntwort(a):falscheAntwort(a));
  if(!App.abgebbar()) App.ueberspringen(); else App.antworten();
}
var de=t(S.DiagnoseErgebnis());
pruef(4,'Startpunkt: Empfehlungen statt Rangliste',
      de.indexOf('Empfohlene Themen zum Weiterüben')>=0 && de.indexOf('In dieser Reihenfolge')<0);
// Korrekturen 2.0, Punkt 2: «Hier lohnt sich Üben zuerst» wertet. Die
// Begruendung nennt jetzt nur noch die Zahlen, die Ueberschrift laedt ein.
pruef(4,'Startpunkt: Fehlerquote begründet, ohne Wertung',
      de.indexOf('getroffen')>=0 && de.indexOf('lohnt sich')<0);

Z.screen='Lernen'; var le=t(S.Lernen());
pruef(8,'Lernen: Mathematik und Deutsch auf einer Ebene',
      le.indexOf('Mathematik')>=0 && le.indexOf('Deutsch')>=0
      && le.indexOf('Deutsch Sprachbetrachtung')<0);
Z.pruefungsfachOffen='deutsch'; var fb=t(S.FachBereiche());
pruef(9,'Deutsch zeigt Textverständnis', fb.indexOf('Textverständnis')>=0);
pruef(9,'Deutsch zeigt Sprachbetrachtung und Aufsatz',
      fb.indexOf('Sprachbetrachtung')>=0 && fb.indexOf('Aufsatz')>=0);

Z.fachOffen='mathematik'; Z.offeneOberthemen={};
var f1=t(S.Fach());
pruef(10,'Fach: zugeklappt keine Unterthemen',
      f1.indexOf('Zahl und Arithmetik')>=0 && f1.indexOf('Rechenregeln')<0);
App.oberthemaUm('mathematik',1);
pruef(10,'Fach: aufgeklappt Unterthemen', t(S.Fach()).indexOf('Rechenregeln')>=0);

App.uebungStarten('mathematik','4.06');
pruef(11,'Einführung erreichbar', Z.screen==='UebungIntro');
App.introFertig();
var uf=t(S.UebungFrage());
pruef(12,'Aufgabe: kleiner Themen-Titel',
      uf.indexOf(oberthemaVon('mathematik','4.06').name)>=0);
pruef(12,'Aufgabe: keine Nummer darunter', uf.indexOf(Z.lauf.aufgaben[0].ref)<0);

Z.profil.plus = true;   // «Ganze Prüfung» gehört zu Plus
Z.selbsttestFach='deutsch'; Z.selbsttestUmfang='pruefung';
var st=t(S.Selbsttest());
pruef(13,'Selbsttest: Fach auf erster Ebene', st.indexOf('Deutsch Sprachbetrachtung')<0);
pruef(14,'Selbsttest: Deutsch nennt alle drei Bereiche',
      st.indexOf('Sprachbetrachtung')>=0 && st.indexOf('Textverständnis')>=0
      && st.indexOf('Aufsatz')>=0);
pruef(15,'Selbsttest: Umfang aus dem Katalog',
      st.indexOf(bedingungen().anzahlAufgaben + ' Aufgaben, ' + bedingungen().dauerMinuten + ' Minuten')>=0);
var bd=t(S.SelbsttestStart());
pruef(16,'Bedingungen: Uhr pausiert', bd.indexOf('Die Uhr hält an')>=0);
pruef(16,'Bedingungen: Zurückblättern möglich', bd.indexOf('Zurückblättern möglich')>=0);
pruef(16,'Bedingungen: Taschenrechner prüfungsgesteuert',
      bd.indexOf(bedingungen().taschenrechner?'Taschenrechner erlaubt':'Kein Taschenrechner')>=0);
App.selbsttestStarten();
pruef(14,'Deutsch-Selbsttest mischt die Bereiche',
      Z.lauf.aufgaben.some(function(a){return a.fach==='sprachbetrachtung';}) &&
      Z.lauf.aufgaben.some(function(a){return a.fach==='textverstaendnis';}));
var a0=Z.lauf.aufgaben[0];
antwortSetzen(Z.lauf,a0,richtigeAntwort(a0)); App.antworten();
pruef(16,'Selbsttest: Zurückblättern führt zurück',
      (function(){ App.zurueckBlaettern(); return Z.lauf.bei===0; })());

Z.screen='Fortschritt'; var fo=t(S.Fortschritt());
pruef(18,'Fortschritt nach Fach', fo.indexOf('Deutsch Sprachbetrachtung')<0);
Z.pruefungsfachOffen='deutsch'; var ff=t(S.FortschrittFach());
pruef(18,'FortschrittFach zeigt Bereiche und Oberthemen',
      ff.indexOf('Sprachbetrachtung')>=0 && ff.indexOf('Wortschatz')>=0);

var aa=t(S.AufsatzArten());
pruef(19,'Aufsatz: erst die Arten', aa.indexOf('Erzählung')>=0 && aa.indexOf('Argumentation')>=0);
pruef(20,'Aufsatz: neue Aufforderung',
      aa.indexOf('Wähle eine Aufsatzart aus, die du üben möchtest')>=0);
// Der Punkt verlangt, dass eine Aufsatzart OHNE Themen als «Themen folgen»
// erscheint statt als leere Karte. Solange es eine solche Art wirklich gab,
// liess sich das am Bildschirm ablesen. Inzwischen trägt jede Art Themen —
// und der Prüfer schlug an, obwohl der Screen sich richtig verhält.
//
// Statt den Punkt zu streichen, wird der Fall hergestellt: Eine Art bekommt
// vorübergehend keine Themen mehr, und danach muss «Themen folgen» dastehen.
// So bleibt die Zusicherung geprüft, auch wenn kein echtes Loch mehr da ist.
(function(){
  // Die Art muss auf DIESEM Screen vorkommen — er zeigt nur die Arten des
  // gewaehlten Schultyps. Eine Art, die dieser Schultyp gar nicht kennt,
  // haette man leeren koennen, ohne dass sich am Bildschirm etwas aendert.
  var art = meineAufsatzarten()[0];
  var sicher = AUFSATZ.filter(function(x){ return x.sorte === art.sorte; });
  var rest = AUFSATZ.filter(function(x){ return x.sorte !== art.sorte; });
  AUFSATZ.length = 0; rest.forEach(function(x){ AUFSATZ.push(x); });
  var ohne = t(S.AufsatzArten());
  pruef(19,'Aufsatz: Art ohne Themen wird benannt', ohne.indexOf('Themen folgen')>=0);
  sicher.forEach(function(x){ AUFSATZ.push(x); });
})();
App.geh('AufsatzThemen:argumentation');
pruef(19,'Aufsatz: nur Themen dieser Art',
      Z.aufsatz.blatt.every(function(x){return x.sorte==='Argumentation';}));
App.aufsatzWaehlen(Z.aufsatz.blatt[0].id);
App.aufsatzTipp('aufbau');
var as=t(S.AufsatzSchreiben());
pruef(21,'Schreiben: Tipp-Knopf', as.indexOf('Tipp')>=0);
pruef(21,'Schreiben: zwei getrennte Hilfen',
      as.indexOf('Aufbau & Checkliste')>=0 && as.indexOf('Satzstarter')>=0);
App.aufsatzTipp('starter');
var st = aufsatzart('argumentation').satzstarter;
pruef(21,'Schreiben: Satzstarter zeigen sich',
      t(S.AufsatzSchreiben()).indexOf(st[0].saetze[0])>=0);
// Korrekturen 2.0, Punkt 6: Die Satzstarter sind nach Abschnitten geordnet,
// und die Abschnittsnamen stehen auch da. Fuenf Anfaenge ohne Ordnung helfen
// weniger als drei, die zum richtigen Teil des Aufsatzes gehoeren.
pruef(21,'Schreiben: Satzstarter nach Abschnitten geordnet',
      st.length >= 3 && st.every(function(g){ return g.abschnitt && g.saetze.length; })
      && t(S.AufsatzSchreiben()).indexOf(st[1].abschnitt) >= 0);

print('Runde 7: ' + N + ' Punkte aus der Rückmeldung');
if(BAD.length){ print('FEHLER: ' + BAD.length); BAD.forEach(function(b){ print('   ' + b); }); }
else print('Runde 7 ohne Fehler.');
