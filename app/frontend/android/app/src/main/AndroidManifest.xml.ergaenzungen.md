# Android — was ins Manifest und in die Play Console gehört

## AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Ohne diese Berechtigung schlägt jeder Kauf still fehl. -->
    <uses-permission android:name="com.android.vending.BILLING" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:label="StudySwiss"
        android:icon="@mipmap/ic_launcher"
        android:enableOnBackInvokedCallback="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:windowSoftInputMode="adjustResize">
            ...
        </activity>
    </application>
</manifest>
```

`android:windowSoftInputMode="adjustResize"` ist wichtig: Ohne das verdeckt
die Tastatur beim Aufsatzschreiben die halbe Schreibfläche.

## build.gradle

```groovy
android {
    compileSdk 35
    defaultConfig {
        applicationId "ch.studyswiss.app"   // muss zu ANDROID_PAKET passen
        minSdk 23                            // flutter_secure_storage verlangt 23
        targetSdk 35
    }
}
```

## Produkte in der Play Console

Dieselben IDs wie bei Apple, damit im Code keine Fallunterscheidung nötig ist.

| ID | Ort in der Console | Preis |
|---|---|---|
| `ch.studyswiss.plus.pass` | Einmalige Produkte | CHF 129.– |
| `ch.studyswiss.plus.familie` | Einmalige Produkte | CHF 189.– |
| `ch.studyswiss.plus.monat` | Abos, Basisplan monatlich | CHF 19.– |

## Server-zu-Server

`GOOGLE_SERVER_TOKEN` ist ein OAuth-Zugriffstoken eines Dienstkontos mit der
Rolle «Finanzdaten anzeigen, Bestellungen und Abos verwalten». Das Dienstkonto
wird in der Google Cloud Console angelegt und in der Play Console unter
Nutzer und Berechtigungen freigegeben.

## Vor der Veröffentlichung

- **Datensicherheit ausfüllen**: erhobene Daten sind E-Mail (optional) und
  App-Aktivität (Lernfortschritt). Keine Weitergabe, keine Werbe-IDs.
- **Zielgruppe**: Die App richtet sich an 13- bis 16-Jährige. Damit gilt die
  Richtlinie für Familien — kein Werbe-SDK, keine Standortdaten.
- Der Kauf muss auf einem echten Gerät im internen Testkanal durchlaufen.
