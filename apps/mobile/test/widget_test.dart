import 'package:flutter_test/flutter_test.dart';
import 'package:magic_mug_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MagicMugApp());
    expect(find.byType(MagicMugApp), findsOneWidget);
  });
}
