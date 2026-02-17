# ShareBill 技术架构文档

## 1. 技术栈选型

### 1.1 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 20 LTS | 运行环境 |
| **NestJS** | 10.x | Web 框架 |
| **TypeScript** | 5.x | 开发语言 |
| **Prisma** | 5.x | ORM + 数据库迁移 |
| **PostgreSQL** | 16 | 主数据库 |
| **Redis** | 7 | 缓存 + 会话 |
| **JWT** | - | 身份认证 |
| **bcrypt** | - | 密码加密 |
| **class-validator** | - | 参数校验 |

### 1.2 部署与运维
| 技术 | 用途 |
|------|------|
| **Docker** | 容器化 |
| **Docker Compose** | 本地/单机部署 |
| **PostgreSQL 原生备份** | 数据导出/迁移 |
| **Prisma Migrate** | 数据库版本控制 |

---

## 2. 项目结构

```
sharebill/
├── apps/
│   ├── api/                    # NestJS 主应用
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # 认证模块
│   │   │   │   ├── users/      # 用户模块
│   │   │   │   ├── expenses/   # 记账模块
│   │   │   │   ├── families/   # 家庭/群组模块
│   │   │   │   ├── tags/       # 标签模块
│   │   │   │   └── statistics/ # 统计模块
│   │   │   ├── common/         # 公共工具
│   │   │   ├── prisma/         # Prisma 客户端
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 数据库模型
│   │   │   └── migrations/     # 迁移文件
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                    # Flutter Web 构建产物
├── docker-compose.yml          # 一键部署配置
├── docker-compose.prod.yml     # 生产环境配置
├── scripts/
│   ├── backup.sh               # 数据备份脚本
│   ├── restore.sh              # 数据恢复脚本
│   └── migrate.sh              # 数据库迁移脚本
└── README.md
```

---

## 3. 数据库设计（Prisma Schema）

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户模型
model User {
  id            String    @id @default(uuid())
  phone         String?   @unique
  email         String?   @unique
  password      String    // bcrypt 加密
  nickname      String?
  avatarUrl     String?
  defaultCurrency String  @default("CNY")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // 关联
  expenses      Expense[]
  families      FamilyMember[]
  tags          Tag[]
  
  @@map("users")
}

// 标签模型
model Tag {
  id        String   @id @default(uuid())
  name      String
  color     String   @default("#1890ff")
  icon      String?
  isSystem  Boolean  @default(false)
  userId    String?
  createdAt DateTime @default(now())
  
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses  Expense[]
  
  @@map("tags")
}

// 支出记录
model Expense {
  id          String    @id @default(uuid())
  userId      String
  familyId    String?
  
  // 基本信息
  amount      Decimal   @db.Decimal(10, 2)
  currency    String    @default("CNY")
  name        String
  description String?
  category    String    @default("other")
  expenseDate DateTime  @db.Date
  
  // 分摊类型
  splitType   SplitType @default(NONE) // NONE, TIME, COUNT
  splitConfig Json?     // 分摊配置 JSON
  
  // 关联
  images      String[]  // 图片 URL 数组
  tagIds      String[]  // 标签 ID 数组
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // 关联
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  family      Family?   @relation(fields: [familyId], references: [id])
  timeSplits  TimeSplitDetail[]
  countSplits CountSplitRecord[]
  familySplits FamilyExpenseSplit[]
  
  @@map("expenses")
}

// 时间分摊明细
model TimeSplitDetail {
  id          String    @id @default(uuid())
  expenseId   String
  date        DateTime  @db.Date
  amount      Decimal   @db.Decimal(10, 2)
  isSettled   Boolean   @default(false)
  
  expense     Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  
  @@map("time_split_details")
}

// 次数分摊记录
model CountSplitRecord {
  id          String    @id @default(uuid())
  expenseId   String
  usedCount   Int
  usedDate    DateTime  @default(now())
  note        String?
  
  expense     Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  
  @@map("count_split_records")
}

// 家庭/群组
model Family {
  id               String    @id @default(uuid())
  name             String
  createdBy        String
  defaultSplitRule SplitRule @default(EQUAL)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  // 关联
  members   FamilyMember[]
  expenses  Expense[]
  
  @@map("families")
}

// 家庭成员
model FamilyMember {
  id       String    @id @default(uuid())
  familyId String
  userId   String
  role     MemberRole @default(MEMBER)
  nickname String?
  joinDate DateTime   @default(now())
  
  family   Family    @relation(fields: [familyId], references: [id], onDelete: Cascade)
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  splits   FamilyExpenseSplit[]
  
  @@unique([familyId, userId])
  @@map("family_members")
}

