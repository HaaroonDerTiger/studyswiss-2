/* ======================================================================
   Ein berechenbarer Zufall für die Prüfläufe.

   Die App würfelt den Seed einer Aufgabe mit `Math.random()` — so soll es
   sein, sonst bekämen alle Nutzerinnen dieselbe Reihenfolge (Abschnitt 2.4).
   Für einen PRÜFER ist das aber die falsche Eigenschaft: Läuft eine Runde
   zweimal über andere Aufgaben, dann ist ein roter Lauf nicht wiederholbar,
   und ein grüner beweist wenig. Genau das ist passiert — Runde 4 meldete
   einmal einen Fehler, der beim nächsten Lauf verschwunden war.

   Darum wird `Math.random` hier durch einen Generator ersetzt, der von
   einem Startwert abhängt. Derselbe Startwert ergibt denselben Lauf.

   Ein anderer Startwert wird über die Umgebung gesetzt:
       SS_SEED=7 app/pruefung/pruefen.sh
   So lässt sich derselbe Prüfer über viele verschiedene Ziehungen führen,
   ohne dass ein einzelner Lauf unberechenbar wird.
   ====================================================================== */
(function(){
  var start = 1;
  try {
    // JavaScriptCore kennt kein `process`; der Startwert kommt dann per
    // vorangestellter Zuweisung oder bleibt bei 1.
    if (typeof SS_SEED !== 'undefined') start = SS_SEED | 0;
  } catch(e) {}
  if (!start) start = 1;
  var z = start >>> 0;
  Math.random = function(){
    // xorshift32 — kurz, schnell und für diesen Zweck gut genug.
    z ^= z << 13; z >>>= 0;
    z ^= z >> 17;
    z ^= z << 5;  z >>>= 0;
    return z / 4294967296;
  };
  Math.random.startwert = start;
})();
