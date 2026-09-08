/* Zieht jede Aufgabe und gibt sie als JSON aus — zum Vergleich mit der
   Python-Fassung derselben Engine. */
var aus = [];
TEMPLATES.forEach(function(spec){
  for(var seed = 1; seed <= 25; seed++){
    var a;
    try { a = ziehe(spec, seed); } catch(e){ a = null; }
    if(!a){ aus.push([spec.templateId, seed, null]); continue; }
    aus.push([spec.templateId, seed, {
      stamm: a.stamm,
      loesungText: a.loesungText,
      fehler: (a.fehler||[]).map(function(f){ return [f.diagnoseId, Math.round(f.wert*1e6)]; }),
      felder: (a.felder||[]).map(function(f){ return [f.name, f.loesungText]; }),
      mischung: a.mischung || null,
      reihenfolge: a.reihenfolge || null,
    }]);
  }
});
print(JSON.stringify(aus));
