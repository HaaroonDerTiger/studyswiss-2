/* ======================================================================
   Runde 4 — die Bedienung.

   Runde 3 hat die Bewertung geprueft, aber sie hat die Antwort direkt in
   den Zustand gelegt. Hier geht es um den Weg dorthin: Ein Kind tippt,
   waehlt und schreibt. Geprueft wird deshalb je Format:

   · Der Screen zeichnet sich, ohne «undefined» im Markup.
   · Die echten Bedienfunktionen (tippeWort, gitterTippen, feldEingabe …)
     bringen den Zustand auf die richtige Antwort.
   · Erst dann meldet `App.bereit()` «fertig», und die Antwort gilt.
   · Ein zweites Antippen nimmt die Wahl zurueck.
   ====================================================================== */
var F4 = [], N4 = {}, SCHRITTE = 0;
function m4(t){ if(F4.length < 30) F4.push(t); }
function zaehl4(f){ N4[f] = (N4[f] || 0) + 1; }

/** Bedient die Oberflaeche so, wie ein Kind es taete. */
function bediene(a, antwort){
  switch(a.format){
  case 'einfachauswahl': App.waehle(antwort.optionId); break;
  case 'mehrfachauswahl': (antwort.optionIds || []).forEach(function(id){ App.kreuze(id); }); break;
  case 'markieren': case 'kommas': (antwort.stellen || []).forEach(function(i){ App.tippeWort(i); }); break;
  case 'mehrfeld':
    Object.keys(antwort.felder).forEach(function(n){ App.feldEingabe(n, antwort.felder[n]); }); break;
  case 'tabelle_auswahl':
    Object.keys(antwort.zeilen).forEach(function(i){ App.zeileWaehlen(+i, antwort.zeilen[i]); }); break;
  case 'gitter':
    // Die Punkte werden der Reihe nach gesetzt — `gitterTippen` verteilt
    // sie auf die noch leeren Namen, genau wie am Telefon.
    a.gitter.punkte.forEach(function(p){
      var q = antwort.punkte[p.name]; App.gitterTippen(q[0], q[1]); }); break;
  case 'zuordnen':
    Object.keys(antwort.zuordnung).forEach(function(ziel){
      App.zuordnenZiel(+ziel); App.zuordnenElement(antwort.zuordnung[ziel]); }); break;
  case 'sortieren':
    (antwort.reihenfolge || []).forEach(function(k){ App.sortierenTippen(k); }); break;
  case 'wertetabelle':
    (antwort.paare || []).forEach(function(p, i){
      App.paarEingabe(i, 0, String(p[0])); App.paarEingabe(i, 1, String(p[1])); }); break;
  case 'faerben':
    (antwort.felder || []).forEach(function(i){ App.feldFaerben(i); }); break;
  default: App.eingabe(antwort.eingabe);
  }
}

App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');

alleBereicheMitAufgaben().forEach(function(fach){
  Array.from(bespielt(fach)).forEach(function(u){
    App.uebungStarten(fach, u);
    if(!Z.lauf || !Z.lauf.aufgaben.length) return;
    App.introFertig();
    for(var i = 0; i < Z.lauf.aufgaben.length && i < 3; i++){
      var a = Z.lauf.aufgaben[Z.lauf.bei];
      if(!a) break;
      var wo = a.templateId + ' [' + a.format + ']';
      SCHRITTE++;

      // 1. Der Screen zeichnet sich, bevor irgendetwas eingegeben wurde.
      try {
        var h = S.UebungFrage();
        if(h.indexOf('undefined') >= 0) m4(wo + ': «undefined» im leeren Screen');
        if(!h.length) m4(wo + ': Screen ist leer');
        // Die Aufgabennummer steht NICHT mehr auf dem Aufgabenbild. Sie
        // stand dort fuer den Support, aber sie war das Erste, was einer
        // Schuelerin unter der Aufgabe entgegensprang, und sie erklaerte
        // sich nicht. Auffindbar bleibt eine Aufgabe trotzdem: Im
        // Fehlerarchiv steht die Nummer weiter — und genau dort schaut man
        // nach, wenn jemand «bei der Aufgabe mit den Pumpen stimmt etwas
        // nicht» schreibt. Statt des Refs steht jetzt das Oberthema oben,
        // klein und leise (siehe `themaZeile`).
        if(h.indexOf(a.ref) >= 0) m4(wo + ': die Aufgabennummer ' + a.ref + ' steht auf dem Aufgabenbild');
      } catch(e){ m4(wo + ': Screen wirft ' + e); break; }

      // 2. Ohne Eingabe darf der Knopf nicht abgebbar sein — ausser bei
      //    Kommas: Dort IST «kein Komma» eine mögliche Antwort, und die
      //    Bloecke enthalten solche Saetze als Falle. Wer dort nichts
      //    antippt, hat geantwortet.
      App.zustandLeeren(Z.lauf);
      if(a.format !== 'kommas' && App.abgebbar())
        m4(wo + ': gilt ohne Eingabe als beantwortbar');

      // 3. Bedienen — und zwar ueber die echten Funktionen.
      var r = richtigeAntwort(a);
      try { bediene(a, r); }
      catch(e){ m4(wo + ': Bedienung wirft ' + e); break; }
      if(!App.bereit()){ m4(wo + ': nach vollstaendiger Bedienung nicht bereit'); break; }
      // Genau der gemeldete Fehler: alles ausgefüllt, und der Knopf bleibt
      // gesperrt. Er kam davon, dass der Knopf nur das einzeilige Feld
      // ansah — bei mehreren Feldern kam man dadurch nie weiter.
      if(!App.abgebbar()){ m4(wo + ': alles ausgefuellt, aber der Pruefen-Knopf bleibt gesperrt'); break; }

      // 4. Der Screen zeichnet sich auch MIT Eingabe.
      try {
        var h2 = S.UebungFrage();
        if(h2.indexOf('undefined') >= 0) m4(wo + ': «undefined» im ausgefuellten Screen');
      } catch(e){ m4(wo + ': gefuellter Screen wirft ' + e); break; }

      // 5. Und die so erzeugte Antwort ist richtig.
      App.antworten();
      var rm = Z.lauf.rueckmeldung;
      if(!rm) m4(wo + ': keine Rueckmeldung');
      else if(!rm.richtig) m4(wo + ': ueber die Bedienung erzeugte Loesung gilt als falsch');
      else zaehl4(a.format);
      try {
        var h3 = S.UebungFrage();
        if(h3.indexOf('undefined') >= 0) m4(wo + ': «undefined» im Rueckmeldungsblatt');
      } catch(e){ m4(wo + ': Rueckmeldungsblatt wirft ' + e); }
      App.weiter();
      if(Z.screen !== 'UebungFrage') break;
    }
  });
});

