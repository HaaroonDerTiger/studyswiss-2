/* ======================================================================
   Runde 8 — der Weg jedes Kantons durch die echten Screens.

   `kantone.py` prueft die DATEN: Geht die Kette vom Kanton bis zur Aufgabe
   auf? Diese Runde prueft, ob die SCREENS das auch zeigen. Das ist nicht
   dasselbe: Der Katalog kann tadellos sein, und der Screen nimmt trotzdem
   die falsche Liste — genau so stand es hier, bis es auffiel. «FachBereiche»
   las die globale Bereichsliste des Fachs statt die des Schultyps, und ein
   Zuercher Kind bekam die Berner Bereiche untereinander aufgezaehlt.

   Zwei Maszstaebe, wie bei `kantone.py`:

   · Ein AKTIVER Kanton verspricht, dass alles da ist. Bei ihm wird jeder
     Screen auf Vollstaendigkeit geprueft.
   · Ein Kanton mit `aktiv: false` ist ausgegraut und nicht antippbar. Bei
     ihm wird nur geprueft, dass sich die Screens ueberhaupt zeichnen und
     nichts Fremdes zeigen.

   Verglichen werden UEBERSCHRIFTEN, nicht Fliesstext. «Gymnasium» steckt in
   «Gymnasium, Übertritt aus dem 8. Schuljahr»; eine Suche im flachen Text
   meldete daraufhin einen fremden Schultyp, wo keiner war. Ein Pruefer mit
   falschem Alarm ist schlimmer als keiner.
   ====================================================================== */
