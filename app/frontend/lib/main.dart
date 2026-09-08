import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Datumsformate für de_CH: «7. März 2027», nicht «March 7, 2027».
  await initializeDateFormatting('de_CH');
  runApp(const ProviderScope(child: StudySwissApp()));
}
