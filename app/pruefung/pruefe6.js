/* ======================================================================
   Runde 6 — ergeben die Zahlen Sinn?

   Die bisherigen Runden prüfen, ob etwas läuft und ob es richtig bewertet.
   Diese prüft, ob das, was dasteht, in sich stimmt: Kann «8 von 5» je
   dastehen? Bleibt das Wochenpensum sinnvoll, wenn die Prüfung morgen ist —
   oder in drei Jahren? Widerspricht sich der Fortschritt?

   Solche Fehler stürzen nicht ab. Sie stehen einfach da und sind falsch.
   ====================================================================== */
var F6 = [], N6 = 0;
function m6(t){ if(F6.length < 40) F6.push(t); }
function p6(was, fn){ N6++; try { fn(); } catch(e){ m6(was + ': wirft ' + e); } }

function amDatum(tage){
  var d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + tage);
  return alsDatum(d);
}
function frisch(){
  App.zuruecksetzen(); App.anmelden('apple');
  App.waehleKanton('ZH'); App.waehleSchule('fms');
}

/* --- 1) Der Lernpfad bei jedem denkbaren Termin -------------------- */
[1, 2, 6, 7, 13, 27, 30, 90, 190, 365, 730, 1095].forEach(function(tage){
  p6('Lernpfad bei ' + tage + ' Tagen', function(){
    frisch();
    Z.profil.pruefungsdatum = amDatum(tage);
    var P = lernpfad();
    if(!P.aktiv) return m6('Lernpfad bei ' + tage + ' Tagen inaktiv: ' + P.grund);

    if(P.wochenBisPruefung < 1)
      m6(tage + ' Tage: ' + P.wochenBisPruefung + ' Wochen bis zur Prüfung');
    if(P.pensumDieseWoche < 0)
      m6(tage + ' Tage: negatives Pensum ' + P.pensumDieseWoche);
    if(P.pensumDieseWoche > 40)
      m6(tage + ' Tage: Pensum ' + P.pensumDieseWoche + ' über der Obergrenze 40');
    if(P.geloestDieseWoche > P.pensumDieseWoche && P.pensumDieseWoche > 0)
      m6(tage + ' Tage: «' + P.geloestDieseWoche + ' von ' + P.pensumDieseWoche + '»');
    if(P.offenTotal < 0) m6(tage + ' Tage: offenTotal ' + P.offenTotal);
    if(!P.wochen.length) m6(tage + ' Tage: keine einzige Woche im Pfad');
    if(P.wochen.length !== P.wochenTotal && P.wochenTotal)
      m6(tage + ' Tage: ' + P.wochen.length + ' Wochen, angekündigt ' + P.wochenTotal);

    // Genau eine Woche ist «diese Woche».
    var jetzt = P.wochen.filter(function(w){ return w.istDieseWoche; });
    if(jetzt.length !== 1) m6(tage + ' Tage: ' + jetzt.length + ' Wochen als «diese Woche»');

    // Die Wochen laufen lückenlos und in der richtigen Richtung.
    for(var i = 1; i < P.wochen.length; i++){
      if(P.wochen[i].von <= P.wochen[i-1].von)
        m6(tage + ' Tage: Woche ' + i + ' liegt nicht nach der vorigen');
    }
    // Die vier Abschnitte decken den Pfad ab, ohne Lücke und ohne Überlappung.
    var e = P.etappen;
    if(e.length !== 4) m6(tage + ' Tage: ' + e.length + ' Abschnitte statt 4');
    var letzteWoche = 0;
    for(var k = 0; k < e.length; k++){
      // Ein Abschnitt ohne Woche ist erlaubt — bei kurzer Restzeit reicht die
      // Zeit nicht für alle vier. Er trägt dann `null` und wird ohne
      // Zeitangabe gezeigt, statt «Woche 3–1» zu behaupten.
      if(e[k].vonWoche == null){
        if(e[k].bisWoche != null)
          m6(tage + ' Tage: Abschnitt ' + e[k].nummer + ' hat ein Ende ohne Anfang');
        continue;
      }
      if(e[k].vonWoche > e[k].bisWoche)
        m6(tage + ' Tage: Abschnitt ' + e[k].nummer + ' endet vor seinem Anfang');
      if(e[k].vonWoche !== letzteWoche + 1)
        m6(tage + ' Tage: Abschnitt ' + e[k].nummer + ' beginnt in Woche ' +
           e[k].vonWoche + ', die vorige endete in ' + letzteWoche);
      letzteWoche = e[k].bisWoche;
      if(e[k].abgeschlossen > e[k].total)
        m6(tage + ' Tage: Abschnitt ' + e[k].nummer + ': ' +
           e[k].abgeschlossen + ' von ' + e[k].total);
    }
    // Und der Screen zeichnet sich.
    App.geh('Lernpfad'); bildschirm();
  });
});

