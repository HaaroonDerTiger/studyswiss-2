/* ======================================================================
   Faehrt echte Nutzerwege durch die Vorschau und meldet jeden Fehler.
   ====================================================================== */
var FEHLER = [], SCHRITTE = 0;
function pruefe(was, fn){
  SCHRITTE++;
  try { fn(); }
  catch(e){ FEHLER.push(was + ' → ' + (e && e.message ? e.message : String(e))); }
}
function behaupte(was, bedingung, zusatz){
  SCHRITTE++;
  if(!bedingung) FEHLER.push('BEHAUPTUNG: ' + was + (zusatz ? ' (' + zusatz + ')' : ''));
}

/* --- 1) Jeder Screen muss ohne Ausnahme rendern -------------------- */
print('1) Alle Screens rendern');
App.zuruecksetzen();
App.anmelden('apple');
App.waehleKanton('ZH');
App.waehleSchule('fms');

var brauchtLauf = ['DiagnoseLauf','DiagnoseErgebnis','UebungIntro','UebungFrage',
                   'UebungErgebnis','SelbsttestLauf','SelbsttestErgebnis',
                   'AufsatzSchreiben','AufsatzKorrektur'];
Object.keys(S).forEach(function(name){
  if(brauchtLauf.indexOf(name) >= 0) return;   // später mit echtem Lauf
  pruefe('Screen ' + name, function(){
    Z.screen = name;
    var html = S[name]();
    if(typeof html !== 'string' || html.length < 20)
      throw new Error('liefert kein brauchbares HTML (' + typeof html + ')');
    if(html.indexOf('undefined') >= 0)
      throw new Error('enthaelt das Wort «undefined» im Markup');
    if(html.indexOf('[object Object]') >= 0)
      throw new Error('enthaelt [object Object]');
    if(html.indexOf('NaN') >= 0)
      throw new Error('enthaelt NaN');
  });
});

/* --- 2) Der ganze Onboarding-Weg ----------------------------------- */
print('2) Onboarding von vorne');
App.zuruecksetzen();
pruefe('Splash', function(){ S.Start(); });
pruefe('Onboarding 1', function(){ S.Onboarding(); App.onboardingWeiter(); });
pruefe('Onboarding 2', function(){ S.Onboarding(); App.onboardingWeiter(); });
pruefe('Anmeldung', function(){ S.Anmeldung(); App.anmelden('gast'); });
behaupte('nach der Anmeldung gibt es ein Profil', Z.profil !== null);
pruefe('Kantonswahl', function(){ S.KantonWahl(); App.waehleKanton('ZH'); });
behaupte('Kanton ist gesetzt', Z.profil.kanton === 'ZH', Z.profil.kanton);
pruefe('Schulwahl', function(){ S.SchulWahl(); App.waehleSchule('fms'); });
behaupte('Schultyp ist gesetzt', Z.profil.schultyp === 'fms');
behaupte('Termin ist vorbelegt', !!Z.profil.pruefungsdatum, String(Z.profil.pruefungsdatum));
behaupte('Tage bis Pruefung sind positiv', tageBisPruefung() > 0, String(tageBisPruefung()));
pruefe('Termin-Screen', function(){ S.PruefungTermin(); });

/* --- 3) Standortbestimmung komplett durchspielen -------------------- */
print('3) Standortbestimmung, 24 Aufgaben');
pruefe('Standort starten', function(){ App.standortStarten(); });
behaupte('Standort hat Aufgaben', Z.lauf && Z.lauf.aufgaben.length > 0,
         Z.lauf ? String(Z.lauf.aufgaben.length) : 'kein Lauf');
var anzahl = Z.lauf ? Z.lauf.aufgaben.length : 0;
for(var i = 0; i < anzahl + 2 && Z.screen === 'DiagnoseLauf'; i++){
  (function(n){
    pruefe('Standort Aufgabe ' + (n+1), function(){
      var html = S.DiagnoseLauf();
      if(html.indexOf('undefined') >= 0) throw new Error('undefined im Markup');
      var a = Z.lauf.aufgaben[Z.lauf.bei];
      // So antwortet ein Kind: mal richtig, mal daneben.
      // Abwechselnd richtig und daneben — in dem Format, das die Aufgabe
      // tatsaechlich hat. `richtigeAntwort`/`falscheAntwort` kennen alle
      // vierzehn; eine Kette von if-Zweigen hier wäre die fünfzehnte
      // Stelle, an der man ein neues Format vergessen kann.
      var w = n % 2 === 0 ? richtigeAntwort(a) : (falscheAntwort(a) || richtigeAntwort(a));
      antwortSetzen(Z.lauf, a, w);
      App.antworten();
    });
  })(i);
}
behaupte('Standort endet im Ergebnis', Z.screen === 'DiagnoseErgebnis', Z.screen);
pruefe('Startpunkt-Screen', function(){
  var h = S.DiagnoseErgebnis();
  if(h.indexOf('undefined') >= 0) throw new Error('undefined im Markup');
});
behaupte('Startpunkt zaehlt alle Themen',
  Z.lauf.startpunkt.sitzen + Z.lauf.startpunkt.ueben + Z.lauf.startpunkt.offen > 0);

