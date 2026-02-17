import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RecordCountSplitDto } from './dto/record-count-split.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SplitType } from '@prisma/client';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(userId, createExpenseDto);
  }

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tagIds') tagIds?: string,
    @Query('splitType') splitType?: SplitType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const parsedTagIds = tagIds ? tagIds.split(',') : undefined;
    return this.expensesService.findAll(userId, {
      startDate,
      endDate,
      tagIds: parsedTagIds,
      splitType,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(userId, id, updateExpenseDto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.remove(userId, id);
  }

  // 记录次数分摊使用
  @Post(':id/count-split')
  recordCountSplit(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: RecordCountSplitDto,
  ) {
    return this.expensesService.recordCountSplit(userId, id, dto.count, dto.note);
  }

  // 结算时间分摊
  @Post(':id/settle-time')
  settleTimeSplit(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body('date') date: string,
  ) {
    return this.expensesService.settleTimeSplit(userId, id, date);
  }
}
