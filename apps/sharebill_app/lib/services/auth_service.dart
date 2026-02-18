import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// API 配置
// 测试环境（外网服务器）
const String API_BASE_URL = 'http://43.163.245.88:3000/api/v1';

// Dio 实例
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: API_BASE_URL,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));
  
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
  ));
  
  return dio;
});

// 认证服务
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref);
});

// 认证状态
final authStateProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token');
  
  if (token == null) return null;
  
  try {
    final dio = ref.read(dioProvider);
    final response = await dio.get('/auth/profile');
    return response.data;
  } catch (e) {
    await prefs.remove('token');
    return null;
  }
});

class AuthService {
  final Ref _ref;
  
  AuthService(this._ref);
  
  Future<void> login(String phone, String code) async {
    final dio = _ref.read(dioProvider);
    final prefs = await SharedPreferences.getInstance();
    
    try {
      final response = await dio.post('/auth/login', data: {
        'phone': phone,
        'code': code,
      });
      
      final token = response.data['token'];
      
      await prefs.setString('token', token);
      
      _ref.refresh(authStateProvider);
    } on DioException catch (e) {
      throw e.response?.data?['message'] ?? '登录失败';
    }
  }
  
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    _ref.refresh(authStateProvider);
  }
}
