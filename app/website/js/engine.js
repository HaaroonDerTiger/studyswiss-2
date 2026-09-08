/* StudySwiss — die Engine, aus der Vorschau geholt
   ==================================================================
   ERZEUGT von `app/pruefung/website_bauen.py`. Nicht von Hand ändern —
   die Quelle ist `app/preview/StudySwiss-Vorschau.html`.

   Warum geholt und nicht geschrieben: §8 hält drei Fassungen der Engine
   in Gleichschritt (Kotlin, JavaScript, Python), und `gleichlauf.py`
   vergleicht sie Zeichen für Zeichen. Eine vierte Fassung wäre eine
   vierte Baustelle — und die erste, die still abweicht.

   Die Website benutzt also dieselben Zeilen wie die App-Vorschau. Was
   sie selbst mitbringt, ist die Ansicht: `js/antwort.js` baut die
   Eingabeflächen für den Browser, so wie `widgets/antwortflaeche.dart`
   sie für Flutter baut. Zwei Ansichten, eine Engine.

   Gebraucht wird von aussen: `Z` mit `profil`, `versuche` und
   `selbsttestFach` — siehe `js/zustand.js`.                          */


/* ---- aus der Vorschau, Block 0: Rng, Ausdruck, Generator ---- */
/* =======================================================================
   ENGINE. Port von app/backend/.../engine/{Rng,Ausdruck,Generator}.kt
   Bitgenau dieselbe Rng: Template-ID + Seed ergibt hier dieselbe Aufgabe
   wie auf dem Server. Wer eine dieser Funktionen ändert, muss die
   Kotlin-Fassung mitändern. Sonst laufen sie auseinander.
   ======================================================================= */

class Rng {
  constructor(seed){
    let x = (seed>>>0) + 0x9e3779b9;
    x = Math.imul(x ^ (x>>>16), 0x21f0aaad);
    x = Math.imul(x ^ (x>>>15), 0x735a2d97);
    this.s = (x ^ (x>>>15))>>>0;
  }
  next(){
    this.s = (this.s + 0x6d2b79f5)>>>0;
    let t = this.s;
    t = Math.imul(t ^ (t>>>15), t|1);
    t ^= t + Math.imul(t ^ (t>>>7), t|61);
    return ((t ^ (t>>>14))>>>0) / 4294967296;
  }
  int(a,b){ return a + Math.floor(this.next()*(b-a+1)); }
  pick(a){ return a[this.int(0,a.length-1)]; }
  shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){const j=this.int(0,i);[b[i],b[j]]=[b[j],b[i]];} return b; }
}

/* --- Sicherer Auswerter: eigener Parser, nie eval --------------------- */
const FN = {
  floor:a=>Math.floor(a[0]), ceil:a=>Math.ceil(a[0]), round:a=>Math.round(a[0]),
  abs:a=>Math.abs(a[0]), min:a=>Math.min(...a), max:a=>Math.max(...a),
  pow:a=>Math.pow(a[0],a[1]), sqrt:a=>Math.sqrt(a[0]),
  ggt:a=>{let x=Math.abs(a[0]),y=Math.abs(a[1]);while(y){[x,y]=[y,x%y];}return x;},
  istGanz:a=>Math.abs(a[0]-Math.round(a[0]))<1e-9?1:0,
  teilerImBereich:a=>{let n=0;for(let k=Math.ceil(a[1]);k<=Math.floor(a[2]);k++)if(k&&a[0]%k===0)n++;return n;}
};
const OPS = ['<=','>=','==','!=','&&','||','+','-','*','/','%','<','>','?',':','!'];

function tok(q){
  const out=[]; let i=0;
  while(i<q.length){
    const c=q[i];
    if(/\s/.test(c)){i++;continue;}
    if(/[0-9]/.test(c) || (c==='.' && /[0-9]/.test(q[i+1]||''))){
      let j=i; while(i<q.length && /[0-9.]/.test(q[i]))i++;
      out.push({t:'num',v:parseFloat(q.slice(j,i))}); continue;
    }
    if(/[A-Za-z_]/.test(c)){
      let j=i; while(i<q.length && /[A-Za-z0-9_]/.test(q[i]))i++;
      out.push({t:'name',v:q.slice(j,i)}); continue;
    }
    if(c==='('){out.push({t:'('});i++;continue;}
    if(c===')'){out.push({t:')'});i++;continue;}
    if(c===','){out.push({t:','});i++;continue;}
    const op = OPS.find(o=>q.startsWith(o,i));
    if(!op) throw new Error('Unerlaubtes Zeichen '+c);
    out.push({t:'op',v:op}); i+=op.length;
  }
  return out;
}

function werteAus(q, scope){
  const T=tok(q); let i=0;
  const schau=()=>T[i];
  const friss=(...ops)=>{const p=schau(); if(p&&p.t==='op'&&ops.includes(p.v)){i++;return p.v;} return null;};
  function bedingt(){
    const c=oder(); if(!friss('?'))return c;
    const a=bedingt(); if(!friss(':'))throw new Error("':' fehlt");
    const b=bedingt(); return c!==0?a:b;
  }
  function oder(){let l=und(); while(friss('||')){const r=und(); l=(l!==0||r!==0)?1:0;} return l;}
  function und(){let l=vgl(); while(friss('&&')){const r=vgl(); l=(l!==0&&r!==0)?1:0;} return l;}
  function vgl(){
    let l=summe();
    for(;;){
      const op=friss('<','>','<=','>=','==','!='); if(!op)return l;
      const r=summe();
      const b={'<':l<r-1e-9,'>':l>r+1e-9,'<=':l<=r+1e-9,'>=':l>=r-1e-9,
               '==':Math.abs(l-r)<1e-9,'!=':Math.abs(l-r)>=1e-9}[op];
      l=b?1:0;
    }
  }
  function summe(){let l=prod(); for(;;){const op=friss('+','-'); if(!op)return l; const r=prod(); l=op==='+'?l+r:l-r;}}
  function prod(){
    let l=un();
    for(;;){
      const op=friss('*','/','%'); if(!op)return l;
      const r=un();
      if((op==='/'||op==='%')&&Math.abs(r)<1e-12) throw new Error('Division durch null');
      l = op==='*'?l*r : op==='/'?l/r : (Math.trunc(l)%Math.trunc(r));
    }
  }
  function un(){
    if(friss('-'))return -un();
    if(friss('+'))return un();
    if(friss('!'))return un()===0?1:0;
    return prim();
  }
  function prim(){
    const p=schau(); if(!p) throw new Error('Ausdruck bricht ab');
    if(p.t==='num'){i++;return p.v;}
    if(p.t==='('){i++;const v=bedingt(); if(!schau()||schau().t!==')')throw new Error("')' fehlt"); i++; return v;}
    if(p.t==='name'){
      i++;
      if(schau()&&schau().t==='('){
        const f=FN[p.v]; if(!f)throw new Error('Unbekannte Funktion '+p.v);
        i++; const args=[];
        if(schau()&&schau().t!==')'){ args.push(bedingt()); while(schau()&&schau().t===','){i++;args.push(bedingt());} }
        if(!schau()||schau().t!==')')throw new Error("')' fehlt"); i++;
        return f(args);
      }
      if(!(p.v in scope)) throw new Error('Unbekannter Name '+p.v);
      return scope[p.v];
    }
    throw new Error('Unerwartet');
  }
  const r=bedingt();
  if(i!==T.length) throw new Error('Rest nach dem Ausdruck');
  if(!isFinite(r)) throw new Error('nicht endlich');
  return Math.round(r*1e6)/1e6;
}

/* --- Formatierung ------------------------------------------------------ */
function gruppiert(n){
  const z = Math.abs(Math.round(n)).toString().split('').reverse().join('')
             .match(/.{1,3}/g).join("'").split('').reverse().join('');
  return (n<0?'-':'')+z;
}
/* Die hochgestellten Ziffern. «2^5» ist eine Notlösung aus der Zeit der
   Schreibmaschine; im Aufgabentext, in der Antwort und in der Erklärung
   steht die Hochzahl hochgestellt. Sonst liest ein Kind «zwei Dach fünf». */
const HOCHZIFFERN = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
                     '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'};
const TIEFZIFFERN = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄',
                     '5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','-':'₋'};
function tiefgestellt(w){
  /* Das Gegenstück zu hochgestellt. Ohne den Nenner lässt sich ein Bruch mit
     gezogenen Zahlen nicht setzen: {z:hoch}⁄{n:tief} ergibt ⁵⁄₁₂, während
     «{z}/{n}» dem Kind einen Schrägstrich zeigt. */
  return String(Math.round(w)).split('').map(c=>TIEFZIFFERN[c]||c).join('');
}
function hochgestellt(w){
  return String(Math.round(w)).split('').map(c=>HOCHZIFFERN[c]||c).join('');
}
/* Ein Bruch wird als Bruch gesetzt: ⁵⁄₁₂, nicht 5/12. Getippt wird er
   weiterhin mit dem Schrägstrich. `alsZahl` nimmt beide Schreibweisen
   entgegen. Nur die ANZEIGE ist gesetzt. */
function alsBruch(z, n){
  return String(z).split('').map(c=>HOCHZIFFERN[c]||c).join('') + '⁄'
       + String(n).split('').map(c=>TIEFZIFFERN[c]||c).join('');
}
function formatiere(w,f){
  if(f==='hoch') return hochgestellt(w);
  if(f==='tief') return tiefgestellt(w);
  if(f==='franken'){
    if(Math.abs(w-Math.round(w))<1e-9) return 'Fr. '+gruppiert(w)+'.–';
    return 'Fr. '+gruppiert(Math.trunc(w))+(Math.abs(w)%1).toFixed(2).slice(1);
  }
  const md=/^dezimal([1-4])$/.exec(f||'');
  if(md){ const p10=Math.pow(10,+md[1]); return String(Math.round(w*p10)/p10); }
  if(f==='ganz') return String(Math.round(w));
  if(Math.abs(w-Math.round(w))<1e-9) return String(Math.round(w));
  /* Die Toleranz wächst mit dem Nenner, und sie muss es: Jeder Ausdruck wird
     auf sechs Stellen gerundet, ein Wert wie ⁷⁴⁄₆₃ kommt also als 1.174603 an.
     Mal 63 fehlen dann 1.1e-5, mit der festen Schwelle 1e-7 fand die Schleife
     den Bruch nie und zeigte «1.1746». Falsche Treffer sind ausgeschlossen:
     Beim falschen Nenner liegt w*n mindestens 1/n von einer ganzen Zahl weg. */
  for(let n=2;n<1000;n++){ const z=w*n; if(Math.abs(z-Math.round(z))<5e-7*n){
    const zz=Math.round(z), t=FN.ggt([zz,n]); return alsBruch(zz/t, n/t); } }
  return w.toFixed(4);
}
function schlicht(w){
  return Math.abs(w-Math.round(w))<1e-9 ? String(Math.round(w)) : String(Math.round(w*1e4)/1e4);
}

