plugins {
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.serialization") version "2.0.21"
    id("io.ktor.plugin") version "3.0.1"
    application
}

group = "ch.studyswiss"
version = "1.0.0"

application {
    mainClass.set("ch.studyswiss.ApplicationKt")
}

repositories { mavenCentral() }

dependencies {
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("io.ktor:ktor-server-content-negotiation-jvm")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm")
    implementation("io.ktor:ktor-server-status-pages-jvm")
    implementation("io.ktor:ktor-server-auth-jvm")
    implementation("io.ktor:ktor-server-auth-jwt-jvm")
    implementation("io.ktor:ktor-server-cors-jvm")
    implementation("io.ktor:ktor-server-call-logging-jvm")
    implementation("io.ktor:ktor-server-request-validation-jvm")
    implementation("io.ktor:ktor-server-default-headers-jvm")
    implementation("io.ktor:ktor-client-core-jvm")
    implementation("io.ktor:ktor-client-cio-jvm")
    implementation("io.ktor:ktor-client-content-negotiation-jvm")

    implementation("org.jetbrains.exposed:exposed-core:0.55.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.55.0")
    implementation("org.jetbrains.exposed:exposed-java-time:0.55.0")
    implementation("com.zaxxer:HikariCP:5.1.0")
    implementation("com.h2database:h2:2.2.224")
    implementation("org.postgresql:postgresql:42.7.4")

    // Der QR-Code der Schweizer QR-Rechnung. Von Hand geschrieben waere
    // er ein Risiko, das niemand sieht: Ein Code mit einem Bitfehler
    // sieht aus wie einer, der stimmt, und die Bank weist ihn erst beim
    // Einlesen zurueck. `core` allein genuegt — wir zeichnen SVG selbst
    // und brauchen keine Bildbibliothek.
    implementation("com.google.zxing:core:3.5.3")

    implementation("com.auth0:java-jwt:4.4.0")
    implementation("com.auth0:jwks-rsa:0.22.1")
    implementation("ch.qos.logback:logback-classic:1.5.8")

    testImplementation(kotlin("test"))
    testImplementation("io.ktor:ktor-server-test-host-jvm")
}

kotlin { jvmToolchain(17) }

tasks.register<JavaExec>("tore") {
    group = "verification"
    description = "Die zwoelf Qualitaetstore auf alle Templates."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("ch.studyswiss.engine.ToreKt")
}

tasks.register<JavaExec>("offen") {
    group = "verification"
    description = "Unterthemen ohne Template."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("ch.studyswiss.engine.OffenKt")
}
