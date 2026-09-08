/* StudySwiss — die Eingabeflächen
   ==================================================================
   Vierzehn Aufgabenarten, vierzehn Flächen. Das Gegenstück zu
   `widgets/antwortflaeche.dart` in Flutter und zu `antwortflaeche()` in
   der App-Vorschau: dieselbe Engine, eine eigene Ansicht.

   Zwei Regeln aus §4.5 gelten hier wörtlich:

   **Alles wird angetippt, nichts gezogen.** Auf einem Telefon ist Ziehen
   mit dem Daumen unzuverlässig — man verfehlt das Ziel, das Blatt
   scrollt stattdessen weg, und ein Kind, das die Aufgabe lösen kann,
   scheitert an der Bedienung. Zuordnen und Sortieren laufen darum über
   zwei Tipps.

   **Ein zweites Antippen nimmt die Wahl zurück.** Ohne das gäbe es
   keinen Weg, einen Fehlgriff zu berichtigen.

   Der Zustand liegt in einem einfachen Objekt, das der Aufrufer hält.
   `Antwort.antwort(a, z)` macht daraus genau die Form, die
   `bewerteAlles` erwartet — die Zuordnung steht an einer Stelle und
   nicht in jedem Screen neu.                                          */

const Antwort = {

  /** Ein frischer Zustand für eine Aufgabe. */
  leer() {
    return { eingabe: '', wahl: null, mehrfach: [], stellen: [], zeilen: {},
             felder: {}, punkte: {}, zuordnung: {}, reihenfolge: [],
             paare: [], rasterFelder: [], gewaehltesElement: null };
  },

  /**
   * Ist die Antwort abgebbar?
   *
   * §4.5: **In der Übung darf man unvollständig prüfen.** Wer drei von
   * vier Feldern gefüllt hat, soll nicht raten müssen, was ins vierte
   * gehört — die Rückmeldung sagt es ihm, und genau dafür ist die Übung
   * da. Im Selbsttest zählt die Aufgabe als Ganzes, wie in der Prüfung.
   */
  abgebbar(a, z, streng = false) {
    switch (a.format) {
      case 'einfachauswahl':  return z.wahl != null;
      case 'mehrfachauswahl': return z.mehrfach.length > 0;
      case 'markieren':
      case 'kommas':          return z.stellen.length > 0;
      case 'tabelle_auswahl': return streng ? Object.keys(z.zeilen).length === a.zeilen.length
                                            : Object.keys(z.zeilen).length > 0;
      case 'zuordnen':        return streng ? Object.keys(z.zuordnung).length === a.ziele.length
                                            : Object.keys(z.zuordnung).length > 0;
      case 'sortieren':       return z.reihenfolge.length === a.zuOrdnen.length;
      case 'mehrfeld':        return streng ? a.felder.every(f => (z.felder[f.name] || '').trim())
                                            : a.felder.some(f => (z.felder[f.name] || '').trim());
      case 'gitter':          return streng ? a.gitter.punkte.every(p => z.punkte[p.name])
                                            : Object.keys(z.punkte).length > 0;
      case 'wertetabelle':    return z.paare.some(p => p && p.length === 2);
      case 'faerben':         return z.rasterFelder.length > 0;
      default:                return String(z.eingabe || '').trim() !== '';
    }
  },

  /**
   * Die Antwort in der Form, die der Server erwartet.
   *
   * **Flach und mit seinen Namen** — `model/Dto.kt::Antwort`. Sie war
   * einmal die Form der Engine und wurde zusätzlich unter `antwort`
   * verschachtelt; der Server hätte davon kein Feld gelesen und jede
   * Antwort als leer bewertet. Beim Färben heisst das Feld `gefaerbt`,
   * nicht `felder`: `felder` gehört der Mehrfeld-Aufgabe, und zwei
   * Bedeutungen unter einem Namen sind ein Fehler, der sich versteckt.
   */
  antwort(a, z) {
    switch (a.format) {
      case 'einfachauswahl':  return { optionId: z.wahl };
      case 'mehrfachauswahl': return { optionIds: z.mehrfach };
      case 'markieren':
      case 'kommas':          return { stellen: z.stellen };
      case 'tabelle_auswahl': return { zeilen: z.zeilen };
      case 'mehrfeld':        return { felder: z.felder };
      case 'gitter':          return { punkte: z.punkte };
      case 'zuordnen':        return { zuordnung: z.zuordnung };
      case 'sortieren':       return { reihenfolge: z.reihenfolge };
      case 'wertetabelle':    return { paare: z.paare.filter(p => p && p.length === 2) };
      case 'faerben':         return { gefaerbt: z.rasterFelder };
      default:                return { eingabe: String(z.eingabe || '').trim() };
    }
  },

  /**
   * Die Fläche zeichnen.
   *
   * `beiAenderung` wird nach jedem Tipp gerufen — der Aufrufer schaltet
   * damit den Prüfen-Knopf frei. Neu gezeichnet wird immer die ganze
   * Fläche: Sie ist klein, und eine gezielte Änderung an einzelnen
   * Knöpfen wäre die Sorte Zustandsführung, die irgendwann auseinander
   * läuft.
   */
  zeichne(wo, a, z, beiAenderung) {
    const neu = () => { this.zeichne(wo, a, z, beiAenderung); beiAenderung(); };
    wo.innerHTML = '';
    const bauer = this['_' + a.format] || this._eingabe;
    bauer.call(this, wo, a, z, neu);
  },

  /* ---------------------------------------------------------------- */
  /* Zahl und Freitext                                                 */
  /* ---------------------------------------------------------------- */
  _eingabe(wo, a, z, neu) {
    const einheit = a.einheit ? `<span class="einheit">${sicher(a.einheit)}</span>` : '';
    wo.innerHTML = `
      <label class="feld antwortfeld">
        <span>${a.format === 'loesungsmenge' ? 'Die Menge, mit Komma getrennt'
              : a.format === 'luecke' ? 'Deine Antwort' : 'Ergebnis'}</span>
        <div class="reihe" style="gap:10px">
          <input id="antwortEingabe" autocomplete="off" spellcheck="false"
                 inputmode="${a.format === 'zahl_eingeben' ? 'decimal' : 'text'}"
                 value="${sicher(z.eingabe || '')}">
          ${einheit}
        </div>
      </label>`;
    const feld = $('#antwortEingabe', wo);
    feld.addEventListener('input', () => { z.eingabe = feld.value; beiAenderungLeise(neu); });
    feld.focus();
  },

  _zahl_eingeben(wo, a, z, neu) { this._eingabe(wo, a, z, neu); },
  _luecke(wo, a, z, neu)        { this._eingabe(wo, a, z, neu); },
  _loesungsmenge(wo, a, z, neu) { this._eingabe(wo, a, z, neu); },

  /* ---------------------------------------------------------------- */
  /* Auswahl                                                           */
  /* ---------------------------------------------------------------- */
  _einfachauswahl(wo, a, z, neu) {
    wo.innerHTML = `<div class="wahlliste">${a.optionen.map(o => `
      <button class="wahl${z.wahl === o.id ? ' an' : ''}" data-id="${sicher(o.id)}">
        ${anzeigeText(o.text)}</button>`).join('')}</div>`;
    $$('.wahl', wo).forEach(b => b.onclick = () => {
      z.wahl = (z.wahl === b.dataset.id) ? null : b.dataset.id;   // zweites Antippen nimmt zurück
      neu();
    });
  },

  _mehrfachauswahl(wo, a, z, neu) {
    wo.innerHTML = `<div class="wahlliste">${a.optionen.map(o => {
      const an = z.mehrfach.includes(o.id);
      return `<button class="wahl${an ? ' an' : ''}" data-id="${sicher(o.id)}">
        <span class="kaestchen">${an ? icon('haken', 14) : ''}</span>
        <span>${anzeigeText(o.text)}</span></button>`;
    }).join('')}</div>
    <p class="sm" style="margin-top:10px">${z.mehrfach.length} ausgewählt</p>`;
    $$('.wahl', wo).forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      z.mehrfach = z.mehrfach.includes(id) ? z.mehrfach.filter(x => x !== id)
                                           : z.mehrfach.concat(id);
      neu();
    });
  },

  /* ---------------------------------------------------------------- */
  /* Wörter antippen: Markieren und Kommas                             */
  /* ---------------------------------------------------------------- */
  _markieren(wo, a, z, neu) {
    /* Satzzeichen bleiben ausserhalb der Schaltfläche — sonst tippt man
       auf «Brief.» statt auf «Brief». */
    const teile = w => { const m = w.match(/^(.*?)([.,;:!?»)]*)$/); return [m[1], m[2]]; };
    wo.innerHTML = `
      <p class="sm" style="margin-bottom:10px;font-weight:700;color:${
        z.stellen.length === (a.anzahlGesucht || 0) ? 'var(--green)' : 'var(--ink3)'}">
        ${z.stellen.length} von ${zahl(a.anzahlGesucht || 0)} markiert</p>
      <div class="satz">${a.woerter.map((w, i) => {
        const [wort, zeichen] = teile(w);
        return `<button class="wort${z.stellen.includes(i) ? ' an' : ''}" data-i="${i}"
                  >${sicher(wort)}</button>${zeichen
                  ? `<span class="satzzeichen">${sicher(zeichen)}</span>` : ''}`;
      }).join('')}</div>`;
    $$('.wort', wo).forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      z.stellen = z.stellen.includes(i) ? z.stellen.filter(x => x !== i)
                                        : z.stellen.concat(i).sort((x, y) => x - y);
      neu();
    });
  },

  _kommas(wo, a, z, neu) {
    wo.innerHTML = `
      <p class="sm" style="margin-bottom:10px">${z.stellen.length
        ? z.stellen.length + ' Komma' + (z.stellen.length === 1 ? '' : 's') + ' gesetzt'
        : 'Tippe in die Lücke, wo ein Komma hingehört'}</p>
      <div class="satz kommasatz">${a.woerter.map((w, i) => `
        <span class="wortfest">${sicher(w)}</span>${i < a.woerter.length - 1
          ? `<button class="luecke${z.stellen.includes(i) ? ' an' : ''}" data-i="${i}"
               aria-label="Komma nach ${sicher(w)}">${z.stellen.includes(i) ? ',' : ''}</button>`
          : ''}`).join('')}</div>`;
    $$('.luecke', wo).forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      z.stellen = z.stellen.includes(i) ? z.stellen.filter(x => x !== i)
                                        : z.stellen.concat(i).sort((x, y) => x - y);
      neu();
    });
  },

  /* ---------------------------------------------------------------- */
  /* Tabelle mit Auswahlspalte                                         */
  /* ---------------------------------------------------------------- */
  _tabelle_auswahl(wo, a, z, neu) {
    /* Der Server schickt die Zeilen als Optionen `{id, text}`; der
       Schlüssel der Antwort ist die ZEILENNUMMER. */
    wo.innerHTML = `<div class="zeilenwahl">${a.zeilen.map((r, i) => `
      <div class="zeile">
        <div class="zeilentext">${anzeigeText(r.text)}</div>
        <div class="zeilenoptionen">${a.optionen.map(o => `
          <button class="chip${z.zeilen[i] === o.text ? ' an' : ''}"
            data-zeile="${i}" data-wert="${sicher(o.text)}">${sicher(o.text)}</button>`
        ).join('')}</div>
      </div>`).join('')}</div>
      <p class="sm" style="margin-top:10px">${Object.keys(z.zeilen).length} von
        ${a.zeilen.length} Zeilen beantwortet</p>`;
    $$('[data-zeile]', wo).forEach(b => b.onclick = () => {
      const i = +b.dataset.zeile;
      if (z.zeilen[i] === b.dataset.wert) delete z.zeilen[i];
      else z.zeilen[i] = b.dataset.wert;
      neu();
    });
  },

  /* ---------------------------------------------------------------- */
  /* Mehrere Felder                                                    */
  /* ---------------------------------------------------------------- */
  _mehrfeld(wo, a, z, neu) {
    wo.innerHTML = `<div class="feldreihe">${a.felder.map(f => `
      <label class="feld">
        <span>${sicher(f.label || f.name)}</span>
        <div class="reihe" style="gap:8px">
          <input data-feld="${sicher(f.name)}" autocomplete="off"
                 inputmode="${f.text ? 'text' : 'decimal'}"
                 value="${sicher(z.felder[f.name] || '')}">
          ${f.einheit ? `<span class="einheit">${sicher(f.einheit)}</span>` : ''}
        </div>
      </label>`).join('')}</div>`;
    $$('[data-feld]', wo).forEach(i => i.addEventListener('input', () => {
      z.felder[i.dataset.feld] = i.value;
      beiAenderungLeise(neu);
    }));
  },

  /* ---------------------------------------------------------------- */
  /* Koordinatengitter                                                 */
  /* ---------------------------------------------------------------- */
  _gitter(wo, a, z, neu) {
    const g = a.gitter;
    const naechster = a.gitter.punkte.find(p => !z.punkte[p.name]);
    wo.innerHTML = `
      <p class="sm" style="margin-bottom:10px">${naechster
        ? `Tippe ins Gitter, um <b class="stark">${sicher(naechster.label || naechster.name)}</b> zu setzen`
        : 'Alle Punkte gesetzt. Ein zweites Antippen nimmt einen zurück.'}</p>
      <div class="gitterrahmen">${gitterSvg(g, z.punkte)}</div>
      <div class="reihe" style="gap:8px;flex-wrap:wrap;margin-top:12px">
        ${g.punkte.map(p => `<span class="chip${z.punkte[p.name] ? ' an' : ''}">
          ${sicher(p.label || p.name)}${z.punkte[p.name]
            ? ` (${z.punkte[p.name][0]}|${z.punkte[p.name][1]})` : ' —'}</span>`).join('')}
      </div>`;
    const svg = $('svg', wo);
    svg.addEventListener('click', e => {
      const stelle = gitterStelle(svg, g, e);
      if (!stelle) return;
      /* Ein zweites Antippen auf denselben Punkt nimmt ihn zurück. Ohne
         das könnte man einen Fehlgriff nur durch Neuladen beheben. */
      const schon = Object.keys(z.punkte).find(n =>
        z.punkte[n][0] === stelle[0] && z.punkte[n][1] === stelle[1]);
      if (schon) { delete z.punkte[schon]; neu(); return; }
      const offen = g.punkte.find(p => !z.punkte[p.name]);
      if (!offen) return;
      z.punkte[offen.name] = stelle;
      neu();
    });
  },

  /* ---------------------------------------------------------------- */
  /* Zuordnen — zwei Tipps, kein Ziehen                                */
  /* ---------------------------------------------------------------- */
  _zuordnen(wo, a, z, neu) {
    const belegt = Object.values(z.zuordnung);
    wo.innerHTML = `
      <p class="sm" style="margin-bottom:10px">${z.gewaehltesElement != null
        ? 'Jetzt das Ziel antippen'
        : 'Erst ein Element antippen, dann sein Ziel'}</p>
      <div class="zuordnung">
        <div>
          <p class="eyebrow">Elemente</p>
          <div class="stapel eng">${a.elemente.map((el, pos) => {
            const vergeben = belegt.includes(pos);
            return `<button class="wahl klein${z.gewaehltesElement === pos ? ' an' : ''}${
              vergeben ? ' vergeben' : ''}" data-el="${pos}">${sicher(el.text)}</button>`;
          }).join('')}</div>
        </div>
        <div>
          <p class="eyebrow">Ziele</p>
          <div class="stapel eng">${a.ziele.map((ziel, i) => {
            const drin = z.zuordnung[i];
            return `<button class="wahl klein ziel${drin != null ? ' an' : ''}" data-ziel="${i}">
              <span class="zielname">${sicher(ziel.text)}</span>
              <span class="zielwert">${drin != null ? sicher(a.elemente[drin].text) : '—'}</span>
            </button>`;
          }).join('')}</div>
        </div>
      </div>`;
    $$('[data-el]', wo).forEach(b => b.onclick = () => {
      const i = +b.dataset.el;
      z.gewaehltesElement = (z.gewaehltesElement === i) ? null : i;
      neu();
    });
    $$('[data-ziel]', wo).forEach(b => b.onclick = () => {
      const ziel = +b.dataset.ziel;
      if (z.zuordnung[ziel] != null) { delete z.zuordnung[ziel]; z.gewaehltesElement = null; neu(); return; }
      if (z.gewaehltesElement == null) return;
      Object.keys(z.zuordnung).forEach(k => {
        if (z.zuordnung[k] === z.gewaehltesElement) delete z.zuordnung[k];
      });
      z.zuordnung[ziel] = z.gewaehltesElement;
      z.gewaehltesElement = null;
      neu();
    });
  },

  /* ---------------------------------------------------------------- */
  /* Sortieren — ebenfalls über zwei Tipps                             */
  /* ---------------------------------------------------------------- */
  _sortieren(wo, a, z, neu) {
    /* `zuOrdnen` kommt schon gemischt. Gemeldet werden ANZEIGEPOSITIONEN;
       zurück auf die Sollreihenfolge rechnet der Server. Der Client kennt
       die Mischung nicht — sonst kennte er die halbe Lösung. */
    const offen = a.zuOrdnen.map((_, i) => i).filter(i => !z.reihenfolge.includes(i));
    wo.innerHTML = `
      <p class="sm" style="margin-bottom:10px">Tippe die Elemente
        in der gefragten Reihenfolge an. Ein zweites Antippen nimmt zurück.</p>
      <div class="stapel eng">${z.reihenfolge.map((i, platz) => `
        <button class="wahl klein an" data-weg="${i}">
          <span class="platz">${platz + 1}</span>${sicher(a.zuOrdnen[i].text)}</button>`).join('')}
      </div>
      ${offen.length ? `<p class="eyebrow" style="margin:18px 0 8px">Noch offen</p>
        <div class="stapel eng">${offen.map(i => `
          <button class="wahl klein" data-hin="${i}">${sicher(a.zuOrdnen[i].text)}</button>`
        ).join('')}</div>` : ''}`;
    $$('[data-hin]', wo).forEach(b => b.onclick = () => {
      z.reihenfolge = z.reihenfolge.concat(+b.dataset.hin); neu();
    });
    $$('[data-weg]', wo).forEach(b => b.onclick = () => {
      z.reihenfolge = z.reihenfolge.filter(x => x !== +b.dataset.weg); neu();
    });
  },

  /* ---------------------------------------------------------------- */
  /* Wertetabelle                                                      */
  /* ---------------------------------------------------------------- */
  _wertetabelle(wo, a, z, neu) {
    const w = a.tabelle;
    /* Wie viele Zeilen die Tabelle hat, sagt `zeilen` — nicht `paare`.
       Die Lösungspaare reisen nie zum Client (§4.10). Der Server
       schickt `tabelle: {spalten, zeilen}`; hier stand einmal
       `wertetabelle.paare.length` — ein Feld, das es am Client gar nicht
       gibt. Die Fläche warf, sobald eine Wertetabelle gezogen wurde, und
       der ganze Aufgabenschirm blieb mit «Es hat nicht geklappt» stehen. */
    const soll = w.zeilen || 0;
    const zeilen = Math.max(soll, z.paare.length + 1);
    while (z.paare.length < zeilen) z.paare.push([]);
    wo.innerHTML = `
      <div class="wtabelle">
        <div class="wt-kopf"><div class="wt-nr"></div>
          <div>${sicher(w.spalten[0].kopf)}</div><div>${sicher(w.spalten[1].kopf)}</div></div>
        ${z.paare.map((p, i) => `
          <div class="wt-zeile"><div class="wt-nr">${i + 1}</div>
            <input class="wt-feld" data-zeile="${i}" data-spalte="0" inputmode="decimal"
                   value="${p[0] != null ? sicher(p[0]) : ''}" placeholder="—">
            <input class="wt-feld" data-zeile="${i}" data-spalte="1" inputmode="decimal"
                   value="${p[1] != null ? sicher(p[1]) : ''}" placeholder="—">
          </div>`).join('')}
      </div>`;
    $$('.wt-feld', wo).forEach(f => f.addEventListener('input', () => {
      const i = +f.dataset.zeile, s = +f.dataset.spalte;
      const wert = alsZahl(f.value);
      const paar = z.paare[i] || (z.paare[i] = []);
      if (wert === null) paar[s] = undefined; else paar[s] = wert;
      z.paare[i] = (paar[0] != null && paar[1] != null) ? [paar[0], paar[1]] : paar;
      beiAenderungLeise(neu);
    }));
  },

  /* ---------------------------------------------------------------- */
  /* Rasterfelder einfärben                                            */
  /* ---------------------------------------------------------------- */
  _faerben(wo, a, z, neu) {
    const r = a.raster;
    wo.innerHTML = `
      <p class="sm" style="margin-bottom:10px">${z.rasterFelder.length} Felder gefärbt</p>
      <div class="faerbraster" style="grid-template-columns:repeat(${r.spalten}, 1fr)">
        ${Array.from({ length: r.spalten * r.zeilen }, (_, i) => `
          <button class="rasterfeld${z.rasterFelder.includes(i) ? ' an' : ''}" data-f="${i}"
            aria-label="Feld ${i + 1}"></button>`).join('')}
      </div>`;
    $$('.rasterfeld', wo).forEach(b => b.onclick = () => {
      const i = +b.dataset.f;
      z.rasterFelder = z.rasterFelder.includes(i) ? z.rasterFelder.filter(x => x !== i)
                                                  : z.rasterFelder.concat(i);
      neu();
    });
  },
};

/** Tippt jemand in ein Textfeld, darf die Fläche nicht neu gezeichnet
 *  werden — der Schreibpunkt spränge an den Anfang. Gemeldet wird
 *  trotzdem, damit der Prüfen-Knopf aufwacht. */
let _leiseNeu = null;
function beiAenderungLeise(neu) { _leiseNeu = neu; if (window._antwortMeldung) window._antwortMeldung(); }

/* --- Das Gitter ------------------------------------------------------
   Als SVG mit `viewBox`: Es wächst mit dem Platz, ohne dass irgendwo
   eine Pixelbreite steht, und bleibt auf dem Telefon so lesbar wie am
   Laptop. */
function gitterSvg(g, gesetzt) {
    const bx = g.xbis - g.xvon, by = g.ybis - g.yvon;
    const linien = [];
    for (let x = g.xvon; x <= g.xbis; x++)
      linien.push(`<line x1="${x}" y1="${g.yvon}" x2="${x}" y2="${g.ybis}"
        stroke="${x === 0 ? 'var(--ink3)' : 'var(--line)'}" stroke-width="${x === 0 ? .08 : .04}"/>`);
    for (let y = g.yvon; y <= g.ybis; y++)
      linien.push(`<line x1="${g.xvon}" y1="${y}" x2="${g.xbis}" y2="${y}"
        stroke="${y === 0 ? 'var(--ink3)' : 'var(--line)'}" stroke-width="${y === 0 ? .08 : .04}"/>`);

    const vorgabe = (g.vorgabe || []).map(v => `
      <circle cx="${v.x}" cy="${-v.y}" r=".22" fill="var(--tan6)"/>
      <text x="${v.x + .35}" y="${-v.y - .3}" font-size=".85" fill="var(--tan6)"
        font-family="Bitter,Georgia,serif">${sicher(v.text || '')}</text>`).join('');
    const strecken = (g.strecken || []).map(s => `
      <line x1="${s.vonX}" y1="${-s.vonY}" x2="${s.bisX}" y2="${-s.bisY}"
        stroke="var(--tan)" stroke-width=".08"/>`).join('');
    const punkte = Object.entries(gesetzt).map(([name, p]) => `
      <circle cx="${p[0]}" cy="${-p[1]}" r=".3" fill="var(--ink)"/>
      <text x="${p[0] + .4}" y="${-p[1] - .35}" font-size=".9" fill="var(--ink)"
        font-family="Bitter,Georgia,serif">${sicher(name)}</text>`).join('');

    return `<svg viewBox="${g.xvon - .6} ${-g.ybis - .6} ${bx + 1.2} ${by + 1.2}"
      class="gitter" role="img" aria-label="Koordinatengitter zum Antippen">
      ${linien.join('')}${strecken}${vorgabe}${punkte}</svg>`;
}

/** Vom Klick zur Gitterstelle. Gerundet auf ganze Kästchen — auf einem
 *  Telefon trifft niemand einen Punkt auf zwei Nachkommastellen. */
function gitterStelle(svg, g, e) {
  const r = svg.getBoundingClientRect();
  const bx = g.xbis - g.xvon + 1.2, by = g.ybis - g.yvon + 1.2;
  const x = Math.round((e.clientX - r.left) / r.width * bx + g.xvon - .6);
  const y = Math.round(-((e.clientY - r.top) / r.height * by - g.ybis - .6));
  if (x < g.xvon || x > g.xbis || y < g.yvon || y > g.ybis) return null;
  return [x, y];
}

/** Hervorhebungen und gesetzte Brüche, wie in der App. */
function anzeigeText(t) {
  return sicher(t).replace(/_([^_]+)_/g, '<em>$1</em>');
}
