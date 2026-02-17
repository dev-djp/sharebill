import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SplitType } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  // 获取总览统计
  async getOverview(userId: string, query: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = query;

    const where: any = { userId };
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const expenses = await this.prisma.expense.findMany({ where });
    
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = expenses.length;
    
    // 按分摊类型统计
    const normalExpenses = expenses.filter(e => e.splitType === SplitType.NONE);
    const timeSplitExpenses = expenses.filter(e => e.splitType === SplitType.TIME);
    const countSplitExpenses = expenses.filter(e => e.splitType === SplitType.COUNT);

    // 计算实际支出（分摊后）
    let actualExpense = 0;
    
    for (const expense of expenses) {
      if (expense.splitType === SplitType.NONE) {
        actualExpense += Number(expense.amount);
      } else if (expense.splitType === SplitType.TIME) {
        // 时间分摊：统计已结算的金额
        const settledSplits = await this.prisma.timeSplitDetail.findMany({
          where: {
            expenseId: expense.id,
            isSettled: true,
          },
        });
        actualExpense += settledSplits.reduce((sum, s) => sum + Number(s.amount), 0);
      } else if (expense.splitType === SplitType.COUNT) {
        // 次数分摊：统计已使用的金额
        const usedRecords = await this.prisma.countSplitRecord.findMany({
          where: { expenseId: expense.id },
        });
        const totalUsed = usedRecords.reduce((sum, r) => sum + r.usedCount, 0);
        const config = expense.splitConfig as any;
        const perCount = config?.totalCount ? Number(expense.amount) / config.totalCount : 0;
        actualExpense += totalUsed * perCount;
      }
    }

    return {
      totalExpense,
      actualExpense,
      count,
      averageExpense: count > 0 ? totalExpense / count : 0,
      splitSummary: {
        normal: {
          count: normalExpenses.length,
          amount: normalExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        },
        timeSplit: {
          count: timeSplitExpenses.length,
          amount: timeSplitExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        },
        countSplit: {
          count: countSplitExpenses.length,
          amount: countSplitExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        },
      },
    };
  }

  // 按标签统计
  async getTagStatistics(userId: string, query: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = query;

    const where: any = { userId };
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const expenses = await this.prisma.expense.findMany({ where });
    
    // 获取所有相关标签
    const tagIds = [...new Set(expenses.flatMap(e => e.tagIds))];
    const tags = await this.prisma.tag.findMany({
      where: {
        id: { in: tagIds },
      },
    });

    // 按标签统计
    const tagStats = tags.map(tag => {
      const taggedExpenses = expenses.filter(e => e.tagIds.includes(tag.id));
      return {
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        count: taggedExpenses.length,
        amount: taggedExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
      };
    });

    // 按金额排序
    tagStats.sort((a, b) => b.amount - a.amount);

    return {
      data: tagStats,
      total: tagStats.reduce((sum, t) => sum + t.amount, 0),
    };
  }

  // 按月份统计趋势
  async getMonthlyTrend(userId: string, months: number = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 按月份分组
    const monthlyData: { [key: string]: { amount: number; count: number } } = {};
    
    for (let i = 0; i < months; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { amount: 0, count: 0 };
    }

    for (const expense of expenses) {
      const date = new Date(expense.expenseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].amount += Number(expense.amount);
        monthlyData[key].count += 1;
      }
    }

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  // 按分类统计
  async getCategoryStatistics(userId: string, query: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = query;

    const where: any = { userId };
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const expenses = await this.prisma.expense.findMany({ where });
    
    // 按分类分组
    const categoryMap: { [key: string]: { count: number; amount: number } } = {};
    
    for (const expense of expenses) {
      const category = expense.category || 'other';
      if (!categoryMap[category]) {
        categoryMap[category] = { count: 0, amount: 0 };
      }
      categoryMap[category].count += 1;
      categoryMap[category].amount += Number(expense.amount);
    }

    const categories = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      ...data,
    }));

    categories.sort((a, b) => b.amount - a.amount);

    return {
      data: categories,
      total: categories.reduce((sum, c) => sum + c.amount, 0),
    };
  }
}