var F8 = [], N8 = 0;
function m8(t){ if(F8.length < 40) F8.push(t); }
function pr8(wo, was, bed){ N8++; if(!bed) m8(wo + ': ' + was); }
function txt8(h){ return h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

/** Die Ueberschriften eines Screens — genau die Zeilen, die ein Kind liest. */
function titel8(html, klasse){
  var aus = [], re = new RegExp('class="' + klasse + '"[^>]*>([^<]*)<', 'g'), m;
  while((m = re.exec(html)) !== null) aus.push(m[1].trim());
  return aus;
}

Object.keys(KATALOG.schultypen).forEach(function(kanton){
  var meine = KATALOG.schultypen[kanton] || [];
  var kInfo = KATALOG.kantone.filter(function(x){ return x.kuerzel === kanton; })[0];
  var aktiv = !!(kInfo && kInfo.aktiv);

  /* --- Die Schulwahl zeigt genau die Schulen dieses Kantons -------- */
  App.zuruecksetzen(); App.anmelden('apple'); App.waehleKanton(kanton);
  var swHtml = S.SchulWahl();
  var gezeigt = titel8(swHtml, 'h3');
  pr8(kanton, 'Schulwahl zeigt «undefined»', swHtml.indexOf('undefined') < 0);
  meine.forEach(function(t){
    pr8(kanton, 'Schulwahl nennt «' + t.name + '» nicht',
        gezeigt.indexOf(t.name) >= 0);
  });
  pr8(kanton, 'Schulwahl zeigt ' + gezeigt.length + ' Schulen statt ' + meine.length,
      gezeigt.length === meine.length);

  meine.forEach(function(t){
    var wo = kanton + '/' + t.id;
    App.zuruecksetzen(); App.anmelden('apple');
    Z.profil.kanton = kanton; App.waehleSchule(t.id);

    /* --- Termin — den verspricht der Katalog fuer jede Pruefung ----- */
    pr8(wo, 'nach der Schulwahl steht kein Prüfungstermin',
        !!Z.profil.pruefungsdatum);

    /* --- Lernen ---------------------------------------------------- */
    Z.screen = 'Lernen';
    var lernenHtml = S.Lernen();
    pr8(wo, '«Lernen» zeigt «undefined»', lernenHtml.indexOf('undefined') < 0);
    var gezeigteFaecher = titel8(lernenHtml, 'h4');
    var sollFaecher = (t.pruefungsfaecher || []).filter(function(f){
      return bereicheVonFach(f).length; });
    if(aktiv){
      sollFaecher.forEach(function(f){
        pr8(wo, '«Lernen» nennt das Fach ' + fachName(f) + ' nicht',
            gezeigteFaecher.indexOf(fachName(f)) >= 0);
      });
    }
    // Ein fremdes Fach darf NIE dastehen, auch nicht bei «bald».
    (KATALOG.pruefungsfaecher || []).forEach(function(f){
      if(sollFaecher.some(function(x){ return fachName(x) === f.name; })) return;
      pr8(wo, '«Lernen» nennt das fremde Fach ' + f.name,
          gezeigteFaecher.indexOf(f.name) < 0);
    });

    /* --- FachBereiche ---------------------------------------------- */
    sollFaecher.forEach(function(f){
      Z.pruefungsfachOffen = f;
      var fbHtml = S.FachBereiche();
      pr8(wo, '«FachBereiche» zeigt «undefined»', fbHtml.indexOf('undefined') < 0);
      var gezeigteB = titel8(fbHtml, 'h4');
      var soll = (t.bereiche || []).filter(function(b){
        return fachVonBereich(b) === f; });
      soll.forEach(function(b){
        pr8(wo, 'Bereich «' + bereichKurz(b) + '» fehlt unter ' + fachName(f),
            gezeigteB.indexOf(bereichKurz(b)) >= 0);
        var bi = bereichInfo(b);
        // Ein Tipps-Bereich hat nie Aufgaben und soll auch nie «Aufgaben
        // folgen» sagen — es kommen keine. Hoerverstehen und muendliche
        // Pruefung fuehren stattdessen auf eine Seite mit Ablauf, Tipps und
        // Redemitteln. Statt der Aufgaben wird darum geprueft, dass die Seite
        // wirklich da ist.
        if(bi && bi.art === 'tipps'){
          var seite = TIPPS[b];
          pr8(wo, 'Tipps-Bereich «' + bereichKurz(b) + '» hat keine Seite',
              !!seite);
          if(seite){
            Z.tippsOffen = b;
            var tHtml = S.Tipps();
            pr8(wo, '«Tipps» zeigt «undefined»', tHtml.indexOf('undefined') < 0);
            var tFlach = txt8(tHtml);
            pr8(wo, 'Tipps-Seite «' + bereichKurz(b) + '» ohne Ablauf',
                tFlach.indexOf('So läuft die Prüfung ab') >= 0);
            (seite.uebungen || []).forEach(function(u){
              pr8(wo, 'Übungshinweis ' + u.bereich + ' ' + u.unterthema +
                      ' zeigt ins Leere',
                  bespielt(u.bereich).size === 0 ||
                  tFlach.indexOf(u.name) >= 0);
            });
          }
        }
        else if(bi && bi.art !== 'aufsatz' && bespielt(b).size === 0){
          var flach = txt8(fbHtml), i = flach.indexOf(bereichKurz(b));
          pr8(wo, 'Bereich «' + bereichKurz(b) + '» hat keine Aufgaben, sagt es aber nicht',
              i >= 0 && flach.slice(i, i + 90).indexOf('Aufgaben folgen') >= 0);
        }
      });
      // Kein Bereich, der diesem Schultyp nicht gehoert.
      var erlaubt = soll.map(bereichKurz);
      gezeigteB.forEach(function(name){
        pr8(wo, 'fremder Bereich «' + name + '» steht unter ' + fachName(f),
            erlaubt.indexOf(name) >= 0);
      });
    });

    /* --- Selbsttest-Bedingungen kommen aus der Pruefung ------------- */
    Z.screen = 'SelbsttestStart';
    var bed = txt8(S.SelbsttestStart());
    var B = bedingungen();
    pr8(wo, 'Bedingungen nennen die Dauer nicht',
        bed.indexOf(B.dauerMinuten + ' Minuten') >= 0);
    if(B.hilfsmittelText)
      pr8(wo, 'Bedingungen nennen «' + B.hilfsmittelText + '» nicht',
          bed.indexOf(B.hilfsmittelText) >= 0);

    /* --- ... und zwar die des GEWAEHLTEN FACHS ---------------------- */
    /* Ein Schultyp hat nicht ueberall dieselben Bedingungen: In
       Basel-Stadt dauert Mathematik 90 Minuten und erlaubt einen
       Taschenrechner, Deutsch dauert 45 Minuten und erlaubt keinen; in
       Bern dauert Deutsch doppelt so lange wie Mathematik. Die Vorschau
       nahm bis hierher immer die Bedingungen des ERSTEN Pruefungsteils
       und log damit fuer jedes andere Fach — nachgerechnet hat es
       niemand, weil dieser Punkt das Fach nie gesetzt hat. */
    /* Welcher Teil gilt, wenn ein Fach mehrere hat? Der STRENGSTE:
       zuerst der ohne Taschenrechner, dann der kuerzere. Dieselbe Regel
       steht in `katalog.py`; hier wird sie eigens nachgerechnet, damit die
       Pruefung nicht bloss die Quelle gegen sich selbst haelt. */
    function rang8(x){
      var h = x.hilfsmittel || {};
      return ((h.taschenrechner || 'keiner') === 'keiner' ? 0 : 1000)
           + (x.dauerMinuten || 90);
    }
    var vorherFach = Z.selbsttestFach;
    (t.pruefungsfaecher || []).forEach(function(pf){
      var teile8 = (t.teile || []).filter(function(x){
        return x.pruefungsfach === pf && x.angeboten !== false; });
      if(!teile8.length) return;
      var teil = teile8.slice().sort(function(x,y){ return rang8(x) - rang8(y); })[0];
      Z.selbsttestFach = pf;
      var bedF = txt8(S.SelbsttestStart());
      pr8(wo, 'Selbsttest ' + fachName(pf) + ': Dauer ' + teil.dauerMinuten
              + ' Minuten steht nicht da',
          bedF.indexOf(teil.dauerMinuten + ' Minuten') >= 0);
      var mitRechner = teil.hilfsmittel && teil.hilfsmittel.taschenrechner
                    && teil.hilfsmittel.taschenrechner !== 'keiner';
      pr8(wo, 'Selbsttest ' + fachName(pf) + ': Taschenrechner falsch angesagt',
          (bedF.indexOf('Kein Taschenrechner') >= 0) === !mitRechner);
      /* Die Bemerkung eines Pruefungsteils sagt, was sonst noch gilt:
         «steht mehr als ein Loesungsweg da, wird die Aufgabe nicht
         bewertet», «falsche Antworten geben Abzug». Sie stand lange nur
         in den Daten. Gefordert sind die Bemerkungen ALLER Teile des
         Fachs, nicht nur die des strengsten: Deutsch besteht in
         Solothurn aus Aufsatz UND Sprachbogen. */
      teile8.forEach(function(x){
        if(!x.bemerkung) return;
        pr8(wo, 'Selbsttest ' + fachName(pf) + ': die Bemerkung des Teils «'
                + x.name + '» steht nicht im Screen',
            bedF.indexOf(x.bemerkung) >= 0);
      });
    });
    Z.selbsttestFach = vorherFach;

    /* --- Aufsatzarten sind die der Pruefung ------------------------- */
    Z.screen = 'AufsatzArten';
    var aaHtml = S.AufsatzArten();
    pr8(wo, '«AufsatzArten» zeigt «undefined»', aaHtml.indexOf('undefined') < 0);
    // Der Aufsatzarten-Screen setzt seine Namen als h3, nicht h4.
    var gezeigteArten = titel8(aaHtml, 'h3');
    (t.aufsatzarten || []).forEach(function(id){
      var art = (AUFSATZARTEN || []).filter(function(x){ return x.id === id; })[0];
      if(!art) return;
      pr8(wo, 'Aufsatzart «' + art.name + '» fehlt', gezeigteArten.indexOf(art.name) >= 0);
    });
    gezeigteArten.forEach(function(name){
      var art = (AUFSATZARTEN || []).filter(function(x){ return x.name === name; })[0];
      if(!art) return;
      pr8(wo, 'fremde Aufsatzart «' + name + '» steht da',
          (t.aufsatzarten || []).indexOf(art.id) >= 0);
    });
  });
});

print('Runde 8: ' + N8 + ' Prüfungen über ' +
      Object.keys(KATALOG.schultypen).length + ' Kantone');
if(F8.length){ print('FEHLER: ' + F8.length); F8.forEach(function(t){ print('   ' + t); }); }
else print('Runde 8 ohne Fehler.');
