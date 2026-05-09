# 3A Game Master — 宝塔面板部署教程

## 前提条件

- 腾讯云服务器已安装宝塔面板（如未安装，见下方安装方法）
- 域名 `3agamemaster.com` 已购买
- 服务器公网IP已知（下文用 `YOUR_SERVER_IP` 代替）

---

## 一、宝塔面板安装（如已安装跳过）

```bash
# CentOS
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu/Debian
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

安装完成后会输出：
- 面板访问地址（如 `http://YOUR_SERVER_IP:8888/xxxx`）
- 初始用户名和密码

> 首次登录宝塔后，会弹出"推荐安装套件"，选择 **Nginx** 套件安装。

---

## 二、宝塔面板安装运行环境

### 2.1 安装 Node.js 版本管理器

1. 进入宝塔面板 → **软件商店**
2. 搜索 **"Node.js版本管理器"** → 点击 **安装**
3. 安装完成后，点击 **设置**
4. 选择安装 **Node.js 20.x** 或 **Node.js 22.x**（LTS版本）
5. 等待安装完成

### 2.2 安装 PM2 管理器

1. 软件商店 → 搜索 **"PM2管理器"** → 点击 **安装**
2. 安装完成后备用

### 2.3 安装 Nginx

1. 如果首次安装宝塔时没选Nginx：软件商店 → 搜索 **"Nginx"** → 安装
2. 确保Nginx处于运行状态

### 2.4 安装 PostgreSQL 客户端库

```bash
# SSH终端执行（宝塔面板 → 终端）
# CentOS
yum install -y postgresql-devel

# Ubuntu/Debian
apt install -y libpq-dev
```

> 这是为了让 Node.js 的 `pg` 库能正常连接 PostgreSQL 数据库。

---

## 三、部署项目代码

### 3.1 SSH进入服务器

宝塔面板 → **终端**，或用 SSH 工具连接服务器。

### 3.2 创建项目目录

```bash
mkdir -p /www/wwwroot/3agamemaster
cd /www/wwwroot/3agamemaster
```

### 3.3 上传项目代码

**方式A：Git拉取（推荐）**

```bash
cd /www/wwwroot/3agamemaster

# 如果项目在 GitHub/Gitee 上
git clone https://your-repo-url.git .

# 如果还没推到Git，用宝塔文件管理器上传
```

**方式B：宝塔文件管理器上传**

1. 宝塔面板 → **文件** → 进入 `/www/wwwroot/3agamemaster`
2. 点击 **上传** → 上传项目压缩包
3. 解压

### 3.4 安装依赖

```bash
cd /www/wwwroot/3agamemaster

# 使用 Node.js 版本管理器中的 Node
# 宝塔的Node通常在 /www/server/nodejs/v20xxx/bin/node
# 先查看路径
ls /www/server/nodejs/

# 设置npm源为国内镜像（加速）
npm config set registry https://registry.npmmirror.com

# 安装 pnpm
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 3.5 构建生产版本

```bash
cd /www/wwwroot/3agamemaster
pnpm run build
```

构建成功后，确认 `.next/standalone` 目录存在：

```bash
ls .next/standalone/
```

### 3.6 复制静态资源

```bash
cd /www/wwwroot/3agamemaster

# standalone 模式需要手动复制 static 和 public
cp -r .next/static .next/standalone/workspace/projects/.next/
cp -r public .next/standalone/workspace/projects/
```

### 3.7 创建环境变量文件

```bash
cd /www/wwwroot/3agamemaster
cat > .env.production << 'EOF'
DATABASE_URL=postgresql://3agame:dengyouming@123.207.50.64:5432/3agame
COZE_PROJECT_DOMAIN_DEFAULT=https://3agamemaster.com
PORT=5000
NODE_ENV=production
ADMIN_PASSWORD=3agame2025
EOF
```

---

## 四、PM2 启动项目

### 4.1 使用宝塔PM2管理器

1. 宝塔面板 → **软件商店** → **PM2管理器** → **设置**
2. 点击 **添加项目**
3. 填写：
   - **项目名称**：`3agamemaster`
   - **启动文件**：`/www/wwwroot/3agamemaster/.next/standalone/workspace/projects/server.js`
   - **运行目录**：`/www/wwwroot/3agamemaster/.next/standalone/workspace/projects`
   - **环境变量**（点击展开）：
     ```
     DATABASE_URL=postgresql://3agame:dengyouming@123.207.50.64:5432/3agame
     COZE_PROJECT_DOMAIN_DEFAULT=https://3agamemaster.com
     PORT=5000
     NODE_ENV=production
     ADMIN_PASSWORD=3agame2025
     ```
4. 点击 **提交**

### 4.2 或使用命令行启动

```bash
cd /www/wwwroot/3agamemaster/.next/standalone/workspace/projects

