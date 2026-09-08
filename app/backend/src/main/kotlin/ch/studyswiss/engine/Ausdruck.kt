package ch.studyswiss.engine

import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToLong
import kotlin.math.sqrt

/**
 * Eigener Auswerter fuer arithmetische Ausdruecke.
 *
 * Bewusst kein `ScriptEngine`, keine Reflection, kein `eval`: Templates sind
 * Daten, und Daten duerfen nie zu Code werden. Erlaubt sind Zahlen, die
 * deklarierten Variablennamen, die Operatoren und die Funktionen unten.
 * Alles andere wirft beim Parsen, nicht erst beim Auswerten.
 */
object Ausdruck {

    class Ungueltig(text: String) : IllegalArgumentException(text)

    private val FUNKTIONEN: Map<String, (List<Double>) -> Double> = mapOf(
        "floor" to { a -> floor(a[0]) },
        "ceil" to { a -> ceil(a[0]) },
        "round" to { a -> Math.round(a[0]).toDouble() },
        "abs" to { a -> abs(a[0]) },
        "min" to { a -> a.reduce(::min) },
        "max" to { a -> a.reduce(::max) },
        "pow" to { a -> a[0].pow(a[1]) },
        "sqrt" to { a -> sqrt(a[0]) },
        "ggt" to { a -> ggt(abs(a[0]).toLong(), abs(a[1]).toLong()).toDouble() },
        "istGanz" to { a -> if (abs(a[0] - Math.round(a[0])) < 1e-9) 1.0 else 0.0 },
        "teilerImBereich" to { a ->
            val n = a[0].toLong()
            var anzahl = 0
            var k = ceil(a[1]).toLong()
            val bis = floor(a[2]).toLong()
            while (k <= bis) {
                if (k != 0L && n % k == 0L) anzahl++
                k++
            }
            anzahl.toDouble()
        },
    )

    private tailrec fun ggt(a: Long, b: Long): Long = if (b == 0L) a else ggt(b, a % b)

    /* ------------------------------ Tokens ------------------------------ */

    private sealed interface Token {
        data class Zahl(val wert: Double) : Token
        data class Name(val text: String) : Token
        data class Op(val text: String) : Token
        data object KlammerAuf : Token
        data object KlammerZu : Token
        data object Komma : Token
    }

    private val OPERATOREN = listOf(
        "<=", ">=", "==", "!=", "&&", "||",
        "+", "-", "*", "/", "%", "<", ">", "?", ":", "!",
    )

    private fun tokenisiere(quelle: String): List<Token> {
        val out = mutableListOf<Token>()
        var i = 0
        while (i < quelle.length) {
            val c = quelle[i]
            when {
                c.isWhitespace() -> i++
                c.isDigit() || (c == '.' && i + 1 < quelle.length && quelle[i + 1].isDigit()) -> {
                    val start = i
                    while (i < quelle.length && (quelle[i].isDigit() || quelle[i] == '.')) i++
                    out += Token.Zahl(
                        quelle.substring(start, i).toDoubleOrNull()
                            ?: throw Ungueltig("Keine Zahl: ${quelle.substring(start, i)}"),
                    )
                }
                c.isLetter() || c == '_' -> {
                    val start = i
                    while (i < quelle.length && (quelle[i].isLetterOrDigit() || quelle[i] == '_')) i++
                    out += Token.Name(quelle.substring(start, i))
                }
                c == '(' -> { out += Token.KlammerAuf; i++ }
                c == ')' -> { out += Token.KlammerZu; i++ }
                c == ',' -> { out += Token.Komma; i++ }
                else -> {
                    val op = OPERATOREN.firstOrNull { quelle.startsWith(it, i) }
                        ?: throw Ungueltig("Unerlaubtes Zeichen '$c' in \"$quelle\"")
                    out += Token.Op(op)
                    i += op.length
                }
            }
        }
        return out
    }

    /* --------------------------- Rekursiver Abstieg --------------------- */

    private class Parser(val tokens: List<Token>, val scope: Map<String, Double>, val quelle: String) {
        var pos = 0

        fun schau(): Token? = tokens.getOrNull(pos)

        fun frissOp(vararg was: String): String? {
            val t = schau()
            if (t is Token.Op && t.text in was) { pos++; return t.text }
            return null
        }

        fun erwarte(t: Token) {
            if (schau() != t) throw Ungueltig("Erwartet $t in \"$quelle\"")
            pos++
        }

        /** Tiefste Ebene zuerst: Bedingungsoperator `a ? b : c`. */
        fun bedingt(): Double {
            val pruefung = oder()
            if (frissOp("?") == null) return pruefung
            val dann = bedingt()
            erwarte(Token.Op(":"))
            val sonst = bedingt()
            return if (pruefung != 0.0) dann else sonst
        }

