/* ======================================================================
   Ein winziges DOM für JavaScriptCore.
   ======================================================================

   Warum das hier steht: Die Website ist der zweite Client desselben
   Backends, und ihr Lernbereich ist der Teil, auf den es am meisten
   ankommt — Übung, Selbsttest, Standortbestimmung, Aufsatz. Bis jetzt
   prüfte `website.py` den ausgelieferten Text: tote Verknüpfungen,
   Platzhalter, Preise im Quelltext. Was sie nicht konnte, ist den Code
   AUSFÜHREN. Ein Knopf, der an nichts hängt, sieht im Text aus wie
   einer, der funktioniert — genau so stand «Abbrechen» monatelang da.

   Die App-Vorschau hat es leichter: Ihre Screens sind Funktionen, die
   HTML zurückgeben, und `pruefe.js` ruft sie einfach auf. Die Website
   dagegen setzt `innerHTML` und hängt `onclick` an — sie braucht ein
   DOM. Dieses hier ist bewusst klein: Es kann genau das, was der
   Lernbereich benutzt, und nichts darüber hinaus. Ein vollständiges DOM
   wäre eine Abhängigkeit, die man pflegen muss, für eine Prüfung.

   Was es kann: Elemente aus einer HTML-Zeichenkette bauen,
   `querySelector` mit `#id`, `.klasse`, `tag` und `[attribut]` samt
   Nachfahren-Kombinator, `onclick`, `textContent`, `classList`,
   `dataset`, `hidden`, `disabled`, `value` und `closest`.

   Was es NICHT kann und auch nicht können soll: Layout, Ereignisse mit
   Blasenphase, CSS. Wer davon etwas braucht, prüft das Falsche.        */

/* --- Der Zerteiler ---------------------------------------------------
   Klein, aber nicht naiv: Er kennt leere Elemente, Kommentare und
   Anführungszeichen in Attributen. Skript- und Stilinhalte kommen im
   Lernbereich nicht vor und werden wie Text behandelt.               */

var LEER = ['br', 'hr', 'img', 'input', 'meta', 'link', 'path', 'circle',
            'rect', 'line', 'polyline', 'polygon', 'use', 'source'];

function Knoten(tag) {
  this.tagName = String(tag || '').toUpperCase();
  this.attrs = {};
  this.kinder = [];
  this.eltern = null;
  this.text = '';            // nur für Textknoten
  this.istText = false;
  this.onclick = null;
  this.oninput = null;
  this.onchange = null;
  this.value = '';
  this.hidden = false;
  this.disabled = false;
  this.style = {};
}

Object.defineProperty(Knoten.prototype, 'dataset', {
  get: function () {
    var d = {}, self = this;
    Object.keys(this.attrs).forEach(function (k) {
      if (k.indexOf('data-') === 0) {
        var name = k.slice(5).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
        d[name] = self.attrs[k];
      }
    });
    return d;
  },
});

Object.defineProperty(Knoten.prototype, 'classList', {
  get: function () {
    var self = this;
    return {
      contains: function (k) { return self.klassen().indexOf(k) >= 0; },
      add: function (k) { if (!this.contains(k)) self.attrs['class'] = self.klassen().concat([k]).join(' '); },
      remove: function (k) {
        self.attrs['class'] = self.klassen().filter(function (x) { return x !== k; }).join(' ');
      },
      toggle: function (k, an) {
        var da = this.contains(k);
        var soll = (an === undefined) ? !da : !!an;
        if (soll && !da) this.add(k); else if (!soll && da) this.remove(k);
      },
    };
  },
});

Knoten.prototype.klassen = function () {
  return String(this.attrs['class'] || '').split(/\s+/).filter(Boolean);
};

