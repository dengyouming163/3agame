#!/bin/bash
# 3AGameMaster 服务器初始化脚本
# 在腾讯云服务器上执行

echo "=== 安装PostgreSQL客户端 ==="
yum install -y postgresql 2>/dev/null || dnf install -y postgresql 2>/dev/null

echo "=== 验证psql ==="
which psql && echo "psql安装成功" || echo "psql安装失败，请手动安装"
