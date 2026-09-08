/* ======================================================================
   Antworten bauen — für jedes der vierzehn Formate.

   Die Prüfungen brauchen zweierlei: die Antwort, die ein Kind gibt, das
   alles verstanden hat, und eine, die knapp danebenliegt. Ohne diesen
   Helfer müsste jede Prüfdatei die vierzehn Formen einzeln kennen.
   ====================================================================== */

/** Die richtige Antwort in der Form, die `bewerteAlles` erwartet. */
function richtigeAntwort(a){
  switch(a.format){

  case 'mehrfeld': {
    const f = {};
    (a.felder || []).forEach(x => { f[x.name] = x.loesungText; });
    return {felder: f};
  }
  case 'tabelle_auswahl': {
    const z = {};
    (a.zeilen || []).forEach((r, i) => { z[i] = r.loesung; });
    return {zeilen: z};
  }
  case 'gitter': {
    // Ein gesetzter Punkt ist ein Paar [x, y], kein Objekt — so legt ihn
    // `gitterTippen` in der Oberflaeche ab.
    const p = {}, punkte = a.gitter.punkte || [], erste = a.gitter.loesungen[0];
    erste.forEach((xy, i) => {
      const name = punkte[i] ? punkte[i].name : String(i);
      p[name] = [xy[0], xy[1]];
    });
    return {punkte: p};
  }
  case 'zuordnen': {
    const z = {};
    (a.paare || []).forEach(p => { z[p.index] = p.index; });
    return {zuordnung: z};
  }
  case 'sortieren':
    return {reihenfolge: a.reihenfolge.slice()};
  case 'wertetabelle':
    return {paare: a.wertetabelle.paare.map(p => [p[0], p[1]])};
  case 'faerben':
    return {felder: a.raster.felder.slice()};
  case 'loesungsmenge':
    return {eingabe: a.loesungsmenge.join(', ')};

  // Die Textformate teilen sich die Eingabe.
  case 'markieren':
  case 'kommas':
    return {stellen: (a.indizes || []).slice()};
  case 'mehrfachauswahl':
    return {optionIds: a.optionen.filter(o => a.loesungWorte.indexOf(o.text) >= 0)
                                 .map(o => o.id)};
  case 'einfachauswahl': {
    const o = a.optionen.find(x => a.loesungWorte.indexOf(x.text) >= 0);
    return {optionId: o ? o.id : null};
  }
  case 'luecke':
    return {eingabe: a.loesungWorte[0]};
  }
  return {eingabe: a.loesungText};
}

/** Eine Antwort, die danebenliegt — für die Gegenprobe. Sie muss sich
 *  garantiert von der richtigen unterscheiden, sonst prüft die Gegenprobe
 *  nichts. Gibt `null`, wenn das Format keine eindeutig falsche zulässt. */
