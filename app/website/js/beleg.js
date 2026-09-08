/* StudySwiss — Offerte und Rechnung zeichnen
   ==================================================================
   Ein Papier, zwei Anlässe: Die Offerte geht an die Schulleitung, die
   Rechnung an die Buchhaltung. Beide werden gedruckt, beide müssen
   ohne Rückfrage verständlich sein.

   Gezeichnet wird hier, gerechnet in `preise.js`. Die Beträge kommen
   fertig aus der Bestellung — die Rechnung rechnet nie selbst nach,
   sonst steht am Ende auf dem Papier etwas anderes als in der Offerte. */

/** Absender und Bankverbindung kommen vom Server, damit sie an einer
 *  Stelle gepflegt sind und nicht im Quelltext stehen. Ohne Server
 *  bleiben die Platzhalter sichtbar — genau wie in `app/start/agb.md`.
 *  Vor der ersten echten Rechnung müssen sie gefüllt sein; das steht in
 *  der Checkliste. */
const ANBIETER_VORSCHAU = {
  name:    'StudySwiss',
  zusatz:  '[Firma und Rechtsform]',
  strasse: '[Strasse und Nummer]',
  plzOrt:  '[PLZ Ort]',
  land:    'Schweiz',
  uid:     '[CHE-000.000.000 MWST]',
  iban:    '[CH00 0000 0000 0000 0000 0]',
  email:   '[rechnungen@studyswiss.ch]',
  web:     'studyswiss.ch',
};

function anbieterVon(beleg) {
  return Object.assign({}, ANBIETER_VORSCHAU, (beleg && beleg.anbieter) || {});
}

/** Eine Adresse als Block, ohne leere Zeilen. */
function adressblock(a) {
  if (!a) return '';
  return [a.name, a.zusatz, a.strasse, [a.plz, a.ort].filter(Boolean).join(' '), a.land]
    .filter(Boolean).map(z => sicher(z)).join('<br>');
}

/** Die Positionen. Eine einzige Zeile, aber ausgeschrieben — «24
 *  Lizenzen» allein sagt der Buchhaltung nicht, wofür. */
function positionen(b) {
  const r = b.rechnung;
  const zeit = `${datum(b.start, true)} bis ${datum(b.ende, true)}`;
  const zeilen = [`
    <tr>
      <td>
        <b>Schullizenz StudySwiss</b><br>
        <span class="grau">Zugang zu allen Fächern der Aufnahmeprüfung,
        ${sicher(zeit)}<br>Stufe «${sicher(r.stufe.name)}»</span>
      </td>
      <td class="r">${zahl(r.anzahl)}</td>
      <td class="r">${franken(r.einzelpreis)}</td>
      <td class="r">${franken(r.netto)}</td>
    </tr>`];
  if (r.rabatt > 0) zeilen.push(`
    <tr><td>Rabatt ${r.rabattProzent} %</td><td class="r"></td>
        <td class="r"></td><td class="r">−${franken(r.rabatt, false)}</td></tr>`);
  return `
    <table>
      <thead><tr>
        <th>Position</th><th class="r">Menge</th>
        <th class="r">Einzelpreis</th><th class="r">Betrag</th>
      </tr></thead>
      <tbody>${zeilen.join('')}</tbody>
      <tfoot>
        <tr><td colspan="3" class="r">Zwischensumme</td>
            <td class="r">${franken(r.zwischensumme)}</td></tr>
        <tr><td colspan="3" class="r">Mehrwertsteuer ${String(r.mwstSatz).replace('.', ',')} %</td>
            <td class="r">${franken(r.mwst)}</td></tr>
        <tr class="total"><td colspan="3" class="r">Total</td>
            <td class="r">${franken(r.total)}</td></tr>
      </tfoot>
    </table>`;
}

function belegKopf(anb, empfaenger, titel) {
  return `
    <div class="beleg-kopf">
      <div class="absender">
        <span class="firma">${sicher(anb.name)}</span>
        ${sicher(anb.zusatz)}<br>${sicher(anb.strasse)}<br>${sicher(anb.plzOrt)}<br>
        ${sicher(anb.email)} · ${sicher(anb.web)}
      </div>
      <h1>${sicher(titel)}</h1>
    </div>
    <div class="beleg-adressfeld">${adressblock(empfaenger)}</div>`;
}

