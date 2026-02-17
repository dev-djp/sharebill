import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  getOverview(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statisticsService.getOverview(userId, { startDate, endDate });
  }

  @Get('tags')
  getTagStatistics(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statisticsService.getTagStatistics(userId, { startDate, endDate });
  }

  @Get('monthly')
  getMonthlyTrend(
    @CurrentUser('sub') userId: string,
    @Query('months') months?: number,
  ) {
    return this.statisticsService.getMonthlyTrend(userId, months ? Number(months) : 6);
  }

  @Get('categories')
  getCategoryStatistics(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statisticsService.getCategoryStatistics(userId, { startDate, endDate });
  }
}
