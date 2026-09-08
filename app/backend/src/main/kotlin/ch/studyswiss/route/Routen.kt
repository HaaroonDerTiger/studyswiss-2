package ch.studyswiss.route

import ch.studyswiss.daten.Katalog
import ch.studyswiss.model.*
import ch.studyswiss.repo.NutzerRepo
import ch.studyswiss.service.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

/**
 * Routen tun nur HTTP: parsen, validieren, Statuscode setzen.
 * Fachlogik steht in den Services, und eine Route ruft nie ein Repo direkt auf.
 */
private const val WEB_COOKIE = "ss_refresh"

class Routen(
    private val auth: AuthService,
    private val nutzerRepo: NutzerRepo,
    private val lern: LernService,
    private val aufgaben: AufgabenService,
    private val aufsatz: AufsatzService,
    private val abo: AboService,
    private val schule: SchulService,
) {

    /**
     * Dieselbe Sitzung, zwei Clients.
     *
     * Die App legt den Refresh-Token in `flutter_secure_storage`. Ein
     * Browser hat nichts Vergleichbares: `localStorage` liest jedes
     * Skript, das auf die Seite gelangt, und ein Token mit sechzig Tagen
     * Laufzeit ist ein lohnendes Ziel — bei Minderjaehrigen erst recht
     * (§2.6).
     *
     * Darum bekommt der Browser den Refresh-Token als `httpOnly`-Cookie
     * und im Rumpf eine leere Zeichenkette. Kein Skript kann ihn lesen,
     * auch unseres nicht. Gegen Anfragen von fremden Seiten schuetzt der
     * Kopf `X-Client: web`: Einen eigenen Kopf kann eine fremde Seite nur
     * mit Vorabanfrage senden, und die laesst unser CORS nur fuer die
     * eigene Herkunft zu.
     *
     * `SameSite=Lax` und nicht `Strict`: Nach der Rueckkehr von Apple
     * oder Google ist die Anfrage seitenuebergreifend, und mit `Strict`
     * waere der Nutzer genau dann wieder abgemeldet, wenn er sich eben
     * angemeldet hat.
     */
    private fun ApplicationCall.fuerClient(sitzung: Sitzung): Sitzung {
        if (request.headers["X-Client"] != "web") return sitzung
        response.cookies.append(
            Cookie(
                name = WEB_COOKIE,
                value = sitzung.refreshToken,
                httpOnly = true,
                secure = !entwicklung,
                path = "/v1/auth",
                maxAge = 60 * 24 * 3600,
                extensions = mapOf("SameSite" to "Lax"),
            )
        )
        return sitzung.copy(refreshToken = "")
    }

    private fun ApplicationCall.nutzerId(): String =
        principal<JWTPrincipal>()?.subject ?: error("Ohne Anmeldung")

    private suspend fun ApplicationCall.nutzer(): Nutzer? {
        val n = nutzerRepo.finde(nutzerId())
        if (n == null) respond(HttpStatusCode.Unauthorized, problem(401, "Das Konto gibt es nicht mehr."))
        return n
    }

    /** Ohne HTTPS setzt kein Browser ein `secure`-Cookie — in der
     *  Entwicklung liefe man sonst gegen eine Wand, die es in Produktion
     *  gar nicht gibt. */
    private val entwicklung: Boolean = System.getenv("STUDYSWISS_UMGEBUNG") != "produktion"
    private val konfigApple: String? = System.getenv("APPLE_SERVICE_ID")
    private val konfigGoogleWeb: String? = System.getenv("GOOGLE_WEB_CLIENT_ID")

    private fun problem(status: Int, detail: String, titel: String = "Das hat nicht geklappt") =
        Problem("about:blank", titel, status, detail)

    /** Eine abgelehnte Schul-Bitte wird 400 mit dem Satz, den der Dienst
     *  geschrieben hat — nicht 500 mit «Da ist etwas schiefgelaufen». Wer
     *  eine Bestellung fuer eine Gemeinde ausfuellt, muss lesen koennen,
     *  was fehlt. */
    private suspend inline fun <reified T : Any> versucheSchule(call: ApplicationCall, block: () -> T) {
        try {
            call.respond(block())
        } catch (e: SchulService.Abgelehnt) {
            call.respond(HttpStatusCode.BadRequest,
                problem(400, e.message ?: "Das geht so nicht.", "Bitte prüfen"))
        }
    }

    /**
     * Ein Fach ist gratis — vollstaendig, nicht als Kostprobe. Jedes weitere
     * gehoert zu Plus.
     *
     * `AboService.darf(n, "alle_faecher")` und `gratisFach()` gab es lange,
     * nur rief sie niemand auf: Beide Faecher standen jedem offen, und von den
     * vier Argumenten, die den Kauf tragen, wirkten nur zwei.
     *
     * Ohne Angabe ist das gratis Fach gemeint — der Client schickt `fach`
     * nicht mit, wenn er dem Vorschlag folgt.
     */
    private fun darfFach(n: Nutzer, bereichOderFach: String?): Boolean {
        if (bereichOderFach == null) return true
        val faecher = lern.pruefungsfaecherVon(n)
        // Uebergeben wird mal ein Bereich (Uebung) und mal ein Pruefungsfach
        // (Selbsttest). Frei ist immer das ganze Fach: Mathematik von A bis Z,
        // nicht «Mathematik, aber nur die Geometrie».
        val fach = Katalog.fachVonBereich(bereichOderFach) ?: bereichOderFach
        if (fach !in faecher) return true          // unbekanntes Fach faellt woanders auf
        return fach == abo.gratisFach(faecher) || abo.darf(n, "alle_faecher")
    }

    private suspend fun ApplicationCall.zweitesFach() = respond(
        HttpStatusCode.PaymentRequired,
        problem(
            402,
            "Ein Fach ist gratis und vollständig. Für die anderen brauchst du StudySwiss Plus.",
            "Plus nötig",
        ),
    )

    fun installiere(app: Application) = app.routing {

        route("/v1") {

            /* ------------------------- Anmeldung ------------------------ */
            route("/auth") {
                post("/apple") {
                    versuche(call) { call.fuerClient(auth.mitApple(call.receive())) }
                }
                post("/google") {
                    versuche(call) { call.fuerClient(auth.mitGoogle(call.receive())) }
                }
                post("/gast") {
                    versuche(call) { call.fuerClient(auth.alsGast(call.receive())) }
                }
                post("/refresh") {
                    /* Die App schickt den Refresh-Token im Rumpf, der Browser
                       gar nicht — dort steht er im `httpOnly`-Cookie, das
                       kein Skript lesen kann. Beides muss hier ankommen, und
                       zwar ohne dass der Client sagen muss, welcher er ist:
                       Was da ist, wird genommen. */
                    val ausCookie = call.request.cookies[WEB_COOKIE]
                    val ausRumpf = runCatching { call.receive<RefreshBitte>().refreshToken }
                        .getOrNull()
                    val token = ausRumpf?.takeIf { it.isNotBlank() } ?: ausCookie
                    if (token.isNullOrBlank()) {
                        call.respond(HttpStatusCode.Unauthorized,
                            problem(401, "Bitte melde dich neu an.", "Nicht angemeldet"))
                    } else {
                        versuche(call) { call.fuerClient(auth.erneuern(token)) }
                    }
                }
                /**
                 * Anmeldung im Browser vorbereiten.
                 *
                 * Apple und Google laufen im Web ueber eine Weiterleitung:
                 * Der Browser geht zum Anbieter und kommt mit einem Token
                 * zurueck. Der Nonce wird hier gewuerfelt und nicht im
                 * Browser — sonst koennte ein Angreifer eine alte Antwort
                 * ein zweites Mal einspielen.
                 *
                 * Solange die Service-ID (Apple) beziehungsweise die
                 * Web-Client-ID (Google) fehlt, sagt der Server das
                 * geradeheraus. Eine Weiterleitung auf eine unvollstaendige
                 * Anmeldung endet beim Anbieter in einer Fehlerseite, die
                 * niemand versteht.
                 */
                post("/web/start") {
                    val anbieter = call.receive<WebAnmeldeBitte>().anbieter
                    val eingerichtet = when (anbieter) {
                        "apple" -> !konfigApple.isNullOrBlank()
                        "google" -> !konfigGoogleWeb.isNullOrBlank()
                        "gast" -> true
                        else -> false
                    }
                    if (!eingerichtet) {
                        call.respond(HttpStatusCode.NotImplemented, problem(
                            501,
                            "Die Anmeldung mit $anbieter ist im Browser noch nicht " +
                                "eingerichtet. In der App funktioniert sie. Wer hier " +
                                "weiterkommen will, meldet sich ohne Konto an oder " +
                                "löst einen Code ein.",
                            "Noch nicht eingerichtet"))
                    } else {
                        call.respond(WebStart(hinweis = "bereit"))
                    }
                }
                post("/abmelden") {
                    call.request.cookies[WEB_COOKIE]?.let { auth.ziehZurueck(it) }
                    call.response.cookies.append(
                        Cookie(WEB_COOKIE, "", httpOnly = true, secure = !entwicklung,
                            path = "/v1/auth", maxAge = 0, extensions = mapOf("SameSite" to "Lax")))
                    call.respond(HttpStatusCode.NoContent)
                }
                authenticate("sitzung") {
                    post("/verknuepfen") {
                        versuche(call) { auth.verknuepfeMitApple(call.nutzerId(), call.receive()) }
                    }
                    delete("/konto") {
                        // Loeschung loescht alles: Versuche, Sets, Aufsaetze, Abos.
                        nutzerRepo.loesche(call.nutzerId())
                        call.respond(HttpStatusCode.NoContent)
                    }
                }
            }

            /* --------------------------- Schulen -------------------------
               Ein eigener Zweig ohne `authenticate`: Eine Schule hat kein
               Nutzerkonto, sondern einen Verwaltungsschluessel. Sie soll
               eine Offerte holen koennen, ohne sich irgendwo anzumelden —
               wer fuer eine Gemeinde eine Offerte einholt, legt dafuer
               kein Konto an.

               Der Schluessel steht in der Abfrage, nicht im Kopf: So kann
               die Schulleitung einen Link speichern. Er ist lang genug,
               um nicht geraten zu werden, und er oeffnet nichts ausser
               den Papieren der eigenen Schule. */
            route("/schule") {
                get("/preise") { call.respond(schule.preise()) }

                post("/offerte") {
                    versucheSchule(call) { schule.offerte(call.receive()) }
                }
                get("/offerte/{nummer}") {
                    val nr = call.parameters["nummer"] ?: return@get call.respond(
                        HttpStatusCode.BadRequest, problem(400, "Ohne Nummer keine Offerte."))
                    val s = call.request.queryParameters["schluessel"].orEmpty()
                    schule.offerteHolen(nr, s)?.let { call.respond(it) }
                        ?: call.respond(HttpStatusCode.NotFound,
                            problem(404, "Zu diesem Schlüssel finden wir diese Offerte nicht.",
                                "Nicht gefunden"))
                }

                post("/bestellung") {
                    val bitte = call.receive<BestellBitte>()
                    val ausOfferte = call.request.queryParameters["schluessel"]
                    versucheSchule(call) { schule.bestellen(bitte, ausOfferte) }
                }

                get("/rechnung/{nummer}") {
                    val nr = call.parameters["nummer"] ?: return@get call.respond(
                        HttpStatusCode.BadRequest, problem(400, "Ohne Nummer keine Rechnung."))
                    val s = call.request.queryParameters["schluessel"].orEmpty()
                    schule.rechnung(nr, s)?.let { call.respond(it) }
                        ?: call.respond(HttpStatusCode.NotFound,
                            problem(404, "Zu diesem Schlüssel finden wir diese Rechnung nicht.",
                                "Nicht gefunden"))
                }

                /* Der Zahlteil als SVG. Er wird hier erzeugt und nicht im
                   Browser: Ein QR-Code mit einem Fehler sieht aus wie einer
                   ohne, und die Schule merkt es erst bei der Mahnung. */
                get("/rechnung/{nummer}/zahlteil.svg") {
                    val nr = call.parameters["nummer"].orEmpty()
                    val s = call.request.queryParameters["schluessel"].orEmpty()
                    val svg = schule.zahlteilSvg(nr, s)
                    if (svg == null) {
                        call.respond(HttpStatusCode.NotFound,
                            problem(404, "Für diese Rechnung gibt es keinen Zahlteil. " +
                                "Fehlt die IBAN in der Konfiguration, wird bewusst keiner " +
                                "erzeugt — ein Zahlteil ohne Konto ist wertlos.",
                                "Kein Zahlteil"))
                    } else {
                        call.respondText(svg, ContentType.Image.SVG)
                    }
                }

                get("/lizenzen") {
                    val s = call.request.queryParameters["schluessel"].orEmpty()
                    schule.lizenzen(s)?.let { call.respond(it) }
                        ?: call.respond(HttpStatusCode.NotFound,
                            problem(404, "Zu diesem Schlüssel finden wir keine Lizenzen. " +
                                "Bitte prüfen Sie die Schreibweise.", "Kein Zugang"))
                }
                patch("/lizenzen/{code}") {
                    val code = call.parameters["code"].orEmpty()
                    val s = call.request.queryParameters["schluessel"].orEmpty()
                    val ok = schule.aendereCode(s, code, call.receive())
                    if (ok) call.respond(HttpStatusCode.NoContent)
                    else call.respond(HttpStatusCode.NotFound,
                        problem(404, "Diesen Code gibt es bei dieser Schule nicht.",
                            "Nicht gefunden"))
                }
                get("/belege") {
                    call.respond(schule.belege(call.request.queryParameters["schluessel"].orEmpty()))
                }
                get("/bericht") {
                    val s = call.request.queryParameters["schluessel"].orEmpty()
                    schule.bericht(s)?.let { call.respond(it) }
                        ?: call.respond(HttpStatusCode.NotFound,
                            problem(404, "Zu diesem Schlüssel finden wir keine Schule.",
                                "Kein Zugang"))
                }
            }

            /* -------------------------- Katalog ------------------------- */
            route("/katalog") {
                get("/kantone") { call.respond(Katalog.kantone) }
                get("/schultypen") {
                    val k = call.request.queryParameters["kanton"] ?: Katalog.standardKanton
                    call.respond(Katalog.schultypen(k))
                }
                get("/termine") {
                    val k = call.request.queryParameters["kanton"] ?: Katalog.standardKanton
                    val s = call.request.queryParameters["schultyp"] ?: ""
                    val t = Katalog.termin(k, s)
                    if (t == null) call.respond(HttpStatusCode.NotFound, problem(404, "Für diese Wahl ist noch kein Termin hinterlegt."))
                    else call.respond(t)
                }
                get("/faecher") {
                    call.respond(FaecherAntwort(Katalog.pruefungsfaecher, Katalog.bereiche))
                }
                // Ein Bereich mit `art: "tipps"` hat keinen Themenbaum,
                // sondern eine Seite: Hoerverstehen, muendliche Pruefung.
                get("/tipps") {
                    val b = call.request.queryParameters["bereich"] ?: ""
                    val t = Katalog.tipps(b)
                    if (t == null) call.respond(HttpStatusCode.NotFound,
                        problem(404, "Zu diesem Bereich gibt es keine Tipps-Seite."))
                    else call.respond(t)
                }
                get("/themen") {
                    val f = call.request.queryParameters["fach"] ?: "mathematik"
                    // Mit `pruefung` kommt nur, was diese Pruefung wirklich
                    // stellt. Ohne sie der ganze Baum — die Route ist offen
                    // und kennt den Nutzer nicht.
                    val pr = call.request.queryParameters["pruefung"]
                    val b = Katalog.baeume[f]
                    if (b == null) {
                        call.respond(HttpStatusCode.NotFound, problem(404, "Dieses Fach gibt es nicht."))
                    } else {
                        // Welche Unterthemen schon Aufgaben haben, weiss nur
                        // der Server. Ohne diese Auskunft zeigt die App alle
                        // als antippbar — und wer eines ohne Aufgaben trifft,
                        // bekommt statt einer Uebung eine Fehlermeldung.
                        val bespielt = Katalog.bespielt(f, pr)
                        call.respond(
                            b.copy(
                                oberthemen = b.oberthemen.map { o ->
                                    o.copy(
                                        unterthemen = o.unterthemen.map {
                                            it.copy(hatAufgaben = it.code in bespielt)
                                        },
                                    )
                                },
                            ),
                        )
                    }
                }
            }

            authenticate("sitzung") {

                /* ------------------------ Profil ------------------------ */
                get("/profil") { call.nutzer()?.let { call.respond(lern.profil(it)) } }

                patch("/profil") {
                    val n = call.nutzer() ?: return@patch
                    var a = call.receive<ProfilAenderung>()
                    // Wer Kanton und Schultyp setzt, aber kein Datum, bekommt
                    // den naechsten Termin aus dem Katalog vorbelegt.
                    if (a.pruefungsdatum == null && a.kanton != null && a.schultyp != null) {
                        a = a.copy(pruefungsdatum = lern.vorbelegterTermin(a.kanton!!, a.schultyp!!)?.toString())
                    }
                    call.respond(lern.profil(nutzerRepo.aendere(n.id, a)))
                }

                /* -------------------- Standortbestimmung ---------------- */
                /** Welche Faecher die Standortbestimmung anbietet — Mathematik
                 *  und Deutsch getrennt, so wie sie auch geprueft werden. */
                get("/standort/faecher") {
                    call.nutzer()?.let { call.respond(lern.standortFaecher(it)) }
                }
                post("/standort/start") {
                    val n = call.nutzer() ?: return@post
                    val fach = call.request.queryParameters["fach"]
                    if (!darfFach(n, fach)) return@post call.zweitesFach()
                    val d = lern.standortStarten(n, fach)
                    if (d == null) call.respond(HttpStatusCode.NotFound,
                        problem(404, "Für dieses Fach gibt es noch keine Aufgaben."))
                    else call.respond(d)
                }
                post("/standort/{id}/antwort") {
                    val n = call.nutzer() ?: return@post
                    val r = lern.antworten(n, call.receive(), Quelle.STANDORT,
                        setId = call.parameters["id"])
                    // In der Standortbestimmung gibt es kein Feedback zwischendurch.
                    if (r == null) call.respond(HttpStatusCode.NotFound, problem(404, "Diese Aufgabe gibt es nicht."))
                    else call.respond(HttpStatusCode.Accepted)
                }
                post("/standort/{id}/abschluss") {
                    val n = call.nutzer() ?: return@post
                    call.respond(lern.startpunkt(n, call.parameters["id"]!!))
                }

                /* ------------------------ Uebung ------------------------ */
                get("/uebung/vorschlag") { call.nutzer()?.let { call.respond(lern.vorschlag(it)) } }

                post("/uebung/start") {
                    val n = call.nutzer() ?: return@post
                    val b = call.receive<UebungStart>()
                    if (!darfFach(n, b.fach)) return@post call.zweitesFach()
                    val u = lern.uebungStarten(n, b)
                    if (u == null) call.respond(HttpStatusCode.NotFound, problem(404, "Zu diesem Thema gibt es noch keine Aufgaben."))
                    else call.respond(u)
                }
                post("/uebung/{id}/antwort") {
                    val n = call.nutzer() ?: return@post
                    val stufe = call.request.queryParameters["hinweise"]?.toIntOrNull() ?: 0
                    val r = lern.antworten(n, call.receive(), Quelle.UEBUNG, stufe,
                        setId = call.parameters["id"])
                    if (r == null) call.respond(HttpStatusCode.NotFound, problem(404, "Diese Aufgabe gibt es nicht."))
                    else call.respond(r)
                }
                post("/uebung/{id}/hinweis") {
                    val b = call.receive<HinweisBitte>()
                    val h = lern.hinweis(b.aufgabeRef, b.stufe)
                    if (h == null) call.respond(HttpStatusCode.NotFound, problem(404, "Zu dieser Aufgabe gibt es keine Hinweise."))
                    else call.respond(h)
                }
                post("/uebung/{id}/abschluss") {
                    val n = call.nutzer() ?: return@post
                    val e = lern.uebungAbschliessen(n, call.parameters["id"]!!)
                    if (e == null) call.respond(HttpStatusCode.NotFound, problem(404, "Diese Übung gibt es nicht."))
                    else call.respond(e)
                }

                /* ---------------------- Selbsttest ---------------------- */
                post("/selbsttest/start") {
                    val n = call.nutzer() ?: return@post
                    val b = call.receive<SelbsttestStart>()
                    if (b.umfang == "pruefung" && !abo.darf(n, "selbsttest_pruefung")) {
                        return@post call.respond(HttpStatusCode.PaymentRequired,
                            problem(402, "Die ganze Prüfung gehört zu StudySwiss Plus.", "Plus nötig"))
                    }
                    if (!darfFach(n, b.fach)) return@post call.zweitesFach()
                    val t = lern.selbsttestStarten(n, b)
                    if (t == null) call.respond(HttpStatusCode.NotFound,
                        problem(404, "Für dieses Fach gibt es noch keine Aufgaben."))
                    else call.respond(t)
                }
                /** Die Faecher des Selbsttests und die Bedingungen dazu.
                 *  Beides kommt aus dem Katalog des Schultyps — welche
                 *  Bedingungen gelten, entscheidet die Pruefung. */
                get("/selbsttest/faecher") {
                    call.nutzer()?.let { call.respond(lern.selbsttestFaecher(it)) }
                }
                get("/selbsttest/bedingungen") {
                    // Mit `fach` kommen die Bedingungen dieses Fachs — in Bern
                    // dauert Deutsch doppelt so lange wie Mathematik.
                    val f = call.request.queryParameters["fach"]
                    call.nutzer()?.let { call.respond(lern.bedingungenVon(it, f)) }
                }
                post("/selbsttest/{id}/antwort") {
                    val n = call.nutzer() ?: return@post
                    lern.antworten(n, call.receive(), Quelle.SELBSTTEST,
                        setId = call.parameters["id"])
                    // Im Selbsttest gibt es kein Feedback waehrend des Laufs.
                    call.respond(HttpStatusCode.Accepted)
                }
                post("/selbsttest/{id}/abgabe") {
                    val n = call.nutzer() ?: return@post
                    val e = lern.selbsttestAbgeben(n, call.parameters["id"]!!)
                    if (e == null) call.respond(HttpStatusCode.NotFound, problem(404, "Diesen Test gibt es nicht."))
                    else call.respond(e)
                }
                get("/selbsttest/versuche") { call.nutzer()?.let { call.respond(lern.selbsttestVersuche(it)) } }

                /* ------------------------ Lernpfad ---------------------- */
                get("/lernpfad") { call.nutzer()?.let { call.respond(lern.lernpfad(it)) } }

                /* ---------------------- Fortschritt --------------------- */
                get("/fortschritt") { call.nutzer()?.let { call.respond(lern.fortschritt(it)) } }
                get("/fehler") { call.nutzer()?.let { call.respond(lern.fehlerarchiv(it)) } }
                post("/fehler/nochmal") {
                    val ref = call.receive<Map<String, String>>()["aufgabeRef"] ?: ""
                    val a = aufgaben.herstellen(ref)
                    // Dieselbe Ref ergibt exakt dieselbe Aufgabe. Genau dafuer
                    // speichern wir Refs statt Aufgaben.
                    if (a == null) call.respond(HttpStatusCode.NotFound, problem(404, "Diese Aufgabe gibt es nicht mehr."))
                    else call.respond(aufgaben.alsDto(a))
                }

                /* ------------------------ Eltern ------------------------ */
                get("/eltern/report") {
                    val n = call.nutzer() ?: return@get
                    // §4.9 zaehlt den Eltern-Report zu Plus. Geprueft wurde hier
                    // lange nur die Freigabe durch die Schuelerin — die Schranke
                    // war zwar definiert («eltern_report»), aber nie aufgerufen.
                    if (!abo.darf(n, "eltern_report")) {
                        return@get call.respond(HttpStatusCode.PaymentRequired,
                            problem(402, "Der Eltern-Report gehört zu StudySwiss Plus.", "Plus nötig"))
                    }
                    val r = lern.elternReport(n)
                    if (r == null) call.respond(HttpStatusCode.Forbidden,
                        problem(403, "Der Eltern-Report ist nicht freigegeben.", "Nicht freigegeben"))
                    else call.respond(r)
                }
                post("/eltern/freigabe") {
                    val n = call.nutzer() ?: return@post
                    nutzerRepo.setzeElternFreigabe(n.id, call.receive<Freigabe>().aktiv)
                    call.respond(HttpStatusCode.NoContent)
                }

                /* ------------------------ Aufsatz ----------------------- */
                /** Erst die Aufsatzart, dann das Thema. Welche Arten es gibt,
                 *  haengt am Schultyp — eine Art, die in dieser Pruefung nicht
                 *  vorkommt, erscheint gar nicht. */
                get("/aufsatz/arten") {
                    val n = call.nutzer() ?: return@get
                    call.respond(aufsatz.arten(Katalog.schultyp(n.kanton ?: Katalog.standardKanton, n.schultyp)))
                }
                get("/aufsatz/themen") {
                    val n = call.nutzer() ?: return@get
                    val art = call.request.queryParameters["art"]
                    val slot = call.request.queryParameters["slot"]
                    call.respond(
                        when {
                            art != null -> aufsatz.themenDerArt(art)
                            slot != null -> aufsatz.themen(slot)
                            // Ohne Angabe ein Pruefungsblatt — je ein Thema
                            // pro Art, die DIESE Pruefung wirklich fuehrt.
                            else -> aufsatz.blatt(
                                Katalog.schultyp(n.kanton ?: Katalog.standardKanton, n.schultyp))
                        },
                    )
                }
                post("/aufsatz/entwurf") {
                    val n = call.nutzer() ?: return@post
                    call.respond(aufsatz.speichere(n.id, call.receive()))
                }
                get("/aufsatz/{id}") {
                    val n = call.nutzer() ?: return@get
                    val a = aufsatz.lies(n.id, call.parameters["id"]!!)
                    if (a == null) call.respond(HttpStatusCode.NotFound, problem(404, "Diesen Aufsatz gibt es nicht."))
                    else call.respond(a)
                }
                post("/aufsatz/{id}/korrektur") {
                    val n = call.nutzer() ?: return@post
                    if (!abo.darf(n, "aufsatzkorrektur")) {
                        return@post call.respond(HttpStatusCode.PaymentRequired,
                            problem(402, "Die Aufsatzkorrektur gehört zu StudySwiss Plus.", "Plus nötig"))
                    }
                    try {
                        call.respond(aufsatz.korrigiere(
                            n.id, call.parameters["id"]!!,
                            Katalog.schultyp(n.kanton ?: Katalog.standardKanton, n.schultyp)))
                    } catch (e: AufsatzService.NichtVerfuegbar) {
                        call.respond(HttpStatusCode.ServiceUnavailable, problem(503, e.message ?: ""))
                    }
                }

                /* -------------------------- Abo ------------------------- */
                get("/abo/status") { call.nutzer()?.let { call.respond(abo.status(it)) } }
                get("/abo/produkte") {
                    // Die Preise stehen auch in App Store Connect und in der
                    // Play Console. Hier kommen sie her, damit der Screen den
                    // Vergleich «monatlich vs. Pass» rechnen kann.
                    call.nutzer()?.let { call.respond(abo.produkte(it)) }
                }
                post("/abo/apple") {
                    val n = call.nutzer() ?: return@post
                    versuche(call) { abo.mitApple(n, call.receive<AppleQuittung>().signedTransaction) }
                }
                post("/abo/google") {
                    val n = call.nutzer() ?: return@post
                    val q = call.receive<GoogleQuittung>()
                    versuche(call) { abo.mitGoogle(n, q.purchaseToken, q.produktId) }
                }
                /**
                 * Kauf auf der Website vorbereiten.
                 *
                 * Der Kauf laeuft ueber einen Zahlungsanbieter; wir sehen
                 * nie eine Kartennummer. Was hier entsteht, ist die
                 * Adresse, zu der der Browser geht.
                 *
                 * Ohne eingerichteten Anbieter wird KEIN Kauf vorgetaeuscht.
                 * §4.9 sagt es fuer die Laeden schon: Ohne die
                 * Server-Schluessel lehnt der Server jeden Kauf ab — lieber
                 * kein Plus als eines, das sich jeder selbst ausstellt. Fuer
                 * die Web-Kasse gilt dasselbe.
                 */
                post("/abo/web/start") {
                    call.receive<WebKaufBitte>()
                    call.respond(HttpStatusCode.NotImplemented, problem(
                        501,
                        "Der Kauf auf der Website ist noch nicht eingerichtet. " +
                            "In der App funktioniert er, und über die Schule ebenfalls. " +
                            "Sobald der Zahlungsanbieter angebunden ist, führt dieser " +
                            "Knopf dorthin.",
                        "Noch nicht eingerichtet"))
                }

                post("/abo/code") {
                    val n = call.nutzer() ?: return@post
                    val code = call.receive<CodeEinloesen>().code
                    /* Zwei Sorten Code, ein Feld: Der Familiencode kommt von
                       einer anderen Familie, der Schulcode von der Schule.
                       Ein Kind, das einen Zettel abtippt, weiss nicht, welche
                       Sorte es hat — und muss es auch nicht wissen. Zuerst
                       der Schulcode, weil er ein Ablaufdatum mitbringt. */
                    val bis = schule.loeseCodeEin(n.id, code)
                    if (bis != null) {
                        call.respond(abo.schaltePlusFrei(n, "schule", code, bis))
                    } else {
                        versuche(call) { abo.loeseCodeEin(n, code) }
                    }
                }
            }
        }

        /**
         * Der Gesundheitsprüfpunkt für den Lastverteiler.
         *
         * Er prüft, was wirklich schiefgehen kann: Ist die Datenbank
         * erreichbar, und sind die Aufgaben geladen? Ein Prüfpunkt, der nur
         * «ok» sagt, weil der Prozess läuft, meldet einen gesunden Dienst
         * auch dann, wenn keine einzige Anfrage beantwortet werden kann.
         *
         * Antwortet mit 503, sobald etwas fehlt — nur so nimmt der
         * Lastverteiler die Instanz aus dem Verkehr.
         */
        get("/gesundheit") {
            val db = try {
                org.jetbrains.exposed.sql.transactions.transaction {
                    exec("SELECT 1") { it.next(); true } ?: false
                }
            } catch (e: Exception) {
                false
            }
            val vorlagen = Katalog.nutzbar.size
            val bloecke = Katalog.textNutzbar.size
            val gesund = db && vorlagen > 0 && bloecke > 0

            call.respond(
                if (gesund) HttpStatusCode.OK else HttpStatusCode.ServiceUnavailable,
                mapOf(
                    "status" to if (gesund) "ok" else "gestoert",
                    "datenbank" to if (db) "erreichbar" else "nicht erreichbar",
                    "vorlagen" to vorlagen.toString(),
                    "deutschbloecke" to bloecke.toString(),
                    "faecher" to Katalog.baeume.keys.joinToString(","),
                    "version" to (System.getenv("STUDYSWISS_VERSION") ?: "unbekannt"),
                ),
            )
        }
    }

    /** Fasst die Fehler zusammen, die eine Anmeldung oder ein Kauf werfen kann. */
    private suspend inline fun <reified T : Any> versuche(call: ApplicationCall, block: () -> T) {
        try {
            call.respond(block())
        } catch (e: AuthService.Abgelehnt) {
            call.respond(HttpStatusCode.Unauthorized, problem(401, e.message ?: "", "Anmeldung abgelehnt"))
        } catch (e: AboService.Abgelehnt) {
            call.respond(HttpStatusCode.BadRequest, problem(400, e.message ?: "", "Kauf abgelehnt"))
        } catch (e: NutzerRepo.SchonVergeben) {
            call.respond(HttpStatusCode.Conflict, problem(409, e.message ?: "", "Schon vergeben"))
        }
    }
}
