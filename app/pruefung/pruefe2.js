/* ======================================================================
   Runde 2 — die Bewertung selbst. Ueber alle Templates und viele Seeds:
   Wird eine richtige Antwort IMMER angenommen und eine falsche IMMER
   mit benanntem Denkfehler abgelehnt?
   ====================================================================== */
var FEHLER = [], GEPRUEFT = 0;
function melde(t){ if(FEHLER.length < 40) FEHLER.push(t); }

print('A) Mathematik: richtige Antwort wird angenommen');
// Runde 3 prüft alle vierzehn Formate ueber `richtigeAntwort`. Hier geht
// es um die Eigenheit der Zahleneingabe: Der Schüler tippt Text, und der
// darf in mehreren Schreibweisen ankommen.
TEMPLATES.forEach(function(spec){
  var gelungen = 0;
  for(var seed = 1; seed <= 120; seed++){
    var a = ziehe(spec, seed);
    if(!a){ continue; }
    gelungen++;
    if(spec.format !== 'zahl_eingeben') continue;
    GEPRUEFT++;
    // So tippt ein Kind: den Text, den die App selbst als Loesung anzeigt.
    var u = bewerte(a, a.loesungText);
    if(!u.richtig)
      melde(spec.templateId + ' Seed ' + seed + ': eigener Loesungstext «' +
            a.loesungText + '» wird abgelehnt');
    // Und die nackte Zahl, mit Punkt und mit Komma.
    var roh = String(a.loesung);
    if(!bewerte(a, roh).richtig)
      melde(spec.templateId + ' Seed ' + seed + ': rohe Zahl «' + roh + '» wird abgelehnt');
    if(!bewerte(a, roh.replace('.', ',')).richtig)
      melde(spec.templateId + ' Seed ' + seed + ': Komma statt Punkt «' +
            roh.replace('.', ',') + '» wird abgelehnt');
  }
  if(gelungen < 108)
    melde(spec.templateId + ': nur ' + gelungen + ' von 120 Ziehungen gelingen');
});

print('B) Mathematik: jeder Distraktor wird mit Denkfehler abgelehnt');
TEMPLATES.forEach(function(spec){
  for(var seed = 1; seed <= 60; seed++){
    var a = ziehe(spec, seed);
    if(!a) continue;
    // Ein Distraktor muss den Denkfehler treffen, den das Template ihm
    // zugedacht hat — bei der Zahleneingabe wie in jedem Feld eines
    // Mehrfelds. Sonst bekommt das Kind irgendeine Rueckmeldung.
    var faelle = [];
    if(a.format === 'zahl_eingeben')
      a.fehler.forEach(function(f){ faelle.push({antwort: {eingabe: String(f.wert)}, f: f}); });
    else if(a.format === 'mehrfeld')
      (a.felder || []).forEach(function(feld){
        (feld.fehler || []).forEach(function(f){
          var ein = {};
          a.felder.forEach(function(x){ ein[x.name] = x.loesungText; });
          ein[feld.name] = String(f.wert);
          faelle.push({antwort: {felder: ein}, f: f, wo: feld.name});
        });
      });
    faelle.forEach(function(k){
      GEPRUEFT++;
      var u = bewerteAlles(a, k.antwort), wo = spec.templateId + ' Seed ' + seed +
              (k.wo ? '/' + k.wo : '');
      if(u.richtig)
        melde(wo + ': Distraktor ' + k.f.wert + ' wird als richtig gewertet');
      else if(u.diagnoseId !== k.f.diagnoseId)
        melde(wo + ': Distraktor ' + k.f.wert + ' liefert «' + u.diagnoseId +
              '» statt «' + k.f.diagnoseId + '»');
      else if(u.feedback.length < 40)
        melde(spec.templateId + '/' + k.f.diagnoseId + ': Feedback zu knapp');
    });
  }
});

