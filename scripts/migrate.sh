#!/bin/bash
# 数据库迁移脚本

echo "执行数据库迁移..."

cd apps/api

# 检查是否在 Docker 中运行
if [ -f /.dockerenv ]; then
  # 在容器内
  npx prisma migrate deploy
else
  # 在宿主机，通过 Docker 执行
  docker-compose exec api npx prisma migrate deploy
fi

if [ $? -eq 0 ]; then
  echo "✅ 迁移完成"
else
  echo "❌ 迁移失败"
  exit 1
fi
