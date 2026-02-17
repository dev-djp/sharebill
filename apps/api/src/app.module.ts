import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { TagsModule } from './modules/tags/tags.module';
import { FamiliesModule } from './modules/families/families.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ExpensesModule,
    TagsModule,
    FamiliesModule,
    StatisticsModule,
  ],
})
export class AppModule {}