DATABASE_URL="postgresql://3agame:dengyouming@123.207.50.64:5432/3agame" \
COZE_PROJECT_DOMAIN_DEFAULT="https://3agamemaster.com" \
PORT=5000 \
NODE_ENV=production \
ADMIN_PASSWORD=3agame2025 \
/www/server/nodejs/v20/bin/node server.js
```

### 4.3 验证服务启动

```bash
# 本机测试
curl http://localhost:5000/api/health
```

正常返回：
```json
{"status":"healthy","services":{"database":{"connected":true},"storage":{"configured":true}}}
```

---

## 五、宝塔配置 Nginx 反向代理

### 5.1 添加站点

1. 宝塔面板 → **网站** → **添加站点**
2. 填写：
   - **域名**：`3agamemaster.com` 和 `www.3agamemaster.com`
   - **根目录**：`/www/wwwroot/3agamemaster`（保持默认即可，实际由Nginx代理）
   - **PHP版本**：纯静态
   - **数据库**：不创建
3. 点击 **提交**

### 5.2 配置反向代理

1. 网站列表 → 点击 `3agamemaster.com` → **设置**
2. 左侧点击 **反向代理** → **添加反向代理**
3. 填写：
   - **代理名称**：`3agamemaster`
   - **目标URL**：`http://127.0.0.1:5000`
   - **发送域名**：`$host`
4. 点击 **提交**

### 5.3 修改Nginx配置（关键）

宝塔自动生成的反向代理配置需要修改，以支持WebSocket和正确转发头部：

1. 网站设置 → **配置文件**
2. 在 `server { }` 块内，找到 `location /` 部分，**替换为以下内容**：

```nginx
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        
        # 超时设置（AI生成接口可能需要较长时间）
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # 缓冲设置
        proxy_buffering off;
        proxy_cache off;
    }
    
    # Next.js 静态资源缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:5000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    # S3存储的图片走代理缓存
    location ~* \.(jpg|jpeg|png|gif|webp|svg|ico)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
```

3. 点击 **保存**

### 5.4 开放防火墙端口

1. 宝塔面板 → **安全**
2. 确保 **5000** 端口**不需要**对外开放（仅本机Nginx访问）
3. 确保 **80** 和 **443** 端口已开放

同时检查腾讯云安全组：
1. 腾讯云控制台 → 云服务器 → 安全组
2. 确保入站规则允许 **80**（HTTP）和 **443**（HTTPS）

---

## 六、Cloudflare 全球CDN代理

### 6.1 添加域名到 Cloudflare

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击 **添加站点** → 输入 `3agamemaster.com`
3. 选择 **Free 计划** → 继续

### 6.2 修改 DNS 域名服务器

Cloudflare 会给你两个域名服务器，如：
- `gina.ns.cloudflare.com`
- `tim.ns.cloudflare.com`

1. 登录你的域名注册商（腾讯云/阿里云/GoDaddy等）
2. 找到域名管理 → DNS管理 / 域名服务器
3. 将默认DNS服务器替换为 Cloudflare 提供的两个
4. 等待DNS生效（通常10分钟~24小时）

### 6.3 配置 DNS 记录

Cloudflare 面板 → **DNS** → **记录**：

| 类型 | 名称 | 内容 | 代理状态 | TTL |
|------|------|------|----------|-----|
| A | `@` | `YOUR_SERVER_IP` | ☁️ 已代理（橙色云朵） | 自动 |
| A | `www` | `YOUR_SERVER_IP` | ☁️ 已代理（橙色云朵） | 自动 |

> **关键**：代理状态必须是 ☁️ 橙色云朵（Proxied），这样流量才走 Cloudflare CDN。

### 6.4 配置 SSL/TLS

1. Cloudflare → **SSL/TLS** → **概述**
2. 加密模式选择 **完全（严格）**

> 这意味着 Cloudflare 到你服务器之间也需要有效证书。宝塔可以自动申请Let's Encrypt证书。

### 6.5 宝塔申请 SSL 证书

1. 宝塔面板 → 网站 → `3agamemaster.com` → 设置 → **SSL**
2. 选择 **Let's Encrypt**
3. 勾选 `3agamemaster.com` 和 `www.3agamemaster.com`
4. 点击 **申请**
5. 申请成功后，开启 **强制HTTPS**

