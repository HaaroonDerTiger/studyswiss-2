package ch.studyswiss.service

import ch.studyswiss.Konfig
import ch.studyswiss.daten.Katalog
import ch.studyswiss.model.*
import ch.studyswiss.repo.AufsatzRepo
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.UUID

/**
 * Das einzige Modul, in dem ein Sprachmodell vorkommt.
 *
 * Aufgaben werden nirgends per LLM erzeugt — der Generator ist deterministisch.
 * Hier geht es um einen selbst geschriebenen Text, und dafuer braucht es eine
 * Beurteilung, die kein Regelwerk leisten kann.
 *
 * Der Text verlaesst das Backend nur zur Korrektur und wird nicht zum Training
 * weitergegeben. Das muss im Vertrag mit dem Anbieter stehen, nicht nur hier.
 */
class AufsatzService(private val repo: AufsatzRepo, private val konfig: Konfig) {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }

    private val http = HttpClient {
        install(ContentNegotiation) { json(json) }
        install(HttpTimeout) { requestTimeoutMillis = 120_000 }
    }

    fun themen(slot: String?): List<AufsatzThema> =
        Katalog.aufsatzThemen.filter { slot == null || it.slot == slot }

    /**
     * Die Aufsatzarten dieser Pruefung.
     *
     * Zuerst die Art, dann das Thema — vorher lagen vier Themen aus vier
     * Slots nebeneinander, und wer eine bestimmte Textsorte ueben wollte,
     * musste so lange wuerfeln, bis sie kam.
     *
     * Gefiltert wird nach dem Schultyp: Eine Art, die in dieser Pruefung
     * nicht vorkommt, erscheint gar nicht. Eine, die vorkommt und zu der wir
     * noch keine Themen haben, erscheint mit `themen = 0` — das sagt der
     * Screen dann auch, statt eine leere Liste zu zeigen.
     */
    fun arten(schultyp: Schultyp?): List<AufsatzartDto> {
        val erlaubt = schultyp?.aufsatzarten ?: Katalog.aufsatzarten.map { it.id }
        return Katalog.aufsatzarten.filter { it.id in erlaubt }.map { a ->
            AufsatzartDto(
                id = a.id, name = a.name, untertitel = a.untertitel,
                beschreibung = a.beschreibung,
                themen = Katalog.aufsatzThemen.count { it.sorte == a.sorte },
                aufbau = a.aufbau, satzstarter = a.satzstarter,
            )
        }
    }

    /** Die Themen EINER Aufsatzart, gemischt. */
    fun themenDerArt(artId: String, anzahl: Int = 4): List<AufsatzThema> {
        val art = Katalog.aufsatzart(artId) ?: return emptyList()
        return Katalog.aufsatzThemen.filter { it.sorte == art.sorte }.shuffled().take(anzahl)
    }

    /**
     * Ein Pruefungsblatt: je ein Thema pro Aufsatzart, die diese Pruefung
     * wirklich fuehrt.
     *
     * Hier standen vier feste Slots — «arg», «erz», «ref», «bild». Das sind
     * die Zuercher. Eine Berner FMS-Pruefung legt drei Themen vor, und zwar
     * eine Bildbeschreibung, eine Erzaehlung und einen Brief; von «ref» weiss
     * sie nichts. Welche Arten vorkommen, steht darum im Katalog.
     */
    fun blatt(schultyp: Schultyp?): List<AufsatzThema> {
        val arten = schultyp?.aufsatzarten?.takeIf { it.isNotEmpty() }
            ?: Katalog.aufsatzarten.map { it.id }
        return arten.mapNotNull { id ->
            val sorte = Katalog.aufsatzart(id)?.sorte ?: return@mapNotNull null
            Katalog.aufsatzThemen.filter { it.sorte == sorte }.randomOrNull()
        }
    }

    fun speichere(nutzerId: String, e: AufsatzEntwurf): AufsatzDto {
        val id = e.id ?: UUID.randomUUID().toString()
        repo.speichere(id, nutzerId, e.themaId, e.text)
        return AufsatzDto(id, e.themaId, e.text, woerter(e.text), null)
    }

    fun lies(nutzerId: String, id: String): AufsatzDto? {
        val (themaId, text, korrektur) = repo.finde(id, nutzerId) ?: return null
        return AufsatzDto(id, themaId, text, woerter(text), korrektur?.let {
            runCatching { json.decodeFromString<Korrektur>(it) }.getOrNull()
        })
    }

    fun woerter(t: String) = Regex("""[\p{L}\p{N}'’\-]+""").findAll(t).count()

    /* ------------------------------------------------------------------- */

    class NichtVerfuegbar(text: String) : RuntimeException(text)

    /**
     * @param schultyp Der Schultyp des Nutzers. Er entscheidet, nach WELCHEM
     *   Massstab korrigiert wird. Ohne ihn wuerde ein Berner Aufsatz nach den
     *   Zuercher Anforderungen beurteilt — und niemand merkte es, weil das
     *   Modell trotzdem eine ordentlich aussehende Antwort liefert.
     */
    suspend fun korrigiere(nutzerId: String, id: String, schultyp: Schultyp?): Korrektur {
        val (themaId, text, _) = repo.finde(id, nutzerId)
            ?: throw NichtVerfuegbar("Diesen Aufsatz gibt es nicht.")
        val thema = Katalog.aufsatzThemen.firstOrNull { it.id == themaId }
            ?: throw NichtVerfuegbar("Das Thema gibt es nicht mehr.")
        if (woerter(text) < 120) {
            throw NichtVerfuegbar("Der Text ist noch zu kurz für eine Korrektur. Ab etwa 120 Wörtern lohnt es sich.")
        }
        val schluessel = konfig.modellSchluessel
            ?: throw NichtVerfuegbar("Die Korrektur ist gerade nicht verfügbar. Dein Text ist gespeichert.")

        val antwort: ModellAntwort = http.post("https://api.anthropic.com/v1/messages") {
            header("x-api-key", schluessel)
            header("anthropic-version", "2023-06-01")
            contentType(ContentType.Application.Json)
            setBody(
                ModellBitte(
                    model = konfig.modell,
                    max_tokens = 6000,
                    system = massstab(schultyp) + SYSTEM,
                    messages = listOf(Nachricht("user", prompt(thema, text))),
                ),
            )
        }.body()

        val roh = antwort.content.firstOrNull()?.text
            ?: throw NichtVerfuegbar("Die Korrektur kam leer zurück. Versuch es gleich nochmals.")
        // Antwortet das Modell einmal nicht nach Schema — abgeschnitten, ein
        // Feld vergessen, ein Satz davor —, ist das ein Grund fuer «gleich
        // nochmals», nicht fuer einen 500er. Vorher fing den Fehler niemand,
        // und aus 90 Minuten Schreiben wurde «Da ist etwas schiefgelaufen».
        val korrektur = try {
            json.decodeFromString<Korrektur>(nurJson(roh))
        } catch (e: Exception) {
            throw NichtVerfuegbar(
                "Die Korrektur kam unvollständig zurück. Dein Text ist gespeichert — " +
                    "versuch es gleich nochmals.",
            )
        }
        if (korrektur.kriterien.isEmpty()) {
            throw NichtVerfuegbar(
                "Die Korrektur kam ohne Beurteilung zurück. Dein Text ist gespeichert — " +
                    "versuch es gleich nochmals.",
            )
        }
        repo.merkeKorrektur(id, json.encodeToString(Korrektur.serializer(), korrektur))
        return korrektur
    }

    /** Das Modell antwortet manchmal mit einem Codeblock drumherum. */
    private fun nurJson(s: String): String {
        val a = s.indexOf('{'); val b = s.lastIndexOf('}')
        return if (a in 0..<b) s.substring(a, b + 1) else s
    }

    private fun prompt(t: AufsatzThema, text: String) = """
Korrigiere den folgenden Prüfungstext.

THEMA
Titel: ${t.titel}
Erwartete Textsorte: ${t.sorte}
Auftrag im Wortlaut: ${t.auftrag}

TEILAUFTRÄGE
${t.teile.mapIndexed { i, x -> "${i + 1}. $x" }.joinToString("\n")}

TEXT DER SCHÜLERIN ODER DES SCHÜLERS (${woerter(text)} Wörter)
---
$text
---

Antworte ausschliesslich mit einem JSON-Objekt in genau diesem Schema, ohne
Text davor oder danach:

$SCHEMA
""".trimIndent()

    /**
     * Der Massstab dieser Pruefung, vor den allgemeinen Teil gesetzt.
     *
     * Steht fuer eine Pruefung noch kein Rahmen im Katalog, bleibt dieser
     * Abschnitt leer — dann korrigiert das Modell nach den allgemeinen
     * Kriterien A bis D. Das ist weniger genau, aber es ist ehrlich; ein
     * fremder Kantonsmassstab waere schlicht falsch.
     */
    private fun massstab(schultyp: Schultyp?): String {
        val r = Katalog.pruefung(schultyp?.pruefungId)?.aufsatzrahmen ?: return ""
        if (r.grundlage.isBlank() && r.anforderungen.isEmpty()) return ""
        val teile = mutableListOf<String>()
        if (r.rolle.isNotBlank()) {
            val teilname = r.teilname.ifBlank { "den schriftlichen Prüfungsteil" }
            teile += "Du bist ${r.rolle} und korrigierst $teilname."
        }
        if (r.grundlage.isNotBlank() || r.anforderungen.isNotEmpty()) {
            teile += "BEWERTUNGSGRUNDLAGE — ${r.grundlage}\n" +
                r.anforderungen.joinToString("\n")
        }
        val rahmen = buildString {
            if (r.rahmen.isNotBlank()) append("PRÜFUNGSRAHMEN: ${r.rahmen}")
            if (r.woerterVon > 0 && r.woerterBis > 0) {
                if (isNotEmpty()) append(" ")
                append("Ein vollständiger Text umfasst ${r.woerterVon}–${r.woerterBis} Wörter.")
            }
        }
        if (rahmen.isNotBlank()) teile += rahmen
        return teile.joinToString("\n\n") + "\n\n"
    }

    private companion object {
        // Was hier steht, gilt in JEDEM Kanton. Der kantonale Massstab —
        // Rolle, Anforderungen, Dauer, Wortzahl — kommt aus dem Katalog und
        // wird davorgesetzt; siehe `massstab`.
        val SYSTEM = """
Es gilt Schweizer Rechtschreibung: immer «ss», nie «ß».

TON: Du schreibst an eine 14- bis 16-jährige Person. Duze sie. Sag zuerst, was
gelungen ist, und dann konkret, was zu tun ist — mit Bezug auf Stellen im Text,
nie pauschal. Keine Floskeln, keine Herablassung.

BEWERTUNG: Gib KEINE Note und keine Punktzahl. Beurteile jedes der vier
Kriterien einzeln mit genau einer dieser vier Stufen:

  "noch_nicht"  — das Kriterium ist im Text nicht erkennbar erfüllt
  "teilweise"   — Ansätze sind da, tragen aber noch nicht durch
  "erreicht"    — das Kriterium ist erfüllt
  "sicher"      — das Kriterium ist durchgehend und sicher erfüllt

Der Grund: Diese Rückmeldung soll zeigen, was als Nächstes zu tun ist. Eine
Note sagt einer 14-Jährigen, wo sie steht, aber nicht, was sie tun soll — und
sie erzeugt Druck, wo Übung nötig wäre. Formuliere darum zu jedem Kriterium
konkret, woran man die Stufe im Text sieht und was den nächsten Schritt
ausmacht.
""".trimIndent()

        val SCHEMA = """
{
  "gesamt": "Zwei bis drei Sätze: zuerst, was der Text schon trägt, dann der eine Punkt, an dem es sich als Nächstes zu arbeiten lohnt. Keine Note, keine Punktzahl.",
  "kriterien": [
    {"kuerzel":"A","name":"Aufgabenerfüllung & Inhalt","stufe":"erreicht","kommentar":"Ein bis zwei Sätze.","staerken":["..."],"baustellen":["..."]},
    {"kuerzel":"B","name":"Aufbau & Struktur","stufe":"teilweise","kommentar":"...","staerken":["..."],"baustellen":["..."]},
    {"kuerzel":"C","name":"Ausdruck & Wortschatz","stufe":"erreicht","kommentar":"...","staerken":["..."],"baustellen":["..."]},
    {"kuerzel":"D","name":"Sprachrichtigkeit","stufe":"sicher","kommentar":"...","staerken":["..."],"baustellen":["..."]}
  ],
  "teilauftraege": [{"nr":1,"text":"Wortlaut des Teilauftrags","status":"erfuellt","hinweis":"Woran man das im Text sieht bzw. was fehlt."}],
  "textstellen": [{"zitat":"wörtliches Zitat aus dem Text","art":"Rechtschreibung","problem":"Was daran falsch oder schwach ist.","besser":"Die ausformulierte Verbesserung.","warum":"Kurze Begründung oder Regel."}],
  "staerken": ["Was der Text wirklich gut macht — konkret, mit Bezug auf den Text."],
  "naechsteSchritte": [{"fokus":"Worauf du beim nächsten Aufsatz achtest","uebung":"Eine konkrete Übung dazu."}]
}
""".trimIndent()
    }

    @Serializable private data class ModellBitte(
        val model: String, val max_tokens: Int, val system: String, val messages: List<Nachricht>,
    )
    @Serializable private data class Nachricht(val role: String, val content: String)
    @Serializable private data class ModellAntwort(val content: List<Block>)
    @Serializable private data class Block(val type: String = "text", val text: String? = null)
}
