# Play Billing und Google Sign-In werden ueber Reflexion angesprochen; ohne
# diese Zeilen verschwinden ihre Klassen im Release und der Kauf bricht ab —
# nur im Release, nicht im Debug, und darum erst nach dem Hochladen.
-keep class com.android.billingclient.** { *; }
-keep class com.google.android.gms.** { *; }

# Flutters eigener Einstiegspunkt.
-keep class io.flutter.** { *; }
-dontwarn io.flutter.embedding.**