> 如果申请失败（DNS还没生效），等DNS生效后再试。

### 6.6 Cloudflare 缓存规则（可选优化）

Cloudflare → **缓存** → **配置**：

| 规则 | 缓存级别 | TTL |
|------|----------|-----|
| `/_next/static/*` | 标准 | 1个月 |
| `/*.jpg,/*.png,/*.webp` | 标准 | 30天 |
| `/api/*` | 绕过 | 不缓存 |

Cloudflare → **规则** → **页面规则**：

```
URL: *3agamemaster.com/api/*
设置: 缓存级别 = 绕过

URL: *3agamemaster.com/_next/static/*
设置: 浏览器缓存TTL = 1年, 边缘缓存TTL = 1个月
```

### 6.7 Cloudflare 性能优化（可选）

- **速度** → **优化** → 开启 **Auto Minify**（JS+CSS+HTML）
- **速度** → **优化** → 开启 **Brotli**
- **速度** → **优化** → 开启 **Early Hints**
- **速度** → **优化** → **Rocket Loader** → **关闭**（可能与Next.js冲突）

---

## 七、验证部署

### 7.1 本机验证

```bash
curl http://localhost:5000/api/health
```

### 7.2 Nginx验证

```bash
curl -H "Host: 3agamemaster.com" http://127.0.0.1/api/health
```

### 7.3 外网验证

```bash
curl https://3agamemaster.com/api/health
```

### 7.4 浏览器验证

1. 访问 `https://3agamemaster.com` — 首页正常展示
2. 访问 `https://3agamemaster.com/guides` — 攻略列表
3. 访问 `https://3agamemaster.com/admin` — 输入密码 `3agame2025` 进入后台
4. 后台 → AI生成 → 生成一篇测试文章 → 审核发布 → 确认前端展示

---

## 八、日常更新流程

### 每次代码更新后：

```bash
cd /www/wwwroot/3agamemaster

# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖（如有变更）
pnpm install

# 3. 重新构建
pnpm run build

# 4. 复制静态资源
cp -r .next/static .next/standalone/workspace/projects/.next/
cp -r public .next/standalone/workspace/projects/

# 5. 重启PM2
pm2 restart 3agamemaster
```

### 或使用一键脚本：

```bash
bash /www/wwwroot/3agamemaster/deploy.sh
```

---

## 九、宝塔定时任务 — 每日自动生成+发布

1. 宝塔面板 → **计划任务**
2. 添加任务：
   - **任务类型**：Shell脚本
   - **任务名称**：每日自动生成攻略
   - **执行周期**：每天 08:00
   - **脚本内容**：

```bash
#!/bin/bash
# 每日自动生成3篇攻略 + 调度发布
curl -s -X POST https://3agamemaster.com/api/auto/daily >> /www/wwwlogs/3agamemaster-cron.log 2>&1
echo "$(date): daily task executed" >> /www/wwwlogs/3agamemaster-cron.log
```

3. 点击 **提交**

> 这样每天早上8点自动生成3篇新攻略并安排发布，你只需要在后台审核即可。

---

## 十、故障排查

| 问题 | 排查方法 |
|------|----------|
| 网站打不开 | 宝塔 → PM2管理器 → 检查项目是否运行 |
| 502 Bad Gateway | PM2项目未启动或端口不对，检查5000端口 |
| 数据库连不上 | SSH执行 `psql -h 123.207.50.64 -U 3agame -d 3agame` 测试 |
| SSL证书申请失败 | 确保DNS已指向Cloudflare，暂时关闭Cloudflare代理（灰色云朵）再申请 |
| AI生成超时 | Nginx超时设置调大（proxy_read_timeout 300s） |
| 图片无法加载 | 检查S3存储配置，查看PM2日志 |
| Cloudflare 522 | 服务器Nginx未运行或防火墙拦截了Cloudflare IP |

### 查看日志

```bash
# PM2日志
pm2 logs 3agamemaster

# Nginx日志
tail -f /www/wwwlogs/3agamemaster.com.log
tail -f /www/wwwlogs/3agamemaster.com.error.log

# 宝塔PM2管理器中也可直接查看
```

---

## 完整架构图

```
用户(全球) 
    ↓
Cloudflare CDN (全球节点，SSL终止)
    ↓ HTTPS
腾讯云服务器 (Nginx)
    ↓ HTTP :5000
PM2 → Next.js Standalone Server
    ↓ PostgreSQL连接
数据库 123.207.50.64:5432
    ↓
S3对象存储 (CDN分发图片)
```
