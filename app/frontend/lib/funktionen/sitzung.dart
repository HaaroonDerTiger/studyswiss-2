import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../daten/modelle.dart';
import '../daten/repos.dart';

/// Hält, wer angemeldet ist. Der Rest der App liest nur `profil`.
class SitzungsZustand {
  const SitzungsZustand({this.profil, this.laedt = false, this.fehler});
  final Profil? profil;
  final bool laedt;
  final String? fehler;

  bool get angemeldet => profil != null;

  SitzungsZustand kopie({Profil? profil, bool? laedt, String? fehler, bool fehlerWeg = false}) =>
      SitzungsZustand(
        profil: profil ?? this.profil,
        laedt: laedt ?? this.laedt,
        fehler: fehlerWeg ? null : (fehler ?? this.fehler),
      );
}

class SitzungsController extends StateNotifier<SitzungsZustand> {
  SitzungsController(this._ref) : super(const SitzungsZustand());
  final Ref _ref;

  AuthRepo get _auth => _ref.read(authRepoProvider);
  LernRepo get _lern => _ref.read(lernRepoProvider);

  /// Beim Start: Gibt es noch eine gültige Sitzung? Wenn ja, direkt nach
  /// «Lernen», ohne Onboarding.
  Future<void> wiederaufnehmen() async {
    state = state.kopie(laedt: true);
    try {
      state = SitzungsZustand(profil: await _lern.profil());
    } catch (_) {
      state = const SitzungsZustand();
    }
  }

  /// Sign in with Apple. Der Nonce schützt gegen Wiedereinspielen: Apple
  /// bekommt den SHA-256, der Server den Klartext, und vergleicht selbst.
  Future<void> mitApple() => _versuche(() async {
        final roh = _nonce();
        // `AppleIDAuthorizationScopes`, nicht `SignInWithAppleAuthorizationScope`:
        // Das Paket hat den Namen umbenannt, und die alte Schreibweise gab es
        // hier noch, weil nie ein Analyzer darüberlief.
        final apple = await SignInWithApple.getAppleIDCredential(
          scopes: const [
            AppleIDAuthorizationScopes.email,
            AppleIDAuthorizationScopes.fullName,
          ],
          nonce: sha256.convert(utf8.encode(roh)).toString(),
        );
        final token = apple.identityToken;
        if (token == null) throw 'Apple hat kein Token geliefert.';
        // Der Vorname kommt NUR beim allerersten Mal. Jetzt oder nie.
        return (await _auth.mitApple(token, roh, vorname: apple.givenName)).nutzer;
      });

  Future<void> mitGoogle() => _versuche(() async {
        final konto = await GoogleSignIn(scopes: const ['email']).signIn();
        if (konto == null) throw 'Die Anmeldung wurde abgebrochen.';
        final token = (await konto.authentication).idToken;
        if (token == null) throw 'Google hat kein Token geliefert.';
        return (await _auth.mitGoogle(token)).nutzer;
      });

  /// «Ohne Konto weiterlernen». Ein 14-Jähriger soll nicht an einer
  /// Anmeldemaske scheitern.
  Future<void> alsGast() => _versuche(() async => (await _auth.alsGast()).nutzer);

  /// Verknüpft ein Gastkonto nachträglich. Die Nutzer-ID bleibt, also
  /// wandert der ganze Fortschritt mit.
  Future<void> verknuepfen() => _versuche(() async {
        final roh = _nonce();
        final apple = await SignInWithApple.getAppleIDCredential(
          scopes: const [AppleIDAuthorizationScopes.email],
          nonce: sha256.convert(utf8.encode(roh)).toString(),
        );
        final token = apple.identityToken;
        if (token == null) throw 'Apple hat kein Token geliefert.';
        return (await _auth.verknuepfe(token, roh)).nutzer;
      });

  Future<void> abmelden() async {
    await _auth.abmelden();
    state = const SitzungsZustand();
  }

  Future<void> kontoLoeschen() async {
    await _auth.kontoLoeschen();
    state = const SitzungsZustand();
  }

  Future<void> aktualisiere() async {
    try {
      state = state.kopie(profil: await _lern.profil());
    } catch (_) {/* der alte Stand bleibt stehen */}
  }

  Future<void> speichereOnboarding({
    String? kanton,
    String? schultyp,
    String? pruefungsdatum,
    String? vorname,
  }) async {
    state = state.kopie(
      profil: await _lern.aendere(
        kanton: kanton,
        schultyp: schultyp,
        pruefungsdatum: pruefungsdatum,
        vorname: vorname,
      ),
    );
  }

  Future<void> _versuche(Future<Profil> Function() was) async {
    state = state.kopie(laedt: true, fehlerWeg: true);
    try {
      state = SitzungsZustand(profil: await was());
    } catch (e) {
      state = state.kopie(laedt: false, fehler: e is String ? e : _lesbar(e));
    }
  }

  String _lesbar(Object e) {
    final t = e.toString();
    if (t.contains('canceled') || t.contains('AuthorizationErrorCode.canceled')) {
      return 'Die Anmeldung wurde abgebrochen.';
    }
    return 'Die Anmeldung hat nicht geklappt. Versuch es nochmals oder lerne ohne Konto weiter.';
  }

  String _nonce() {
    const zeichen = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final z = Random.secure();
    return List.generate(32, (_) => zeichen[z.nextInt(zeichen.length)]).join();
  }
}

final sitzungProvider =
    StateNotifierProvider<SitzungsController, SitzungsZustand>((ref) => SitzungsController(ref));
