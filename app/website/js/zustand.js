/* StudySwiss — der Zustand, den die Engine braucht
   ==================================================================
   Die Engine aus `engine.js` ist wörtlich die der App-Vorschau. Sie
   greift auf drei Felder eines Objekts `Z` zu: `profil`, `versuche` und
   `selbsttestFach`. Mehr ist es nicht — nachgezählt, nicht vermutet.

   Dieses Objekt liegt darum hier und nicht in der Engine: So bleibt die
   Engine unverändert übernehmbar, und die Website entscheidet selbst,
   woher der Zustand kommt.

   Woher er kommt, hängt davon ab, ob jemand angemeldet ist:

   | | angemeldet | ohne Server (Vorschau) |
   |---|---|---|
   | Aufgaben | vom Server, ohne Lösung | lokal aus der Engine |
   | Antwort prüfen | auf dem Server | lokal |
   | Fortschritt | am Konto | im Browser |

   Der Fortschritt im Browser ist bewusst `localStorage` und nicht
   `sessionStorage`: Wer ohne Konto übt, soll morgen weitermachen
   können. Er wandert mit, sobald ein Konto verknüpft wird — dieselbe
   Zusage wie in der App (§4.8).                                       */

/* Nicht `const Z = …`: In der Einzeldatei steht die Engine im selben
   Skript und bringt ihr eigenes `Z` mit — zwei Deklarationen desselben
   Namens brechen das Laden ab, und dann bleibt jede Seite leer. Also
   nur anlegen, wenn es noch keines gibt. Die Website ohne Engine (die
   ausgelieferte) bekommt hier ihres, die Vorschau behält das der
   Engine. */
if (typeof Z === 'undefined') {
  window.Z = { profil: null, versuche: [], selbsttestFach: null };
}

const SPEICHER = 'studyswiss.fortschritt';

const Fortschritt = {
  laden() {
    try {
      const roh = JSON.parse(localStorage.getItem(SPEICHER) || '{}');
      Z.versuche = Array.isArray(roh.versuche) ? roh.versuche : [];
      if (roh.profil) Z.profil = roh.profil;
    } catch (e) { Z.versuche = []; }
    return Z.versuche;
  },

  merken() {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify({
        /* Nur die letzten 2000 Versuche. Der Fortschritt braucht die
           Trefferquote der letzten zehn und die Zahl der gelösten
           Pflichtaufgaben — für beides genügt das bei Weitem, und ein
           Speicher, der unbegrenzt wächst, läuft irgendwann über. */
        versuche: Z.versuche.slice(-2000),
        profil: Z.profil,
      }));
    } catch (e) { /* voller oder gesperrter Speicher: dann eben nicht */ }
  },

  /** Einen Versuch verbuchen. Dieselben Felder wie in der App, damit
   *  `fortschritte()` aus der Engine damit rechnen kann. */
  verbuchen(a, ergebnis) {
    Z.versuche.push({
      ref: a.ref, fach: a.fach, unterthema: a.unterthema,
      lernzielId: a.lernzielId || null,
      richtig: !!ergebnis.richtig,
      diagnoseId: ergebnis.diagnoseId || null,
      zeit: Date.now(),
    });
    this.merken();
  },

  /** Wie viele verschiedene Aufgaben eines Unterthemas richtig sind.
   *
   *  **Verschiedene**, nicht Versuche: Wer dieselbe Aufgabe fünfmal
   *  richtig hat, hat ein Thema nicht fünfmal geübt. Genau so zählt es
   *  `fortschritte()` in der App (§3.4). */
  geloest(fach, unterthema) {
    const refs = new Set();
    Z.versuche.forEach(v => {
      if (v.richtig && v.fach === fach && v.unterthema === unterthema) refs.add(v.ref);
    });
    return refs.size;
  },

  /** Alles vergessen. Steht in den Einstellungen — wer ohne Konto übt,
   *  muss den Fortschritt auf einem geteilten Rechner löschen können. */
  loeschen() {
    Z.versuche = [];
    try { localStorage.removeItem(SPEICHER); } catch (e) {}
  },
};