/* --- 1b) Die Routenkarte ------------------------------------------- */
[3, 10, 30, 90, 190, 400].forEach(function(tage){
  p6('Routenkarte bei ' + tage + ' Tagen', function(){
    frisch();
    Z.profil.pruefungsdatum = amDatum(tage);
    App.geh('Lernpfad');
    var h = bildschirm(), P = lernpfad();

    // Der Startknopf gehört nach oben — sonst muss man durch den ganzen
    // Pfad scrollen, um anzufangen.
    var iKnopf = h.indexOf('beginnen</button>');
    var iRoute = h.indexOf('class="route"');
    var iHalt = h.indexOf('class="halt ');
    if(iKnopf < 0) m6(tage + ' Tage: kein Startknopf');
    else if(iKnopf > iRoute || iKnopf > iHalt)
      m6(tage + ' Tage: der Startknopf steht nicht mehr zuoberst');
    if(iRoute < 0) m6(tage + ' Tage: keine Routenübersicht');
    if(h.indexOf('wanderer') < 0) m6(tage + ' Tage: kein Wanderer auf der Route');
    if(h.indexOf('fahne') < 0) m6(tage + ' Tage: keine Fahne am Ziel');

    var jetzt = (h.match(/class="halt jetzt"/g) || []).length;
    if(jetzt !== 1) m6(tage + ' Tage: ' + jetzt + ' Halte als «jetzt» markiert');

    var m = /left:calc\(([\d.]+)% - 11px\)/.exec(h);
    if(!m) m6(tage + ' Tage: der Wanderer hat keine Position');
    else if(+m[1] < 0 || +m[1] > 100) m6(tage + ' Tage: Wanderer bei ' + m[1] + ' %');

    var stuecke = (h.match(/class="routeStueck/g) || []).length;
    var mitWochen = P.etappen.filter(function(e){ return e.vonWoche != null; }).length;
    if(stuecke !== mitWochen)
      m6(tage + ' Tage: ' + stuecke + ' Routenstücke, ' + mitWochen + ' Etappen mit Wochen');
  });
});

/* --- 2) Termin heute, gestern, gar nicht --------------------------- */
[[0,'heute'], [-1,'gestern'], [-400,'vor über einem Jahr']].forEach(function(p){
  p6('Termin ' + p[1], function(){
    frisch();
    Z.profil.pruefungsdatum = amDatum(p[0]);
    var P = lernpfad();
    if(P.aktiv) m6('Termin ' + p[1] + ': Lernpfad noch aktiv');
    if(!P.grund || P.grund.length < 20) m6('Termin ' + p[1] + ': kein brauchbarer Grund');
    App.geh('Lernpfad');
    if(bildschirm().indexOf('undefined') >= 0) m6('Termin ' + p[1] + ': undefined im Screen');
  });
});
p6('gar kein Termin', function(){
  frisch(); Z.profil.pruefungsdatum = null;
  if(lernpfad().aktiv) m6('Ohne Termin ist der Lernpfad aktiv');
  App.geh('Lernpfad'); App.geh('Lernen'); App.geh('Fortschritt'); bildschirm();
});

/* --- 3) Der Fortschritt widerspricht sich nicht -------------------- */
p6('Fortschritt in sich stimmig', function(){
  frisch();
  alleBereicheMitAufgaben().forEach(function(f){
    fortschritte([f]).forEach(function(x){
      if(x.geloest > x.pflichtset)
        m6('Fortschritt: «' + x.geloest + ' von ' + x.pflichtset + '» in ' + x.unterthema);
      if(x.pflichtset <= 0) m6('Fortschritt: Pflichtset ' + x.pflichtset + ' in ' + x.unterthema);
      if(x.quote < 0 || x.quote > 1) m6('Fortschritt: Quote ' + x.quote + ' in ' + x.unterthema);
    });
  });
});

/* --- 4) Der Scheduler schlägt nichts dreimal am Stück vor ---------- */
p6('Kein drittes Mal am Stück', function(){
  frisch();
  var letzte = [];
  for(var i = 0; i < 25; i++){
    var r = rangliste()[0];
    if(!r) break;
    letzte.push(r.fach + '|' + r.unterthema);
    if(letzte.length >= 3){
      var d = letzte.slice(-3);
      if(d[0] === d[1] && d[1] === d[2])
        return m6('Dreimal hintereinander vorgeschlagen: ' + d[0]);
    }
    // So tut es ein Kind: die Aufgaben lösen.
    App.uebungStarten(r.fach, r.unterthema);
    if(!Z.lauf) break;
    App.introFertig();
    var schutz = 0;
    while(Z.screen === 'UebungFrage' && schutz++ < 30){
      var a = Z.lauf.aufgaben[Z.lauf.bei];
      antwortSetzen(Z.lauf, a, richtigeAntwort(a));
      App.antworten(); App.weiter();
    }
  }
});

/* --- 5) Der Selbsttest liefert, was er verspricht ------------------ */
/* Der Selbsttest laeuft ueber ein PRUEFUNGSFACH — «deutsch», nicht
   «sprachbetrachtung». Ein Deutsch-Selbsttest mischt Sprachbetrachtung und
   Textverstaendnis, so wie die Pruefung. */
[['mathematik','alle'], ['deutsch','alle'], ['mathematik','pruefung'],
 ['deutsch','pruefung']].forEach(function(p){
  p6('Selbsttest ' + p.join('/'), function(){
    frisch(); Z.profil.plus = true;
    Z.selbsttestFach = p[0]; Z.selbsttestUmfang = p[1];
    App.selbsttestStarten();
    if(!Z.lauf || Z.lauf.art !== 'SELBSTTEST') return m6('Selbsttest ' + p.join('/') + ' startet nicht');
    var soll = p[1] === 'pruefung' ? 20 : 12;
    if(Z.lauf.aufgaben.length !== soll)
      m6('Selbsttest ' + p.join('/') + ': ' + Z.lauf.aufgaben.length + ' statt ' + soll + ' Aufgaben');
    // Keine Aufgabe doppelt.
    var refs = {}, doppelt = 0;
    Z.lauf.aufgaben.forEach(function(a){ if(refs[a.ref]) doppelt++; refs[a.ref] = 1; });
    if(doppelt) m6('Selbsttest ' + p.join('/') + ': ' + doppelt + ' Aufgaben doppelt');
    // Und alle gehören zum gewählten Fach. Die Aufgabe traegt den BEREICH
    // in `fach` — ein Deutsch-Selbsttest enthaelt darum Aufgaben mit
    // «sprachbetrachtung» und «textverstaendnis», und beide gehoeren dazu.
    var meine = bereicheVon(p[0]);
    var fremd = Z.lauf.aufgaben.filter(function(a){ return meine.indexOf(a.fach) < 0; });
    if(fremd.length) m6('Selbsttest ' + p.join('/') + ': ' + fremd.length + ' Aufgaben aus einem anderen Fach');
    // Bei einem Fach mit mehreren Bereichen muss der Test sie auch wirklich
    // mischen — sonst hiesse er «Deutsch» und pruefte nur die Grammatik.
    if(meine.length > 1 && p[1] !== 'einzelne'){
      var drin = {};
      Z.lauf.aufgaben.forEach(function(a){ drin[a.fach] = (drin[a.fach]||0) + 1; });
      var fehlend = meine.filter(function(b){ return !drin[b]; });
      if(fehlend.length)
        m6('Selbsttest ' + p.join('/') + ': kein einziger Aufgabe aus ' + fehlend.join(', '));
    }
    if(Z.lauf.uhrId) clearInterval(Z.lauf.uhrId);
  });
});

/* --- 6) Ein Übungsset wiederholt sich nicht ------------------------ */
p6('Übungsset ohne Dubletten', function(){
  frisch();
  alleBereicheMitAufgaben().forEach(function(fach){
    Array.from(bespielt(fach)).slice(0, 12).forEach(function(u){
      App.uebungStarten(fach, u);
      if(!Z.lauf) return;
      var refs = {}, doppelt = [];
      Z.lauf.aufgaben.forEach(function(a){
        if(refs[a.ref]) doppelt.push(a.ref);
        refs[a.ref] = 1;
      });
      if(doppelt.length) m6(fach + '/' + u + ': Aufgabe doppelt im Set — ' + doppelt[0]);
      // Die Einführung darf keine Aufgabe aus dem Set sein.
      if(Z.lauf.beispiel && refs[Z.lauf.beispiel.ref])
        m6(fach + '/' + u + ': die Einführung zeigt eine Aufgabe aus dem Set');
    });
  });
});

/* --- 7) Der Eltern-Report bezieht alles auf dieselbe Woche --------- */
p6('Eltern-Report', function(){
  frisch();
  Z.profil.elternReport = true;
  App.geh('ElternReport');
  var h = bildschirm();
  if(h.indexOf('undefined') >= 0) m6('Eltern-Report: undefined im Screen');
  // Er darf keine Aufsatztexte und keine einzelnen Aufgaben zeigen.
  if(/aufgabeRef|templateId|:\d{3,}/.test(h))
    m6('Eltern-Report zeigt einzelne Aufgaben — das darf er nicht');
  if(h.indexOf('ZAP') >= 0) m6('Eltern-Report sagt «ZAP» statt «Aufnahmeprüfung»');
});

/* --- «Nochmal» im Fehlerarchiv gibt DIESELBE Aufgabe --------------- */
/* Der Knopf rief lange `uebungStarten(fach, code)` und zog zehn frische
   Aufgaben — die eine, an der es gehakt hatte, war nicht darunter. Genau
   dafür speichert die App `templateId:seed`: Aus der Ref entsteht sie
   Zeichen für Zeichen wieder. Ohne diese Prüfung fiele das nie auf, weil
   ein frisches Set genauso «funktioniert». */
p6('Fehlerarchiv: Nochmal gibt dieselbe Aufgabe', function(){
  frisch();
  var code = Array.from(bespielt('mathematik')).sort()[0];
  App.uebungStarten('mathematik', code);
  if(!Z.lauf || !Z.lauf.aufgaben.length) return m6('Keine Übung zum Prüfen');
  App.introFertig();
  var a = Z.lauf.aufgaben[Z.lauf.bei], w = falscheAntwort(a);
  if(!w) return;
  antwortSetzen(Z.lauf, a, w);
  App.antworten();

  App.nochmalAusArchiv(a.ref, a.fach, a.unterthema);
  if(Z.screen !== 'UebungFrage')
    return m6('Nochmal landet auf ' + Z.screen + ' statt UebungFrage');
  if(Z.lauf.aufgaben.length !== 1)
    m6('Nochmal zieht ' + Z.lauf.aufgaben.length + ' Aufgaben statt genau der einen');
  var b = Z.lauf.aufgaben[Z.lauf.bei];
  if(b.ref !== a.ref) m6('Nochmal gibt ' + b.ref + ' statt ' + a.ref);
  if(b.stamm !== a.stamm) m6('Nochmal: gleiche Ref, aber anderer Aufgabentext');
});

/* --- Jeder Eintrag im Fehlerarchiv trägt eine Rückmeldung ---------- */
/* Vorher wurde dort nur `a.fehler` durchsucht — die ZAHLEN-Fehlermuster.
   Für Deutsch ist die Liste immer leer, deren Muster liegen in `textFehler`.
   Folge: Bei Mathematik stand der Denkfehler da, bei Deutsch blieb der
   Kasten leer, und nichts sah kaputt aus. Darum wird hier BEIDES geprüft. */
alleBereicheMitAufgaben().forEach(function(fach){
  p6('Fehlerarchiv trägt eine Rückmeldung: ' + fach, function(){
    frisch();
    var codes = Array.from(bespielt(fach)).sort(), daneben = 0;
    for(var i = 0; i < codes.length && daneben < 3; i++){
      App.uebungStarten(fach, codes[i]);
      if(!Z.lauf || !Z.lauf.aufgaben.length) continue;
      App.introFertig();
      var a = Z.lauf.aufgaben[Z.lauf.bei], w = falscheAntwort(a);
      if(!w) continue;
      antwortSetzen(Z.lauf, a, w);
      App.antworten();
      if(Z.lauf.rueckmeldung && !Z.lauf.rueckmeldung.richtig) daneben++;
    }
    if(!daneben) return m6(fach + ': keine Aufgabe liess sich falsch beantworten');

    App.geh('Fehlerarchiv');
    App.archivFach(fachVonBereich(fach) || fach);
    var h = bildschirm();
    // Seit Korrekturen 2.0 stehen die Gruppen zugeklappt da; die oberste ist
    // offen. Fuer die Pruefung werden alle geoeffnet.
    (h.match(/App\.archivUm\('([^']+)'\)/g) || []).forEach(function(m){
      var k = /App\.archivUm\('([^']+)'\)/.exec(m)[1];
      if(!Z.archivOffen || !Z.archivOffen.has(k)) App.archivUm(k);
    });
    h = bildschirm();
    if(h.indexOf('Nochmal versuchen') < 0)
      return m6(fach + ': das Fehlerarchiv zeigt keinen Eintrag');
    // Korrekturen 2.0, Punkt 11: Jede Gruppe nennt, wie viele Fehler in ihr
    // stecken. Ohne die Zahl sieht man nicht, wo es sich zu schauen lohnt.
    if(!/>\s*\d+\s*</.test(h))
      return m6(fach + ': die Gruppen nennen keine Fehleranzahl');

    var v = Z.versuche.filter(function(x){ return !x.richtig; }).slice(-1)[0];
    var a2 = App.herstellen(v.ref);
    var fm = a2.fehler.find(function(f){ return f.diagnoseId === v.diagnoseId; })
          || (a2.textFehler||[]).find(function(f){ return f.diagnoseId === v.diagnoseId; });
    var erwartet = fm ? fm.feedback
                      : ((a2.erklaerung && a2.erklaerung.kern)
                         || (a2.loesungsweg||[]).slice(-1)[0] || '');
    if(!erwartet)
      return m6(fach + ': die Aufgabe ' + v.ref + ' hat gar keinen erklärenden Satz');
    if(h.indexOf(esc(erwartet).slice(0, 40)) < 0)
      m6(fach + ': die Rückmeldung «' + erwartet.slice(0, 40) + '…» fehlt im Archiv');
  });
});

