/* ======================================================================
   Runde 3 — Bewertung über ALLE vierzehn Formate.

   Zwei Fragen je Aufgabe:
   · Wird die richtige Antwort angenommen?
   · Wird eine knapp danebenliegende abgelehnt?
   Ein Format, bei dem die zweite Frage nie «ja» ergibt, nimmt alles an —
   das wäre schlimmer als ein Format, das nichts annimmt.
   ====================================================================== */
var F3 = [], N3 = 0, JE = {};
function m3(t){ if(F3.length < 40) F3.push(t); }
function zaehl(fmt, was){ JE[fmt] = JE[fmt] || {}; JE[fmt][was] = (JE[fmt][was] || 0) + 1; }

alleAufgaben(40, 12).forEach(function(e){
  var a = e.a, wo = e.spec.templateId + ' Seed ' + e.seed + ' (' + a.format + ')';
  N3++;

  var r = richtigeAntwort(a), u;
  try { u = bewerteAlles(a, r); }
  catch(ex){ m3(wo + ': Bewertung wirft ' + ex); return; }
  if(!u.richtig) m3(wo + ': die eigene Loesung wird abgelehnt — ' + JSON.stringify(r).slice(0,120));
  else zaehl(a.format, 'richtig angenommen');

  var f = falscheAntwort(a);
  if(f === null){ zaehl(a.format, 'keine falsche Antwort baubar'); return; }
  var v;
  try { v = bewerteAlles(a, f); }
  catch(ex){ m3(wo + ': falsche Antwort wirft ' + ex); return; }
  if(v.richtig) m3(wo + ': eine falsche Antwort wird angenommen — ' + JSON.stringify(f).slice(0,120));
  else zaehl(a.format, 'falsch abgelehnt');
});

print('Runde 3: ' + N3 + ' Aufgaben geprueft');
Object.keys(JE).sort().forEach(function(k){
  var z = JE[k];
  print('   ' + k + ': ' + Object.keys(z).map(function(w){ return z[w] + ' ' + w; }).join(' · '));
});
if(F3.length){ print('FEHLER: ' + F3.length); F3.forEach(function(t){ print('   ' + t); }); }
else print('Runde 3 ohne Fehler.');