print('C) Deutsch: richtige Antwort wird angenommen');
TEXTBLOECKE.forEach(function(spec){
  for(var seed = 1; seed <= 200; seed++){
    var a = ziehText(spec, seed);
    GEPRUEFT++;
    if(spec.format === 'einfachauswahl' &&
       !a.optionen.some(function(x){ return a.loesungWorte.indexOf(x.text) >= 0; })){
      melde(spec.templateId + ' Seed ' + seed + ': Loesung fehlt in den Optionen'); continue;
    }
    var u = bewerteAlles(a, richtigeAntwort(a));
    if(!u.richtig)
      melde(spec.templateId + ' Seed ' + seed + ' [' + spec.format +
            ']: richtige Antwort abgelehnt — ' + u.feedback.slice(0, 70));
  }
});

print('D) Deutsch: Lueckenaufgaben verzeihen Schreibweise, nicht Endungen');
TEXTBLOECKE.filter(function(s){ return s.format === 'luecke'; }).forEach(function(spec){
  for(var seed = 1; seed <= 120; seed++){
    var a = ziehText(spec, seed);
    GEPRUEFT++;
    var l = a.loesungWorte[0];
    if(!l) continue;
    // Gross-/Kleinschreibung und Leerzeichen sollen egal sein.
    if(!bewerteText(a, {eingabe: l.toUpperCase()}).richtig)
      melde(spec.templateId + ': GROSSSCHREIBUNG «' + l + '» wird abgelehnt');
    if(!bewerteText(a, {eingabe: '  ' + l + '  '}).richtig)
      melde(spec.templateId + ': Leerzeichen um «' + l + '» werden nicht verziehen');
    // Eine falsche Endung darf NICHT durchgehen.
    var falsch = l + 'xyz';
    if(bewerteText(a, {eingabe: falsch}).richtig)
      melde(spec.templateId + ': «' + falsch + '» wird faelschlich angenommen');
  }
});

print('E) Deutsch: jeder Distraktor wird mit Denkfehler abgelehnt');
TEXTBLOECKE.forEach(function(spec){
  spec.aufgaben.forEach(function(auf, idx){
    (auf.fehler || []).forEach(function(f){
      GEPRUEFT++;
      // Die Aufgabe direkt bauen, damit wir genau diese pruefen.
      var a = null;
      for(var seed = 1; seed <= 600 && !a; seed++){
        var k = ziehText(spec, seed);
        if(k.stamm === auf.stamm) a = k;
      }
      if(!a){ melde(spec.templateId + ' Aufgabe ' + (idx+1) + ' ist ueber 600 Seeds nicht erreichbar'); return; }
      var antwort;
      if(spec.format === 'einfachauswahl' || spec.format === 'mehrfachauswahl'){
        var o = a.optionen.filter(function(x){ return x.text === f.antwort; })[0];
        if(!o){ melde(spec.templateId + ': Distraktor «' + f.antwort + '» nicht in den Optionen'); return; }
        antwort = spec.format === 'einfachauswahl' ? {optionId: o.id} : {optionIds: [o.id]};
      } else {
        antwort = {eingabe: f.antwort};
      }
      var u = bewerteText(a, antwort);
      if(u.richtig)
        melde(spec.templateId + ': Distraktor «' + f.antwort + '» wird als richtig gewertet');
      else if(u.diagnoseId !== f.diagnoseId)
        melde(spec.templateId + ': «' + f.antwort + '» liefert «' + u.diagnoseId +
              '» statt «' + f.diagnoseId + '»');
    });
  });
});

print('F) Randfaelle');
function rand(was, fn){ GEPRUEFT++; try { fn(); } catch(e){ melde('Randfall ' + was + ': ' + e.message); } }

