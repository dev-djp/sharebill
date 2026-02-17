import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final tagsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final service = ref.read(tagServiceProvider);
  return service.getTags();
});

final tagServiceProvider = Provider<TagService>((ref) {
  return TagService(ref);
});

class TagService {
  final Ref _ref;
  
  TagService(this._ref);
  
  Future<List<Map<String, dynamic>>> getTags() async {
    final dio = _ref.read(dioProvider);
    
    final response = await dio.get('/tags');
    return List<Map<String, dynamic>>.from(response.data);
  }
  
  Future<void> createTag(String name, {String? color, String? icon}) async {
    final dio = _ref.read(dioProvider);
    
    await dio.post('/tags', data: {
      'name': name,
      'color': color,
      'icon': icon,
    });
  }
}
