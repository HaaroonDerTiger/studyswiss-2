# iOS — bauen und nach TestFlight hochladen

Diese Datei ist kein Build-Artefakt. Sie hält fest, wie aus dem Quelltext ein
Build in TestFlight wird, damit man es nicht zweimal herausfinden muss.

## Die Kennungen

| | |
|---|---|
| Bundle-ID | `at.horizonapps.study-swiss` |
| Team | `MP66YWAZ26` |
| Version / Build | steht in `pubspec.yaml`, sonst nirgends |

Die Bundle-ID gehört zum **bestehenden** Ladeneintrag. Wer sie ändert, legt
eine zweite App an und verliert die Bestandskunden — das ist kein Tippfehler,
den man nebenbei korrigiert.

## Der Bau

```sh
cd app/frontend
flutter pub get
flutter analyze          # muss sauber sein, unused_import ist hier ein Fehler
flutter test

flutter build ipa \
  --export-options-plist=ios/ExportOptions.plist \
  --dart-define=STUDYSWISS_API=https://api.studyswiss.ch/v1
```

**Das `--dart-define` ist nicht optional.** Ohne es steht in `api.dart` der
Vorgabewert `http://localhost:8080/v1`, und die App im Laden redet mit einem
Server, den es auf dem Telefon eines Kindes nicht gibt. Der Bau läuft trotzdem
durch; der Fehler zeigt sich erst beim ersten Anmeldeversuch des Testers.

## Die rsync-Falle

Wenn der Bau mit `error: exportArchive Copy failed` abbricht, liegt es fast
sicher nicht an Zertifikaten. Im Protokoll unter
`/var/folders/.../Runner_*.xcdistributionlogs/IDEDistributionPipeline.log`
steht dann die eigentliche Zeile:

```
rsync: on remote machine: --extended-attributes: unknown option
rsync error: syntax or usage error (code 1) [server=3.4.1]
```

Xcode ruft `/usr/bin/rsync` (Apples openrsync) mit `-E` auf. Für die lokale
Kopie startet rsync sich selbst noch einmal — und nimmt dafür das erste
`rsync` aus dem `PATH`. Liegt dort Homebrews rsync 3.4.1 vor `/usr/bin`,
reden zwei verschiedene rsync miteinander, und das Fremdwort
`--extended-attributes` bringt den Server zu Fall.

Der Ausweg ist, für den Export nur die Apple-Werkzeuge sichtbar zu machen:

```sh
env PATH=/usr/bin:/bin:/usr/sbin:/sbin xcodebuild -exportArchive \
  -archivePath build/ios/archive/Runner.xcarchive \
  -exportOptionsPlist ios/ExportOptions.plist \
  -exportPath build/ios/ipa \
  -allowProvisioningUpdates
```

Homebrew deinstallieren muss man dafür nicht.

## Signieren ohne Zertifikat im Schlüsselbund

Auf diesem Rechner liegt **nur** ein Apple-Development-Zertifikat:

```sh
security find-identity -v -p codesigning
```

Für den Laden signiert Xcode trotzdem — über *cloud signing*: Der private
Schlüssel bleibt bei Apple, Xcode schickt den Hash hin und bekommt die
Signatur zurück. Deshalb steht im Archiv `Apple Development` und im fertigen
IPA `Apple Distribution`. Das ist richtig so und kein Grund, ein
Distributionszertifikat nachzuinstallieren.

## Prüfen und hochladen

Die Zugangsdaten stehen in `.env` (`APPLE_SCHLUESSEL_ID`,
`APPLE_AUSSTELLER_ID`); der Schlüssel selbst liegt unter
`~/.appstoreconnect/private_keys/AuthKey_<ID>.p8`, wo `altool` ihn von
allein findet.

```sh
# Erst prüfen — das lädt nichts hoch.
xcrun altool --validate-app -f build/ios/ipa/studyswiss.ipa -t ios \
  --apiKey <SCHLUESSEL_ID> --apiIssuer <AUSSTELLER_ID>

# Dann hochladen.
xcrun altool --upload-app -f build/ios/ipa/studyswiss.ipa -t ios \
  --apiKey <SCHLUESSEL_ID> --apiIssuer <AUSSTELLER_ID>
```

Nach dem Hochladen steht der Build 5 bis 15 Minuten auf «Processing».

## Externe Tester

Interne Tester (bis 100, alle mit Zugang zu App Store Connect) bekommen den
Build sofort. **Externe Tester brauchen eine Beta-App-Review**, einmal je
Version — nicht je Build. Dafür verlangt App Store Connect:

- Beta-App-Beschreibung und eine Kontakt-E-Mail,
- **einen Testzugang**, mit dem die Review ohne eigenes Konto hineinkommt.
  Die App kennt «Ohne Konto weiterlernen»; steht das im Feld «Anmerkungen»,
  erspart es die Rückfrage.
- Die Angabe zur Exportverschlüsselung entfällt: `ITSAppUsesNonExemptEncryption`
  steht in der `Info.plist` bereits auf `false`.

Die Review dauert in der Regel einen Tag. Erst danach kann man externe
Gruppen einladen.
