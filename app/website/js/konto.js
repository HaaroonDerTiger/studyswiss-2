/* StudySwiss — Anmeldung im Browser
   ==================================================================
   Dieselben drei Wege wie in der App (§4.8), plus «Code einlösen».

   Der Unterschied zur App steckt nicht hier, sondern im Backend: Im
   Web meldet man sich bei Apple über eine **Service-ID** an, nicht über
   die Bundle-ID, und bei Google über eine eigene Web-Client-ID. Der
   Server muss darum je Anbieter mehrere Publikumswerte annehmen —
   sonst weist er jede Anmeldung aus dem Browser ab. Siehe
   `AuthService.pruefeToken`.                                          */

async function kontoStarten() {
  const form = $('#formCode');
  if (!form) return;

  $('#mitApple').onclick  = () => anmeldenMit('apple');
  $('#mitGoogle').onclick = () => anmeldenMit('google');
  $('#alsGast').onclick   = () => anmeldenMit('gast');

  form.onsubmit = async e => {
    e.preventDefault();
    if (!pruefeFormular(form)) return;
    const code = $('input[name=code]', form).value.trim().toUpperCase();
    const knopf = $('button[type=submit]', form);
    knopf.disabled = true; knopf.textContent = 'Wird geprüft …';
    try {
      /* Ein Kind, dessen Schule Lizenzen gekauft hat, hat noch kein Konto —
         es hat einen Zettel. `/abo/code` verlangt aber eine Anmeldung.
         Darum zuerst ein Gastkonto: sofort nutzbar, ohne E-Mail-Adresse,
         später mit Apple oder Google verknüpfbar. Ohne diesen Schritt
         scheiterte genau der Weg, für den die Codes gedacht sind. */
      if (!angemeldet) await gastkonto();
      const s = await api('/abo/code', { body: { code } });
      $('#codeMeldung').innerHTML = `<div class="hinweis gut">${icon('haken', 18)}
        <div><b>Freigeschaltet.</b> ${sicher((s && s.hinweis)
          || 'Alle Fächer sind jetzt offen.')}</div></div>`;
      setTimeout(() => location.href = 'lernen.html', 1200);
    } catch (err) {
      fehlerZeigen('#codeMeldung', err);
    } finally {
      knopf.disabled = false; knopf.textContent = 'Einlösen';
    }
  };
}

/**
 * Ein Gastkonto anlegen, falls noch keines da ist.
 *
 * Die Gerätekennung wird einmal gewürfelt und im Browser behalten —
 * sonst bekäme dasselbe Gerät bei jedem Besuch ein neues Konto, und der
 * Fortschritt wäre jedes Mal weg. `localStorage` ist hier richtig: Es
 * ist keine Anmeldung, sondern die Kennung dieses Browsers, und sie
 * öffnet für sich allein gar nichts.
 */
async function gastkonto() {
  let id = null;
  try { id = localStorage.getItem('studyswiss.geraet'); } catch (e) {}
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID()
                            : String(Date.now()) + Math.random().toString(36).slice(2));
    try { localStorage.setItem('studyswiss.geraet', id); } catch (e) {}
  }
  const s = await api('/auth/gast', { body: { geraeteId: id } });
  if (s && s.accessToken) accessToken = s.accessToken;
  angemeldet = s && s.nutzer ? s.nutzer : null;
  return angemeldet;
}

/**
 * Die Anmeldung selbst.
 *
 * Apple und Google laufen im Web über eine Weiterleitung: Wir schicken
 * den Browser zum Anbieter, der schickt ihn mit einem Token zurück, und
 * das Token geht an `/v1/auth/*`. Den Nonce würfelt der Server, damit
 * niemand eine alte Antwort ein zweites Mal einspielt.
 *
 * Ohne Server tut die Vorschau so, als wäre man angemeldet — sonst
 * liesse sich der Lernbereich gar nicht anschauen.
 */
async function anmeldenMit(anbieter) {
  if (DEMO) {
    await api('/auth/gast', { body: { geraeteId: 'vorschau' } });
    await sitzungAufnehmen();
    location.href = 'lernen.html';
    return;
  }
  try {
    const s = await api('/auth/web/start', { body: { anbieter } });
    if (s && s.weiterleitung) { location.href = s.weiterleitung; return; }
    location.href = 'lernen.html';
  } catch (e) {
    fehlerZeigen('#codeMeldung', e);
  }
}

seiteBereit(kontoStarten);
