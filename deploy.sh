#!/bin/bash
# 3A Game Master 一键部署脚本
# 用法: ./deploy.sh [服务器IP]

set -e

SERVER_IP=${1:-123.207.50.64}
SERVER_USER=${2:-root}
REMOTE_PATH="/opt/3agamemaster"
LOCAL_PATH="/workspace/projects"

echo "====================================="
echo "  3A Game Master 部署脚本"
echo "====================================="
echo "目标服务器: $SERVER_USER@$SERVER_IP"
echo "远程路径: $REMOTE_PATH"
echo ""

# Step 1: 构建
echo "[1/4] 构建生产版本..."
cd $LOCAL_PATH
rm -f .next/lock
pnpm run build
echo "✓ 构建完成"

# Step 2: 打包
echo "[2/4] 打包部署文件..."
cd $LOCAL_PATH
tar -czf deploy.tar.gz \
  -C .next/standalone/workspace/projects . \
  -C ../../../.next static \
  -C ../../../ public \
  -C . ecosystem.config.js

echo "✓ 打包完成 ($(du -sh deploy.tar.gz | cut -f1))"

# Step 3: 上传
echo "[3/4] 上传到服务器..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"
scp deploy.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_PATH/
echo "✓ 上传完成"

# Step 4: 远程解压+重启
echo "[4/4] 远程部署..."
ssh $SERVER_USER@$SERVER_IP << 'REMOTE_SCRIPT'
cd /opt/3agamemaster
tar -xzf deploy.tar.gz
cp -r .next/static .next/ 2>/dev/null
cp -r public . 2>/dev/null
rm -f deploy.tar.gz

# 安装pm2如果不存在
which pm2 > /dev/null 2>&1 || npm install -g pm2

# 启动或重启
if pm2 describe 3agamemaster > /dev/null 2>&1; then
  pm2 restart 3agamemaster
  echo "✓ 服务已重启"
else
  pm2 start ecosystem.config.js
  pm2 save
  echo "✓ 服务已启动"
fi

# 等待启动
sleep 3
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "healthy"; then
  echo "✓ 健康检查通过"
else
  echo "✗ 健康检查失败，请检查日志"
  pm2 logs 3agamemaster --lines 20
fi
REMOTE_SCRIPT

echo ""
echo "====================================="
echo "  部署完成！"
echo "  访问: https://3agamemaster.com"
echo "  后台: https://3agamemaster.com/admin"
echo "====================================="
