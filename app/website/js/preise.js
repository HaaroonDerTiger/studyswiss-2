/* StudySwiss — Preise und Rechnen
   ==================================================================
   §9 sagt: «Kein Preis im Code.» Das gilt uneingeschränkt für den
   App-Store-Kauf — dort kommt die Zahl aus dem Laden, sonst zeigt die
   App etwas anderes an als die Kaufbestätigung.

   Beim Schulverkauf gibt es keinen Laden. Die Zahl kommt darum aus
   `GET /v1/schule/preise` und wird hier nur gerechnet und angezeigt.
   Die Tabelle unten ist der Stand für die Vorschau ohne Server; sie
   trägt `herkunft: 'vorschau'`, und die Oberfläche sagt es dazu. So
   kann niemand eine Offerte aus Demo-Zahlen für echt halten.         */

const PREISE_VORSCHAU = {
  herkunft: 'vorschau',
  waehrung: 'CHF',
  mwstSatz: 8.1,           // Normalsatz seit 2024
  einzelpass: 129,         // zum Vergleich: was Eltern in der App zahlen
  /* Staffel je Lizenz und Schuljahr. `ab` ist die Anzahl, ab der die
     Stufe gilt — die Liste ist aufsteigend und lückenlos. */
  staffel: [
    { ab:   1, preis: 89, name: 'Einzelne Klasse'   },
    { ab:  20, preis: 69, name: 'Zwei Klassen'      },
    { ab:  50, preis: 55, name: 'Ganze Stufe'       },
    { ab: 200, preis: 45, name: 'Ganze Schule'      },
  ],
  zahlungsfristTage: 30,
  offerteGueltigTage: 30,
};

let PREISE = PREISE_VORSCHAU;

/** Holt die Preise vom Server. Klappt das nicht, bleibt die Vorschau-
 *  Tabelle stehen — eine Seite ohne Preise wäre schlimmer als eine mit
 *  gekennzeichneten. */
async function preiseLaden() {
  try {
    const p = await api('/schule/preise');
    if (p && Array.isArray(p.staffel) && p.staffel.length) {
      PREISE = Object.assign({ herkunft: 'server' }, p);
    }
  } catch (e) { /* Vorschau-Tabelle bleibt */ }
  return PREISE;
}

/** Die Stufe, die für diese Anzahl gilt. */
function stufeFuer(anzahl) {
  let treffer = PREISE.staffel[0];
  for (const s of PREISE.staffel) if (anzahl >= s.ab) treffer = s;
  return treffer;
}

/** Die nächste Stufe und wie viele Lizenzen bis dahin fehlen — die
 *  Angabe gehört auf den Bildschirm: Wer bei 47 Lizenzen steht, soll
 *  sehen, dass drei mehr den Preis je Lizenz senken. Das ist keine
 *  Verkaufsmasche, sondern die ehrlichere Auskunft. */
function naechsteStufe(anzahl) {
  const naechste = PREISE.staffel.find(s => s.ab > anzahl);
  if (!naechste) return null;
  return { stufe: naechste, fehlen: naechste.ab - anzahl };
}

/**
 * Rechnet eine Bestellung durch.
 *
 * Bewusst eine reine Funktion ohne Seiteneffekte: Dieselbe Rechnung
 * läuft im Rechner, in der Offerte, in der Bestellung und auf der
 * Rechnung. Vier Stellen mit je eigener Rechnung liefen früher oder
 * später auseinander, und dann steht auf der Rechnung ein anderer
 * Betrag als in der Offerte.
 */
function rechne(anzahl, extras = {}) {
  const n = Math.max(0, Math.round(anzahl || 0));
  const stufe = stufeFuer(n);
  const netto = n * stufe.preis;
  const rabattProzent = Math.max(0, +extras.rabattProzent || 0);
  const rabatt = Math.round(netto * rabattProzent) / 100;
  const zwischensumme = netto - rabatt;
  const mwstSatz = PREISE.mwstSatz;
  /* Auf 5 Rappen runden — so steht es auf jeder Schweizer Rechnung,
     und so stimmt die Summe mit dem Einzahlungsschein überein. */
  const mwst = Math.round(zwischensumme * mwstSatz) / 100;
  const mwstGerundet = Math.round(mwst * 20) / 20;
  const total = Math.round((zwischensumme + mwstGerundet) * 20) / 20;
  return {
    anzahl: n, stufe, einzelpreis: stufe.preis,
    netto, rabattProzent, rabatt, zwischensumme,
    mwstSatz, mwst: mwstGerundet, total,
    proLizenz: n ? Math.round((total / n) * 100) / 100 : 0,
    gespartGegenEinzeln: Math.max(0, n * PREISE.einzelpass - total),
    herkunft: PREISE.herkunft,
  };
}