/* --- 4) Uebung mit allen fünf Aufgabenarten ----------------------- */
print('4) Uebung, jede Aufgabenart');
var arten = {};
alleBereicheMitAufgaben().forEach(function(fach){
  var themen = Array.from(bespielt(fach));
  themen.forEach(function(u){
    pruefe('Uebung ' + fach + ' ' + u, function(){
      App.uebungStarten(fach, u);
      if(Z.screen !== 'UebungIntro') throw new Error('kein Intro, sondern ' + Z.screen);
      S.UebungIntro();
      App.introFertig();
      for(var k = 0; k < 3 && Z.screen === 'UebungFrage'; k++){
        var a = Z.lauf.aufgaben[Z.lauf.bei];
        arten[a.format] = (arten[a.format] || 0) + 1;
        S.UebungFrage();
        App.tipp();                       // Hinweis holen
        S.UebungFrage();
        // richtig antworten
        antwortSetzen(Z.lauf, a, richtigeAntwort(a));
        App.antworten();
        if(!Z.lauf.rueckmeldung) throw new Error('keine Rueckmeldung nach dem Antworten');
        if(!Z.lauf.rueckmeldung.richtig)
          throw new Error('richtige Antwort wurde als falsch gewertet: ' +
            a.templateId + ' [' + a.format + '] Eingabe=' +
            JSON.stringify(richtigeAntwort(a)).slice(0, 140) +
            ' Loesung=' + JSON.stringify(a.loesungWorte || a.loesungText));
        S.UebungFrage();                  // mit Rückmeldungsblatt
        App.weiter();
      }
    });
  });
});
print('   Aufgabenarten geprueft: ' + JSON.stringify(arten));

/* --- 4b) Der Rückweg aus einer Übung ------------------------------- */
print('4b) Rückweg zu den Unterthemen');
pruefe('Rückweg', function(){
  App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
  var themen = Array.from(bespielt('mathematik'));

  // Aus der Themenliste heraus — der Normalfall.
  App.uebungStarten('mathematik', themen[0]);
  if(Z.lauf.zurueck !== 'Fach:mathematik')
    throw new Error('zurueck = ' + Z.lauf.zurueck + ' statt Fach:mathematik');
  if(S.UebungIntro().indexOf("App.geh('Fach:mathematik')") < 0)
    throw new Error('In der Einführung fehlt der Weg zur Themenliste');
  App.introFertig();
  if(S.UebungFrage().indexOf('themenknopf') < 0)
    throw new Error('Der Themenname in der Kopfleiste ist kein Knopf');

  // Das X führt wirklich dorthin.
  App.geh(Z.lauf.zurueck);
  if(Z.screen !== 'Fach' || Z.fachOffen !== 'mathematik')
    throw new Error('Das X landet auf ' + Z.screen + '/' + Z.fachOffen);

  // Aus dem Fehlerarchiv heraus führt es dorthin zurück — und der Weg zur
  // Themenliste steht trotzdem oben.
  App.uebungStarten('mathematik', themen[0], 'Fehlerarchiv');
  if(Z.lauf.zurueck !== 'Fehlerarchiv')
    throw new Error('Aus dem Fehlerarchiv: zurueck = ' + Z.lauf.zurueck);
  App.introFertig();
  if(S.UebungFrage().indexOf("App.geh('Fach:mathematik')") < 0)
    throw new Error('Aus dem Fehlerarchiv fehlt der Weg zur Themenliste');

  // Und nach der Übung.
  var schutz = 0;
  while(Z.screen === 'UebungFrage' && schutz++ < 50){
    var a = Z.lauf.aufgaben[Z.lauf.bei];
    antwortSetzen(Z.lauf, a, richtigeAntwort(a));
    App.antworten(); App.weiter();
  }
  var e = S.UebungErgebnis();
  if(e.indexOf('Zu den Themen') < 0) throw new Error('Im Ergebnis fehlt «Zu den Themen»');
  if(e.indexOf("App.geh('Fach:mathematik')") < 0)
    throw new Error('Im Ergebnis führt der Knopf nicht zur Themenliste');
});

