import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/net/api.dart';
import 'modelle.dart';

final apiProvider = Provider<Api>((ref) => Api());

/* ============================== Anmeldung ============================== */

class AuthRepo {
  AuthRepo(this._api);
  final Api _api;

  Future<Sitzung> mitApple(String identityToken, String nonce, {String? vorname}) =>
      _sitzung('/auth/apple', {
        'identityToken': identityToken,
        'nonce': nonce,
        if (vorname != null) 'vorname': vorname,
      });

  Future<Sitzung> mitGoogle(String idToken) => _sitzung('/auth/google', {'idToken': idToken});

  Future<Sitzung> alsGast() async =>
      _sitzung('/auth/gast', {'geraeteId': await _api.tokens.geraeteId()});

  Future<Sitzung> verknuepfe(String identityToken, String nonce) =>
      _sitzung('/auth/verknuepfen', {'identityToken': identityToken, 'nonce': nonce});

  Future<void> abmelden() => _api.tokens.vergiss();

  Future<void> kontoLoeschen() async {
    await _api.dio.delete<void>('/auth/konto');
    await _api.tokens.vergiss();
  }

  Future<Sitzung> _sitzung(String pfad, Map<String, dynamic> daten) async {
    final a = await _api.dio.post<Map<String, dynamic>>(pfad, data: daten);
    final s = Sitzung.vonJson(a.data!);
    await _api.tokens.merke(s.accessToken, s.refreshToken);
    return s;
  }
}

final authRepoProvider = Provider((ref) => AuthRepo(ref.watch(apiProvider)));

/* ================================ Katalog ============================== */

class KatalogRepo {
  KatalogRepo(this._api);
  final Api _api;

  Future<List<Kanton>> kantone() async {
    final a = await _api.dio.get<List<dynamic>>('/katalog/kantone');
    return a.data!.map((e) => Kanton.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Schultyp>> schultypen(String kanton) async {
    final a = await _api.dio
        .get<List<dynamic>>('/katalog/schultypen', queryParameters: {'kanton': kanton});
    return a.data!.map((e) => Schultyp.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<String?> termin(String kanton, String schultyp) async {
    try {
      final a = await _api.dio.get<Map<String, dynamic>>(
        '/katalog/termine',
        queryParameters: {'kanton': kanton, 'schultyp': schultyp},
      );
      return a.data!['datum'] as String?;
    } catch (_) {
      return null;
    }
  }

  /// Die Tipps-Seite eines Bereichs mit `art: "tipps"`. Hörverstehen oder
  /// mündliche Prüfung. Es gibt dort keinen Themenbaum zu holen.
  Future<TippsSeite> tipps(String bereich) async {
    final a = await _api.dio.get<Map<String, dynamic>>(
      '/katalog/tipps',
      queryParameters: {'bereich': bereich},
    );
    return TippsSeite.vonJson(a.data!);
  }

  /// Fächer und Bereiche in einem Zug. Der Client baut daraus die
  /// Navigation unter «Lernen», «Selbsttest» und «Fortschritt» Überall
  /// dieselbe Ordnung.
  Future<Faecher> faecher() async {
    final a = await _api.dio.get<Map<String, dynamic>>('/katalog/faecher');
    return Faecher.vonJson(a.data!);
  }

  Future<Themenbaum> themen(String fach) async {
    final a = await _api.dio
        .get<Map<String, dynamic>>('/katalog/themen', queryParameters: {'fach': fach});
    return Themenbaum.vonJson(a.data!);
  }
}

final katalogRepoProvider = Provider((ref) => KatalogRepo(ref.watch(apiProvider)));

/* ================================= Lernen ============================== */

class LernRepo {
  LernRepo(this._api);
  final Api _api;

  Future<Profil> profil() async {
    final a = await _api.dio.get<Map<String, dynamic>>('/profil');
    return Profil.vonJson(a.data!);
  }

  Future<Profil> aendere({
    String? vorname,
    String? kanton,
    String? schultyp,
    String? pruefungsdatum,
  }) async {
    final a = await _api.dio.patch<Map<String, dynamic>>('/profil', data: {
      if (vorname != null) 'vorname': vorname,
      if (kanton != null) 'kanton': kanton,
      if (schultyp != null) 'schultyp': schultyp,
      if (pruefungsdatum != null) 'pruefungsdatum': pruefungsdatum,
    });
    return Profil.vonJson(a.data!);
  }

  Future<VorschlagsListe> vorschlag() async {
    final a = await _api.dio.get<Map<String, dynamic>>('/uebung/vorschlag');
    return VorschlagsListe.vonJson(a.data!);
  }

  Future<Uebung> uebungStarten({String? unterthema, String? fach, int anzahl = 10}) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/uebung/start', data: {
      if (unterthema != null) 'unterthema': unterthema,
      if (fach != null) 'fach': fach,
      'anzahl': anzahl,
    });
    return Uebung.vonJson(a.data!);
  }

  Future<Rueckmeldung> antworten(
    String setId,
    String aufgabeRef,
    AntwortDaten daten, {
    int hinweise = 0,
  }) async {
    final a = await _api.dio.post<Map<String, dynamic>>(
      '/uebung/$setId/antwort',
      queryParameters: {'hinweise': hinweise},
      data: daten.alsJson(aufgabeRef),
    );
    return Rueckmeldung.vonJson(a.data!);
  }

  Future<String> hinweis(String setId, String aufgabeRef, int stufe) async {
    final a = await _api.dio.post<Map<String, dynamic>>(
      '/uebung/$setId/hinweis',
      data: {'aufgabeRef': aufgabeRef, 'stufe': stufe},
    );
    return a.data!['text'] as String;
  }

  Future<UebungErgebnis> uebungAbschliessen(String setId) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/uebung/$setId/abschluss');
    return UebungErgebnis.vonJson(a.data!);
  }

