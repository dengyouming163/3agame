#!/bin/bash
# ============================================
# 3A Game Master - 服务器部署脚本
# 用法: bash deploy.sh [install|update|restart|status|logs]
# ============================================

set -euo pipefail

# ─── 项目配置 ───
PROJECT_NAME="3agamemaster"
PROJECT_DIR="/www/wwwroot/3agamaster.com"
GIT_REPO="https://github.com/dengyouming163/3agame.git"
APP_PORT=3000
NODE_ENV="production"

# ─── 颜色输出 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── 环境变量文件 ───
ENV_FILE="$PROJECT_DIR/.env.production"

ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    warn ".env.production 不存在，正在创建..."
    cat > "$ENV_FILE" << 'ENVEOF'
# ─── 通用 ───
NODE_ENV=production
PORT=3000

# ─── 数据库 (PostgreSQL) ───
DATABASE_URL=postgresql://aaagame:dengyouming2tll@132.232.166.40:15432/aaagame

# ─── 对象存储 (Cloudflare R2) ───
R2_ENDPOINT=https://60a85e45fc6d5612283f700354563a42.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=79f50cc0491127dc22ea587b2f4133bf
R2_SECRET_ACCESS_KEY=e654e66fd586935dd604fb907d58a56a01dd597121420af853ba5093a6fb7390
R2_BUCKET=3agamemaster
R2_PUBLIC_DOMAIN=img.3agamemaster.com

# ─── AI 模型 (coze-coding-dev-sdk) ───
COZE_WORKLOAD_IDENTITY_API_KEY=NHpQVkVTMDl3Mzl4U0x5T3haRmtiNFh4SlpXaGRjeHA6SDVDTE5KT1dEaXZZQTZ4M1NVZ2RkaERIMEJtODlldWs5MUxsaUhxb1JjUG94Q212Y0RvdGJhYXNHYndrQzdwdQ==
COZE_INTEGRATION_BASE_URL=https://integration.coze.cn
COZE_INTEGRATION_MODEL_BASE_URL=https://integration.coze.cn/api/v3

# ─── 可选 ───
ADMIN_PASSWORD=3agame2025
ENVEOF
    chmod 600 "$ENV_FILE"
    ok ".env.production 已创建 (权限600)"
  fi
}

# ─── Step 0: 环境安装 ───
cmd_install() {
  info "=== 安装运行环境 ==="

  # Node.js
  if ! command -v node &>/dev/null; then
    info "安装 Node.js 20 ..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  fi
  ok "Node.js $(node -v)"

  # pnpm
  if ! command -v pnpm &>/dev/null; then
    info "安装 pnpm..."
    npm install -g pnpm
  fi
  ok "pnpm $(pnpm -v)"

  # PM2
  if ! command -v pm2 &>/dev/null; then
    info "安装 PM2..."
    npm install -g pm2
  fi
  ok "PM2 $(pm2 -v)"

  # 创建项目目录
  mkdir -p "$PROJECT_DIR"
  ok "项目目录: $PROJECT_DIR"

  # 创建 .env.production
  ensure_env

  # PM2 开机自启
  pm2 startup 2>/dev/null || true

  echo ""
  ok "=== 环境安装完成 ==="
  info "下一步: bash deploy.sh clone  (克隆代码)"
  info "       bash deploy.sh update  (构建+启动)"
}

# ─── Step 0.5: 克隆代码 ───
cmd_clone() {
  info "=== 克隆代码 ==="

  if [ -d "$PROJECT_DIR/.git" ]; then
    ok "代码已存在，执行 pull..."
    cd "$PROJECT_DIR"
    git pull origin main
  else
    info "克隆仓库 $GIT_REPO ..."
    mkdir -p "$PROJECT_DIR"
    git clone "$GIT_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
  fi

  ok "代码就绪"
}