/* ------------------------------- Offerte ---------------------------- */
function offertePapier(o) {
  const anb = anbieterVon(o);
  const k = o.kontakt || {};
  return `
  <article class="beleg">
    <div class="beleg-innen">
      ${belegKopf(anb, o.schule, 'Offerte')}
      <dl class="beleg-meta">
        <dt>Offertennummer</dt><dd>${sicher(o.nummer)}</dd>
        <dt>Datum</dt><dd>${sicher(datum(o.erstellt))}</dd>
        <dt>Gültig bis</dt><dd>${sicher(datum(o.gueltigBis))}</dd>
        <dt>Ansprechperson</dt>
        <dd>${sicher([k.vorname, k.nachname].filter(Boolean).join(' '))}${
             k.funktion ? ', ' + sicher(k.funktion) : ''}</dd>
      </dl>
      ${o.muster ? '<div class="hinweis wichtig" style="margin-bottom:18px">'
        + icon('warn', 18) + '<div><b>Muster.</b> Diese Offerte stammt aus der '
        + 'Vorschau ohne Server und ist nicht gültig.</div></div>' : ''}
      ${positionen(o)}
      ${o.bemerkung ? `<p class="bedingungen"><b>Ihre Bemerkung:</b>
         ${sicher(o.bemerkung)}</p>` : ''}
      <div class="bedingungen">
        <p><b>Leistungsumfang.</b> Je Lizenz ein Zugang zu allen Fächern der
        gewählten Aufnahmeprüfung, einschliesslich Standortbestimmung,
        Selbsttest, Fehlerarchiv und Aufsatzkorrektur. Die Lizenz gilt vom
        ${sicher(datum(o.start))} bis zum ${sicher(datum(o.ende))} und
        verlängert sich nicht selbsttätig.</p>
        <p><b>Zahlung.</b> Auf Rechnung, 30 Tage netto, keine Vorauszahlung.
        Die Zugänge sind ab Bestellung gültig, unabhängig vom Zahlungseingang.</p>
        <p><b>Aufstocken.</b> Zusätzliche Lizenzen sind jederzeit möglich.
        Verrechnet wird die Differenz; erreicht die Gesamtzahl eine günstigere
        Stufe, gilt diese für alle Lizenzen des Schuljahrs.</p>
        <p><b>Datenschutz.</b> Die Schule erhält ausschliesslich
        zusammengefasste Kennzahlen. Einzelne Lernstände, Antworten und
        Aufsatztexte sind für die Schule nicht einsehbar.</p>
        <p class="grau" style="margin-top:14px">
        ${sicher(anb.name)} · ${sicher(anb.uid)}</p>
      </div>
    </div>
  </article>`;
}

/* ------------------------------ Rechnung ---------------------------- */
function rechnungPapier(r, schluessel) {
  const anb = anbieterVon(r);
  const empf = r.rechnungsadresse || r.schule;
  return `
  <article class="beleg">
    <div class="beleg-innen">
      ${belegKopf(anb, empf, 'Rechnung')}
      <dl class="beleg-meta">
        <dt>Rechnungsnummer</dt><dd>${sicher(r.nummer)}</dd>
        <dt>Rechnungsdatum</dt><dd>${sicher(datum(r.datum))}</dd>
        <dt>Zahlbar bis</dt><dd>${sicher(datum(r.faellig))}</dd>
        <dt>Unsere Auftragsnummer</dt><dd>${sicher(r.bestellnummer)}</dd>
        ${r.bestellnummerKunde ? `<dt>Ihre Bestellnummer</dt>
          <dd>${sicher(r.bestellnummerKunde)}</dd>` : ''}
      </dl>
      ${r.muster ? '<div class="hinweis wichtig" style="margin-bottom:18px">'
        + icon('warn', 18) + '<div><b>Musterrechnung.</b> Aus der Vorschau ohne '
        + 'Server. Nicht bezahlen — dieser Betrag steht niemandem zu.</div></div>' : ''}
      ${positionen(r)}
      <div class="bedingungen">
        <p><b>Zahlbar bis ${sicher(datum(r.faellig))}</b> ohne Abzug, mit dem
        Zahlteil unten oder auf ${sicher(anb.iban)} unter Angabe der Referenz
        ${sicher(referenzGruppiert(r.referenz))}.</p>
        <p>Die Zugänge sind bereits gültig. Bei Fragen zur Rechnung:
        ${sicher(anb.email)}.</p>
        <p class="grau" style="margin-top:14px">
        ${sicher(anb.name)} · ${sicher(anb.uid)}</p>
      </div>
    </div>
    ${zahlteil(r, anb, empf, schluessel)}
  </article>`;
}

