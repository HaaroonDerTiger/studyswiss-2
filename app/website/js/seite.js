/* StudySwiss — der Rahmen jeder Seite
   ==================================================================
   Kopfzeile, Navigation, Fuss. Alles, was auf jeder Seite gleich ist
   und darum genau einmal geschrieben gehört.                          */

/** Die aktuelle Seite an der Navigation markieren. `aria-current` statt
 *  einer Klasse: Ein Vorleseprogramm sagt dann «aktuelle Seite», und die
 *  Gestaltung hängt sich an dasselbe Merkmal. */
function navMarkieren() {
  const hier = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  $$('[aria-current=page]').forEach(a => a.removeAttribute('aria-current'));
  $$('.hauptnav a, .seitenleiste nav a').forEach(a => {
    const ziel = a.getAttribute('href') || '';
    const z = ziel.replace(/^\.?\//, '').replace(/\.html$/, '').replace(/#.*$/, '');
    if (!z) return;
    if (hier.endsWith('/' + z) || hier.endsWith(z)) a.setAttribute('aria-current', 'page');
  });
}

/** Das Menü auf schmalen Bildschirmen. Die Tab-Leiste der App hat hier
 *  keinen Platz, und ein Menü, das sich nicht schliesst, verdeckt die
 *  halbe Seite. */
function menuVerdrahten() {
  const knopf = $('.menuknopf'), nav = $('.hauptnav');
  if (!knopf || !nav) return;
  knopf.addEventListener('click', () => {
    const offen = nav.classList.toggle('offen');
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
  });
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) { nav.classList.remove('offen');
                                 knopf.setAttribute('aria-expanded','false'); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { nav.classList.remove('offen');
                              knopf.setAttribute('aria-expanded','false'); }
  });
}

/** Im Vorschau-Betrieb steht ein Streifen über der Seite. Wer eine
 *  Musterofferte für echt hält, bestellt am Ende etwas, das niemand
 *  bekommen hat — das darf nicht passieren, und ein kleiner Hinweis
 *  unten rechts genügt dafür nicht. */
function demoStreifen() {
  if (!DEMO || $('.demostreifen')) return;
  const s = el('div', 'demostreifen',
    `${icon('info', 16)} <b>Vorschau ohne Server.</b> Alle Zahlen, Offerten und
     Rechnungen auf dieser Seite sind Muster. Es entsteht keine Bestellung.`);
  document.body.insertBefore(s, document.body.firstChild);
}

/** Anmeldezustand in der Kopfzeile. Ohne Server bleibt es beim Knopf. */
async function kopfKonto() {
  const platz = $('[data-konto]');
  if (!platz) return;
  const profil = await sitzungAufnehmen().catch(() => null);
  if (!profil) return;
  platz.outerHTML =
    `<a class="btn klein bs" href="lernen.html">${sicher(profil.vorname || 'Mein Konto')}</a>`;
}

function fussJahr() {
  const j = $('[data-jahr]');
  if (j) j.textContent = new Date().getFullYear();
}

/** Ein Fehler, der dem Menschen etwas sagt. Das Backend liefert nach
 *  RFC 9457 einen deutschen `detail` — der gehört auf den Schirm, nicht
 *  in die Konsole. */
function fehlerZeigen(wo, e) {
  const kasten = typeof wo === 'string' ? $(wo) : wo;
  if (!kasten) return;
  const titel = (e && e.titel) || 'Es hat nicht geklappt';
  const text  = (e && e.message) || 'Versuch es gleich nochmals.';
  kasten.innerHTML = `<div class="hinweis wichtig">${icon('warn', 18)}
    <div><b>${sicher(titel)}</b><br>${sicher(text)}</div></div>`;
  kasten.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

seiteBereit(() => {
  demoStreifen(); navMarkieren(); menuVerdrahten(); fussJahr(); kopfKonto();
});