Knoten.prototype.getAttribute = function (n) {
  return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null;
};
Knoten.prototype.setAttribute = function (n, w) { this.attrs[n] = String(w); };
Knoten.prototype.focus = function () { };
Knoten.prototype.scrollIntoView = function () { };
Knoten.prototype.removeAttribute = function (n) { delete this.attrs[n]; };
Knoten.prototype.addEventListener = function (art, fn) {
  if (art === 'click') this.onclick = fn;
  if (art === 'input') this.oninput = fn;
};
Knoten.prototype.appendChild = function (k) { k.eltern = this; this.kinder.push(k); return k; };
Knoten.prototype.insertBefore = function (k, vor) {
  var i = this.kinder.indexOf(vor);
  k.eltern = this;
  if (i < 0) this.kinder.push(k); else this.kinder.splice(i, 0, k);
  return k;
};
Object.defineProperty(Knoten.prototype, 'firstChild', {
  get: function () { return this.kinder[0] || null; },
});
Object.defineProperty(Knoten.prototype, 'outerHTML', {
  get: function () { return this.innerHTML; },
  /* Ein Ersetzen von aussen: Der Knoten wird durch das neue Markup
     ersetzt. Der Lernbereich braucht das fuer die Kopfzeile, wenn aus
     dem Anmelde-Knopf der Name wird. */
  set: function (html) {
    var e = this.eltern;
    if (!e) return;
    var i = e.kinder.indexOf(this);
    var neu = zerteile(html);
    neu.forEach(function (k) { k.eltern = e; });
    e.kinder.splice.apply(e.kinder, [i, 1].concat(neu));
  },
});
Knoten.prototype.insertAdjacentHTML = function (wo, html) {
  var neu = zerteile(html);
  var self = this;
  neu.forEach(function (k) { k.eltern = self; self.kinder.push(k); });
};

/** Zurückschreiben, was im Knoten steht.
 *
 *  Immer aus den Kindern, nie aus einer gemerkten Zeichenkette: Knoten
 *  aus dem Seitengerippe haben nie eine bekommen, und eine gemerkte
 *  veraltet, sobald `classList` oder `textContent` etwas ändert. */
