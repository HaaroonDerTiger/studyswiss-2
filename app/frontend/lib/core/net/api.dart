import 'package:dio/dio.dart';
import '../speicher/tokens.dart';

/// Der einzige Ort, an dem HTTP vorkommt. Screens rufen nie `dio` auf,
/// sondern immer ein Repository.
class Api {
  Api({String? basis}) {
    dio = Dio(
      BaseOptions(
        baseUrl: basis ?? const String.fromEnvironment(
          'STUDYSWISS_API',
          defaultValue: 'http://localhost:8080/v1',
        ),
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 130),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (bitte, weiter) async {
          final token = await _tokens.access;
          if (token != null) bitte.headers['Authorization'] = 'Bearer $token';
          weiter.next(bitte);
        },
        onError: (fehler, weiter) async {
          // Ein abgelaufener Access-Token wird still erneuert. Der Refresh-
          // Token rotiert dabei. Jeder wird genau einmal eingelöst.
          final istAbgelaufen = fehler.response?.statusCode == 401;
          final schonVersucht = fehler.requestOptions.extra['erneuert'] == true;
          final istRefresh = fehler.requestOptions.path.contains('/auth/');
          if (!istAbgelaufen || schonVersucht || istRefresh) return weiter.next(fehler);

          final gelungen = await _erneuere();
          if (!gelungen) return weiter.next(fehler);

          final o = fehler.requestOptions;
          o.extra['erneuert'] = true;
          o.headers['Authorization'] = 'Bearer ${await _tokens.access}';
          try {
            weiter.resolve(await dio.fetch(o));
          } on DioException catch (e) {
            weiter.next(e);
          }
        },
      ),
    );
  }

  late final Dio dio;
  final _tokens = TokenSpeicher();
  TokenSpeicher get tokens => _tokens;

  Future<bool> _erneuere() async {
    final rt = await _tokens.refresh;
    if (rt == null) return false;
    try {
      final a = await Dio(BaseOptions(baseUrl: dio.options.baseUrl))
          .post<Map<String, dynamic>>('/auth/refresh', data: {'refreshToken': rt});
      final d = a.data!;
      await _tokens.merke(d['accessToken'] as String, d['refreshToken'] as String);
      return true;
    } catch (_) {
      await _tokens.vergiss();
      return false;
    }
  }

  /// Übersetzt Dio-Fehler in einen Satz, den man einer 14-jährigen Person
  /// zeigen kann. Der Server liefert `detail` nach RFC 9457.
  static String lesbar(Object fehler) {
    if (fehler is DioException) {
      final d = fehler.response?.data;
      if (d is Map && d['detail'] is String) return d['detail'] as String;
      if (fehler.type == DioExceptionType.connectionError) {
        return 'Keine Verbindung. Prüfe dein Internet und versuch es nochmals.';
      }
      if (fehler.type == DioExceptionType.receiveTimeout) {
        return 'Das dauert gerade zu lange. Versuch es gleich nochmals.';
      }
    }
    return 'Da ist etwas schiefgelaufen. Dein Fortschritt ist gespeichert.';
  }

  /// Ob eine Antwort «Dafür brauchst du Plus» bedeutet.
  static bool brauchtPlus(Object fehler) =>
      fehler is DioException && fehler.response?.statusCode == 402;
}
