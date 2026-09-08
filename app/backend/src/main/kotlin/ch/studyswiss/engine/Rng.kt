package ch.studyswiss.engine

/**
 * Bitgenau dieselbe Implementierung wie die JS-Fassung in
 * `kantone/zuerich/Mathematik/zap-trainer/demo-kurzzeit.html`. Wer sie aendert, aendert jede bisher
 * gespeicherte Aufgabe — das ist ein Datenmigrationsfall, kein Refactoring.
 *
 * Der Seed wird zuerst gestreut. Ohne das Streuen liefern die Seeds 1, 2, 3
 * sehr aehnliche erste Ziehungen, und die ersten Aufgaben aller Nutzer sehen
 * gleich aus.
 */
class Rng(seed: Int) {

    private var s: Int = run {
        var x = seed + -0x61c88647            // 0x9e3779b9 als vorzeichenbehafteter Int
        x = (x xor (x ushr 16)) * 0x21f0aaad
        x = (x xor (x ushr 15)) * 0x735a2d97
        x xor (x ushr 15)
    }

    /** Gleichverteilt in [0, 1). */
    fun next(): Double {
        s += 0x6d2b79f5
        var t = s
        t = (t xor (t ushr 15)) * (t or 1)
        t = t xor (t + ((t xor (t ushr 7)) * (t or 61)))
        return ((t xor (t ushr 14)).toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0
    }

    /** Ganzzahl in [min, max], beide Enden eingeschlossen. */
    fun int(min: Int, max: Int): Int = min + (next() * (max - min + 1)).toInt()

    fun <T> pick(a: List<T>): T = a[int(0, a.size - 1)]

    fun <T> shuffle(a: List<T>): List<T> {
        val b = a.toMutableList()
        for (i in b.indices.reversed()) {
            if (i == 0) break
            val j = int(0, i)
            val h = b[i]; b[i] = b[j]; b[j] = h
        }
        return b
    }
}
