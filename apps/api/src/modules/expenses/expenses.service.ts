import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SplitType } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // 创建支出记录
  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    const { amount, name, description, category, expenseDate, splitType, splitConfig, tagIds, images } = createExpenseDto;

    // 创建支出记录
    const expense = await this.prisma.expense.create({
      data: {
        userId,
        amount,
        name,
        description,
        category,
        expenseDate: new Date(expenseDate),
        splitType,
        splitConfig: splitConfig as any,
        tagIds: tagIds || [],
        images: images || [],
      },
    });

    // 处理分摊逻辑
    if (splitType === SplitType.TIME && splitConfig) {
      await this.createTimeSplits(expense.id, amount, splitConfig);
    }

    return this.findOne(userId, expense.id);
  }

  // 创建时间分摊明细
  private async createTimeSplits(
    expenseId: string,
    totalAmount: number,
    config: { days: number; startDate: string }
  ) {
    const { days, startDate } = config;
    const dailyAmount = totalAmount / days;
    const start = new Date(startDate);

    const splits = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      splits.push({
        expenseId,
        date,
        amount: dailyAmount,
      });
    }

    await this.prisma.timeSplitDetail.createMany({
      data: splits,
    });
  }

  // 获取支出列表
  async findAll(userId: string, query: {
    startDate?: string;
    endDate?: string;
    tagIds?: string[];
    splitType?: SplitType;
    page?: number;
    limit?: number;
  }) {
    const { startDate, endDate, tagIds, splitType, page = 1, limit = 20 } = query;

    const where: any = {
      userId,
    };

    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (tagIds && tagIds.length > 0) {
      where.tagIds = {
        hasSome: tagIds,
      };
    }

    if (splitType) {
      where.splitType = splitType;
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: {
          expenseDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 获取单个支出
  async findOne(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        timeSplits: true,
        countSplits: {
          orderBy: {
            usedDate: 'desc',
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('支出记录不存在');
    }

    // 计算已分摊金额
    let splitInfo: any = {};
    
    if (expense.splitType === SplitType.TIME) {
      const settledAmount = expense.timeSplits
        .filter(s => s.isSettled)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      
      splitInfo = {
        totalDays: expense.timeSplits.length,
        settledDays: expense.timeSplits.filter(s => s.isSettled).length,
        settledAmount,
        remainingAmount: Number(expense.amount) - settledAmount,
      };
    } else if (expense.splitType === SplitType.COUNT) {
      const config = expense.splitConfig as any;
      const usedCount = expense.countSplits.reduce((sum, r) => sum + r.usedCount, 0);
      
      splitInfo = {
        totalCount: config?.totalCount || 0,
        usedCount,
        remainingCount: (config?.totalCount || 0) - usedCount,
        perCountAmount: config?.totalCount ? Number(expense.amount) / config.totalCount : 0,
        usedAmount: expense.countSplits.reduce((sum, r) => {
          const perCount = Number(expense.amount) / (config?.totalCount || 1);
          return sum + (r.usedCount * perCount);
        }, 0),
      };
    }

    return {
      ...expense,
      splitInfo,
    };
  }

  // 更新支出
  async update(userId: string, id: string, updateExpenseDto: UpdateExpenseDto) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!expense) {
      throw new NotFoundException('支出记录不存在');
    }

    const { expenseDate, ...rest } = updateExpenseDto;

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...rest,
        expenseDate: expenseDate ? new Date(expenseDate) : undefined,
      },
    });
  }

  // 删除支出
  async remove(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!expense) {
      throw new NotFoundException('支出记录不存在');
    }

    // 删除关联的分摊记录
    await this.prisma.timeSplitDetail.deleteMany({
      where: { expenseId: id },
    });

    await this.prisma.countSplitRecord.deleteMany({
      where: { expenseId: id },
    });

    return this.prisma.expense.delete({
      where: { id },
    });
  }

  // 记录次数分摊使用
  async recordCountSplit(userId: string, expenseId: string, count: number, note?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId,
        splitType: SplitType.COUNT,
      },
    });

    if (!expense) {
      throw new NotFoundException('次数分摊记录不存在');
    }

    const config = expense.splitConfig as any;
    const totalCount = config?.totalCount || 0;

    // 检查剩余次数
    const usedRecords = await this.prisma.countSplitRecord.findMany({
      where: { expenseId },
    });
    const totalUsed = usedRecords.reduce((sum, r) => sum + r.usedCount, 0);

    if (totalUsed + count > totalCount) {
      throw new Error(`超出剩余次数，还剩 ${totalCount - totalUsed} 次`);
    }

    return this.prisma.countSplitRecord.create({
      data: {
        expenseId,
        usedCount: count,
        note,
      },
    });
  }

  // 结算时间分摊
  async settleTimeSplit(userId: string, expenseId: string, date: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId,
        splitType: SplitType.TIME,
      },
    });

    if (!expense) {
      throw new NotFoundException('时间分摊记录不存在');
    }

    return this.prisma.timeSplitDetail.updateMany({
      where: {
        expenseId,
        date: new Date(date),
      },
      data: {
        isSettled: true,
      },
    });
  }
}