const PLATZHALTER = /\{([A-Za-z_][A-Za-z0-9_]*)(?:\.(\d+))?(?::(ganz|dezimal[1-4]|franken|bruch|hoch|tief|vorlage))?\}/g;
function ersetze(vorlage, scope, texte, zf){
  return vorlage.replace(PLATZHALTER,(ganz,name,idx,fmt)=>{
    if(name in texte){ const t=texte[name]; return t[+(idx||0)] ?? t[0]; }
    if(!(name in scope)) return ganz;
    const w=scope[name];
    if(!fmt) return schlicht(w);
    // Die Quelle schreibt {x:d2} fuer zwei Nachkommastellen.
    if(/^d\d$/.test(fmt)) return w.toFixed(+fmt[1]);
    return formatiere(w, fmt==='vorlage'?zf:fmt);
  });
}

/* --- Generator: Rejection Sampling ------------------------------------ */
const VERSUCHE = 400;
function zieheAlt(spec, seed){
  const variablen = spec.variablen, bedingungen = spec.bedingungen || [];
  let scope=null, texte=null;
  for(let versuch=0; versuch<VERSUCHE; versuch++){
    const rng = new Rng(Math.imul(seed,1000003) + versuch);
    const s={}, t={}; let ok=true;
    for(const v of variablen){
      if(v.typ==='auswahl') s[v.name]=rng.pick(v.werte);
      else if(v.typ==='ganzzahl'){
        const sch=v.schritt||1;
        s[v.name]=v.von + rng.int(0, Math.floor((v.bis-v.von)/sch))*sch;
      }
      else if(v.typ==='formel'){
        try{ s[v.name]=werteAus(v.ausdruck,s); }catch(e){ ok=false; break; }
      }
      else if(v.typ==='text') t[v.name]=rng.pick(v.texte);
    }
    if(!ok) continue;
    try{ ok = bedingungen.every(b=>werteAus(b,s)!==0); }catch(e){ ok=false; }
    if(!ok) continue;
    scope=s; texte=t; break;
  }
  if(!scope) return null;

  const zf = spec.zahlformat || 'ganz';
  const E = x => ersetze(x, scope, texte, zf);
  const loesung = werteAus(spec.loesung, scope);

  // Ein Fehlermuster, das zufällig die richtige Lösung ergibt, ist kein
  // Distraktor. Es fällt weg. Ebenso Dubletten.
  const gesehen=new Set(), fehler=[];
  for(const fm of spec.fehler){
    if(!fm.ausdruck) continue;
    let w; try{ w=werteAus(fm.ausdruck,scope); }catch(e){ continue; }
    if(Math.abs(w-loesung)<1e-9) continue;
    const k=Math.round(w*1e6); if(gesehen.has(k)) continue; gesehen.add(k);
    fehler.push({wert:w, diagnoseId:fm.diagnoseId, feedback:E(fm.feedback)});
  }

  return {
    ref: spec.templateId+':'+seed,
    templateId: spec.templateId,
    lernzielId: spec.lernzielId,
    fach: spec.fach,
    unterthema: spec.unterthemen[0],
    format: spec.format,
    stamm: E(spec.stamm),
    einheit: spec.einheit || null,
    loesung, loesungText: formatiere(loesung, zf),
    fehler,
    hinweise: spec.hinweise.map(E),
    loesungsweg: spec.loesungsweg.map(E),
    scope
  };
}

/** Nimmt «1'200.50», «1200,5», «Fr. 96.–» und «96 cm» entgegen. */
const AUSHOCH = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7',
                 '⁸':'8','⁹':'9','⁻':'-','₀':'0','₁':'1','₂':'2','₃':'3','₄':'4',
                 '₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₋':'-','⁄':'/'};
