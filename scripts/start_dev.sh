#!/bin/bash
# 快速启动开发环境

echo "🚀 ShareBill 开发环境启动脚本"
echo "=============================="

cd "$(dirname "$0")/.."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未找到 Docker，请先安装 Docker"
    exit 1
fi

echo ""
echo "📦 步骤 1/3: 启动数据库和 Redis..."
docker-compose up -d postgres redis

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 5

echo ""
echo "🔧 步骤 2/3: 安装依赖..."
cd apps/api
npm install

echo ""
echo "🗄️  步骤 3/3: 执行数据库迁移..."
npx prisma generate
npx prisma migrate dev --name init || npx prisma migrate deploy

echo ""
echo "✅ 环境准备完成!"
echo ""
echo "🚀 启动开发服务器:"
echo "  cd apps/api && npm run start:dev"
echo ""
echo "📱 API 地址: http://localhost:3000/api/v1"
echo "📊 数据库: localhost:5432"
echo ""
echo "💡 提示: 开发阶段登录验证码 = 手机号后6位"
