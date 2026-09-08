# StudySwiss — Backend
#
# Zwei Stufen: bauen und laufen. Das fertige Bild enthält nur die
# Laufzeitumgebung und das Programm — kein Gradle, kein Quellcode, keine
# Build-Werkzeuge. Das hält es klein und verringert die Angriffsfläche.

# ── Stufe 1: bauen ───────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk AS bau
WORKDIR /bau

# Zuerst nur die Build-Dateien kopieren. Solange sich die nicht ändern,
# nimmt Docker die heruntergeladenen Abhängigkeiten aus dem Zwischenspeicher
# — jeder weitere Bau dauert dann Sekunden statt Minuten.
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies || true

COPY src ./src
RUN ./gradlew --no-daemon buildFatJar

# ── Stufe 2: laufen ──────────────────────────────────────────────────
FROM eclipse-temurin:17-jre
WORKDIR /app

# Nicht als root laufen. Wer eine Lücke im Programm findet, findet dahinter
# einen Benutzer ohne Rechte.
RUN useradd --system --create-home --shell /usr/sbin/nologin studyswiss
COPY --from=bau /bau/build/libs/*-all.jar app.jar
USER studyswiss

EXPOSE 8080

# DigitalOcean und jeder Lastverteiler brauchen einen Weg zu erfahren, ob
# der Dienst wirklich antwortet — nicht nur, ob der Prozess läuft.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -qO- http://127.0.0.1:${PORT:-8080}/gesundheit || exit 1"]

# `MaxRAMPercentage` statt einer festen Zahl: Wer den Container später auf
# eine grössere Maschine stellt, bekommt den Speicher automatisch.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Duser.timezone=Europe/Zurich"

ENTRYPOINT ["java", "-jar", "app.jar"]
