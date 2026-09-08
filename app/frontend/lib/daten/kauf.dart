import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_storekit/store_kit_wrappers.dart';
import '../core/net/api.dart';
import 'modelle.dart';
import 'repos.dart' show apiProvider;

/// Der Kauf, auf beiden Läden gleichwertig.
///
/// `in_app_purchase` spricht auf iOS mit **StoreKit 2** und auf Android mit
/// **Google Play Billing 6**. Der Ablauf ist derselbe, die Quittung sieht
/// anders aus: Apple liefert eine signierte Transaktion (JWS), Google einen
/// `purchaseToken`. Beide gehen an unseren Server, und **erst dessen Antwort
/// schaltet Plus frei**. Dem Gerät wird nie geglaubt.
///
/// Zwei Dinge, die beide Läden zwingend verlangen und die man leicht vergisst:
///
/// - **`completePurchase` muss immer aufgerufen werden**, auch bei einem
///   Fehler. Sonst legt der Store den Kauf immer wieder vor, und auf Android
///   wird er nach drei Tagen automatisch rückerstattet.
/// - **«Kauf wiederherstellen» ist auf iOS Pflicht** (App Store Review
///   Guideline 3.1.1). Auf Android liefert `restorePurchases` dasselbe.
class KaufDienst {
  KaufDienst(this._api);
  final Api _api;

  final _laden = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _horcher;

  /// Meldet jede fertig geprüfte Änderung. Der Plus-Screen hört mit.
  final _ergebnisse = StreamController<KaufErgebnis>.broadcast();
  Stream<KaufErgebnis> get ergebnisse => _ergebnisse.stream;

  static const idMonat = 'ch.studyswiss.plus.monat';
  static const idPass = 'ch.studyswiss.plus.pass';
  static const idFamilie = 'ch.studyswiss.plus.familie';
  static const alleIds = {idMonat, idPass, idFamilie};

  bool get verfuegbar => !kIsWeb && (Platform.isIOS || Platform.isAndroid);

  Future<void> starten() async {
    if (!verfuegbar || !await _laden.isAvailable()) return;

    // Auf iOS muss der Delegate vor dem ersten Kauf stehen, sonst gehen
    // Käufe verloren, die ausserhalb der App angestossen wurden.
    if (Platform.isIOS) {
      final ios = _laden.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
      await ios.setDelegate(_AppleDelegate());
    }

    _horcher = _laden.purchaseStream.listen(
      _verarbeite,
      onDone: () => _horcher?.cancel(),
      onError: (Object e) => _ergebnisse.add(KaufErgebnis.fehler(Api.lesbar(e))),
    );
  }

  Future<void> beenden() async {
    await _horcher?.cancel();
    await _ergebnisse.close();
  }

  /// Holt Namen und **lokalisierte Preise** aus dem Laden. Der Preis kommt
  /// immer vom Store, nie aus unserem Code. Sonst zeigt die App etwas
  /// anderes an als die Kaufbestätigung.
  Future<List<ProductDetails>> angebote() async {
    if (!verfuegbar) return const [];
    final antwort = await _laden.queryProductDetails(alleIds);
    return antwort.productDetails;
  }

  /// Alle drei Produkte sind nicht verbrauchbar. Auch das Monatsabo, das
  /// in beiden Läden als Subscription gilt. `buyConsumable` wäre falsch: Es
  /// erlaubt den mehrfachen Kauf desselben Artikels.
  Future<void> kaufen(ProductDetails p) =>
      _laden.buyNonConsumable(purchaseParam: PurchaseParam(productDetails: p));

  /// Pflicht auf iOS, sinnvoll auf Android: Wer das Gerät wechselt, muss
  /// seinen Kauf zurückbekommen, ohne noch einmal zu zahlen.
  Future<void> wiederherstellen() => _laden.restorePurchases();

  Future<void> _verarbeite(List<PurchaseDetails> liste) async {
    for (final kauf in liste) {
      switch (kauf.status) {
        case PurchaseStatus.pending:
          _ergebnisse.add(KaufErgebnis.laeuft());
        case PurchaseStatus.error:
          _ergebnisse.add(KaufErgebnis.fehler(
              kauf.error?.message ?? 'Der Kauf ist nicht durchgegangen.'));
        case PurchaseStatus.canceled:
          _ergebnisse.add(KaufErgebnis.abgebrochen());
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          await _pruefeAmServer(kauf);
      }

      // Immer, auch nach einem Fehler. Sonst legt der Store den Kauf erneut
      // vor, und Google erstattet ihn nach drei Tagen automatisch zurück.
      if (kauf.pendingCompletePurchase) {
        await _laden.completePurchase(kauf);
      }
    }
  }

  Future<void> _pruefeAmServer(PurchaseDetails kauf) async {
    try {
      final Map<String, dynamic> antwort;
      if (kauf is AppStorePurchaseDetails) {
        // StoreKit 2 liefert die signierte Transaktion. Der Server prüft sie
        // gegen die App Store Server API.
        final jws = kauf.verificationData.serverVerificationData;
        final a = await _api.dio.post<Map<String, dynamic>>(
          '/abo/apple',
          data: {'signedTransaction': jws},
        );
        antwort = a.data!;
      } else if (kauf is GooglePlayPurchaseDetails) {
        final a = await _api.dio.post<Map<String, dynamic>>(
          '/abo/google',
          data: {
            'purchaseToken': kauf.verificationData.serverVerificationData,
            'produktId': kauf.productID,
          },
        );
        antwort = a.data!;
      } else {
        _ergebnisse.add(KaufErgebnis.fehler('Dieser Laden wird nicht unterstützt.'));
        return;
      }
      _ergebnisse.add(KaufErgebnis.fertig(AboStatus.vonJson(antwort)));
    } catch (e) {
      // Der Kauf ist beim Store durch, nur unsere Prüfung nicht. Das darf
      // nicht wie ein fehlgeschlagener Kauf aussehen.
      _ergebnisse.add(KaufErgebnis.fehler(
        'Der Kauf ist beim Store angekommen, wir konnten ihn aber noch nicht bestätigen. '
        'Öffne die App gleich nochmals. «Kauf wiederherstellen» hilft immer.',
      ));
    }
  }
}

/// Apple stösst Käufe manchmal von aussen an, etwa aus dem App Store heraus.
/// Ohne diesen Delegate gingen sie verloren.
class _AppleDelegate implements SKPaymentQueueDelegateWrapper {
  @override
  bool shouldContinueTransaction(SKPaymentTransactionWrapper t, SKStorefrontWrapper s) => true;

  @override
  bool shouldShowPriceConsent() => false;
}

class KaufErgebnis {
  const KaufErgebnis._(this.art, {this.status, this.text});
  final KaufArt art;
  final AboStatus? status;
  final String? text;

  factory KaufErgebnis.laeuft() => const KaufErgebnis._(KaufArt.laeuft);
  factory KaufErgebnis.abgebrochen() => const KaufErgebnis._(KaufArt.abgebrochen);
  factory KaufErgebnis.fertig(AboStatus s) => KaufErgebnis._(KaufArt.fertig, status: s);
  factory KaufErgebnis.fehler(String t) => KaufErgebnis._(KaufArt.fehler, text: t);
}

enum KaufArt { laeuft, fertig, abgebrochen, fehler }

final kaufDienstProvider = Provider<KaufDienst>((ref) {
  final d = KaufDienst(ref.watch(apiProvider));
  ref.onDispose(d.beenden);
  return d;
});
