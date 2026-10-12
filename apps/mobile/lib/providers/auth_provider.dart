import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';
import '../core/api_config.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;
  bool _initError = false;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get initError => _initError;
  bool get isAuthenticated => _user != null && _token != null;

  AuthProvider() {
    initAuth();
  }

  Future<void> initAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('magic_mug_token');
      final userStr = prefs.getString('magic_mug_user');

      if (userStr != null) {
        _user = User.fromJson(jsonDecode(userStr));
      }

      if (_token != null) {
        // Verify token with backend
        try {
          final res = await ApiClient().dio.get(ApiConfig.meEndpoint);
          if (res.statusCode == 200) {
            final data = (res.data is Map && res.data['data'] != null) ? res.data['data'] : res.data;
            if (data is Map<String, dynamic>) {
              _user = User.fromJson(data);
              await prefs.setString('magic_mug_user', jsonEncode(_user!.toJson()));
            }
          }
        } catch (_) {
          // Token expired, re-login
          await autoLogin();
        }
      } else {
        await autoLogin();
      }
      _initError = false;
    } catch (e) {
      _initError = true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> autoLogin([String username = 'admin', String password = 'secretpassword']) async {
    _isLoading = true;
    _initError = false;
    notifyListeners();

    try {
      final res = await ApiClient().dio.post(
        ApiConfig.loginEndpoint,
        data: {
          'username': username,
          'password': password,
        },
      );

      if (res.statusCode == 200) {
        final data = (res.data is Map && res.data['data'] != null) ? res.data['data'] : res.data;
        if (data is Map) {
          _token = data['access_token'];
          if (data['user'] != null) {
            _user = User.fromJson(Map<String, dynamic>.from(data['user']));
          }

          final prefs = await SharedPreferences.getInstance();
          if (_token != null) await prefs.setString('magic_mug_token', _token!);
          if (_user != null) await prefs.setString('magic_mug_user', jsonEncode(_user!.toJson()));

          _isLoading = false;
          notifyListeners();
          return true;
        }
      }
      _initError = true;
    } catch (e) {
      _initError = true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('magic_mug_token');
    await prefs.remove('magic_mug_user');
    _user = null;
    _token = null;
    notifyListeners();
  }
}
