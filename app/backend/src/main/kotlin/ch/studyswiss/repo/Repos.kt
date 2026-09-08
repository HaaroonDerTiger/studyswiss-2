package ch.studyswiss.repo

import ch.studyswiss.daten.*
import ch.studyswiss.model.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** Repos geben Domaenentypen zurueck, nie ResultRow. Ktor sieht Exposed nie. */

class NutzerRepo {

    private fun ResultRow.alsNutzer() = Nutzer(
        id = this[Nutzers.id],
        anbieter = Anbieter.valueOf(this[Nutzers.anbieter]),
        fremdId = this[Nutzers.fremdId],
        email = this[Nutzers.email],
        vorname = this[Nutzers.vorname],
        kanton = this[Nutzers.kanton],
        schultyp = this[Nutzers.schultyp],
        pruefungsdatum = this[Nutzers.pruefungsdatum],
        elternFreigabe = this[Nutzers.elternFreigabe],
        plusBis = this[Nutzers.plusBis],
        erstelltAm = this[Nutzers.erstelltAm],
    )

    fun finde(id: String): Nutzer? = transaction {
        Nutzers.selectAll().where { Nutzers.id eq id }.singleOrNull()?.alsNutzer()
    }

    fun findeOderLege(anbieter: Anbieter, fremdId: String, email: String?, vorname: String?): Nutzer =
        transaction {
            val da = Nutzers.selectAll()
                .where { (Nutzers.anbieter eq anbieter.name) and (Nutzers.fremdId eq fremdId) }
                .singleOrNull()
            if (da != null) return@transaction da.alsNutzer()

            val neu = UUID.randomUUID().toString()
            Nutzers.insert {
                it[Nutzers.id] = neu
                it[Nutzers.anbieter] = anbieter.name
                it[Nutzers.fremdId] = fremdId
                // Apple liefert E-Mail und Namen nur beim allerersten Mal.
                it[Nutzers.email] = email
                it[Nutzers.vorname] = vorname
                it[erstelltAm] = Instant.now()
            }
            finde(neu)!!
        }

    fun aendere(id: String, a: ProfilAenderung): Nutzer = transaction {
        Nutzers.update({ Nutzers.id eq id }) { r ->
            a.vorname?.let { r[vorname] = it.take(60) }
            a.kanton?.let { r[kanton] = it }
            a.schultyp?.let { r[schultyp] = it }
            a.pruefungsdatum?.let { r[pruefungsdatum] = LocalDate.parse(it) }
        }
        finde(id)!!
    }

    fun setzeElternFreigabe(id: String, aktiv: Boolean) = transaction {
        Nutzers.update({ Nutzers.id eq id }) { it[elternFreigabe] = aktiv }
        Unit
    }

    fun setzePlus(id: String, bis: Instant?) = transaction {
        Nutzers.update({ Nutzers.id eq id }) { it[plusBis] = bis }
        Unit
    }

    class SchonVergeben(text: String) : RuntimeException(text)

    /**
     * Verknuepft ein Gastkonto mit Apple oder Google. Der Fortschritt bleibt,
     * weil die Nutzer-ID dieselbe bleibt.
     *
     * Gehoert die Kennung schon einem anderen Konto, wird das hier gesagt.
     * Vorher lief der `update` blind los, der eindeutige Index
     * `nutzer_anbieter_fremd` schlug zu, und die `ExposedSQLException` fing
     * niemand: Aus «neues Telefon, erst als Gast losgelegt, jetzt die eigene
     * Apple-ID verknuepft» wurde «Da ist etwas schiefgelaufen».
     */
    fun verknuepfe(id: String, anbieter: Anbieter, fremdId: String, email: String?): Nutzer = transaction {
        val fremd = Nutzers.selectAll()
            .where { (Nutzers.anbieter eq anbieter.name) and (Nutzers.fremdId eq fremdId) }
            .singleOrNull()
        if (fremd != null && fremd[Nutzers.id] != id) {
            throw SchonVergeben(
                "Dieses Konto gehört schon zu einem anderen Profil. " +
                    "Melde dich damit an — dein Fortschritt von dort ist noch da.",
            )
        }
        Nutzers.update({ Nutzers.id eq id }) {
            it[Nutzers.anbieter] = anbieter.name
            it[Nutzers.fremdId] = fremdId
            if (email != null) it[Nutzers.email] = email
        }
        finde(id)!!
    }

