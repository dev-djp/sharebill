import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  // 创建标签
  async create(userId: string, createTagDto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        ...createTagDto,
        userId,
      },
    });
  }

  // 获取用户的所有标签
  async findAll(userId: string) {
    return this.prisma.tag.findMany({
      where: {
        OR: [
          { userId },
          { isSystem: true },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // 获取单个标签
  async findOne(userId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isSystem: true },
        ],
      },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    return tag;
  }

  // 更新标签
  async update(userId: string, id: string, updateTagDto: UpdateTagDto) {
    // 检查标签是否存在且属于当前用户
    const tag = await this.prisma.tag.findFirst({
      where: {
        id,
        userId,
        isSystem: false,
      },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在或无权修改');
    }

    return this.prisma.tag.update({
      where: { id },
      data: updateTagDto,
    });
  }

  // 删除标签
  async remove(userId: string, id: string) {
    // 检查标签是否存在且属于当前用户
    const tag = await this.prisma.tag.findFirst({
      where: {
        id,
        userId,
        isSystem: false,
      },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在或无权删除');
    }

    // 检查是否有支出使用该标签
    const expensesWithTag = await this.prisma.expense.count({
      where: {
        tagIds: {
          has: id,
        },
      },
    });

    if (expensesWithTag > 0) {
      // 从所有支出中移除该标签
      await this.prisma.expense.updateMany({
        where: {
          tagIds: {
            has: id,
          },
        },
        data: {
          tagIds: {
            set: {
              // Prisma 不支持直接删除数组元素，需要在应用中处理
            },
          },
        },
      });
    }

    return this.prisma.tag.delete({
      where: { id },
    });
  }

  // 初始化系统标签
  async initSystemTags() {
    const systemTags = [
      { name: '餐饮', color: '#FF6B6B', icon: 'restaurant' },
      { name: '交通', color: '#4ECDC4', icon: 'commute' },
      { name: '购物', color: '#45B7D1', icon: 'shopping' },
      { name: '娱乐', color: '#96CEB4', icon: 'sports_esports' },
      { name: '医疗', color: '#FFEAA7', icon: 'local_hospital' },
      { name: '教育', color: '#DDA0DD', icon: 'school' },
      { name: '住房', color: '#98D8C8', icon: 'home' },
      { name: '电子产品', color: '#F7DC6F', icon: 'devices' },
      { name: '办公用品', color: '#BB8FCE', icon: 'work' },
      { name: '日常', color: '#85C1E2', icon: 'daily' },
    ];

    for (const tag of systemTags) {
      await this.prisma.tag.upsert({
        where: {
          id: `system_${tag.name}`,
        },
        update: {},
        create: {
          id: `system_${tag.name}`,
          ...tag,
          isSystem: true,
        },
      });
    }
  }
}
