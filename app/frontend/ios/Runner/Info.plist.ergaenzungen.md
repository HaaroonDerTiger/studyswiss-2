# iOS — was in `ios/Runner/Info.plist` und in Xcode gesetzt sein muss

Diese Datei ist kein Build-Artefakt. Sie hält fest, was beim Einrichten des
iOS-Ziels von Hand zu tun ist, damit man es nicht zweimal herausfinden muss.

## Info.plist

```xml
<key>CFBundleDisplayName</key>
<string>StudySwiss</string>

<key>CFBundleLocalizations</key>
<array><string>de</string></array>
<key>CFBundleDevelopmentRegion</key>
<string>de_CH</string>

<!-- Ohne diesen Eintrag lehnt die Review die App wegen fehlender
     Datenschutzangabe ab, sobald der Schlüsselbund benutzt wird. -->
<key>NSFaceIDUsageDescription</key>
<string>Damit du dich ohne Passwort anmelden kannst.</string>
```

## Fähigkeiten in Xcode (Signing & Capabilities)

| Fähigkeit | Wofür |
|---|---|
| **Sign in with Apple** | Pflicht, sobald ein zweiter Anmeldeanbieter da ist — App Store Review Guideline 4.8. |
| **In-App Purchase** | StoreKit 2 für die drei Produkte. |
| **Keychain Sharing** | `flutter_secure_storage` legt die Tokens dort ab. |

## Produkte in App Store Connect

Die IDs müssen **auf das Zeichen genau** mit `lib/daten/kauf.dart` übereinstimmen,
sonst kommt `queryProductDetails` leer zurück und der Kauf-Screen zeigt
«Nicht verfügbar».

| ID | Art | Preis |
|---|---|---|
| `ch.studyswiss.plus.pass` | Non-Consumable | CHF 129.– |
| `ch.studyswiss.plus.familie` | Non-Consumable | CHF 189.– |
| `ch.studyswiss.plus.monat` | Auto-Renewable Subscription | CHF 19.– / Monat |

## Server-zu-Server

Für `APPLE_SERVER_TOKEN` braucht das Backend einen signierten JWT aus:
Issuer-ID, Key-ID und dem privaten Schlüssel (`.p8`) aus App Store Connect →
Users and Access → Integrations → In-App Purchase. **Ohne diesen Schlüssel
lehnt der Server in Produktion jeden Kauf ab** — lieber kein Plus als ein
Plus, das sich jeder selbst ausstellt.

## Vor der Einreichung

- Der Sandbox-Kauf muss durchlaufen, inklusive «Kauf wiederherstellen».
- Die Altersfreigabe steht auf 4+, es gibt keine Werbung und keine Chats.
- In der Datenschutzangabe: E-Mail-Adresse (optional, nur bei Apple/Google-
  Anmeldung), Nutzungsdaten (Lernfortschritt). Nichts davon wird zum
  Nachverfolgen über Apps hinweg verwendet — «Tracking» bleibt aus.