/* --- Zweites Antippen nimmt zurueck -------------------------------- */
App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
var geprueft = {};
alleBereicheMitAufgaben().forEach(function(fach){
  Array.from(bespielt(fach)).forEach(function(u){
    App.uebungStarten(fach, u);
    if(!Z.lauf || !Z.lauf.aufgaben.length) return;
    App.introFertig();
    var a = Z.lauf.aufgaben[0], f = a.format;
    if(geprueft[f]) return;
    var rueck = {markieren: 'stellen', kommas: 'stellen', mehrfachauswahl: 'mehrfach',
                 sortieren: 'reihenfolge', faerben: 'felder2', tabelle_auswahl: 'zeilen',
                 gitter: 'punkte'};
    if(!rueck[f]) return;
    geprueft[f] = true;
    SCHRITTE++;
    App.zustandLeeren(Z.lauf);
    var r = richtigeAntwort(a);
    bediene(a, r); bediene(a, r);          // zweimal dasselbe antippen
    if(f === 'sortieren') { /* sortierenTippen entfernt beim zweiten Mal */ }
    var rest = Z.lauf[rueck[f]];
    var leer = Array.isArray(rest) ? rest.length === 0 : Object.keys(rest || {}).length === 0;
    if(!leer) m4(f + ': zweites Antippen nimmt die Wahl nicht zurueck — ' + JSON.stringify(rest).slice(0,80));
  });
});

/* --- In der Uebung darf man auch unvollständig pruefen ------------- */
App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
var teil = {};
alleBereicheMitAufgaben().forEach(function(fach){
  Array.from(bespielt(fach)).forEach(function(u){
    App.uebungStarten(fach, u);
    if(!Z.lauf || !Z.lauf.aufgaben.length) return;
    App.introFertig();
    var a = Z.lauf.aufgaben[0];
    // Nur Formate mit mehreren Teilen — bei einem Feld gibt es kein «halb».
    if(['mehrfeld','tabelle_auswahl','gitter','zuordnen','wertetabelle'].indexOf(a.format) < 0) return;
    if(teil[a.format]) return;
    teil[a.format] = true;
    SCHRITTE++;
    App.zustandLeeren(Z.lauf);
    var voll = richtigeAntwort(a), halb = JSON.parse(JSON.stringify(voll));
    // Genau einen Teil eintragen.
    if(a.format === 'mehrfeld'){ var k = Object.keys(halb.felder); halb.felder = {}; halb.felder[k[0]] = voll.felder[k[0]]; }
    else if(a.format === 'tabelle_auswahl'){ var z0 = Object.keys(halb.zeilen)[0]; halb.zeilen = {}; halb.zeilen[z0] = voll.zeilen[z0]; }
    else if(a.format === 'gitter'){ var p0 = Object.keys(halb.punkte)[0]; halb.punkte = {}; halb.punkte[p0] = voll.punkte[p0]; }
    else if(a.format === 'zuordnen'){ var t0 = Object.keys(halb.zuordnung)[0]; halb.zuordnung = {}; halb.zuordnung[t0] = voll.zuordnung[t0]; }
    else if(a.format === 'wertetabelle'){ halb.paare = voll.paare.slice(0,1); }
    antwortSetzen(Z.lauf, a, halb);
    if(App.bereit()) m4(a.format + ': eine halbe Antwort gilt als vollstaendig');
    if(!App.abgebbar()) m4(a.format + ': in der Uebung laesst sich eine halbe Antwort nicht pruefen');
    // Im Selbsttest muss dagegen alles ausgefuellt sein.
    Z.lauf.art = 'SELBSTTEST';
    if(App.abgebbar()) m4(a.format + ': im Selbsttest genuegt eine halbe Antwort');
    antwortSetzen(Z.lauf, a, voll);
    if(!App.abgebbar()) m4(a.format + ': im Selbsttest wird die volle Antwort nicht angenommen');
    Z.lauf.art = 'UEBUNG';
  });
});

print('Runde 4: ' + SCHRITTE + ' Bedienungen');
print('   ' + Object.keys(N4).sort().map(function(k){ return k + ':' + N4[k]; }).join(' · '));
if(F4.length){ print('FEHLER: ' + F4.length); F4.forEach(function(t){ print('   ' + t); }); }
else print('Runde 4 ohne Fehler.');
