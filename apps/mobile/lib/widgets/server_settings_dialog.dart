import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../core/api_config.dart';
import '../core/api_client.dart';
import '../core/theme.dart';

class ServerSettingsDialog extends StatefulWidget {
  const ServerSettingsDialog({super.key});

  static void show(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => const ServerSettingsDialog(),
    );
  }

  @override
  State<ServerSettingsDialog> createState() => _ServerSettingsDialogState();
}

class _ServerSettingsDialogState extends State<ServerSettingsDialog> {
  late final TextEditingController _urlController;
  bool _testing = false;
  String? _testStatus;
  bool _testSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: ApiConfig.baseUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    setState(() {
      _testing = true;
      _testStatus = 'Testing connection...';
      _testSuccess = false;
    });

    final testUrl = _urlController.text.trim();
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));
      final cleanUrl = testUrl.endsWith('/') ? testUrl.substring(0, testUrl.length - 1) : testUrl;
      final rootHealthUrl = '${cleanUrl.replaceFirst(RegExp(r'/api/v1/?$'), '')}/health';

      Response? response;
      try {
        response = await dio.get(rootHealthUrl);
      } catch (_) {
        response = await dio.get('$cleanUrl/categories');
      }

      setState(() {
        _testing = false;
        _testSuccess = true;
        _testStatus = 'Connected successfully! (Server status: ${response?.statusCode ?? 200})';
      });
    } on DioException catch (e) {
      setState(() {
        _testing = false;
        if (e.response != null && (e.response!.statusCode == 401 || e.response!.statusCode == 200 || e.response!.statusCode == 404 || e.response!.statusCode == 405)) {
          _testSuccess = true;
          _testStatus = 'Connected to Backend! (Server online)';
        } else {
          _testSuccess = false;
          _testStatus = 'Connection failed: ${e.type.name}\nCheck IP and Wi-Fi connection.';
        }
      });
    } catch (e) {
      setState(() {
        _testing = false;
        _testSuccess = false;
        _testStatus = 'Connection error: $e';
      });
    }
  }

  Future<void> _save() async {
    final newUrl = _urlController.text.trim();
    if (newUrl.isNotEmpty) {
      await ApiConfig.saveBaseUrl(newUrl);
      ApiClient().updateBaseUrl(newUrl);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Server URL updated to: $newUrl'),
            backgroundColor: AppColors.forestGreen,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: AppColors.maroon.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.wifi_rounded, color: AppColors.maroon, size: 18),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Backend Connection',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Text(
              'Enter the backend API server URL (Cloud hosted or custom server):',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _urlController,
              decoration: InputDecoration(
                labelText: 'Server Base URL',
                hintText: 'https://your-backend.com/api/v1',
                prefixIcon: const Icon(Icons.link, size: 18),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.restore, size: 18),
                  tooltip: 'Reset to default',
                  onPressed: () {
                    _urlController.text = ApiConfig.defaultBaseUrl;
                  },
                ),
              ),
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 10),

            // Quick default chip
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.cloud_done_rounded, size: 14, color: AppColors.maroon),
                  label: const Text('Default Server', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  onPressed: () {
                    _urlController.text = ApiConfig.defaultBaseUrl;
                  },
                ),
              ],
            ),

            if (_testStatus != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _testSuccess
                      ? AppColors.forestGreen.withValues(alpha: 0.1)
                      : AppColors.errorBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      _testSuccess ? Icons.check_circle_rounded : Icons.error_rounded,
                      color: _testSuccess ? AppColors.forestGreen : AppColors.error,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _testStatus!,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _testSuccess ? AppColors.forestGreen : AppColors.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _testing ? null : _testConnection,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _testing
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Test Connection', style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.maroon,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('Save & Connect', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