  /// Welche Fächer die Standortbestimmung anbietet. Mathematik und
  /// Deutsch getrennt, so wie sie auch geprüft werden.
  Future<List<FachWahl>> standortFaecher() async {
    final a = await _api.dio.get<List<dynamic>>('/standort/faecher');
    return a.data!.map((e) => FachWahl.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<(String, List<Aufgabe>)> standortStarten(String fach) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/standort/start',
        queryParameters: {'fach': fach});
    final aufgaben = (a.data!['aufgaben'] as List)
        .map((e) => Aufgabe.vonJson(e as Map<String, dynamic>))
        .toList();
    return (a.data!['id'] as String, aufgaben);
  }

  Future<void> standortAntwort(String setId, String ref, AntwortDaten daten) =>
      _api.dio.post<void>('/standort/$setId/antwort', data: daten.alsJson(ref));

  Future<Startpunkt> startpunkt(String setId) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/standort/$setId/abschluss');
    return Startpunkt.vonJson(a.data!);
  }

  /// Die Fächer des Selbsttests. Auf der ersten Ebene steht das Fach, nicht
  /// einer seiner Bereiche.
  Future<List<FachWahl>> selbsttestFaecher() async {
    final a = await _api.dio.get<List<dynamic>>('/selbsttest/faecher');
    return a.data!.map((e) => FachWahl.vonJson(e as Map<String, dynamic>)).toList();
  }

  /// Was im Selbsttest gilt. Taschenrechner, Zurückblättern, Uhr. Kommt
  /// aus dem Katalog des Schultyps, nicht aus dem Screen.
  ///
  /// Mit [fach] kommen die Bedingungen dieses Prüfungsfachs: In Basel-Stadt
  /// dauert Mathematik 90 Minuten mit Taschenrechner und Deutsch 45 Minuten
  /// ohne, in Bern dauert Deutsch doppelt so lange wie Mathematik. Ohne den
  /// Parameter antwortet der Server mit den Bedingungen des ersten
  /// Prüfungsteils, und die stimmen dann für das andere Fach nicht.
  Future<Bedingungen> selbsttestBedingungen({String? fach}) async {
    final a = await _api.dio.get<Map<String, dynamic>>(
        '/selbsttest/bedingungen',
        queryParameters: fach == null ? null : {'fach': fach});
    return Bedingungen.vonJson(a.data!);
  }

  Future<Selbsttest> selbsttestStarten(String fach, String umfang, List<String> themen) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/selbsttest/start',
        data: {'fach': fach, 'umfang': umfang, 'themen': themen});
    return Selbsttest.vonJson(a.data!);
  }

  Future<void> selbsttestAntwort(String setId, String ref, AntwortDaten daten) =>
      _api.dio.post<void>('/selbsttest/$setId/antwort', data: daten.alsJson(ref));

  Future<SelbsttestErgebnis> selbsttestAbgeben(String setId) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/selbsttest/$setId/abgabe');
    return SelbsttestErgebnis.vonJson(a.data!);
  }

  Future<Lernpfad> lernpfad() async {
    final a = await _api.dio.get<Map<String, dynamic>>('/lernpfad');
    return Lernpfad.vonJson(a.data!);
  }

  Future<List<Produkt>> produkte() async {
    final a = await _api.dio.get<List<dynamic>>('/abo/produkte');
    return a.data!.map((e) => Produkt.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<AboStatus> aboStatus() async {
    final a = await _api.dio.get<Map<String, dynamic>>('/abo/status');
    return AboStatus.vonJson(a.data!);
  }

  Future<AboStatus> codeEinloesen(String code) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/abo/code', data: {'code': code});
    return AboStatus.vonJson(a.data!);
  }

  Future<Fortschritt> fortschritt() async {
    final a = await _api.dio.get<Map<String, dynamic>>('/fortschritt');
    return Fortschritt.vonJson(a.data!);
  }

  Future<List<FehlerGruppe>> fehlerarchiv() async {
    final a = await _api.dio.get<List<dynamic>>('/fehler');
    return a.data!.map((e) => FehlerGruppe.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<Aufgabe> nochmal(String aufgabeRef) async {
    final a = await _api.dio
        .post<Map<String, dynamic>>('/fehler/nochmal', data: {'aufgabeRef': aufgabeRef});
    return Aufgabe.vonJson(a.data!);
  }

  Future<ElternReport?> elternReport() async {
    try {
      final a = await _api.dio.get<Map<String, dynamic>>('/eltern/report');
      return ElternReport.vonJson(a.data!);
    } catch (_) {
      return null;
    }
  }

  Future<void> elternFreigabe(bool aktiv) =>
      _api.dio.post<void>('/eltern/freigabe', data: {'aktiv': aktiv});

  /// Erst die Aufsatzart, dann das Thema. Welche Arten es gibt, hängt am
  /// Schultyp. Eine Art, die an dieser Prüfung nicht vorkommt, erscheint
  /// gar nicht.
  Future<List<Aufsatzart>> aufsatzarten() async {
    final a = await _api.dio.get<List<dynamic>>('/aufsatz/arten');
    return a.data!.map((e) => Aufsatzart.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AufsatzThema>> aufsatzThemen(String art) async {
    final a = await _api.dio
        .get<List<dynamic>>('/aufsatz/themen', queryParameters: {'art': art});
    return a.data!.map((e) => AufsatzThema.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AufsatzThema>> aufsatzBlatt() async {
    final a = await _api.dio.get<List<dynamic>>('/aufsatz/themen');
    return a.data!.map((e) => AufsatzThema.vonJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> aufsatzSpeichern(int themaId, String text, {String? id}) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/aufsatz/entwurf',
        data: {'themaId': themaId, 'text': text, if (id != null) 'id': id});
    return a.data!['id'] as String;
  }

  Future<Map<String, dynamic>> aufsatzKorrektur(String id) async {
    final a = await _api.dio.post<Map<String, dynamic>>('/aufsatz/$id/korrektur');
    return a.data!;
  }
}

final lernRepoProvider = Provider((ref) => LernRepo(ref.watch(apiProvider)));