# ─── Step 1: 构建 ───
cmd_build() {
  info "=== 构建项目 ==="
  cd "$PROJECT_DIR"

  # 安装依赖
  info "安装依赖..."
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  ok "依赖安装完成"

  # 构建 Next.js (standalone 模式)
  info "构建 Next.js..."
  pnpm next build
  ok "Next.js 构建完成"

  # 构建 server.ts → dist/server.js
  info "构建 standalone server..."
  npx tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting
  ok "Server 构建完成"

  # 复制静态资源到 standalone 目录
  info "组装 standalone 产物..."
  STANDALONE_DIR="$PROJECT_DIR/.next/standalone/workspace/projects"
  if [ -d "$STANDALONE_DIR" ]; then
    # 复制 .next/static
    cp -r "$PROJECT_DIR/.next/static" "$STANDALONE_DIR/.next/static"
    # 复制 public
    cp -r "$PROJECT_DIR/public" "$STANDALONE_DIR/public"
    # 复制 dist/server.js (我们的自定义server)
    cp "$PROJECT_DIR/dist/server.js" "$STANDALONE_DIR/server.js"
    # 复制 .env.production
    if [ -f "$ENV_FILE" ]; then
      cp "$ENV_FILE" "$STANDALONE_DIR/.env.production"
    fi
    ok "Standalone 产物组装完成: $STANDALONE_DIR"
  else
    error "Standalone 目录不存在: $STANDALONE_DIR"
  fi
}

# ─── Step 2: 启动/重启服务 ───
cmd_restart() {
  info "=== 重启服务 ==="

  STANDALONE_DIR="$PROJECT_DIR/.next/standalone/workspace/projects"

  if [ ! -f "$STANDALONE_DIR/server.js" ]; then
    error "未找到 server.js，请先运行 bash deploy.sh build"
  fi

  cd "$STANDALONE_DIR"

  # 用 PM2 启动
  pm2 delete $PROJECT_NAME 2>/dev/null || true
  pm2 start server.js \
    --name $PROJECT_NAME \
    --env production \
    --node-args="-r dotenv/config" \
    --dotenv "$STANDALONE_DIR/.env.production" \
    --time \
    --max-memory-restart 512M \
    --log-date-format "YYYY-MM-DD HH:mm:ss"

  pm2 save
  ok "服务已启动 (PID: $(pm2 pid $PROJECT_NAME 2>/dev/null || echo 'N/A'))"

  # 验证
  sleep 3
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    ok "服务验证通过: http://localhost:$APP_PORT (HTTP $HTTP_CODE)"
  else
    warn "服务可能未就绪 (HTTP $HTTP_CODE)，请检查: pm2 logs $PROJECT_NAME"
  fi

  ok "=== 服务已启动 ==="
}

# ─── Step 3: 更新部署 ───
cmd_update() {
  info "=== 更新部署 ==="
  cd "$PROJECT_DIR"

  # 拉取代码
  if [ -d ".git" ]; then
    info "拉取最新代码..."
    git pull origin main || warn "Git pull 失败，使用本地代码"
  else
    warn "非 Git 仓库，跳过代码拉取"
  fi

  # 确保 .env.production 存在
  ensure_env

  # 构建
  cmd_build

  # 重启
  cmd_restart

  ok "=== 更新部署完成 ==="
  info "访问: https://3agamemaster.com"
}

# ─── Step 4: 查看状态 ───
cmd_status() {
  echo "=== 服务状态 ==="
  pm2 describe $PROJECT_NAME 2>/dev/null || echo "服务未运行"
  echo ""
  echo "=== 端口监听 ==="
  ss -tuln | grep ":$APP_PORT" || echo "端口 $APP_PORT 未监听"
  echo ""
  echo "=== 健康检查 ==="
  curl -s http://localhost:$APP_PORT/api/health 2>/dev/null | head -c 200 || echo "无法连接"
}

# ─── Step 5: 查看日志 ───
cmd_logs() {
  pm2 logs $PROJECT_NAME --lines 50
}

# ─── 主入口 ───
case "${1:-help}" in
  clone)    cmd_clone   ;;
  install)  cmd_install  ;;
  build)    cmd_build    ;;
  restart)  cmd_restart  ;;
  update)   cmd_update   ;;
  status)   cmd_status   ;;
  logs)     cmd_logs     ;;
  *)
    echo "3A Game Master 部署工具"
    echo ""
    echo "用法: bash deploy.sh <命令>"
    echo ""
    echo "命令:"
    echo "  clone     克隆/更新代码 (首次部署用)"
    echo "  install   首次安装 (Node.js + pnpm + PM2)"
    echo "  build     构建项目"
    echo "  restart   重启服务"
    echo "  update    拉取代码 + 构建 + 重启 (日常更新用)"
    echo "  status    查看服务状态"
    echo "  logs      查看实时日志"
    ;;
esac
