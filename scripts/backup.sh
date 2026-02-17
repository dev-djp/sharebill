#!/bin/bash
# 数据备份脚本

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="sharebill-db"
DB_NAME="sharebill"
DB_USER="sharebill"

echo "开始备份数据库..."

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/sharebill_$TIMESTAMP.sql

if [ $? -eq 0 ]; then
  # 压缩备份
  gzip $BACKUP_DIR/sharebill_$TIMESTAMP.sql
  
  # 保留最近 30 天的备份
  find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
  
  echo "✅ 备份完成: $BACKUP_DIR/sharebill_$TIMESTAMP.sql.gz"
else
  echo "❌ 备份失败"
  exit 1
fi