/* ------------------------------- Zahlteil ---------------------------
   Nach den «Schweizer Implementation Guidelines QR-Rechnung»:
   Empfangsschein 62 mm, Zahlteil 148 mm, zusammen 210 × 105 mm am
   Blattfuss. Die Beschriftungen sind vorgeschrieben und werden nicht
   übersetzt oder gekürzt — eine Bank prüft sie.

   Den QR-Code selbst erzeugt der Server. Ein Code, der nicht stimmt,
   sieht aus wie einer, der stimmt: Die Schule merkt den Unterschied
   erst bei der Mahnung. Darum wird er nicht im Browser gerechnet. */
function zahlteil(r, anb, empf, schluessel) {
  const betrag = franken(r.rechnung.total, false).replace('.–', '.00');
  const konto = [anb.iban, '', anb.name, anb.strasse, anb.plzOrt]
                  .filter(Boolean).join('\n');
  const zahlbar = [empf && empf.name, empf && empf.zusatz, empf && empf.strasse,
                   [empf && empf.plz, empf && empf.ort].filter(Boolean).join(' ')]
                  .filter(Boolean).join('\n');
  const qr = (!r.muster && schluessel)
    ? `<img src="${sicher(Schule.qrBild(r.nummer, schluessel))}" alt="QR-Code für die Zahlung" loading="lazy">`
    : `<div class="zt-muster">Kein gültiger Zahlteil.<br>Muster aus der Vorschau.</div>`;

  return `
  <div class="zahlteilrahmen">
  <div class="zahlteil">
    <div class="zt-empfang">
      <div class="zt-titel">Empfangsschein</div>
      <div class="zt-ueber">Konto / Zahlbar an</div>
      <div class="zt-wert">${sicher(konto)}</div>
      <div class="zt-ueber">Referenz</div>
      <div class="zt-wert">${sicher(referenzGruppiert(r.referenz))}</div>
      <div class="zt-ueber">Zahlbar durch</div>
      <div class="zt-wert">${sicher(zahlbar)}</div>
      <div class="zt-betrag" style="margin-top:auto">
        <div><div class="zt-ueber">Währung</div><div class="zt-wert">CHF</div></div>
        <div><div class="zt-ueber">Betrag</div><div class="zt-wert">${sicher(betrag)}</div></div>
      </div>
      <div class="zt-annahme">Annahmestelle</div>
    </div>
    <div class="zt-zahl">
      <div class="zt-links">
        <div class="zt-titel">Zahlteil</div>
        <div class="zt-qr">
          ${qr}
          <div class="zt-kreuz"><i></i><i></i></div>
        </div>
        <div class="zt-betrag">
          <div><div class="zt-ueber">Währung</div><div class="zt-wert">CHF</div></div>
          <div><div class="zt-ueber">Betrag</div><div class="zt-wert">${sicher(betrag)}</div></div>
        </div>
      </div>
      <div class="zt-rechts">
        <div class="zt-ueber" style="margin-top:0">Konto / Zahlbar an</div>
        <div class="zt-wert">${sicher(konto)}</div>
        <div class="zt-ueber">Referenz</div>
        <div class="zt-wert">${sicher(referenzGruppiert(r.referenz))}</div>
        <div class="zt-ueber">Zusätzliche Informationen</div>
        <div class="zt-wert">Rechnung ${sicher(r.nummer)}${
          r.bestellnummerKunde ? ', Bestellung ' + sicher(r.bestellnummerKunde) : ''}</div>
        <div class="zt-ueber">Zahlbar durch</div>
        <div class="zt-wert">${sicher(zahlbar)}</div>
      </div>
    </div>
  </div>
  </div>`;
}