/* --- 8) Die Aufgabennummer ist verschwunden, aber nicht verloren ----
   Sie steht nicht mehr unter der Aufgabe — dort war sie das Erste, was
   einer Schuelerin entgegensprang, und sie erklaerte sich nicht. Auffindbar
   muss eine Aufgabe trotzdem bleiben: Im Fehlerarchiv steht sie weiter, und
   genau dort schaut man nach, wenn jemand ein Problem meldet. */
p6('Die Aufgabennummer steht im Fehlerarchiv', function(){
  frisch();
  var codes = Array.from(bespielt('mathematik')).sort();
  var ref = null;
  for(var i = 0; i < codes.length && !ref; i++){
    App.uebungStarten('mathematik', codes[i]);
    if(!Z.lauf || !Z.lauf.aufgaben.length) continue;
    App.introFertig();
    var a = Z.lauf.aufgaben[Z.lauf.bei], w = falscheAntwort(a);
    if(!w) continue;
    antwortSetzen(Z.lauf, a, w);
    App.antworten();
    if(Z.lauf.rueckmeldung && !Z.lauf.rueckmeldung.richtig) ref = a.ref;
    // Und auf dem Aufgabenbild selbst darf sie nicht stehen.
    if(S.UebungFrage().indexOf(a.ref) >= 0)
      m6('die Aufgabennummer ' + a.ref + ' steht wieder unter der Aufgabe');
  }
  if(!ref) return m6('keine Aufgabe liess sich falsch beantworten');
  App.geh('Fehlerarchiv');
  // Die Gruppen stehen seit Korrekturen 2.0 zugeklappt; alle oeffnen.
  (bildschirm().match(/App\.archivUm\('([^']+)'\)/g) || []).forEach(function(m){
    var k = /App\.archivUm\('([^']+)'\)/.exec(m)[1];
    if(!Z.archivOffen || !Z.archivOffen.has(k)) App.archivUm(k);
  });
  if(bildschirm().indexOf(ref) < 0)
    m6('die Aufgabennummer ' + ref + ' fehlt im Fehlerarchiv — dann findet sie niemand mehr');
});