rand('kein Termin gesetzt', function(){
  App.zuruecksetzen(); App.anmelden('gast');
  Z.profil.kanton = 'ZH'; Z.profil.schultyp = 'fms'; Z.profil.pruefungsdatum = null;
  var P = lernpfad();
  if(P.aktiv) throw new Error('Lernpfad aktiv ohne Termin');
  if(!P.grund) throw new Error('kein Grund angegeben');
  S.Lernpfad(); S.Lernen(); S.Fortschritt();
});
rand('Termin in der Vergangenheit', function(){
  Z.profil.pruefungsdatum = '2020-01-01';
  var P = lernpfad();
  if(P.aktiv) throw new Error('Lernpfad aktiv trotz vergangenem Termin');
  S.Lernpfad(); S.Lernen();
});
rand('Termin morgen', function(){
  // In Ortszeit rechnen, nicht in UTC — sonst prüft der Test am Abend
  // etwas anderes, als er zu pruefen glaubt.
  var d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 1);
  var m = alsDatum(d);
  Z.profil.pruefungsdatum = m;
  var P = lernpfad();
  if(!P.aktiv) throw new Error('Lernpfad inaktiv bei Termin morgen');
  if(P.wochenBisPruefung < 1) throw new Error('Wochen = ' + P.wochenBisPruefung);
  S.Lernpfad();
});
rand('ohne jeden Fortschritt', function(){
  App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
  S.Fortschritt(); S.Lernpfad(); S.Fehlerarchiv(); S.ElternReport(); S.Lernen();
});
rand('alle Themen abgeschlossen', function(){
  App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
  // Jedes bespielte Thema künstlich voll machen
  // Gefuellt wird je BEREICH — dort liegen die Themenbaeume. «meineFaecher»
  // gibt seit der Trennung von Fach und Bereich die Pruefungsfaecher zurueck,
  // und «bespielt('deutsch')» waere leer.
  meineBereiche().forEach(function(f){
    Array.from(bespielt(f)).forEach(function(u){
      var soll = unterthemaVon(f,u).pflichtset;
      for(var i = 0; i < soll; i++)
        Z.versuche.push({ref:'x'+f+u+i, fach:f, unterthema:u, richtig:true, diagnoseId:null, zeit:new Date()});
    });
  });
  var r = rangliste();
  if(r.length !== 0) throw new Error('Rangliste nicht leer: ' + r.length);
  var P = lernpfad();
  if(P.offenTotal !== 0) throw new Error('offenTotal = ' + P.offenTotal);
  var h = S.Lernen();
  if(h.indexOf('undefined') >= 0) throw new Error('undefined auf Lernen');
  S.Lernpfad(); S.Fortschritt();
});
rand('Kanton ohne Schultypen', function(){
  App.zuruecksetzen(); App.anmelden('gast');
  Z.profil.kanton = 'BE'; Z.profil.schultyp = null;
  S.SchulWahl();
  meineFaecher();
});
rand('leere Eingabe', function(){
  App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
  App.uebungStarten('mathematik','4.06'); App.introFertig();
  App.zustandLeeren(Z.lauf);
  if(App.bereit()) throw new Error('leere Antwort gilt als bereit');
  // Und eine vollständige, aber falsche Antwort — im Format, das die
  // Aufgabe tatsaechlich hat.
  var a = Z.lauf.aufgaben[Z.lauf.bei], f = falscheAntwort(a);
  if(!f) return;
  antwortSetzen(Z.lauf, a, f);
  if(!App.bereit()) throw new Error('vollstaendige Antwort gilt nicht als bereit');
  App.antworten();
  if(!Z.lauf.rueckmeldung) throw new Error('keine Rueckmeldung auf eine falsche Antwort');
  if(Z.lauf.rueckmeldung.richtig) throw new Error('falsche Antwort als richtig gewertet');
});
rand('alle Hinweise abrufen', function(){
  App.uebungStarten('mathematik','4.06'); App.introFertig();
  var a = Z.lauf.aufgaben[0];
  for(var i = 0; i < a.hinweise.length + 3; i++) App.tipp();
  if(Z.lauf.hinweisStufe > a.hinweise.length)
    throw new Error('Hinweisstufe ' + Z.lauf.hinweisStufe + ' > ' + a.hinweise.length);
});

print('');
print('Geprueft: ' + GEPRUEFT + ' Faelle');
if(FEHLER.length === 0) print('KEINE FEHLER');
else { print(FEHLER.length + ' FEHLER:'); FEHLER.forEach(function(f,i){ print('  '+(i+1)+'. '+f); }); }