        fun oder(): Double {
            var l = und()
            while (frissOp("||") != null) {
                val r = und()
                l = if (l != 0.0 || r != 0.0) 1.0 else 0.0
            }
            return l
        }

        fun und(): Double {
            var l = vergleich()
            while (frissOp("&&") != null) {
                val r = vergleich()
                l = if (l != 0.0 && r != 0.0) 1.0 else 0.0
            }
            return l
        }

        fun vergleich(): Double {
            var l = summe()
            while (true) {
                val op = frissOp("<", ">", "<=", ">=", "==", "!=") ?: return l
                val r = summe()
                // Vergleiche laufen mit Toleranz: Fliesskomma-Artefakte sollen
                // eine Bedingung nicht kippen.
                val b = when (op) {
                    "<" -> l < r - 1e-9
                    ">" -> l > r + 1e-9
                    "<=" -> l <= r + 1e-9
                    ">=" -> l >= r - 1e-9
                    "==" -> abs(l - r) < 1e-9
                    else -> abs(l - r) >= 1e-9
                }
                l = if (b) 1.0 else 0.0
            }
        }

        fun summe(): Double {
            var l = produkt()
            while (true) {
                val op = frissOp("+", "-") ?: return l
                val r = produkt()
                l = if (op == "+") l + r else l - r
            }
        }

        fun produkt(): Double {
            var l = unaer()
            while (true) {
                val op = frissOp("*", "/", "%") ?: return l
                val r = unaer()
                if ((op == "/" || op == "%") && abs(r) < 1e-12) {
                    throw Ungueltig("Division durch null in \"$quelle\"")
                }
                l = when (op) {
                    "*" -> l * r
                    "/" -> l / r
                    else -> l.toLong().toDouble() % r.toLong().toDouble()
                }
            }
        }

        fun unaer(): Double {
            frissOp("-")?.let { return -unaer() }
            frissOp("+")?.let { return unaer() }
            frissOp("!")?.let { return if (unaer() == 0.0) 1.0 else 0.0 }
            return primaer()
        }

        fun primaer(): Double {
            val t = schau() ?: throw Ungueltig("Ausdruck bricht ab: \"$quelle\"")
            when (t) {
                is Token.Zahl -> { pos++; return t.wert }
                is Token.KlammerAuf -> {
                    pos++
                    val w = bedingt()
                    erwarte(Token.KlammerZu)
                    return w
                }
                is Token.Name -> {
                    pos++
                    if (schau() == Token.KlammerAuf) {
                        val fn = FUNKTIONEN[t.text]
                            ?: throw Ungueltig("Unbekannte Funktion \"${t.text}\" in \"$quelle\"")
                        pos++
                        val args = mutableListOf<Double>()
                        if (schau() != Token.KlammerZu) {
                            args += bedingt()
                            while (schau() == Token.Komma) { pos++; args += bedingt() }
                        }
                        erwarte(Token.KlammerZu)
                        return fn(args)
                    }
                    return scope[t.text]
                        ?: throw Ungueltig("Unbekannter Name \"${t.text}\" in \"$quelle\"")
                }
                else -> throw Ungueltig("Unerwartet $t in \"$quelle\"")
            }
        }
    }

    /**
     * Prueft, ob der Ausdruck ueberhaupt parsierbar ist und nur die erlaubten
     * Namen verwendet. Wird beim Laden eines Templates aufgerufen, damit ein
     * Tippfehler nicht erst bei einem bestimmten Seed auffliegt.
     */
    fun pruefe(quelle: String, erlaubteNamen: Collection<String>) {
        val tokens = tokenisiere(quelle)
        for ((i, t) in tokens.withIndex()) {
            if (t !is Token.Name) continue
            val istAufruf = tokens.getOrNull(i + 1) == Token.KlammerAuf
            if (istAufruf) {
                if (t.text !in FUNKTIONEN) throw Ungueltig("Unbekannte Funktion \"${t.text}\" in \"$quelle\"")
            } else if (t.text !in erlaubteNamen) {
                throw Ungueltig("Unbekannter Name \"${t.text}\" in \"$quelle\"")
            }
        }
    }

    /** Wertet aus und zieht Fliesskomma-Artefakte glatt (0.1 + 0.2). */
    fun werteAus(quelle: String, scope: Map<String, Double>): Double {
        val p = Parser(tokenisiere(quelle), scope, quelle)
        val r = p.bedingt()
        if (p.pos != p.tokens.size) throw Ungueltig("Rest nach dem Ausdruck: \"$quelle\"")
        if (!r.isFinite()) throw Ungueltig("\"$quelle\" ergibt $r")
        return (r * 1e6).roundToLong() / 1e6
    }

    fun bedingungErfuellt(quelle: String, scope: Map<String, Double>): Boolean =
        werteAus(quelle, scope) != 0.0
}
