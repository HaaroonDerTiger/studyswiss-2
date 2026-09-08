plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Der Schluessel zum Signieren steht in `android/key.properties` und gehoert
// NICHT ins Repository. Fehlt die Datei, wird mit dem Debug-Schluessel
// signiert — dann laeuft `flutter run --release` lokal, aber die Play Console
// nimmt das Ergebnis nicht an. Genau so ist es gedacht: kein versehentlich
// mit Debug-Schluessel hochgeladenes Release.
val schluessel = java.util.Properties()
val schluesselDatei = rootProject.file("key.properties")
if (schluesselDatei.exists()) {
    schluesselDatei.inputStream().use { schluessel.load(it) }
}

android {
    namespace = "ch.studyswiss.app"
    // Fest statt `flutter.compileSdkVersion`: Play verlangt seit August 2025
    // API 35, und ein Wert, der sich mit dem Flutter-SDK still mitbewegt,
    // faellt genau beim Hochladen auf.
    compileSdk = 35
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // Muss zu ANDROID_PAKET im Backend und zum Eintrag in der Play
        // Console passen. Steht die App schon im Laden, ist dieser Wert nicht
        // mehr frei waehlbar.
        applicationId = "ch.studyswiss.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // 23 statt Flutters Vorgabe: `flutter_secure_storage` verlangt es,
        // und dort liegen die Sitzungstoken.
        minSdk = 23
        targetSdk = 35
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            val datei = schluessel.getProperty("storeFile")
            if (datei != null) {
                storeFile = file(datei)
                storePassword = schluessel.getProperty("storePassword")
                keyAlias = schluessel.getProperty("keyAlias")
                keyPassword = schluessel.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (schluessel.getProperty("storeFile") != null) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            // Der Code wird verkleinert, aber die Modelle werden von Hand aus
            // JSON gelesen, nicht ueber Reflexion — es gibt also nichts, was
            // ProGuard zerschlagen koennte.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