/* --- 4c) Prüfungstermin ändern ------------------------------------- */
print('4c) Prüfungstermin wählen');
pruefe('Terminwahl', function(){
  App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');
  if(!Z.profil.pruefungsdatum) throw new Error('Kein Termin vorbelegt');

  App.geh('PruefungTermin');
  if(bildschirm().indexOf('datumsfeld') >= 0)
    throw new Error('Der Wähler ist offen, bevor man ihn öffnet');
  App.datumWaehler();
  var h = bildschirm();
  if(h.indexOf('datumsfeld') < 0) throw new Error('Kein Datumsfeld im Wähler');
  if(h.indexOf('2027-03-06') < 0 || h.indexOf('2027-03-07') < 0)
    throw new Error('Die Termine aus dem Katalog fehlen');

  App.datumSetzen('2027-03-06');
  if(Z.profil.pruefungsdatum !== '2027-03-06')
    throw new Error('Katalogtermin nicht übernommen: ' + Z.profil.pruefungsdatum);
  if(Z.datumOffen) throw new Error('Der Wähler bleibt nach der Wahl offen');

  App.datumWaehler(); App.datumSetzen('2028-01-15');
  if(Z.profil.pruefungsdatum !== '2028-01-15')
    throw new Error('Eigenes Datum nicht übernommen');
  if(!lernpfad().aktiv) throw new Error('Lernpfad inaktiv nach der Änderung');

  // Ein Datum in der Vergangenheit wird abgelehnt, mit Begründung.
  App.datumWaehler(); App.datumSetzen('2020-01-01');
  if(Z.profil.pruefungsdatum === '2020-01-01')
    throw new Error('Ein Datum in der Vergangenheit wurde übernommen');
  if(!Z.datumFehler) throw new Error('Keine Begründung bei einem Datum in der Vergangenheit');
  App.datumSetzen('nonsens');
  if(Z.profil.pruefungsdatum !== '2028-01-15') throw new Error('Unsinn hat das Datum überschrieben');
  App.datumSchliessen();

  App.geh('EinstellungenPruefung'); App.datumWaehler();
  if(bildschirm().indexOf('datumsfeld') < 0)
    throw new Error('In den Einstellungen fehlt der Wähler');
  App.datumSchliessen();
});

/* --- 4d) Meldungen, Rückfragen, Eingaben --------------------------- */
print('4d) Meldung, Rückfrage, Eingabeblatt');
pruefe('eigene Dialoge', function(){
  App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton('ZH'); App.waehleSchule('fms');

  App.melde('Probe');
  if(bildschirm().indexOf('Probe') < 0) throw new Error('Die Meldung erscheint nicht');
  Z.meldung = null;

  App.geh('Plus');
  App.kaufen('pass');
  if(!Z.frage) throw new Error('Der Kauf stellt keine Rückfrage');
  var h = bildschirm();
  if(h.indexOf('Prüfungs-Pass') < 0) throw new Error('Die Rückfrage nennt das Produkt nicht');
  if(h.indexOf('Abbrechen') < 0) throw new Error('Die Rückfrage lässt sich nicht abbrechen');
  App.frageAbbrechen();
  if(Z.profil.plus) throw new Error('Abbrechen hat trotzdem gekauft');
  App.kaufen('pass'); App.frageJa();
  if(!Z.profil.plus) throw new Error('Bestätigen hat nicht gekauft');

  App.kontoLoeschen();
  if(!Z.frage || !Z.frage.gefahr)
    throw new Error('Konto löschen ist nicht als gefährlich gekennzeichnet');
  App.frageAbbrechen();
  if(!Z.profil) throw new Error('Abbrechen hat das Konto trotzdem gelöscht');

  Z.profil.plus = false;
  App.codeEinloesen();
  if(bildschirm().indexOf('blatteingabe') < 0) throw new Error('Kein Eingabefeld im Blatt');
  App.eingabeblattTippen('kurz'); App.eingabeblattFertig();
  if(Z.profil.plus) throw new Error('Ein zu kurzer Code wurde angenommen');
  if(!Z.meldung) throw new Error('Keine Meldung bei einem falschen Code');
  App.codeEinloesen();
  App.eingabeblattTippen('FAM-4K7Q-2M'); App.eingabeblattFertig();
  if(!Z.profil.plus) throw new Error('Ein gültiger Code wurde nicht angenommen');
});

