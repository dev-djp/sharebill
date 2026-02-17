import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

// API 配置
// 开发环境（本地模拟器）
// const String API_BASE_URL = 'http://10.0.2.2:3000/api/v1';

// 测试环境（外网服务器）
const String API_BASE_URL = 'http://43.163.245.88:3000/api/v1';

// Dio 实例
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: API_BASE_URL,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));
  
  // 请求拦截器 - 添加 Token
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await ref.read(authStorageProvider).getToken();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
    onError: (error, handler) {
      if (error.response?.statusCode == 401) {
        // Token 过期，清除登录状态
        ref.read(authStorageProvider).clearToken();
      }
      return handler.next(error);
    },
  ));
  
  return dio;
});

// 认证存储
final authStorageProvider = Provider<AuthStorage>((ref) => AuthStorage());

class AuthStorage {
  static const String _boxName = 'auth';
  static const String _tokenKey = 'token';
  static const String _userKey = 'user';
  
  late Box _box;
  bool _initialized = false;
  
  Future<void> init() async {
    if (_initialized) return;
    await Hive.initFlutter();
    _box = await Hive.openBox(_boxName);
    _initialized = true;
  }
  
  Future<void> saveToken(String token) async {
    await init();
    await _box.put(_tokenKey, token);
  }
  
  Future<String?> getToken() async {
    await init();
    return _box.get(_tokenKey);
  }
  
  Future<void> clearToken() async {
    await init();
    await _box.delete(_tokenKey);
    await _box.delete(_userKey);
  }
  
  Future<void> saveUser(Map<String, dynamic> user) async {
    await init();
    await _box.put(_userKey, user);
  }
  
  Future<Map<String, dynamic>?> getUser() async {
    await init();
    return _box.get(_userKey);
  }
}

// 认证服务
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref);
});

// 认证状态
final authStateProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final storage = ref.read(authStorageProvider);
  final token = await storage.getToken();
  
  if (token == null) return null;
  
  try {
    // 验证 Token 是否有效
    final dio = ref.read(dioProvider);
    final response = await dio.get('/auth/profile');
    await storage.saveUser(response.data);
    return response.data;
  } catch (e) {
    await storage.clearToken();
    return null;
  }
});

class AuthService {
  final Ref _ref;
  
  AuthService(this._ref);
  
  Future<void> login(String phone, String code) async {
    final dio = _ref.read(dioProvider);
    final storage = _ref.read(authStorageProvider);
    
    try {
      final response = await dio.post('/auth/login', data: {
        'phone': phone,
        'code': code,
      });
      
      final token = response.data['token'];
      final user = response.data['user'];
      
      await storage.saveToken(token);
      await storage.saveUser(user);
      
      // 刷新认证状态
      _ref.refresh(authStateProvider);
    } on DioException catch (e) {
      throw e.response?.data?['message'] ?? '登录失败';
    }
  }
  
  Future<void> logout() async {
    final storage = _ref.read(authStorageProvider);
    await storage.clearToken();
    _ref.refresh(authStateProvider);
  }
}