    fun loesche(id: String) = transaction {
        Versuche.deleteWhere { Versuche.nutzerId eq id }
        Sets.deleteWhere { Sets.nutzerId eq id }
        Aufsaetze.deleteWhere { Aufsaetze.nutzerId eq id }
        Abos.deleteWhere { Abos.nutzerId eq id }
        RefreshTokens.deleteWhere { RefreshTokens.nutzerId eq id }
        Nutzers.deleteWhere { Nutzers.id eq id }
        Unit
    }
}

class TokenRepo {
    fun lege(nutzerId: String, gueltigTage: Long): String = transaction {
        val t = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().take(8)
        RefreshTokens.insert {
            it[token] = t
            it[RefreshTokens.nutzerId] = nutzerId
            it[laeuftAb] = Instant.now().plusSeconds(gueltigTage * 86400)
        }
        t
    }

    /** Rotierend: Wer einloest, verliert das alte Token sofort. */
    fun loeseEin(token: String): String? = transaction {
        val r = RefreshTokens.selectAll().where { RefreshTokens.token eq token }.singleOrNull()
            ?: return@transaction null
        if (r[RefreshTokens.zurueckgezogen] || r[RefreshTokens.laeuftAb].isBefore(Instant.now())) {
            return@transaction null
        }
        RefreshTokens.update({ RefreshTokens.token eq token }) { it[zurueckgezogen] = true }
        r[RefreshTokens.nutzerId]
    }

    /** Beim Abmelden. Ein Token, das nur im Browser geloescht wird, ist
     *  nicht geloescht — es liegt weiterhin gueltig in der Datenbank, und
     *  wer es abgefangen hat, benutzt es weiter. */
    fun ziehZurueck(token: String) = transaction {
        RefreshTokens.update({ RefreshTokens.token eq token }) { it[zurueckgezogen] = true }
        Unit
    }
}

class VersuchRepo {

    private fun ResultRow.alsVersuch() = Versuch(
        id = this[Versuche.id].value,
        nutzerId = this[Versuche.nutzerId],
        aufgabeRef = this[Versuche.aufgabeRef],
        lernzielId = this[Versuche.lernzielId],
        unterthema = this[Versuche.unterthema],
        fach = this[Versuche.fach],
        richtig = this[Versuche.richtig],
        diagnoseId = this[Versuche.diagnoseId],
        hinweiseGenutzt = this[Versuche.hinweiseGenutzt],
        quelle = Quelle.valueOf(this[Versuche.quelle]),
        zeitpunkt = this[Versuche.zeitpunkt],
    )

    fun merke(v: Versuch) = transaction {
        Versuche.insert {
            it[nutzerId] = v.nutzerId
            it[aufgabeRef] = v.aufgabeRef
            it[lernzielId] = v.lernzielId
            it[unterthema] = v.unterthema
            it[fach] = v.fach
            it[richtig] = v.richtig
            it[diagnoseId] = v.diagnoseId
            it[hinweiseGenutzt] = v.hinweiseGenutzt
            it[quelle] = v.quelle.name
            it[zeitpunkt] = v.zeitpunkt
        }
        Unit
    }

    fun alle(nutzerId: String): List<Versuch> = transaction {
        Versuche.selectAll().where { Versuche.nutzerId eq nutzerId }
            .orderBy(Versuche.zeitpunkt to SortOrder.ASC).map { it.alsVersuch() }
    }

    fun seit(nutzerId: String, ab: Instant): List<Versuch> = transaction {
        Versuche.selectAll()
            .where { (Versuche.nutzerId eq nutzerId) and (Versuche.zeitpunkt greaterEq ab) }
            .orderBy(Versuche.zeitpunkt to SortOrder.ASC).map { it.alsVersuch() }
    }

    /** Die Refs, die im Thema schon richtig geloest sind — jede nur einmal.
     *  Wer dieselbe Aufgabe zweimal loest, kommt dem Pflichtset nicht naeher. */
    fun geloest(nutzerId: String, fach: String, unterthema: String): Set<String> = transaction {
        Versuche.selectAll().where {
            (Versuche.nutzerId eq nutzerId) and (Versuche.fach eq fach) and
                (Versuche.unterthema eq unterthema) and (Versuche.richtig eq true)
        }.map { it[Versuche.aufgabeRef] }.toSet()
    }

    fun letzteFehler(nutzerId: String, grenze: Int = 60): List<Versuch> = transaction {
        Versuche.selectAll().where { (Versuche.nutzerId eq nutzerId) and (Versuche.richtig eq false) }
            .orderBy(Versuche.zeitpunkt to SortOrder.DESC).limit(grenze).map { it.alsVersuch() }
    }
}

