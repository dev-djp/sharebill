import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/expense_service.dart';
import '../services/tag_service.dart';

class AddExpenseScreen extends ConsumerStatefulWidget {
  const AddExpenseScreen({super.key});

  @override
  ConsumerState<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends ConsumerState<AddExpenseScreen> {
  final _amountController = TextEditingController();
  final _nameController = TextEditingController();
  
  DateTime _selectedDate = DateTime.now();
  String _selectedCategory = 'other';
  SplitType _splitType = SplitType.none;
  List<String> _selectedTagIds = [];
  
  // 时间分摊配置
  int _splitDays = 7;
  DateTime _splitStartDate = DateTime.now();
  
  // 次数分摊配置
  int _splitTotalCount = 10;
  
  bool _isLoading = false;

  @override
  void dispose() {
    _amountController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amountController.text);
    final name = _nameController.text.trim();
    
    if (amount == null || amount <= 0) {
      _showError('请输入有效金额');
      return;
    }
    
    if (name.isEmpty) {
      _showError('请输入支出名称');
      return;
    }

    setState(() => _isLoading = true);

    try {
      Map<String, dynamic>? splitConfig;
      
      if (_splitType == SplitType.time) {
        splitConfig = {
          'days': _splitDays,
          'startDate': _splitStartDate.toIso8601String(),
        };
      } else if (_splitType == SplitType.count) {
        splitConfig = {
          'totalCount': _splitTotalCount,
        };
      }

      await ref.read(expenseServiceProvider).createExpense(
        amount: amount,
        name: name,
        category: _selectedCategory,
        expenseDate: _selectedDate,
        splitType: _splitType,
        splitConfig: splitConfig,
        tagIds: _selectedTagIds,
      );

      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('记账成功')),
        );
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tagsAsync = ref.watch(tagsProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('记一笔'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 金额输入
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: '金额',
                prefixText: '¥ ',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            
            // 名称输入
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: '名称',
                hintText: '例如：午餐、打车',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            
            // 日期选择
            ListTile(
              title: const Text('日期'),
              subtitle: Text('${_selectedDate.year}-${_selectedDate.month}-${_selectedDate.day}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (date != null) {
                  setState(() => _selectedDate = date);
                }
              },
            ),
            const SizedBox(height: 16),
            
            // 分摊方式
            const Text('分摊方式', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SegmentedButton<SplitType>(
              segments: const [
                ButtonSegment(
                  value: SplitType.none,
                  label: Text('不分摊'),
                ),
                ButtonSegment(
                  value: SplitType.time,
                  label: Text('时间分摊'),
                ),
                ButtonSegment(
                  value: SplitType.count,
                  label: Text('次数分摊'),
                ),
              ],
              selected: {_splitType},
              onSelectionChanged: (selected) {
                setState(() => _splitType = selected.first);
              },
            ),
            
            // 时间分摊配置
            if (_splitType == SplitType.time) ...[
              const SizedBox(height: 16),
              const Text('分摊天数', style: TextStyle(fontWeight: FontWeight.bold)),
              Slider(
                value: _splitDays.toDouble(),
                min: 1,
                max: 365,
                divisions: 364,
                label: '$_splitDays 天',
                onChanged: (value) {
                  setState(() => _splitDays = value.round());
                },
              ),
              Text('每天 ¥${(double.tryParse(_amountController.text) ?? 0 / _splitDays).toStringAsFixed(2)}'),
            ],
            
            // 次数分摊配置
            if (_splitType == SplitType.count) ...[
              const SizedBox(height: 16),
              const Text('总次数', style: TextStyle(fontWeight: FontWeight.bold)),
              Slider(
                value: _splitTotalCount.toDouble(),
                min: 1,
                max: 100,
                divisions: 99,
                label: '$_splitTotalCount 次',
                onChanged: (value) {
                  setState(() => _splitTotalCount = value.round());
                },
              ),
              Text('每次 ¥${(double.tryParse(_amountController.text) ?? 0 / _splitTotalCount).toStringAsFixed(2)}'),
            ],
            
            const SizedBox(height: 16),
            
            // 标签选择
            const Text('标签', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            tagsAsync.when(
              data: (tags) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: tags.map((tag) {
                  final isSelected = _selectedTagIds.contains(tag['id']);
                  return FilterChip(
                    label: Text(tag['name']),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedTagIds.add(tag['id']);
                        } else {
                          _selectedTagIds.remove(tag['id']);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              loading: () => const CircularProgressIndicator(),
              error: (_, __) => const Text('加载标签失败'),
            ),
            
            const SizedBox(height: 32),
            
            // 保存按钮
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _save,
                child: _isLoading
                  ? const CircularProgressIndicator()
                  : const Text('保存', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

