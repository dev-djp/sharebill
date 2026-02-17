#!/bin/bash
# 数据恢复脚本

if [ -z "$1" ]; then
  echo "用法: ./restore.sh <备份文件路径>"
  echo "示例: ./restore.sh ./backups/sharebill_20240218_120000.sql.gz"
  exit 1
fi

BACKUP_FILE=$1
CONTAINER_NAME="sharebill-db"
DB_NAME="sharebill"
DB_USER="sharebill"

echo "开始恢复数据库..."
echo "备份文件: $BACKUP_FILE"

# 检查文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

# 恢复数据
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
else
  cat $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
fi

if [ $? -eq 0 ]; then
  echo "✅ 恢复完成"
else
  echo "❌ 恢复失败"
  exit 1
fi