function alsZahl(eingabe){
  // Gesetzte Brüche und Hochzahlen zuerst in gewöhnliche Ziffern
  // zurückverwandeln. Angezeigt wird ⁵⁄₁₂, getippt wird 5/12. Beides muss
  // dieselbe Zahl ergeben, sonst gilt als falsch, wer abschreibt, was
  // dasteht.
  const roh = String(eingabe).trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻₀₁₂₃₄₅₆₇₈₉₋⁄]/g, c => AUSHOCH[c])
    .replace(/['’]/g,'').replace(/Fr\./g,'').replace(/CHF/g,'')
    .replace(/,/g,'.').replace(/[^0-9.\-\/]/g,'');
  if(!roh) return null;
  if(roh.includes('/')){
    const [z,n]=roh.split('/').map(parseFloat);
    return (isFinite(z)&&isFinite(n)&&Math.abs(n)>1e-12) ? z/n : null;
  }
  const x = parseFloat(roh.replace(/\.$/,''));
  return isFinite(x) ? x : null;
}

const LOB = ['Stimmt. Genau so geht es.','Richtig. Sauber gerechnet.',
             'Das passt. Weiter so.','Richtig.'];
const ALLGEMEIN = 'Das stimmt noch nicht. Geh den Weg nochmals Schritt für Schritt '+
  'durch und schau, welche Zahl das Ganze ist und welche nur ein Teil davon.';

/** Vergleicht mit der Lösung und, wenn sie nicht stimmt, mit jedem
 *  Fehlermuster. Trifft eines, benennt die Rückmeldung den Denkfehler —
 *  «Das ist falsch» kommt in dieser App nirgends vor. */
/** Wie genau muss eine Zahl stimmen?
 *
 *  So genau, wie die App sie anzeigt. Zeigt sie «0.88», weil das Feld auf
 *  zwei Stellen gerundet ist, dann MUSS 0.88 richtig sein. Sonst gilt als
 *  falsch, wer genau das abschreibt, was dasteht. Der exakte Wert (0.875)
 *  bleibt daneben ebenfalls richtig. */
function genauigkeit(zahlformat){
  const m = /^dezimal([1-4])$/.exec(zahlformat || '');
  if(m) return 0.5 * Math.pow(10, -m[1]) + 1e-9;
  if(zahlformat === 'franken') return 0.005 + 1e-9;
  return 1e-6;
}

function bewerteZahl(aufgabe, eingabe){
  // Deutsch-Formate haben ihre eigene Bewertung.
  if(aufgabe.textFehler !== undefined) return bewerteText(aufgabe, eingabe);
  const z = alsZahl(eingabe);
  if(z===null) return {richtig:false, diagnoseId:null,
    feedback:'Da fehlt noch eine Zahl. Schreibe dein Ergebnis als Zahl, zum Beispiel 42 oder 3.5.'};
  const tol = genauigkeit(aufgabe.zahlformat);
  if(Math.abs(z-aufgabe.loesung)<tol)
    return {richtig:true, diagnoseId:null, feedback:LOB[Math.floor(Math.random()*LOB.length)]};
  const treffer = aufgabe.fehler.find(f=>Math.abs(f.wert-z)<tol);
  return {richtig:false, diagnoseId:treffer?treffer.diagnoseId:null,
          feedback:treffer?treffer.feedback:ALLGEMEIN};
}

/* ---- aus der Vorschau, Block 3: Einstiegspunkte und Katalog ---- */
/* --- Einstiegspunkte. Der zweite Engine-Teil steht weiter unten; in
       JavaScript werden Funktionsdeklarationen hochgezogen. --- */
function ziehe(spec, seed){ return zieheMathe(spec, seed); }
function ziehText(spec, seed){ return ziehText2(spec, seed); }
function bewerte(a, antwort){
  return bewerteAlles(a, typeof antwort === 'string' ? {eingabe: antwort} : antwort);
}

/* =======================================================================
   ZUSTAND UND SCHEDULER
   ======================================================================= */

const Z = {
  screen: 'Start',
  profil: null,             // {vorname,kanton,schultyp,pruefungsdatum,plus,elternFreigabe,anbieter}
  versuche: [],             // {ref,fach,unterthema,richtig,diagnoseId,zeit}
  lauf: null,               // laufendes Set
  onboardingSeite: 0,
  fachOffen: 'mathematik',        // der offene BEREICH (Themenbaum)
  pruefungsfachOffen: null,       // das offene FACH (Mathematik, Deutsch)
  offeneOberthemen: {},           // aufgeklappte Oberthemen je Bereich
  standortFach: null,             // Standortbestimmung: gewaehltes Fach
  selbsttestFach: null,           // Selbsttest: gewaehltes PRUEFUNGSFACH
  selbsttestUmfang: null,
  aufsatz: null,
  aufsatzArt: null,
  vorSeite: null,
};

const heute = () => new Date();
/** Heute um Mitternacht. Fuer Wochenrechnungen, die keine Uhrzeit kennen. */
const heuteDatum = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

/** Ein Datum als «JJJJ-MM-TT» in ORTSZEIT.
 *
 *  `toISOString()` waere falsch: Es rechnet in UTC, und in der Schweiz ist
 *  das im Sommer zwei Stunden zurueck. Wer um 23 Uhr uebt, saehe sonst das
 *  Datum von gestern, und der Countdown zur Pruefung waere um einen Tag
 *  daneben, genau an den Abenden, an denen es darauf ankommt. */
const alsDatum = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` +
                      `-${String(d.getDate()).padStart(2,'0')}`;
function tageBisPruefung(){
  if(!Z.profil?.pruefungsdatum) return null;
  const d = new Date(Z.profil.pruefungsdatum + 'T00:00:00');
  return Math.max(0, Math.ceil((d - heute()) / 86400000));
}

const baum = f => THEMEN[f];
const unterthemaVon = (f,c) => {
  const b = THEMEN[f]; if(!b) return null;
  for(const o of b.oberthemen){ const u=o.unterthemen.find(x=>x.code===c); if(u) return u; }
  return null;
};
const oberthemaVon = (f,c) => THEMEN[f]?.oberthemen.find(o=>o.unterthemen.some(u=>u.code===c)) || null;
/** Wird dieses Unterthema in der gewaehlten Pruefung ueberhaupt geprueft?
 *
 *  Ein Themenbaum bedient mehrere Pruefungen. Der Zuercher Mathematikbaum
 *  die ZAP 1, 2 und 3. Vierzehn seiner Unterthemen kommen nur in der ZAP 3
 *  vor: Zinsrechnen, Kreissektor, Zylinder, Geradengleichung. Wer die ZAP 1
 *  schreibt, bekam sie trotzdem vorgeschlagen. Die Angabe stand seit jeher
 *  im Themenbaum. Sie wurde bloss nie gelesen. */
function giltIn(u, pruefung){
  if(!pruefung || !u) return true;
  if((u.nurGeprueftIn||[]).length && u.nurGeprueftIn.indexOf(pruefung)<0) return false;
  return (u.nichtGeprueftIn||[]).indexOf(pruefung)<0;
}

const bespielt = f => {
  const roh = new Set([
    ...TEMPLATES.filter(t=>t.fach===f).flatMap(t=>t.unterthemen),
    ...TEXTBLOECKE.filter(t=>(t.fach||'sprachbetrachtung')===f).flatMap(t=>t.unterthemen)]);
  const pr = mySchultyp()?.pruefungId;
  if(!pr || !THEMEN[f]) return roh;
  const aus = new Set();
  for(const o of THEMEN[f].oberthemen)
    for(const u of o.unterthemen)
      if(roh.has(u.code) && giltIn(u, pr)) aus.add(u.code);
  return aus;
};
function pruefungsgewicht(f,c){
  const o = oberthemaVon(f,c); if(!o) return 0;
  const total = THEMEN[f].oberthemen.reduce((a,x)=>a+x.punkte,0);
  return total ? o.punkte/total : 0;
}

/* ---- Fach und Bereich ------------------------------------------------
   Zwei Ebenen, und der Unterschied traegt die halbe Navigation:

   · Ein PRUEFUNGSFACH steht auf dem Pruefungsblatt. Mathematik, Deutsch,
     allenfalls Franzoesisch. Es hat keinen Themenbaum.
   · Ein BEREICH hat einen: Sprachbetrachtung, Textverstaendnis, Aufsatz.
     Bei Mathematik fallen beide zusammen.

   Die Aufgaben tragen den Bereich in ihrem Feld `fach`. Der Name bleibt —
   er steht in Vorlagen, Backend und gespeichertem Fortschritt. */

const mySchultyp = () => {
  const st = KATALOG.schultypen[Z.profil?.kanton || STANDARD_KANTON] || [];
  return st.find(x=>x.id===Z.profil?.schultyp) || st[0] || null;
};

/** Die Bedingungen der gewaehlten Pruefung. Sie stehen im Katalog, nicht
 *  im Screen. Eine Pruefung mit Taschenrechner ist so eine Datenaenderung. */
/** Die Prüfungsbedingungen, wenn möglich die des GEWÄHLTEN FACHS.
 *
 *  Ein Schultyp hat nicht überall dieselben Bedingungen: In Basel-Stadt
 *  dauert Mathematik 90 Minuten und erlaubt einen Taschenrechner, Deutsch
 *  dauert 45 Minuten und erlaubt keinen; in Bern dauert Deutsch doppelt so
 *  lange wie Mathematik. `Katalog` löst das in `bedingungenJeFach` auf, und
 *  `LernService.bedingungenVon` im Backend liest es auch. Die Vorschau tat
 *  es nicht und zeigte einem Basler Kind vor dem Mathematik-Selbsttest
 *  «45 Minuten · Kein Taschenrechner». Das ist genau die Sorte Lüge, die
 *  §9 verbietet: eine Prüfungsbedingung, die nicht zur Prüfung passt.
 *
 *  Ohne Argument gilt das Fach des laufenden Selbsttests; ist keines
 *  gewählt, bleibt es bei den Bedingungen des Schultyps. */
const bedingungen = (fach) => {
  const t = mySchultyp();
  const f = fach !== undefined ? fach : Z.selbsttestFach;
  return Object.assign(
    {taschenrechner:false, zurueckblaettern:true, uhrPausiert:true,
     hinweise:false, dauerMinuten:90, anzahlAufgaben:20, bemerkungen:[]},
    t?.bedingungen || {},
    (f && t?.bedingungenJeFach?.[f]) || {});
};

const fachInfo = id => (KATALOG.pruefungsfaecher||[]).find(f=>f.id===id) || null;
const bereichInfo = id => (KATALOG.bereiche||[]).find(b=>b.id===id) || null;
const fachVonBereich = id => bereichInfo(id)?.pruefungsfach || null;

/** Die Bereiche eines Fachs, die wirklich etwas zu ueben haben.
 *
 *  Massgeblich ist der SCHULTYP, nicht das Fach. «Deutsch» heisst in Zuerich
 *  Sprachbetrachtung plus Textverstaendnis plus Aufsatz, in Bern die Berner
 *  Fassung davon, und an der FMS Bern nur den Aufsatz. Wer hier die Liste
 *  des Fachs nimmt, zeigt einem Zuercher Kind Berner Stoff, sobald es beides
 *  gibt. Genau das ist hier passiert, und es fiel erst in Runde 6 auf.
 *
 *  Nur wenn noch kein Schultyp gewaehlt ist, gilt die Liste des Fachs. */
function bereicheVonFach(fachId){
  const t = mySchultyp();
  const liste = t ? (t.bereiche || []).filter(b => fachVonBereich(b) === fachId)
                  : (fachInfo(fachId)?.bereiche || []);
  return liste.filter(b => b in THEMEN || bereichInfo(b)?.art === 'aufsatz'
                        || bereichInfo(b)?.art === 'tipps');
}

/** Die Pruefungsfaecher dieses Schultyps. */
function meineFaecher(){
  const t = mySchultyp();
  return (t?.pruefungsfaecher || ['mathematik']).filter(f=>bereicheVonFach(f).length);
}

/** Alle uebbaren Bereiche. Das, was frueher «meineFaecher» hiess. */
function meineBereiche(){
  return meineFaecher().flatMap(bereicheVonFach).filter(b=>b in THEMEN);
}

/** Alle Bereiche eines Fachs fuer DIESEN Schultyp. Auch die ohne Baum.
 *  Der Screen «FachBereiche» zeigt sie als «Aufgaben folgen». */
function alleBereicheVonFach(fachId){
  const t = mySchultyp();
  return t ? (t.bereiche || []).filter(b => fachVonBereich(b) === fachId)
           : (fachInfo(fachId)?.bereiche || []);
}

/** Die Faecher, die sich pruefen lassen, also solche mit mindestens
 *  einem Bereich, der einen Themenbaum hat.
 *
 *  Deutsch heisst an der FMS Bern NUR Aufsatz: Die ganze Deutschpruefung
 *  besteht dort aus einem einzigen Text. Ein Selbsttest ueber null Themen
 *  ist keine Pruefung, sondern eine leere Karte. Darum steht Deutsch dort
 *  weder im Selbsttest noch in der Standortbestimmung. Der Aufsatz wird
 *  separat geschrieben, und genau das sagt der Hinweis darunter. */
function pruefbareFaecher(){
  return meineFaecher().filter(f => bereicheVon(f).length);
}

/** Die uebbaren Bereiche EINES Fachs. */
function bereicheVon(fachId){
  return meineFaecher().includes(fachId)
    ? bereicheVonFach(fachId).filter(b=>b in THEMEN) : [];
}

const fachName = id => fachInfo(id)?.name || id;
const bereichName = id => bereichInfo(id)?.name || THEMEN[id]?.name || id;
const bereichKurz = id => bereichInfo(id)?.kurzname || bereichName(id);

/** Zählgrössen je Unterthema. Jede Aufgabe zählt einmal: Wer dieselbe Ref
 *  zweimal löst, kommt dem Pflichtset nicht näher. */
function fortschritte(faecher){
  const out=[];
  for(const fach of faecher){
    const b=THEMEN[fach]; if(!b) continue;
    const bes = bespielt(fach);
    for(const o of b.oberthemen){
      for(const u of o.unterthemen){
        if(!bes.has(u.code)) continue;
        const meine = Z.versuche.filter(v=>v.fach===fach && v.unterthema===u.code);
        const letzte = meine.slice(-10);
        out.push({
          unterthema:u.code, name:u.name, oberthema:o.name, fach,
          pflichtset:u.pflichtset||20,
          geloest:new Set(meine.filter(v=>v.richtig).map(v=>v.ref)).size,
          richtigeLetzte10:letzte.filter(v=>v.richtig).length,
          versucheLetzte10:letzte.length,
          zuletzt: meine.length ? meine[meine.length-1].zeit : null,
        });
      }
    }
  }
  return out.map(f=>({...f,
    abgeschlossen: f.geloest>=f.pflichtset,
    quote: f.versucheLetzte10 ? f.richtigeLetzte10/f.versucheLetzte10 : 0}));
}

/* Dieselben Gewichte wie in service/Scheduler.kt. */
const W_PRUEFUNG=0.40, W_SCHWAECHE=0.25, W_DRINGLICHKEIT=0.20, W_VERGESSEN=0.15, HALBWERT=9;

function rangliste(){
  const faecher = meineBereiche();
  const alle = fortschritte(faecher);
  const nach = new Map(alle.map(f=>[f.fach+'|'+f.unterthema,f]));
  const tageBis = tageBisPruefung();
  /* «Kein drittes Mal am Stück»: Wer zweimal hintereinander dasselbe Thema
     geübt hat, bekommt beim dritten Mal etwas anderes vorgeschlagen.
     
     Gemessen wird an den letzten zwanzig Versuchen. Zwei Übungsblöcke.
     Gehören mindestens vierzehn davon einem Thema, war es zweimal am Stück
     dran. Die Schwelle statt «alle zwanzig», weil ein abgebrochener Block
     oder eine Antwort aus dem Selbsttest sonst die Regel aushebelt.
     
     Und die Regel wirkt HART, nicht als Punktabzug: Eine Halbierung der
     Punkte überstand ein Thema mit grossem Vorsprung einfach.
     
     Der Server rechnet genau dasselbe (`Scheduler.kt`). Er sieht nur die
     Versuche, keinen Verlauf, und beide müssen dieselbe Reihenfolge geben. */
  const LETZTE = 20, SCHWELLE = 14;
  const letzte = Z.versuche.slice(-LETZTE).map(v=>v.fach+'|'+v.unterthema);
  const haeufig = {};
  letzte.forEach(k => { haeufig[k] = (haeufig[k]||0) + 1; });
  const zweimalAmStueck = Object.keys(haeufig)
    .find(k => haeufig[k] >= SCHWELLE) || null;

  const liste = alle.filter(f=>!f.abgeschlossen).map(f=>{
    const u = unterthemaVon(f.fach,f.unterthema);
    const offeneVor = (u?.voraussetzungen||[]).find(v=>{
      const vf = nach.get(f.fach+'|'+v); return vf && vf.geloest*2 < vf.pflichtset;
    });
    const pruefung = pruefungsgewicht(f.fach,f.unterthema);
    const schwaeche = f.versucheLetzte10===0 ? 0.6 : 1-f.quote;
    const rest = 1 - Math.min(1, f.geloest/f.pflichtset);
    const dringend = tageBis===null ? rest*0.5
                   : tageBis<=0 ? rest
                   : rest*Math.min(1, 120/Math.max(1,tageBis));
    const tageHer = f.zuletzt ? (heute()-f.zuletzt)/86400000 : 30;
    const vergessen = 1 - Math.exp(-tageHer/HALBWERT);
    let punkte = W_PRUEFUNG*pruefung + W_SCHWAECHE*schwaeche
               + W_DRINGLICHKEIT*dringend + W_VERGESSEN*vergessen;
    if(offeneVor) punkte *= 0.25;
    return {...f, punkte, begruendung: begruendung(f, pruefung, schwaeche, tageHer, offeneVor)};
  }).sort((a,b)=>b.punkte-a.punkte);

  // Und jetzt die harte Regel: Steht das zweimal geübte Thema vorn und gibt
  // es überhaupt etwas anderes, rutscht es auf Platz zwei. Ist es das
  // einzige offene Thema, bleibt es. Dann wäre Abwechslung nur eine leere
  // Geste.
  if(zweimalAmStueck && liste.length > 1 &&
     liste[0].fach + '|' + liste[0].unterthema === zweimalAmStueck){
    liste.splice(1, 0, liste.shift());
  }
  return liste;
}

/** Der Satz, der im Screen «Zuerst dran» unter dem Thema steht. */
function begruendung(f, pruefung, schwaeche, tageHer, offeneVor){
  if(offeneVor){
    const n = unterthemaVon(f.fach,offeneVor)?.name || offeneVor;
    return 'Übe zuerst «'+n+'» Darauf baut dieses Thema auf.';
  }
  const o = oberthemaVon(f.fach,f.unterthema);
  const total = THEMEN[f.fach].oberthemen.reduce((a,x)=>a+x.punkte,0);
  if(f.versucheLetzte10===0 && pruefung>0.15 && o)
    return 'Du hast dieses Thema noch nie geübt, und «'+o.name+'» trägt '+o.punkte+' von '+total+' Punkten in der Prüfung.';
  if(f.versucheLetzte10===0) return 'Du hast dieses Thema noch nie geübt.';
  if(schwaeche>=0.5 && o)
    return '«'+o.name+'» trägt '+o.punkte+' von '+total+' Punkten, und du hast '+f.richtigeLetzte10+' von '+f.versucheLetzte10+' Aufgaben getroffen.';
  if(schwaeche>=0.5)
    return 'Du hast zuletzt '+f.richtigeLetzte10+' von '+f.versucheLetzte10+' Aufgaben getroffen.';
  if(tageHer>=7) return 'Das liegt '+Math.floor(tageHer)+' Tage zurück. Zeit für eine Auffrischung.';
  return 'Dir fehlen noch '+(f.pflichtset-f.geloest)+' von '+f.pflichtset+' Pflichtaufgaben.';
}

/* --- Aufgaben ziehen --------------------------------------------------- */
const seed = () => 1 + Math.floor(Math.random()*2000000000);

function setZiehen(fach, unterthema, anzahl){
  const mathe = TEMPLATES.filter(t=>t.fach===fach && t.unterthemen.includes(unterthema));
  const text  = TEXTBLOECKE.filter(t=>(t.fach||'sprachbetrachtung')===fach && t.unterthemen.includes(unterthema));
  if(!mathe.length && !text.length) return [];
  const schon = new Set(Z.versuche.filter(v=>v.fach===fach&&v.unterthema===unterthema&&v.richtig).map(v=>v.ref));
  const out=[], gesehen=new Set();
  // Jeder Topf zählt für sich. Vorher lief `i` durch beide Listen: Weil es im
  // Mathe-Zweig immer ungerade und im Text-Zweig immer gerade ist, waren bei
  // gerader Listenlänge nur die halben Indizes erreichbar. Drei fertige,
  // tor-geprüfte Vorlagen hat so nie jemand gezogen.
  let iM = 0, iT = 0;
  for(let i=1; out.length<anzahl && i<anzahl*40; i++){
    const a = (mathe.length && (!text.length || i%2===1))
      ? ziehe(mathe[iM++%mathe.length], seed())
      : ziehText(text[iT++%text.length], seed());
    if(!a || schon.has(a.ref) || gesehen.has(a.stamm)) continue;
    // Die Aufgabe wird unter DEM Unterthema verbucht, für das sie gezogen
    // wurde, nicht unter dem ersten aus ihrer Liste.
    //
    // Viele Vorlagen decken mehrere Unterthemen ab. Ohne diese Zeile füllte
    // eine Übung zu «Verhältnisse» das Pflichtset von «Prozentrechnen», das
    // geübte Thema blieb ewig bei null, und der Scheduler schlug es endlos
    // wieder vor. Der Fehler fiel nirgends auf, weil alles funktionierte —
    // nur die Zahl bewegte sich nicht.
    gesehen.add(a.stamm); out.push({...a, unterthema});
  }
  return out;
}

function mischsatz(fach, unterthemen, anzahl){
  if(!unterthemen.length) return [];
  // Gewichtet wird das OBERTHEMA, nicht das Unterthema. Sonst hängt der Anteil
  // eines Oberthemas daran, in wie viele Unterthemen es zerlegt ist:
  // Oberthema 2 trägt 45 % der Punkte UND stellt 17 der 86 Unterthemen —
  // beides zugleich zu zählen hiesse, es doppelt zu gewichten, und es bekäme
  // über die Hälfte des Tests. Vorher bekam ausserdem jedes Unterthema
  // `Math.max(1, …)`: Es entstanden 86 Aufgaben, aus denen das Mischen
  // gleichverteilt zog. Das Oberthema mit 45 % der Punkte bekam 27 %.
  //
  // GRUNDANTEIL: Oberthema 1 und 6 tragen null Punkte, weil sie nicht
  // eigenständig geprüft werden. Ohne Mindestgewicht kämen sie nie vor, und
  // der Test sähe nicht, ob die Grundlagen sitzen.
  const GRUNDANTEIL = 0.04;
  const gruppen = {};
  unterthemen.forEach(u=>{ const o=oberthemaVon(fach,u); const nr=o?o.nr:-1;
                           (gruppen[nr] = gruppen[nr] || []).push(u); });
  const nummern = Object.keys(gruppen);
  const gew = nummern.map(nr=>Math.max(pruefungsgewicht(fach, gruppen[nr][0]), GRUNDANTEIL));
  const summe = gew.reduce((a,b)=>a+b,0);
  const kumuliert=[]; gew.reduce((a,g)=>{const s=a+g; kumuliert.push(s); return s;},0);

  // Jeder Platz wird einzeln gewichtet gezogen. Der naheliegende Weg. Anteile
  // ausrechnen und die Reste verteilen. Versagt hier: Auf zwölf Plätze liegt
  // jeder rohe Anteil unter 1, und «grösster Rest» entartet zu «die
  // schwersten zuerst».
  //
  // Das ist kein Verstoss gegen §2.4: Gewürfelt wird, WAS gezogen wird —
  // dieselbe Art Entscheidung wie beim Seed. Die Aufgabe selbst entsteht
  // danach deterministisch aus `templateId:seed`.
  let out=[]; const schon=new Set();
  for(let runde=0; out.length<anzahl && runde<4; runde++){
    const plaetze = gew.map(()=>0);
    for(let p=out.length;p<anzahl;p++){
      const wurf = Math.random()*summe;
      const i = kumuliert.findIndex(k=>k>=wurf);
      plaetze[i<0 ? gew.length-1 : i]++;
    }
    // Innerhalb eines Oberthemas gleichmässig auf seine Unterthemen.
    nummern.forEach(function(nr, i){
      if(!plaetze[i]) return;
      const themen = new Rng(seed()).shuffle(gruppen[nr]);
      for(let k=0;k<plaetze[i];k++){
        setZiehen(fach, themen[k%themen.length], 1)
          .filter(a=>!schon.has(a.ref))
          .forEach(a=>{ schon.add(a.ref); out.push(a); });
      }
    });
  }
  // Kein `sort(() => Math.random() - 0.5)`: Ein Vergleicher, der zufällig
  // antwortet, mischt nicht gleichmässig. Manche Reihenfolgen kommen
  // deutlich häufiger heraus als andere. Fisher-Yates mit der eigenen Rng
  // mischt richtig, und der Seed macht das Ergebnis nachvollziehbar.
  return einLesetext(new Rng(seed()).shuffle(out).slice(0, anzahl));
}

/**
 * Alle Textverstaendnis-Aufgaben eines Satzes an EINEN Lesetext binden.
 *
 * Korrekturen 2.0, Punkt 3: «Bei der Standortbestimmung im Bereich Deutsch
 * nicht für jede Textverständnisfrage einen neuen Lesetext verwenden. Besser
 * einen Lesetext anzeigen und dazu mehrere passende Textverständnisfragen
 * stellen. Sonst entsteht unnötig viel Leseaufwand.»
 *
 * Der Mischsatz zieht je Unterthema eine Aufgabe, und jedes Unterthema liegt
 * in einem anderen Block. Bei vier Textverstaendnisfragen las man vier
 * Texte, um vier Fragen zu beantworten. Hier wird der Text mit den meisten
 * Fragen behalten und die uebrigen werden durch weitere Fragen DESSELBEN
 * Blocks ersetzt. Findet sich keine, bleibt die alte Aufgabe stehen: lieber
 * ein zweiter Text als eine Luecke.
 */
function einLesetext(satz){
  const mitText = satz.filter(a => a.lesetext);
  if(mitText.length < 2) return satz;
  const zaehler = {};
  mitText.forEach(a => { zaehler[a.lesetext] = (zaehler[a.lesetext] || 0) + 1; });
  const haupt = Object.keys(zaehler).sort((x,y)=>zaehler[y]-zaehler[x])[0];
  // Der Text steht je nach Block an der Aufgabe ODER am Block. Darum wird
  // der Block ueber die Kennung der Aufgabe gesucht, nicht ueber den Text:
  // «templateId:seed» fuehrt immer zum richtigen.
  const vorbild = mitText.find(a => a.lesetext === haupt);
  const block = TEXTBLOECKE.find(b => b.templateId === String(vorbild.ref).split(':')[0]);
  if(!block) return satz;

  const schon = new Set(satz.map(a => a.ref));
  const ersetzt = satz.map(a => {
    if(!a.lesetext || a.lesetext === haupt) return a;
    for(let i = 1; i < 400; i++){
      const neu = ziehText(block, seed());
      // Ein Block kann MEHRERE Lesetexte tragen, je Aufgabe einen. Ohne
      // diesen Vergleich taeuschte die Ersetzung nur einen gemeinsamen Text
      // vor und zog in Wahrheit den naechsten.
      if(neu && neu.lesetext === haupt && !schon.has(neu.ref)){
        schon.add(neu.ref);
        // Das Unterthema der ERSETZTEN Aufgabe behalten waere falsch: Die
        // neue Frage prueft, was ihr Block prueft.
        return {...neu, unterthema: neu.unterthema || block.unterthemen[0]};
      }
    }
    return a;
  });
  // Die Fragen zum Text hintereinander, damit man ihn einmal liest.
  const mit = ersetzt.filter(a => a.lesetext);
  const ohne = ersetzt.filter(a => !a.lesetext);
  return ohne.slice(0, 2).concat(mit, ohne.slice(2));
}

function merke(a, richtig, diagnoseId){
  Z.versuche.push({ref:a.ref, fach:a.fach, unterthema:a.unterthema,
                   richtig, diagnoseId, zeit:heute()});
}

/* ---- aus der Vorschau, Block 4: Deutsch-Engine ---- */
/* =======================================================================
   DEUTSCH. Port von engine/TextGenerator.kt
   Grammatik laesst sich nicht parametrisieren wie Arithmetik. Ein Block ist
   deshalb eine Sammlung gleichartiger Aufgaben; der Seed waehlt eine davon
   und mischt die Optionen. Template-ID plus Seed ergibt weiterhin immer
   dieselbe Aufgabe.
   ======================================================================= */

const nackt = w => w.trim().replace(/^[«»("'.,;:!?–—]+|[«»)"'.,;:!?–—]+$/g,'').toLowerCase();

function ziehTextAlt(spec, seed){
  const rng = new Rng(seed);
  const i = rng.int(0, spec.aufgaben.length-1);
  const a = spec.aufgaben[i];
  const menge = (a.optionen && a.optionen.length) ? a.optionen : (spec.optionen||[]);
  const wahl = spec.format==='einfachauswahl' || spec.format==='mehrfachauswahl';

  const optionen = wahl ? rng.shuffle(menge).map(text=>({
    id: 'o'+menge.indexOf(text), text,
    diagnoseId: (a.fehler||[]).find(f=>f.antwort===text)?.diagnoseId || null
  })) : [];

  let woerter = [], indizes = [];
  if(spec.format==='kommas'){
    const roh = a.loesung[0].trim().split(/\s+/);
    roh.forEach(w=>{
      const hat = w.endsWith(',');
      woerter.push(hat ? w.slice(0,-1) : w);
      if(hat) indizes.push(woerter.length-1);
    });
  } else if(spec.format==='markieren'){
    const teile = a.stamm.split('\n\n');
    woerter = teile[teile.length-1].trim().split(/\s+/);
    const offen = woerter.map(nackt);
    a.loesung.forEach(w=>{
      const k = offen.indexOf(nackt(w));
      if(k>=0){ offen[k]=' '; indizes.push(k); }
    });
    indizes.sort((x,y)=>x-y);
  }

  return {
    ref: spec.templateId+':'+seed,
    templateId: spec.templateId, lernzielId: spec.lernzielId,
    fach: spec.fach || 'sprachbetrachtung',
    unterthema: spec.unterthemen[0],
    format: spec.format,
    stamm: a.stamm, einheit: null,
    loesung: null,
    loesungText: spec.format==='kommas' ? a.loesung[0] : a.loesung.join(', '),
    optionen, woerter, indizes,
    loesungWorte: a.loesung,
    textFehler: a.fehler || [],
    lesetext: a.text || spec.text || null,
    hinweise: spec.hinweise,
    loesungsweg: spec.loesungsweg.concat([a.erklaerung]),
    fehler: []
  };
}

const normText = s => String(s).trim().toLowerCase().replace(/\s+/g,' ').replace(/[.!?]+$/,'');

/** Bewertet die vier Deutsch-Formate. Wie in Mathematik gilt: Wenn eine
 *  Antwort zu einem Fehlermuster passt, wird der Denkfehler benannt. */
function bewerteText(a, antwort){
  if(a.format==='markieren' || a.format==='kommas'){
    const getippt = [...(antwort.stellen||[])].sort((x,y)=>x-y);
    const richtig = [...a.indizes].sort((x,y)=>x-y);
    if(getippt.join()===richtig.join())
      return {richtig:true, diagnoseId:null, feedback:LOB[Math.floor(Math.random()*LOB.length)]};
    const zuViel  = getippt.filter(i=>!richtig.includes(i)).map(i=>a.woerter[i]);
    const zuWenig = richtig.filter(i=>!getippt.includes(i)).map(i=>a.woerter[i]);
    let satz;
    if(a.format==='kommas' && zuViel.length && !zuWenig.length)
      satz = `Du hast ein Komma zu viel gesetzt, nach «${zuViel[0]}» gehört keines hin. `+
             'Setze nur dort ein Komma, wo ein Teilsatz endet oder eine Aufzählung trennt.';
    else if(a.format==='kommas' && zuWenig.length)
      satz = `Nach «${zuWenig[0]}» fehlt ein Komma. Suche alle Personalformen im Satz. `+
             'jede gehört zu einem eigenen Teilsatz, und zwischen zwei Teilsätzen steht ein Komma.';
    else if(zuWenig.length && !zuViel.length)
      satz = `«${zuWenig[0]}» gehört auch dazu. Markiere die Wortgruppe immer vollständig, `+
             'also mit Artikel und Adjektiven.';
    else if(zuViel.length && !zuWenig.length)
      satz = `«${zuViel[0]}» gehört nicht dazu. Prüfe mit der Frageprobe, wo die Wortgruppe endet.`;
    else
      satz = `Die Markierung stimmt noch nicht ganz: ${zuWenig.length} fehlen, ${zuViel.length} sind zu viel.`;
    return {richtig:false, diagnoseId:'markierung_unvollstaendig', feedback:satz};
  }

  if(a.format==='mehrfachauswahl'){
    const gewaehlt = (antwort.optionIds||[]).map(id=>a.optionen.find(o=>o.id===id)?.text).filter(Boolean);
    const richtig = a.loesungWorte;
    if(gewaehlt.length===richtig.length && gewaehlt.every(x=>richtig.includes(x)))
      return {richtig:true, diagnoseId:null, feedback:LOB[Math.floor(Math.random()*LOB.length)]};
    const daneben = gewaehlt.filter(x=>!richtig.includes(x));
    const t = a.textFehler.find(f=>daneben.includes(f.antwort));
    return {richtig:false, diagnoseId:t?t.diagnoseId:'auswahl_unvollstaendig',
      feedback: t ? t.feedback :
        'Es fehlt noch etwas oder es ist zu viel angekreuzt. Geh die Liste nochmals durch und prüfe jedes Wort einzeln.'};
  }

  if(a.format==='luecke'){
    const g = normText(antwort.eingabe||'');
    if(a.loesungWorte.some(l=>normText(l)===g))
      return {richtig:true, diagnoseId:null, feedback:LOB[Math.floor(Math.random()*LOB.length)]};
    const t = a.textFehler.find(f=>normText(f.antwort)===g);
    return {richtig:false, diagnoseId:t?t.diagnoseId:null,
      feedback: t ? t.feedback :
        'Das stimmt noch nicht. Achte auf die Endung und darauf, ob die Form zum Subjekt passt.'};
  }

  // einfachauswahl
  const gewaehlt = a.optionen.find(o=>o.id===antwort.optionId)?.text;
  if(gewaehlt && a.loesungWorte.includes(gewaehlt))
    return {richtig:true, diagnoseId:null, feedback:LOB[Math.floor(Math.random()*LOB.length)]};
  const t = a.textFehler.find(f=>f.antwort===gewaehlt);
  return {richtig:false, diagnoseId:t?t.diagnoseId:null,
    feedback: t ? t.feedback :
      'Das stimmt noch nicht. Geh die Proben der Reihe nach durch. Der Lösungsweg unten zeigt sie.'};
}

/* =======================================================================
   LERNPFAD. Port von service/Lernpfad.kt
   ======================================================================= */
const PRUEFUNGSFORM_WOCHEN = 4, PENSUM_MAX = 40, PENSUM_MIN = 6;

function montagVon(d){
  const x = new Date(d); const tag = (x.getDay()+6)%7;   // Montag = 0
  x.setDate(x.getDate()-tag); x.setHours(0,0,0,0); return x;
}

function lernpfad(){
  const heute = heuteDatum();
  const p = Z.profil?.pruefungsdatum ? new Date(Z.profil.pruefungsdatum+'T00:00:00') : null;
  if(!p)
    return {aktiv:false, grund:'Sobald dein Prüfungstermin gesetzt ist, rechnet die App dir den Weg dorthin aus.'};
  if(p < heute)
    return {aktiv:false, grund:'Dein Prüfungstermin ist vorbei. Setze in den Einstellungen einen neuen, wenn du weiterüben willst.'};
  if(p.getTime() === heute.getTime())
    return {aktiv:false, grund:'Heute ist es so weit. Kein neues Thema mehr. Geh dein Fehlerarchiv durch und atme durch.'};

  const faecher = meineBereiche();
  const alle = fortschritte(faecher);
  const offenTotal = alle.reduce((a,f)=>a+Math.max(0,f.pflichtset-f.geloest),0);

  const mo = montagVon(heute), moP = montagVon(p);
  const wochenTotal = Math.max(1, Math.round((moP-mo)/(7*86400000))+1);
  const lernwochen = Math.max(1, wochenTotal-PRUEFUNGSFORM_WOCHEN);

  const roh = Math.ceil(offenTotal/lernwochen);
  const pensum = Math.min(PENSUM_MAX, Math.max(PENSUM_MIN, roh));
  const geloestDieseWoche = new Set(Z.versuche.filter(v=>v.richtig && v.zeit>=mo).map(v=>v.ref)).size;

  // Die Themen werden in der Reihenfolge verteilt, die der Scheduler ohnehin
  // liefert, kein zweiter Algorithmus, der dem ersten widersprechen koennte.
  const offen = rangliste().filter(b=>!b.abgeschlossen).slice();
  const wochen = [];
  for(let i=0;i<wochenTotal;i++){
    const start = new Date(mo.getTime()+i*7*86400000);
    const ende  = new Date(start.getTime()+6*86400000);
    const form  = i >= lernwochen;
    const themen = [];
    if(!form){
      let rest = pensum;
      while(rest>0 && offen.length){
        const b = offen.shift();
        const nimmt = Math.min(rest, Math.max(0, b.pflichtset-b.geloest));
        themen.push({unterthema:b.unterthema, name:b.name, fach:b.fach,
                     fachName:bereichKurz(b.fach), oberthema:b.oberthema, aufgaben:nimmt});
        rest -= nimmt;
      }
    }
    wochen.push({
      nummer:i+1, von:start, bis:ende,
      istDieseWoche:i===0, istVergangen:ende<heute, istPruefungsform:form,
      pensum: form?0:themen.reduce((a,t)=>a+t.aufgaben,0),
      geloest: i===0?geloestDieseWoche:0, themen,
      titel: form && i+1===wochenTotal ? 'Prüfungswoche' : form ? 'Prüfungsform'
             : i===0 ? 'Diese Woche' : 'Woche '+(i+1),
      auftrag: form && i+1===wochenTotal
        ? 'Keine neuen Themen mehr. Geh dein Fehlerarchiv durch und schlaf genug.'
        : form ? 'Ein Selbsttest über die ganze Prüfung, danach die Fehler daraus.'
        : themen.length ? null : 'Nichts mehr offen. Wiederhole, was am längsten zurückliegt.'
    });
  }

  /* Die drei Lernabschnitte auf die vorhandenen Wochen verteilen.
     `Math.floor(lernwochen/3)` genügte nicht: Bei einer einzigen Lernwoche
     ergab das für Abschnitt 3 «Woche 3 bis 1» Ein Abschnitt, der vor
     seinem Anfang endet. Wer in vier Wochen Prüfung hat, soll nicht drei
     erfundene Abschnitte sehen, sondern die Wahrheit: Für manches reicht
     die Zeit nicht mehr. Ein Abschnitt ohne Woche bekommt `null` und wird
     ohne Zeitangabe gezeigt. */
  const teile = (total, n) => {
    const aus = []; let ab = 1;
    for(let k = 0; k < n; k++){
      const wie = Math.floor(total / n) + (k < total % n ? 1 : 0);
      aus.push(wie > 0 ? [ab, ab + wie - 1] : [null, null]);
      ab += wie;
    }
    return aus;
  };
  const [a1, a2, a3] = teile(lernwochen, 3);
  /* Unterthemen-Codes sind nur JE FACH eindeutig: 47 der 57 Deutsch-Codes gibt
     es in Mathematik auch. Ein reines Set aus Codes warf beide zusammen. Ein
     Mathematik-Thema landete unter «Grundlagen», weil ein gleichnamiges
     Deutsch-Thema irgendwo Voraussetzung ist. 33 von 144 Unterthemen standen so
     in der falschen Etappe. Der Schlüssel ist deshalb «fach:code». */
  const schluessel = (fach, code) => fach + ':' + code;
  const grundlagen = new Set(faecher.flatMap(f=>
    THEMEN[f].oberthemen.flatMap(o=>o.unterthemen)
             .flatMap(u=>(u.voraussetzungen||[]).map(v=>schluessel(f,v)))));
  const schwer = new Set(faecher.flatMap(f=>{
    const b=THEMEN[f], total=b.oberthemen.reduce((a,o)=>a+o.punkte,0);
    let summe=0; const out=[];
    for(const o of [...b.oberthemen].sort((x,y)=>y.punkte-x.punkte)){
      if(summe>=total/2) break;
      summe+=o.punkte; out.push(...o.unterthemen.map(u=>schluessel(f,u.code)));
    }
    return out;
  }));
  const zaehl = f => { const t=alle.filter(f); return [t.filter(x=>x.abgeschlossen).length, t.length]; };
  const k = x => schluessel(x.fach, x.unterthema);
  const [gF,gT] = zaehl(x=>grundlagen.has(k(x)));
  const [sF,sT] = zaehl(x=>schwer.has(k(x)) && !grundlagen.has(k(x)));
  const [rF,rT] = zaehl(x=>!schwer.has(k(x)) && !grundlagen.has(k(x)));

  return {aktiv:true, wochen, pensumDieseWoche:pensum, geloestDieseWoche,
    offenTotal, wochenBisPruefung:wochenTotal,
    hinweis: roh>PENSUM_MAX
      ? `Bei diesem Termin bleiben pro Woche mehr als ${PENSUM_MAX} Pflichtaufgaben. Das ist neben der Schule viel. Der Pfad zeigt dir zuerst die Themen mit dem grössten Punkteanteil, damit zählt jede Aufgabe, die du schaffst.`
      : offenTotal===0
      ? 'Alle Pflichtsets sind voll. Ab jetzt zählt Wiederholen: Selbsttests und dein Fehlerarchiv.'
      : 'Der Pfad rechnet sich nach jeder Übung neu. Eine ausgelassene Woche verteilt sich auf die übrigen. Es gibt keinen Rückstand, den du aufholen müsstest.',
    etappen:[
      {nummer:1,titel:'Grundlagen',beschreibung:'Themen, auf denen andere aufbauen. Wer sie sitzen hat, tut sich später leichter.',abgeschlossen:gF,total:gT,vonWoche:a1[0],bisWoche:a1[1]},
      {nummer:2,titel:'Die grossen Brocken',beschreibung:'Die Oberthemen, die zusammen die halbe Prüfung ausmachen.',abgeschlossen:sF,total:sT,vonWoche:a2[0],bisWoche:a2[1]},
      {nummer:3,titel:'Der Rest',beschreibung:'Alles, was dann noch offen ist, in der Reihenfolge, die am meisten bringt.',abgeschlossen:rF,total:rT,vonWoche:a3[0],bisWoche:a3[1]},
      {nummer:4,titel:'Prüfungsform',beschreibung:'Die letzten vier Wochen: keine neuen Themen mehr, nur noch Selbsttests und dein Fehlerarchiv. Wiederholen bringt jetzt mehr als Neues.',abgeschlossen:0,total:0,vonWoche: wochenTotal > lernwochen ? lernwochen+1 : null,bisWoche: wochenTotal > lernwochen ? wochenTotal : null},
    ]};
}

/* ---- aus der Vorschau, Block 6: die Formate aus den ZAP-Trainern ---- */
/* =======================================================================
   ENGINE, ZWEITER TEIL. Die Formate aus den ZAP-Trainern
   Mehrfeld, Koordinatengitter, Zuordnen, Sortieren, Wertetabelle,
   Feldfaerben und die Tabelle mit Auswahlspalte.
   ======================================================================= */

/** Zieht die Variablen und prueft die Bedingungen. Der Teil ist fuer alle
 *  Zahlen-Formate gleich; frueher steckte er in `ziehe` fest. */
function zieheScope(spec, seed){
  const variablen = spec.variablen || [], bedingungen = spec.bedingungen || [];
  for(let versuch = 0; versuch < VERSUCHE; versuch++){
    const rng = new Rng(Math.imul(seed, 1000003) + versuch);
    const s = {}, t = {}; let ok = true;
    for(const v of variablen){
      if(v.typ === 'auswahl') s[v.name] = rng.pick(v.werte);
      else if(v.typ === 'ganzzahl'){
        const sch = v.schritt || 1;
        s[v.name] = v.von + rng.int(0, Math.floor((v.bis - v.von)/sch))*sch;
      }
      else if(v.typ === 'formel'){
        try { s[v.name] = werteAus(v.ausdruck, s); } catch(e){ ok = false; break; }
      }
      else if(v.typ === 'text') t[v.name] = rng.pick(v.texte || v.werte);
      else if(v.typ === 'tabellenzeile'){
        // Eine Zeile ziehen und jede Spalte als eigene Zahl ablegen. So
        // bleibt der Auswerter frei von Listen.
        const zeile = rng.pick(v.zeilen);
        v.spalten.forEach((name, k) => { s[name] = zeile[k]; });
      }
    }
    if(!ok) continue;
    try { ok = bedingungen.every(b => werteAus(b, s) !== 0); } catch(e){ ok = false; }
    if(!ok) continue;
    return {scope: s, texte: t, rng: new Rng(Math.imul(seed, 7919) + versuch)};
  }
  return null;
}

/** Wertet eine Liste von Fehlermustern aus. Muster, die zufaellig die
 *  richtige Loesung ergeben, fallen weg. Sie waeren keine Distraktoren. */
function zieheFehler(liste, scope, richtig, E){
  const gesehen = new Set(), out = [];
  for(const fm of liste || []){
    if(fm.ausdruck === undefined) continue;
    let w; try { w = werteAus(fm.ausdruck, scope); } catch(e){ continue; }
    if(richtig !== undefined && Math.abs(w - richtig) < 1e-9) continue;
    const k = Math.round(w*1e6);
    if(gesehen.has(k)) continue;
    gesehen.add(k);
    out.push({wert: w, diagnoseId: fm.diagnoseId, kurz: fm.kurz || '',
              feedback: E(fm.feedback)});
  }
  return out;
}

/** Zieht eine Aufgabe aus einem Zahlen-Template, in jedem der acht Formate. */
function zieheMathe(spec, seed){
  const g = zieheScope(spec, seed);
  if(!g) return null;
  const {scope, texte, rng} = g;
  const zf = spec.zahlformat || 'ganz';
  const E = x => ersetze(x, scope, texte, zf);

  const basis = {
    ref: spec.templateId + ':' + seed,
    templateId: spec.templateId, lernzielId: spec.lernzielId,
    fach: spec.fach || 'mathematik',
    unterthema: spec.unterthemen[0],
    format: spec.format,
    stamm: E(spec.stamm),
    einheit: spec.einheit || null,
    thema: spec.thema || '',
    hinweise: (spec.hinweise || []).map(E),
    loesungsweg: (spec.loesungsweg || []).map(E),
    erklaerung: spec.erklaerung ? {
      kern: E(spec.erklaerung.kern || ''),
      schritte: (spec.erklaerung.schritte || []).map(E),
      falle: E(spec.erklaerung.falle || ''),
      merksatz: E(spec.erklaerung.merksatz || ''),
    } : null,
    darstellung: spec.darstellung ? darstellung(spec.darstellung, E) : null,
    scope, texte, zahlformat: zf,
    optionen: [], fehler: [],
  };

  switch(spec.format){

  case 'zahl_eingeben': {
    const loesung = werteAus(spec.loesung, scope);
    return {...basis, loesung, loesungText: formatiere(loesung, zf),
            fehler: zieheFehler(spec.fehler, scope, loesung, E)};
  }

  case 'mehrfeld': {
    // Jedes Feld hat eine eigene Loesung und eigene Fehlermuster. Falsch ist
    // nur das Feld, das falsch ist. Die uebrigen bleiben stehen.
    const felder = spec.felder.map(f => {
      const w = werteAus(f.ausdruck, scope);
      // Ein Feld darf ein eigenes Zahlformat mitbringen: dieselbe Aufgabe
      // kann eine ganze Zahl und daneben eine Dezimalzahl verlangen.
      const fzf = f.zahlformat || zf;
      return {name: f.name, label: E(f.label), einheit: f.einheit || '',
              loesung: w, zahlformat: fzf, loesungText: formatiere(w, fzf),
              fehler: zieheFehler(f.fehler, scope, w, E)};
    });
    return {...basis, felder,
            loesungText: felder.map(f => f.label + ': ' + f.loesungText).join(' · ')};
  }

  case 'gitter': {
    const G = spec.gitter, z = a => werteAus(a, scope);
    const loesungen = G.loesungen.map(v => v.map(p => [z(p[0]), z(p[1])]));
    return {...basis,
      gitter: {
        xvon: z(G.xvon), xbis: z(G.xbis), yvon: z(G.yvon), ybis: z(G.ybis),
        toleranz: z(G.toleranz || '0'),
        punkte: (G.punkte || []).map(p => ({name: p.name, label: E(p.label || p.name)})),
        vorgabe: (G.vorgabe || []).map(v => ({text: E(v.text), x: z(v.x), y: z(v.y)})),
        strecken: (G.strecken || []).map(s => ({
          text: E(s.text || ''), stil: s.stil || '',
          von: [z(s.von.x), z(s.von.y)], bis: [z(s.bis.x), z(s.bis.y)]})),
        loesungen,
      },
      loesungText: loesungen[0].map(p => '(' + p[0] + ' | ' + p[1] + ')').join(', '),
      fehler: zieheFehler(spec.fehler, scope, undefined, E)};
  }

  case 'zuordnen': {
    const paare = spec.zuordnen.paare.map((p, i) => ({
      index: i, element: E(p.element), ziel: E(p.ziel)}));
    return {...basis, paare, mischung: rng.shuffle(paare.map((_, i) => i)),
            loesungText: paare.map(p => p.ziel + ' → ' + p.element).join(' · '),
            fehler: zieheFehler(spec.fehler, scope, undefined, E)};
  }

  case 'sortieren': {
    const werte = spec.sortieren.werte.map(w => werteAus(w, scope));
    const elemente = spec.sortieren.elemente.map((e, i) => ({
      index: i, text: E(e.text), wert: werte[i]}));
    // Die Sollreihenfolge sind die Indizes, nach Wert aufsteigend.
    const reihenfolge = elemente.map((_, i) => i).sort((a, b) => werte[a] - werte[b]);
    let mischung = elemente.map((_, i) => i);
    for(let v = 0; v < 20; v++){
      mischung = rng.shuffle(elemente.map((_, i) => i));
      if(!mischung.every((e, i) => e === reihenfolge[i])) break;
    }
    return {...basis, elemente, reihenfolge, mischung,
            loesungText: reihenfolge.map(i => elemente[i].text).join(' < '),
            fehler: zieheFehler(spec.fehler, scope, undefined, E)};
  }

  case 'wertetabelle': {
    const W = spec.wertetabelle;
    const sp = W.spalten.map(s => ({name: s.name, kopf: E(s.kopf),
                                    von: werteAus(s.von, scope), bis: werteAus(s.bis, scope)}));
    // Alle Paare im Bereich, welche die Bedingung erfuellen.
    const paare = [];
    for(let a = Math.ceil(sp[0].von); a <= Math.floor(sp[0].bis); a++)
      for(let b = Math.ceil(sp[1].von); b <= Math.floor(sp[1].bis); b++){
        const s2 = {...scope}; s2[sp[0].name] = a; s2[sp[1].name] = b;
        let ok; try { ok = werteAus(W.bedingung, s2) !== 0; } catch(e){ ok = false; }
        if(ok) paare.push([a, b]);
      }
    return {...basis, wertetabelle: {spalten: sp, paare},
            loesungText: paare.map(p => '(' + p[0] + ' | ' + p[1] + ')').join(', '),
            fehler: zieheFehler(spec.fehler, scope, undefined, E)};
  }

  case 'faerben': {
    const R = spec.raster;
    const felder = [];
    for(const z of R.zellen){
      let an; try { an = werteAus(z.bedingung, scope) !== 0; } catch(e){ an = false; }
      if(an) felder.push(Math.round(werteAus(z.index, scope)));
    }
    return {...basis,
      raster: {spalten: Math.round(werteAus(R.spalten, scope)),
               zeilen: Math.round(werteAus(R.zeilen, scope)),
               felder: felder.sort((a, b) => a - b)},
      loesungText: felder.length + ' Felder',
      fehler: zieheFehler(spec.fehler, scope, undefined, E)};
  }

  case 'loesungsmenge': {
    const lm = spec.loesungsmenge;
    const von = werteAus(lm.von, scope), bis = werteAus(lm.bis, scope);
    const menge = [];
    for(let k = Math.ceil(von); k <= Math.floor(bis); k++){
      const s2 = {...scope}; s2[lm.kandidatenVariable] = k;
      let ok; try { ok = werteAus(lm.bedingung, s2) !== 0; } catch(e){ ok = false; }
      if(ok) menge.push(k);
    }
    return {...basis, loesungsmenge: menge, loesungText: menge.join(', '),
            fehler: zieheFehler(spec.fehler, scope, undefined, E)};
  }

  }
  return null;
}

/** Eine Tabelle, die oberhalb der Aufgabe steht (etwa ein Bauplan). */
function darstellung(d, E){
  if(!d) return null;
  return {typ: d.typ, kopf: (d.kopf || []).map(E),
          zeilen: (d.zeilen || []).map(z => z.map(E))};
}

/* ---- aus der Vorschau, Block 7: Bewertung aller Formate ---- */
/* --- Deutsch: die beiden neuen Formate ------------------------------- */

/** Erweitert `ziehText` um Mehrfeld und Tabelle mit Auswahlspalte, und um
 *  Aufgaben, die Woerter und Stellen direkt mitbringen statt sie aus dem
 *  Loesungssatz abzuleiten. */
function ziehText2(spec, seed){
  const rng = new Rng(seed);
  const i = rng.int(0, spec.aufgaben.length - 1);
  const a = spec.aufgaben[i];
  const menge = (a.optionen && a.optionen.length) ? a.optionen : (spec.optionen || []);
  const wahl = spec.format === 'einfachauswahl' || spec.format === 'mehrfachauswahl';

  const basis = {
    ref: spec.templateId + ':' + seed,
    templateId: spec.templateId, lernzielId: spec.lernzielId,
    fach: spec.fach || 'sprachbetrachtung',
    unterthema: spec.unterthemen[0],
    format: spec.format,
    stamm: a.stamm, einheit: null, thema: spec.thema || '',
    // Ein eigener Hinweis der Aufgabe schlaegt den des Blocks.
    hinweise: (a.hinweise && a.hinweise.length) ? a.hinweise : (spec.hinweise || []),
    loesungsweg: (spec.loesungsweg || []).concat(a.erklaerung ? [a.erklaerung] : []),
    erklaerung: null, darstellung: null,
    // Der Lesetext gehoert zum BLOCK, nicht zur Aufgabe: ein Text, viele
    // Fragen. Eine Aufgabe darf ihn ueberschreiben.
    lesetext: a.text || spec.text || null,
    textFehler: a.fehler || [],
    optionen: [], fehler: [], woerter: [], indizes: [], loesungWorte: [],
  };

  if(wahl){
    const optionen = rng.shuffle(menge).map(text => ({
      id: 'o' + menge.indexOf(text), text,
      diagnoseId: (a.fehler || []).find(f => f.antwort === text)?.diagnoseId || null}));
    return {...basis, optionen, loesungWorte: a.loesung,
            loesungText: a.loesung.join(', ')};
  }

  if(spec.format === 'luecke')
    return {...basis, loesungWorte: a.loesung, loesungText: a.loesung[0]};

  if(spec.format === 'mehrfeld'){
    return {...basis,
      felder: a.felder.map((f, k) => ({
        name: 'f' + k, label: f.label, einheit: '',
        loesungWorte: f.loesung, loesungText: f.loesung[0], fehler: []})),
      loesungText: a.felder.map(f => f.label + ': ' + f.loesung[0]).join(' · ')};
  }

  if(spec.format === 'tabelle_auswahl'){
    // Die Optionen bleiben in fester Reihenfolge. Sie sind die Kopfzeile
    // der Tabelle und muessen ueber alle Zeilen gleich stehen.
    return {...basis,
      optionen: menge.map((t, k) => ({id: 'o' + k, text: t, diagnoseId: null})),
      // Eine Zeilenloesung steht in den Daten als Liste, wie ueberall sonst.
      // Fuer den Vergleich zaehlt der eine Eintrag.
      zeilen: a.zeilen.map((z, k) => ({index: k, text: z.text, loesung: z.loesung[0]})),
      loesungText: a.zeilen.map(z => z.text + ' → ' + z.loesung[0]).join(' · ')};
  }

  if(spec.format === 'markieren' || spec.format === 'kommas'){
    // Entweder liegen Wörter und Stellen bei (Import), oder sie werden aus
    // dem Loesungssatz abgeleitet (handgeschriebene Bloecke).
    if(a.woerter && a.woerter.length)
      return {...basis, woerter: a.woerter, indizes: (a.stellen || []).slice().sort((x,y)=>x-y),
              loesungWorte: (a.stellen || []).map(k => a.woerter[k]),
              loesungText: (a.stellen || []).map(k => a.woerter[k]).join(', ')};
    return ziehTextAlt(spec, seed);
  }

  return ziehTextAlt(spec, seed);
}

/* --- Bewertung der neuen Formate ------------------------------------- */

function mengeGleich(a, b){
  const x = [...a].sort((p,q)=>p-q), y = [...b].sort((p,q)=>p-q);
  return x.length === y.length && x.every((v,i)=>v===y[i]);
}

/** Bewertet Mehrfeld. Zahlen wie Text. Falsch ist nur, was falsch ist:
 *  Die Rueckmeldung nennt das Feld und, wenn moeglich, den Denkfehler. */
function bewerteMehrfeld(a, antwort){
  const ein = antwort.felder || {};
  const daneben = [];
  for(const f of a.felder){
    const roh = (ein[f.name] ?? '').toString().trim();
    let stimmt;
    if(f.loesungWorte && f.loesungWorte.length)
      stimmt = f.loesungWorte.some(l => normText(l) === normText(roh));
    else {
      const z = alsZahl(roh);
      stimmt = z !== null && Math.abs(z - f.loesung) < genauigkeit(f.zahlformat);
    }
    if(!stimmt) daneben.push({feld: f, eingabe: roh});
  }
  if(!daneben.length)
    return {richtig: true, diagnoseId: null, feldFehler: [],
            feedback: LOB[Math.floor(Math.random()*LOB.length)]};

  // Fuer jedes falsche Feld das passende Fehlermuster suchen.
  const teile = [], ids = [];
  for(const d of daneben){
    const z = alsZahl(d.eingabe);
    const t = (d.feld.fehler || []).find(x =>
      z !== null && Math.abs(x.wert - z) < genauigkeit(d.feld.zahlformat));
    if(t){ teile.push(t.feedback); ids.push(t.diagnoseId); }
    else teile.push(`Bei «${d.feld.label}» stimmt es noch nicht.`);
  }
  const rest = a.felder.length - daneben.length;
  const vorspann = rest > 0
    ? `${rest} von ${a.felder.length} Feldern stimmen. `
    : '';
  return {richtig: false, diagnoseId: ids[0] || 'mehrfeld_falsch',
          feldFehler: daneben.map(d => d.feld.name),
          feedback: vorspann + teile.join(' ')};
}

function bewerteTabelle(a, antwort){
  const ein = antwort.zeilen || {};
  const falsch = a.zeilen.filter(z => ein[z.index] !== z.loesung);
  if(!falsch.length)
    return {richtig: true, diagnoseId: null, feedback: LOB[Math.floor(Math.random()*LOB.length)]};
  const z = falsch[0];
  const gewaehlt = ein[z.index];
  return {richtig: false, diagnoseId: 'tabelle_zeile_falsch', zeilenFehler: falsch.map(x=>x.index),
    feedback: `${a.zeilen.length - falsch.length} von ${a.zeilen.length} Zeilen stimmen. ` +
      (gewaehlt ? `Bei «${z.text}» hast du «${gewaehlt}» gewählt. ` : `Bei «${z.text}» fehlt noch die Antwort. `) +
      'Geh die Zeilen einzeln durch und mach bei jeder die Probe.'};
}

function bewerteGitter(a, antwort){
  const g = a.gitter, gesetzt = antwort.punkte || {};
  const tol = g.toleranz || 0;
  for(const variante of g.loesungen){
    let alle = true;
    for(let i = 0; i < g.punkte.length; i++){
      const p = gesetzt[g.punkte[i].name];
      const soll = variante[i];
      // Ohne die Endlichkeitsprüfung wäre ein unlesbarer Punkt richtig:
      // Math.abs(undefined - 5) ist NaN, und NaN > tol ergibt false.
      if(!p || !isFinite(p[0]) || !isFinite(p[1]) ||
         Math.abs(p[0]-soll[0]) > tol || Math.abs(p[1]-soll[1]) > tol){ alle = false; break; }
    }
    if(alle) return {richtig: true, diagnoseId: null,
                     feedback: LOB[Math.floor(Math.random()*LOB.length)]};
  }
  const fehlend = g.punkte.filter(p => !gesetzt[p.name]);
  if(fehlend.length)
    return {richtig: false, diagnoseId: 'gitter_unvollstaendig',
      feedback: `Es fehlt noch ${fehlend.length === 1 ? 'ein Punkt' : fehlend.length + ' Punkte'}: ` +
        fehlend.map(p => p.label).join(', ') + '. Setze alle Punkte, bevor du prüfst.'};
  const soll = g.loesungen[0];
  const erste = g.punkte.findIndex((p, i) => {
    const q = gesetzt[p.name];
    return !isFinite(q[0]) || !isFinite(q[1]) ||
           Math.abs(q[0]-soll[i][0]) > tol || Math.abs(q[1]-soll[i][1]) > tol; });
  const p = g.punkte[erste], q = gesetzt[p.name];
  return {richtig: false, diagnoseId: 'gitter_punkt_falsch', punktFehler: [p.name],
    feedback: `${p.label} liegt noch nicht richtig: Du hast (${q[0]} | ${q[1]}) gesetzt. ` +
      'Lies die Koordinaten immer in derselben Reihenfolge ab. Zuerst nach rechts, dann nach oben.'};
}

function bewerteZuordnen(a, antwort){
  const z = antwort.zuordnung || {};       // Ziel-Index → Element-Index
  const falsch = a.paare.filter((p, i) => z[i] !== i);
  if(!falsch.length && Object.keys(z).length === a.paare.length)
    return {richtig: true, diagnoseId: null, feedback: LOB[Math.floor(Math.random()*LOB.length)]};
  const offen = a.paare.length - Object.keys(z).length;
  if(offen > 0)
    return {richtig: false, diagnoseId: 'zuordnung_unvollstaendig',
      feedback: `${offen} von ${a.paare.length} sind noch nicht zugeordnet. Ordne alle zu, bevor du prüfst.`};
  return {richtig: false, diagnoseId: 'zuordnung_falsch', zeilenFehler: falsch.map((_,i)=>i),
    feedback: `${a.paare.length - falsch.length} von ${a.paare.length} stimmen. ` +
      `Bei «${falsch[0].ziel}» passt die Zuordnung noch nicht. Rechne diesen einen nochmals aus.`};
}

function bewerteSortieren(a, antwort){
  const r = antwort.reihenfolge || [];
  if(r.length !== a.elemente.length)
    return {richtig: false, diagnoseId: 'sortierung_unvollstaendig',
      feedback: 'Bring alle Elemente in eine Reihenfolge, bevor du prüfst.'};
  if(r.every((e, i) => e === a.reihenfolge[i]))
    return {richtig: true, diagnoseId: null, feedback: LOB[Math.floor(Math.random()*LOB.length)]};
  // Wie viele stehen an der richtigen Stelle?
  const treffer = r.filter((e, i) => e === a.reihenfolge[i]).length;
  const umgekehrt = r.every((e, i) => e === a.reihenfolge[a.reihenfolge.length-1-i]);
  return {richtig: false, diagnoseId: umgekehrt ? 'sortierung_umgekehrt' : 'sortierung_falsch',
    feedback: umgekehrt
      ? 'Die Reihenfolge stimmt, aber sie steht falsch herum. Gefragt ist von klein nach gross.'
      : `${treffer} von ${a.elemente.length} stehen an der richtigen Stelle. Rechne alle Angaben ` +
        'zuerst in dieselbe Einheit um. Erst dann lassen sie sich vergleichen.'};
}

function bewerteWertetabelle(a, antwort){
  const ein = (antwort.paare || []).filter(p => p && p.length === 2);
  const soll = a.wertetabelle.paare;
  const schluessel = p => p[0] + '|' + p[1];
  const sollMenge = new Set(soll.map(schluessel));
  const einMenge = new Set(ein.map(schluessel));
  const falsch = ein.filter(p => !sollMenge.has(schluessel(p)));
  const fehlend = soll.filter(p => !einMenge.has(schluessel(p)));
  if(!falsch.length && !fehlend.length)
    return {richtig: true, diagnoseId: null, feedback: LOB[Math.floor(Math.random()*LOB.length)]};
  if(falsch.length)
    return {richtig: false, diagnoseId: 'wertepaar_falsch',
      feedback: `Das Paar (${falsch[0][0]} | ${falsch[0][1]}) liegt nicht auf der Geraden. ` +
        'Setze den x-Wert in die Gleichung ein und rechne den y-Wert aus, statt zu schätzen.'};
  return {richtig: false, diagnoseId: 'wertepaar_fehlt',
    feedback: `Es fehlen noch ${fehlend.length} Wertepaare. Geh alle x-Werte im ` +
      'angegebenen Bereich der Reihe nach durch.'};
}

function bewerteFaerben(a, antwort){
  const ein = antwort.felder || [];
  const soll = a.raster.felder;
  if(mengeGleich(ein, soll))
    return {richtig: true, diagnoseId: null, feedback: LOB[Math.floor(Math.random()*LOB.length)]};
  const zuViel = ein.filter(x => !soll.includes(x));
  const zuWenig = soll.filter(x => !ein.includes(x));
  return {richtig: false, diagnoseId: 'faerbung_falsch',
    feedback: (zuWenig.length ? `${zuWenig.length} Felder fehlen noch. ` : '') +
      (zuViel.length ? `${zuViel.length} Felder sind zu viel gefärbt. ` : '') +
      'Zähle je Spalte, wie hoch der Stapel ist, so viele Felder werden von unten gefärbt.'};
}

function bewerteLoesungsmenge(a, antwort){
  const ein = (antwort.eingabe || '').split(/[,;\s]+/).map(x => parseInt(x, 10))
                .filter(x => !isNaN(x));
  if(mengeGleich(ein, a.loesungsmenge))
    return {richtig: true, diagnoseId: null, feedback: LOB[Math.floor(Math.random()*LOB.length)]};
  const zuViel = ein.filter(x => !a.loesungsmenge.includes(x));
  const zuWenig = a.loesungsmenge.filter(x => !ein.includes(x));
  return {richtig: false, diagnoseId: 'menge_falsch',
    feedback: (zuViel.length ? `${zuViel[0]} gehört nicht dazu. ` : '') +
      (zuWenig.length ? `Es fehlen noch ${zuWenig.length} Zahlen. ` : '') +
      'Geh den ganzen Zahlenbereich durch und prüfe jede Zahl einzeln.'};
}

/** Verteilt auf die richtige Bewertung. Ersetzt die alte `bewerte`. */
function bewerteAlles(a, antwort){
  switch(a.format){
    case 'mehrfeld':        return bewerteMehrfeld(a, antwort);
    case 'tabelle_auswahl': return bewerteTabelle(a, antwort);
    case 'gitter':          return bewerteGitter(a, antwort);
    case 'zuordnen':        return bewerteZuordnen(a, antwort);
    case 'sortieren':       return bewerteSortieren(a, antwort);
    case 'wertetabelle':    return bewerteWertetabelle(a, antwort);
    case 'faerben':         return bewerteFaerben(a, antwort);
    case 'loesungsmenge':   return bewerteLoesungsmenge(a, antwort);
  }
  if(a.textFehler !== undefined) return bewerteText(a, antwort);
  return bewerteZahl(a, antwort.eingabe);
}