// 家庭支出分摊记录
model FamilyExpenseSplit {
  id         String  @id @default(uuid())
  expenseId  String
  memberId   String
  shouldPay  Decimal @db.Decimal(10, 2)
  paid       Decimal @default(0) @db.Decimal(10, 2)
  splitRatio Decimal @db.Decimal(5, 2)
  
  expense  Expense      @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  member   FamilyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  
  @@map("family_expense_splits")
}

// 枚举类型
enum SplitType {
  NONE
  TIME
  COUNT
}

enum SplitRule {
  EQUAL
  INCOME
  CUSTOM
}

enum MemberRole {
  ADMIN
  MEMBER
}
```

---

## 4. 部署方案

### 4.1 开发环境（Docker Compose）

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sharebill-db
    environment:
      POSTGRES_USER: sharebill
      POSTGRES_PASSWORD: sharebill123
      POSTGRES_DB: sharebill
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sharebill"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sharebill-redis
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: sharebill-api
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://sharebill:sharebill123@postgres:5432/sharebill?schema=public
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret-key-change-in-production
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    command: npm run start:dev

volumes:
  postgres_data:
  redis_data:
```

### 4.2 生产环境

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sharebill-db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sharebill-redis
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: sharebill-api
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 5. 数据安全与迁移方案

### 5.1 自动备份脚本

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="sharebill"
DB_USER="sharebill"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker exec sharebill-db pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/sharebill_$TIMESTAMP.sql

# 压缩备份
gzip $BACKUP_DIR/sharebill_$TIMESTAMP.sql

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "备份完成: $BACKUP_DIR/sharebill_$TIMESTAMP.sql.gz"
```

### 5.2 数据恢复脚本

```bash
#!/bin/bash
# scripts/restore.sh

if [ -z "$1" ]; then
  echo "用法: ./restore.sh <备份文件路径>"
  exit 1
fi

BACKUP_FILE=$1
DB_NAME="sharebill"
DB_USER="sharebill"

# 解压备份
gunzip -c $BACKUP_FILE | docker exec -i sharebill-db psql -U $DB_USER -d $DB_NAME

echo "恢复完成: $BACKUP_FILE"
```

### 5.3 数据库迁移命令

```bash
# 开发环境
npx prisma migrate dev

# 生产环境
npx prisma migrate deploy

# 生成客户端
npx prisma generate
```

---

## 6. API 接口规范

### 6.1 基础路径
- 基础 URL: `/api/v1`
- 认证方式: JWT Bearer Token

### 6.2 核心接口

#### 认证模块
```
POST   /auth/register          # 注册
POST   /auth/login             # 登录
POST   /auth/refresh           # 刷新 Token
```

#### 用户模块
```
GET    /users/profile          # 获取个人信息
PATCH  /users/profile          # 更新个人信息
```

#### 记账模块
```
GET    /expenses               # 获取支出列表
POST   /expenses               # 创建支出
GET    /expenses/:id           # 获取支出详情
PATCH  /expenses/:id           # 更新支出
DELETE /expenses/:id           # 删除支出
```

#### 标签模块
```
GET    /tags                   # 获取标签列表
POST   /tags                   # 创建标签
PATCH  /tags/:id               # 更新标签
DELETE /tags/:id               # 删除标签
```

#### 家庭模块
```
GET    /families               # 获取家庭列表
POST   /families               # 创建家庭
GET    /families/:id           # 获取家庭详情
POST   /families/:id/members   # 添加成员
DELETE /families/:id/members/:userId  # 移除成员
POST   /families/:id/settlement       # 结算
```

#### 统计模块
```
GET    /statistics/overview    # 总览统计
GET    /statistics/tags        # 标签统计
GET    /statistics/trends      # 趋势分析
GET    /statistics/family/:id  # 家庭统计
```

---

## 7. 环境变量配置

```bash
# .env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://sharebill:sharebill123@localhost:5432/sharebill?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Optional
LOG_LEVEL=debug
```

---

## 8. 部署步骤

### 8.1 首次部署

```bash
# 1. 克隆代码
git clone <repo> sharebill
cd sharebill

# 2. 创建环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 启动服务
docker-compose up -d

# 4. 执行数据库迁移
docker-compose exec api npx prisma migrate deploy

# 5. 生成 Prisma 客户端
docker-compose exec api npx prisma generate

# 6. 查看日志
docker-compose logs -f api
```

### 8.2 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建
docker-compose down
docker-compose up -d --build

# 执行迁移
docker-compose exec api npx prisma migrate deploy
```

### 8.3 数据备份

```bash
# 手动备份
./scripts/backup.sh

# 定时备份（crontab）
# 每天凌晨 2 点备份
0 2 * * * cd /path/to/sharebill && ./scripts/backup.sh
```

---

**文档版本**: v1.0  
**创建日期**: 2026-02-18  
**状态**: 待开发