/* --- 9) Textverstaendnis: der Lesetext steht ueber der Aufgabe ------ */
p6('Textverständnis zeigt seinen Lesetext', function(){
  frisch();
  var codes = Array.from(bespielt('textverstaendnis')).sort();
  if(!codes.length) return m6('Textverständnis hat keine bespielten Unterthemen');
  var gesehen = 0;
  codes.forEach(function(c){
    App.uebungStarten('textverstaendnis', c);
    if(!Z.lauf || !Z.lauf.aufgaben.length) return m6('Textverständnis ' + c + ': keine Aufgaben');
    App.introFertig();
    var a = Z.lauf.aufgaben[Z.lauf.bei];
    if(!a.lesetext) return;             // Bezuege werden ohne Lesetext geuebt
    gesehen++;
    var h = S.UebungFrage();
    if(h.indexOf('Lesetext') < 0) m6('Textverständnis ' + c + ': die Lesetext-Karte fehlt');
    var ersterSatz = esc(a.lesetext.split('\n\n')[1] || '').slice(0, 40);
    var flach = h.replace(/<[^>]*>/g, '');
    if(ersterSatz && flach.indexOf(ersterSatz) < 0)
      m6('Textverständnis ' + c + ': der Lesetext steht nicht auf dem Bild');
    // Korrekturen 2.0, Punkt 6: Jeder Satz muss einzeln antippbar sein.
    if(h.indexOf('App.markiere(') < 0)
      m6('Textverständnis ' + c + ': im Lesetext lässt sich nichts markieren');
    // Eingeklappt darf er verschwinden, aber die Karte bleibt.
    App.lesetextUm();
    if(S.UebungFrage().indexOf('Lesetext') < 0)
      m6('Textverständnis ' + c + ': eingeklappt verschwindet die ganze Karte');
    App.lesetextUm();
  });
  if(!gesehen) m6('kein einziger Textverständnis-Block trägt einen Lesetext');
});

print('Runde 6: ' + N6 + ' Prüfungen');
if(F6.length){ print('FEHLER: ' + F6.length); F6.forEach(function(t){ print('   ' + t); }); }
else print('Runde 6 ohne Fehler.');