/* --- 5) Falsche Antworten müssen den Denkfehler benennen ---------- */
print('5) Falsche Antworten');
App.uebungStarten('mathematik', '4.06');
App.introFertig();
pruefe('falsche Antwort', function(){
  var a = Z.lauf.aufgaben[0];
  var f = (a.format === 'zahl_eingeben' && a.fehler.length)
        ? {eingabe: String(a.fehler[0].wert)} : falscheAntwort(a);
  antwortSetzen(Z.lauf, a, f);
  App.antworten();
  var r = Z.lauf.rueckmeldung;
  if(!r) throw new Error('keine Rueckmeldung');
  if(r.richtig) throw new Error('falsche Antwort wurde als richtig gewertet');
  if(r.feedback.length < 40) throw new Error('Feedback zu knapp: ' + r.feedback);
  if(r.feedback.indexOf('undefined') >= 0) throw new Error('undefined im Feedback');
});

/* --- 6) Selbsttest ------------------------------------------------- */
print('6) Selbsttest');
Z.selbsttestFach = 'mathematik'; Z.selbsttestUmfang = 'alle';
pruefe('Selbsttest starten', function(){ App.selbsttestStarten(); });
behaupte('Selbsttest hat Aufgaben', Z.lauf && Z.lauf.aufgaben.length > 0);
var n2 = Z.lauf ? Z.lauf.aufgaben.length : 0;
for(var j = 0; j < n2 + 2 && Z.screen === 'SelbsttestLauf'; j++){
  pruefe('Selbsttest Aufgabe ' + (j+1), function(){
    S.SelbsttestLauf();
    var a = Z.lauf.aufgaben[Z.lauf.bei];
    antwortSetzen(Z.lauf, a, richtigeAntwort(a));
    App.antworten();
  });
}
behaupte('Selbsttest endet im Ergebnis', Z.screen === 'SelbsttestErgebnis', Z.screen);
pruefe('Selbsttest-Ergebnis', function(){ S.SelbsttestErgebnis(); });

/* --- 7) Fortschritt, Lernpfad, Fehlerarchiv, Eltern ---------------- */
print('7) Auswertungen');
pruefe('Fortschritt', function(){ S.Fortschritt(); });
pruefe('Lernpfad', function(){
  var P = lernpfad();
  if(!P.aktiv) throw new Error('Lernpfad inaktiv trotz Termin: ' + P.grund);
  if(!P.wochen.length) throw new Error('keine Wochen');
  if(P.pensumDieseWoche <= 0) throw new Error('Pensum ist ' + P.pensumDieseWoche);
  if(P.etappen.length !== 4) throw new Error(P.etappen.length + ' Etappen statt 4');
  S.Lernpfad();
});
pruefe('Fehlerarchiv', function(){ S.Fehlerarchiv(); });
pruefe('Eltern-Report', function(){ Z.profil.elternFreigabe = true; S.ElternReport(); });
pruefe('Plus', function(){ S.Plus(); });
pruefe('Plus mit Abo', function(){ Z.profil.plus = true; S.Plus(); Z.profil.plus = false; });

/* --- 8) Aufsatz ---------------------------------------------------- */
print('8) Aufsatz');
pruefe('Themenblatt', function(){
  Z.aufsatz = {blatt: App.wuerfleBlatt()};
  if(Z.aufsatz.blatt.length !== 4) throw new Error(Z.aufsatz.blatt.length + ' Themen statt 4');
  S.AufsatzThemen();
});
pruefe('Schreiben', function(){
  App.aufsatzWaehlen(Z.aufsatz.blatt[0].id);
  S.AufsatzSchreiben();
  App.aufsatzText('Wort '.repeat(150));
  S.AufsatzSchreiben();
});
pruefe('Korrektur', function(){ S.AufsatzKorrektur(); });

/* --- 9) Demo-Daten ------------------------------------------------- */
print('9) Demo-Fortschritt');
pruefe('Demo fuellen', function(){ App.demoDaten(); });
behaupte('Demo legt Versuche an', Z.versuche.length > 50, String(Z.versuche.length));
pruefe('Fortschritt mit Demo', function(){
  var h = S.Fortschritt();
  if(h.indexOf('NaN') >= 0) throw new Error('NaN im Fortschritt');
});
pruefe('Lernpfad mit Demo', function(){ S.Lernpfad(); });
pruefe('Fehlerarchiv mit Demo', function(){
  var h = S.Fehlerarchiv();
  if(h.indexOf('undefined') >= 0) throw new Error('undefined im Fehlerarchiv');
});

/* --- Bericht ------------------------------------------------------- */
print('');
print('Schritte: ' + SCHRITTE);
if(FEHLER.length === 0){
  print('KEINE FEHLER');
} else {
  print(FEHLER.length + ' FEHLER:');
  FEHLER.forEach(function(f, i){ print('  ' + (i+1) + '. ' + f); });
}
