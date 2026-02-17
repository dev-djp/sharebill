#!/bin/bash
# 启动 ShareBill 后端并暴露公网访问

echo "🚀 ShareBill 后端启动脚本"
echo "=========================="

cd "$(dirname "$0")/.."

# 获取公网 IP
PUBLIC_IP=$(curl -s https://api.ipify.org)
echo ""
echo "📡 公网 IP: $PUBLIC_IP"
echo ""

# 检查 Docker
echo "📦 步骤 1/4: 启动数据库..."
docker-compose up -d postgres redis

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 5

# 安装依赖
echo ""
echo "🔧 步骤 2/4: 安装依赖..."
cd apps/api
npm install

# 生成 Prisma 客户端
echo ""
echo "🗄️  步骤 3/4: 生成 Prisma 客户端..."
npx prisma generate

# 执行数据库迁移
echo ""
echo "📊 步骤 4/4: 执行数据库迁移..."
npx prisma migrate deploy

# 初始化系统标签
echo ""
echo "🏷️  初始化系统标签..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const systemTags = [
  { id: 'system_餐饮', name: '餐饮', color: '#FF6B6B', icon: 'restaurant', isSystem: true },
  { id: 'system_交通', name: '交通', color: '#4ECDC4', icon: 'commute', isSystem: true },
  { id: 'system_购物', name: '购物', color: '#45B7D1', icon: 'shopping', isSystem: true },
  { id: 'system_娱乐', name: '娱乐', color: '#96CEB4', icon: 'sports_esports', isSystem: true },
  { id: 'system_医疗', name: '医疗', color: '#FFEAA7', icon: 'local_hospital', isSystem: true },
  { id: 'system_教育', name: '教育', color: '#DDA0DD', icon: 'school', isSystem: true },
  { id: 'system_住房', name: '住房', color: '#98D8C8', icon: 'home', isSystem: true },
  { id: 'system_电子产品', name: '电子产品', color: '#F7DC6F', icon: 'devices', isSystem: true },
  { id: 'system_办公用品', name: '办公用品', color: '#BB8FCE', icon: 'work', isSystem: true },
  { id: 'system_日常', name: '日常', color: '#85C1E2', icon: 'daily', isSystem: true },
];

async function init() {
  for (const tag of systemTags) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: {},
      create: tag,
    });
  }
  console.log('✅ 系统标签初始化完成');
  await prisma.\$disconnect();
}

init().catch(console.error);
"

echo ""
echo "✅ 环境准备完成!"
echo ""
echo "🚀 启动后端服务器..."
echo ""
echo "📱 移动端 API 地址:"
echo "  开发环境: http://10.0.2.2:3000/api/v1 (Android 模拟器)"
echo "  真机访问: http://$PUBLIC_IP:3000/api/v1"
echo ""
echo "⚠️  注意: 确保服务器防火墙开放 3000 端口"
echo ""

# 启动开发服务器
npm run start:dev
