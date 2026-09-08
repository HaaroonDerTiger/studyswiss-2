import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tokens liegen im Schlüsselbund, nie in SharedPreferences.
class TokenSpeicher {
  static const _speicher = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const _access = 'studyswiss.access';
  static const _refresh = 'studyswiss.refresh';
  static const _geraet = 'studyswiss.geraet';

  Future<String?> get access => _speicher.read(key: _access);
  Future<String?> get refresh => _speicher.read(key: _refresh);

  Future<void> merke(String accessToken, String refreshToken) async {
    await _speicher.write(key: _access, value: accessToken);
    await _speicher.write(key: _refresh, value: refreshToken);
  }

  Future<void> vergiss() async {
    await _speicher.delete(key: _access);
    await _speicher.delete(key: _refresh);
  }

  /// Bleibt beim Abmelden erhalten: Wer sich als Gast neu anmeldet, findet
  /// seinen Fortschritt auf demselben Gerät wieder.
  Future<String> geraeteId() async {
    final da = await _speicher.read(key: _geraet);
    if (da != null) return da;
    final neu = DateTime.now().microsecondsSinceEpoch.toRadixString(36) +
        (100000 + DateTime.now().millisecond * 977 % 899999).toString();
    await _speicher.write(key: _geraet, value: neu);
    return neu;
  }
}