class SetRepo {
    fun lege(id: String, nutzerId: String, art: String, fach: String?, unterthema: String?,
             umfang: String?, refs: List<String>) = transaction {
        Sets.insert {
            it[Sets.id] = id
            it[Sets.nutzerId] = nutzerId
            it[Sets.art] = art
            it[Sets.fach] = fach
            it[Sets.unterthema] = unterthema
            it[Sets.umfang] = umfang
            it[Sets.refs] = refs.joinToString(",")
            it[begonnen] = Instant.now()
        }
        Unit
    }

    /**
     * Unter welchem Unterthema dieses Set geübt wurde.
     *
     * Nötig, weil eine Aufgabe mehrere Unterthemen abdecken kann. Die
     * Aufgaben-Referenz `templateId:seed` sagt nicht, für welches davon sie
     * gezogen wurde — das weiss nur das Set. Ohne diese Auskunft verbucht
     * sich eine Übung zu «Verhältnisse» unter «Prozentrechnen», das geübte
     * Thema bleibt bei null und der Scheduler schlägt es endlos wieder vor.
     */
    fun unterthema(id: String, nutzerId: String): String? = transaction {
        Sets.selectAll().where { (Sets.id eq id) and (Sets.nutzerId eq nutzerId) }
            .singleOrNull()?.get(Sets.unterthema)
    }

    /** Zu welchem Fach dieses Set gehoert. Die Standortbestimmung laeuft je
     *  Pruefungsfach; ohne diese Auskunft wuesste der Startpunkt nicht, ueber
     *  welches Fach er redet. */
    fun fach(id: String, nutzerId: String): String? = transaction {
        Sets.selectAll().where { (Sets.id eq id) and (Sets.nutzerId eq nutzerId) }
            .singleOrNull()?.get(Sets.fach)
    }

    fun refs(id: String, nutzerId: String): List<String>? = transaction {
        Sets.selectAll().where { (Sets.id eq id) and (Sets.nutzerId eq nutzerId) }
            .singleOrNull()?.get(Sets.refs)?.split(",")?.filter { it.isNotBlank() }
    }

    fun beende(id: String, punkte: Int, maximum: Int) = transaction {
        Sets.update({ Sets.id eq id }) {
            it[beendet] = Instant.now(); it[Sets.punkte] = punkte; it[Sets.maximum] = maximum
        }
        Unit
    }

    fun versuche(nutzerId: String, art: String): List<VersuchZeile> = transaction {
        Sets.selectAll()
            .where { (Sets.nutzerId eq nutzerId) and (Sets.art eq art) and (Sets.beendet.isNotNull()) }
            .orderBy(Sets.begonnen to SortOrder.DESC).limit(20)
            .map {
                VersuchZeile(
                    id = it[Sets.id],
                    fach = it[Sets.fach] ?: "",
                    umfang = it[Sets.umfang] ?: "",
                    datum = it[Sets.begonnen].toString().take(10),
                    punkte = it[Sets.punkte] ?: 0,
                    maximum = it[Sets.maximum] ?: 0,
                )
            }
    }
}

class AufsatzRepo {
    fun speichere(id: String, nutzerId: String, themaId: Int, text: String) = transaction {
        val da = Aufsaetze.selectAll().where { Aufsaetze.id eq id }.count() > 0
        if (da) {
            Aufsaetze.update({ Aufsaetze.id eq id }) {
                it[Aufsaetze.text] = text; it[geaendert] = Instant.now()
            }
        } else {
            Aufsaetze.insert {
                it[Aufsaetze.id] = id
                it[Aufsaetze.nutzerId] = nutzerId
                it[Aufsaetze.themaId] = themaId
                it[Aufsaetze.text] = text
                it[geaendert] = Instant.now()
            }
        }
        Unit
    }

    fun finde(id: String, nutzerId: String): Triple<Int, String, String?>? = transaction {
        Aufsaetze.selectAll().where { (Aufsaetze.id eq id) and (Aufsaetze.nutzerId eq nutzerId) }
            .singleOrNull()
            ?.let { Triple(it[Aufsaetze.themaId], it[Aufsaetze.text], it[Aufsaetze.korrektur]) }
    }

    fun merkeKorrektur(id: String, json: String) = transaction {
        Aufsaetze.update({ Aufsaetze.id eq id }) { it[korrektur] = json }
        Unit
    }
}