function schreibeZurueck(el) {
  if (el.istText) return el.text;
  var innen = el.kinder.map(schreibeZurueck).join('');
  if (el.tagName === '#WURZEL' || el.tagName === '#DOKUMENT') return innen;
  var name = el.tagName.toLowerCase();
  var attr = Object.keys(el.attrs).map(function (k) {
    return ' ' + k + '="' + String(el.attrs[k]).replace(/"/g, '&quot;') + '"';
  }).join('');
  if (LEER.indexOf(name) >= 0) return '<' + name + attr + '>';
  return '<' + name + attr + '>' + innen + '</' + name + '>';
}

/* Immer aus den Kindern lesen, nie aus einer gemerkten Zeichenkette.
   Eine gemerkte veraltet, sobald `classList.toggle` oder `textContent`
   etwas ändert — und der Prüfer läse dann einen Schirm, den es so nicht
   mehr gibt. Genau die Sorte Fehler, die er finden soll. */
Object.defineProperty(Knoten.prototype, 'innerHTML', {
  get: function () { return this.kinder.map(schreibeZurueck).join(''); },
  set: function (html) {
    var self = this;
    this.kinder = zerteile(String(html));
    this.kinder.forEach(function (k) { k.eltern = self; });
  },
});

Object.defineProperty(Knoten.prototype, 'textContent', {
  get: function () {
    if (this.istText) return this.text;
    return this.kinder.map(function (k) { return k.textContent; }).join('');
  },
  set: function (t) {
    var k = new Knoten('#text');
    k.istText = true; k.text = String(t); k.eltern = this;
    this.kinder = [k];
  },
});

/** HTML zu Knoten. Gibt die obersten Knoten zurück. */
function zerteile(html) {
  var wurzel = new Knoten('#wurzel');
  var stapel = [wurzel];
  var i = 0, s = String(html);
  while (i < s.length) {
    var auf = s.indexOf('<', i);
    if (auf < 0) { textAnhaengen(stapel, s.slice(i)); break; }
    if (auf > i) textAnhaengen(stapel, s.slice(i, auf));
    if (s.substr(auf, 4) === '<!--') {
      var zuK = s.indexOf('-->', auf);
      i = zuK < 0 ? s.length : zuK + 3;
      continue;
    }
    var zu = tagEnde(s, auf);
    if (zu < 0) { textAnhaengen(stapel, s.slice(auf)); break; }
    var roh = s.slice(auf + 1, zu);
    i = zu + 1;
    if (roh.charAt(0) === '/') {
      var name = roh.slice(1).trim().toLowerCase();
      for (var t = stapel.length - 1; t > 0; t--) {
        if (stapel[t].tagName.toLowerCase() === name) { stapel.length = t; break; }
      }
      continue;
    }
    var selbst = roh.charAt(roh.length - 1) === '/';
    if (selbst) roh = roh.slice(0, -1);
    var m = /^([a-zA-Z][\w:-]*)/.exec(roh);
    if (!m) continue;
    var el = new Knoten(m[1]);
    el.attrs = attributeLesen(roh.slice(m[1].length));
    var oben = stapel[stapel.length - 1];
    el.eltern = oben; oben.kinder.push(el);
    if (!selbst && LEER.indexOf(m[1].toLowerCase()) < 0) stapel.push(el);
  }
  return wurzel.kinder;
}

/** Das Ende eines Tags — Anführungszeichen zählen mit, sonst bricht ein
 *  `style="a>b"` den Zerteiler. */
function tagEnde(s, auf) {
  var q = null;
  for (var i = auf + 1; i < s.length; i++) {
    var c = s.charAt(i);
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

function attributeLesen(roh) {
  var a = {}, re = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g, m;
  while ((m = re.exec(roh))) {
    var wert = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3]
             : m[4] !== undefined ? m[4] : '';
    a[m[1]] = entschluessle(wert);
  }
  return a;
}

function entschluessle(s) {
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");
}

function textAnhaengen(stapel, text) {
  if (!text) return;
  var k = new Knoten('#text');
  k.istText = true; k.text = entschluessle(text);
  var oben = stapel[stapel.length - 1];
  k.eltern = oben; oben.kinder.push(k);
}

/* --- Auswahl ---------------------------------------------------------- */

function teilPasst(el, teil) {
  if (el.istText) return false;
  var m = /^([a-zA-Z][\w-]*)?((?:[#.\[][^#.\[]+)*)$/.exec(teil);
  if (!m) return false;
  if (m[1] && el.tagName.toLowerCase() !== m[1].toLowerCase()) return false;
  var rest = m[2] || '', re = /([#.\[])([^#.\[]+)/g, s;
  while ((s = re.exec(rest))) {
    if (s[1] === '#') { if (el.attrs.id !== s[2]) return false; }
    else if (s[1] === '.') { if (el.klassen().indexOf(s[2]) < 0) return false; }
    else {
      var inhalt = s[2].replace(/\]$/, '');
      var g = inhalt.split('=');
      var name = g[0].trim();
      if (!Object.prototype.hasOwnProperty.call(el.attrs, name)) return false;
      if (g.length > 1) {
        var soll = g.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (String(el.attrs[name]) !== soll) return false;
      }
    }
  }
  return true;
}

function alleKnoten(el, aus) {
  aus = aus || [];
  (el.kinder || []).forEach(function (k) {
    if (!k.istText) { aus.push(k); alleKnoten(k, aus); }
  });
  return aus;
}

Knoten.prototype.querySelectorAll = function (sel) {
  var self = this;
  return String(sel).split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    .reduce(function (aus, einer) {
      var teile = einer.split(/\s+/);
      var kandidaten = alleKnoten(self);
      kandidaten.forEach(function (k) {
        if (!teilPasst(k, teile[teile.length - 1])) return;
        var el = k.eltern, i = teile.length - 2, ok = true;
        while (i >= 0) {
          var gefunden = false;
          while (el && el !== self.eltern) {
            if (teilPasst(el, teile[i])) { gefunden = true; el = el.eltern; break; }
            el = el.eltern;
          }
          if (!gefunden) { ok = false; break; }
          i--;
        }
        if (ok && aus.indexOf(k) < 0) aus.push(k);
      });
      return aus;
    }, []);
};

Knoten.prototype.querySelector = function (sel) {
  return this.querySelectorAll(sel)[0] || null;
};

Knoten.prototype.closest = function (sel) {
  var el = this;
  while (el) { if (teilPasst(el, sel.trim())) return el; el = el.eltern; }
  return null;
};

/** Antippen. Ohne Blasenphase: Der Lernbereich hängt seine Handler
 *  direkt an die Knöpfe, und ein erfundenes Ereignismodell prüfte etwas,
 *  das es im Browser so nicht gibt. Die eine Ausnahme ist die
 *  Seitenleiste, die auf dem Behälter lauscht — dafür gibt es
 *  `tippeNav`. */
Knoten.prototype.klick = function () {
  if (typeof this.onclick === 'function') return this.onclick({ target: this });
  return null;
};

/* --- Das Fenster ------------------------------------------------------ */

var document = new Knoten('#dokument');
document.body = document;
document.hidden = false;
document.createElement = function (t) { return new Knoten(t); };
document.addEventListener = function () { };

var window = {
  scrollTo: function () { },
  addEventListener: function () { },
  location: { hash: '', href: '' },
  document: document,
};
var location = window.location;
var history = { replaceState: function () { } };
var navigator = { userAgent: 'jsc' };

/* Der Fragezeil-Leser. `demoAntwort` baut ihn bei JEDEM Aufruf — ohne
   ihn wirft jede einzelne Anfrage, und weil die Aufrufer ein `.catch`
   haben, sähe das aus wie «keine Daten» statt wie ein Fehler. Genau
   diese Sorte stiller Ausfall soll dieser Prüfer finden. */
function URLSearchParams(roh) {
  this._ = {};
  var self = this;
  String(roh || '').replace(/^\?/, '').split('&').forEach(function (paar) {
    if (!paar) return;
    var i = paar.indexOf('=');
    var k = i < 0 ? paar : paar.slice(0, i);
    var w = i < 0 ? '' : paar.slice(i + 1);
    self._[decodeURIComponent(k)] = decodeURIComponent(w.replace(/\+/g, ' '));
  });
}
URLSearchParams.prototype.get = function (k) {
  return Object.prototype.hasOwnProperty.call(this._, k) ? this._[k] : null;
};
URLSearchParams.prototype.has = function (k) {
  return Object.prototype.hasOwnProperty.call(this._, k);
};
document.readyState = 'loading';   // `seiteBereit` sammelt nur, ruft nicht
function queueMicrotask(fn) { Promise.resolve().then(fn); }

/* Die Promise-Warteschlange leeren. Die Vorschau-Schicht loest alles
   ohne echtes Warten auf; ohne dieses Leeren liefe die Pruefung an den
   `await`s vorbei und pruefte einen halbfertigen Schirm. */
function abwarten(male) {
  for (var i = 0; i < (male || 12); i++) {
    if (typeof drainMicrotasks === 'function') drainMicrotasks();
  }
}

/* Speicher: Der Fortschritt liegt im Browser in `localStorage`. Hier
   genügt ein Objekt — geprüft wird, dass er geschrieben und gelesen
   wird, nicht wie der Browser ihn ablegt. */
function Speicher() { this.daten = {}; }
Speicher.prototype.getItem = function (k) {
  return Object.prototype.hasOwnProperty.call(this.daten, k) ? this.daten[k] : null;
};
Speicher.prototype.setItem = function (k, w) { this.daten[k] = String(w); };
Speicher.prototype.removeItem = function (k) { delete this.daten[k]; };
var localStorage = new Speicher();
var sessionStorage = new Speicher();

/* `setTimeout` und `setInterval` laufen hier NICHT von selbst: In
   JavaScriptCore gibt es keine Ereignisschleife. Sie werden gemerkt,
   und die Prüfung ruft sie, wenn sie es will — so lässt sich eine
   ablaufende Uhr in einer Zeile prüfen, statt neunzig Minuten zu warten. */
var UHREN = [];
function setInterval(fn, ms) { UHREN.push({ fn: fn, ms: ms }); return UHREN.length; }
function clearInterval(id) { if (id && UHREN[id - 1]) UHREN[id - 1] = { fn: null, ms: 0 }; }
/* `setTimeout` feuert hier SOFORT. `demoAntwort` wartet 120 ms, damit sich
   die Vorschau im Browser wie ein echter Aufruf anfuehlt — ohne
   Ereignisschleife wuerde dieses Warten nie enden, und jede Pruefung
   bliebe stehen, ohne dass etwas rot wuerde. Sofort feuern heisst: Die
   Verzoegerung wird geprueft, nicht abgesessen. */
function setTimeout(fn, ms) {
  UHREN.push({ fn: null, ms: ms, einmal: true });
  try { fn(); } catch (e) { }
  return UHREN.length;
}
function clearTimeout(id) { if (id && UHREN[id - 1]) UHREN[id - 1] = { fn: null, ms: 0 }; }
function uhrenTicken(male) {
  for (var n = 0; n < (male || 1); n++) {
    UHREN.slice().forEach(function (u) { if (u && typeof u.fn === 'function') u.fn(); });
  }
}

/* `fetch` gibt es nicht und darf es nicht geben: Die Prüfung läuft gegen
   die Vorschau-Schicht (`DEMO = true`), nicht gegen einen Server. Wer
   hier einen Server brauchte, prüfte etwas anderes als die Website. */
function fetch() { throw new Error('fetch im Prüflauf: DEMO war nicht gesetzt'); }