function falscheAntwort(a){
  switch(a.format){

  case 'mehrfeld': {
    const f = {}, felder = a.felder || [];
    felder.forEach((x, i) => { f[x.name] = i === 0 ? String(x.loesung + 1) : x.loesungText; });
    return felder.length ? {felder: f} : null;
  }
  case 'tabelle_auswahl': {
    const z = {}, zeilen = a.zeilen || [], opt = (a.optionen || []).map(function(o){ return o.text; });
    if(!zeilen.length || opt.length < 2) return null;
    zeilen.forEach((r, i) => { z[i] = r.loesung; });
    const richtig = zeilen[0].loesung;
    z[0] = opt.find(o => o !== richtig);
    return z[0] === undefined ? null : {zeilen: z};
  }
  case 'gitter': {
    const p = richtigeAntwort(a).punkte, name = Object.keys(p)[0];
    if(!name) return null;
    p[name] = [p[name][0] + 1 + (a.gitter.toleranz || 0), p[name][1]];
    return {punkte: p};
  }
  case 'zuordnen': {
    const paare = a.paare || [];
    if(paare.length < 2) return null;
    const z = {};
    paare.forEach(q => { z[q.index] = q.index; });
    z[0] = 1; z[1] = 0;                       // zwei vertauschen
    return {zuordnung: z};
  }
  case 'sortieren': {
    const r = a.reihenfolge.slice();
    if(r.length < 2) return null;
    const t = r[0]; r[0] = r[1]; r[1] = t;
    return {reihenfolge: r};
  }
  case 'wertetabelle': {
    const p = a.wertetabelle.paare.map(q => [q[0], q[1]]);
    if(!p.length) return null;
    p[0] = [p[0][0], p[0][1] + 1];
    return {paare: p};
  }
  case 'faerben': {
    const f = a.raster.felder.slice(), n = a.raster.spalten * a.raster.zeilen;
    for(let k = 0; k < n; k++) if(f.indexOf(k) < 0) return {felder: f.concat([k])};
    return f.length ? {felder: f.slice(1)} : null;
  }
  case 'loesungsmenge': {
    const m = a.loesungsmenge;
    return {eingabe: m.length ? m.slice(0, -1).join(', ') : '0'};
  }
  case 'markieren':
  case 'kommas': {
    const s = (a.indizes || []).slice(), n = (a.woerter || []).length;
    if(!n) return null;
    for(let k = 0; k < n; k++) if(s.indexOf(k) < 0) return {stellen: s.concat([k])};
    return s.length ? {stellen: s.slice(1)} : null;
  }
  case 'mehrfachauswahl': {
    const richtig = richtigeAntwort(a).optionIds;
    const daneben = a.optionen.find(o => a.loesungWorte.indexOf(o.text) < 0);
    return daneben ? {optionIds: richtig.concat([daneben.id])} : null;
  }
  case 'einfachauswahl': {
    const daneben = a.optionen.find(o => a.loesungWorte.indexOf(o.text) < 0);
    return daneben ? {optionId: daneben.id} : null;
  }
  case 'luecke':
    return {eingabe: 'xyzxyz'};
  }
  // Zahleneingabe: um eins daneben.
  if(a.loesung !== undefined && a.loesung !== null)
    return {eingabe: String(a.loesung + 1)};
  return null;
}

/** Alle Aufgaben, die es gibt — Zahlen-Templates und Textblöcke. */
function alleAufgaben(seedsProTemplate, seedsProBlock){
  const aus = [];
  TEMPLATES.forEach(spec => {
    for(let s = 1; s <= seedsProTemplate; s++){
      const a = ziehe(spec, s);
      if(a) aus.push({spec: spec, seed: s, a: a});
    }
  });
  (typeof TEXTBLOECKE !== "undefined" ? TEXTBLOECKE : []).forEach(spec => {
    for(let s = 1; s <= seedsProBlock; s++){
      const a = ziehText(spec, s);
      if(a) aus.push({spec: spec, seed: s, a: a});
    }
  });
  return aus;
}

/** Legt eine Antwort so in den Laufzustand, wie es die Oberflaeche tut.
 *  Damit prueft der Test den echten Weg und nicht eine Abkuerzung. */
function antwortSetzen(L, a, antwort){
  L.eingabe = antwort.eingabe || '';
  L.wahl = antwort.optionId || null;
  L.mehrfach = antwort.optionIds || [];
  L.stellen = antwort.stellen || [];
  L.zeilen = antwort.zeilen || {};
  L.punkte = antwort.punkte || {};
  L.zuordnung = antwort.zuordnung || {};
  L.reihenfolge = antwort.reihenfolge || [];
  L.paare = antwort.paare || [];
  if(a.format === 'faerben'){ L.felder2 = antwort.felder || []; L.felder = {}; }
  else { L.felder = antwort.felder || {}; L.felder2 = []; }
}

/* ----------------------------------------------------------------------
   Alle Bereiche, die wirklich Aufgaben haben.

   In den Runden stand dafuer `['mathematik','sprachbetrachtung']` — eine
   feste Liste mit zwei Zuercher Bereichen. Ein neuer Kanton bringt eigene
   mit, und sie waeren stillschweigend nie bedient, nie gezeichnet, nie
   geprueft worden. «Alles gruen» haette dann fuer sie gar nichts bedeutet.
   -------------------------------------------------------------------- */
function alleBereicheMitAufgaben(){
  var aus = [];
  for(var f in THEMEN) if(bespielt(f).size) aus.push(f);
  return aus;
}
