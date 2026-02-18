import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_service.dart';

final expenseServiceProvider = Provider<ExpenseService>((ref) {
  return ExpenseService(ref);
});

class ExpenseService {
  final Ref _ref;
  
  ExpenseService(this._ref);
  
  Future<void> createExpense({
    required double amount,
    required String name,
    String? category,
    required DateTime expenseDate,
    SplitType splitType = SplitType.none,
    Map<String, dynamic>? splitConfig,
    List<String>? tagIds,
  }) async {
    final dio = _ref.read(dioProvider);
    
    await dio.post('/expenses', data: {
      'amount': amount,
      'name': name,
      'category': category ?? 'other',
      'expenseDate': expenseDate.toIso8601String(),
      'splitType': splitType.name.toUpperCase(),
      'splitConfig': splitConfig,
      'tagIds': tagIds ?? [],
    });
  }
  
  Future<Map<String, dynamic>> getExpenses({
    int page = 1,
    int limit = 20,
  }) async {
    final dio = _ref.read(dioProvider);
    
    final response = await dio.get('/expenses', queryParameters: {
      'page': page,
      'limit': limit,
    });
    
    return response.data;
  }
}

enum SplitType {
  none,
  time,
  count,
}
