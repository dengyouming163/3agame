# 3A Game Master — 腾讯云部署方案

## 架构概览

```
用户(全球) → Cloudflare CDN(代理) → 腾讯云服务器(123.207.50.64) → Next.js(:3000)
                                                  ↓
                                            PostgreSQL(:5432)
```

---

## 一、服务器环境准备

### 1.1 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # 确认 v20+
```

### 1.2 安装 PM2

```bash
sudo npm install -g pm2
```

### 1.3 安装 Nginx

```bash
sudo apt-get install -y nginx
```

---

## 二、部署项目代码

### 2.1 上传构建产物

在本地沙箱执行：

```bash
# 打包部署文件（standalone + static + public）
cd /workspace/projects
tar -czf deploy.tar.gz \
  -C .next/standalone/workspace/projects . \
  -C ../../../.next static \
  -C ../../../ public

# 上传到服务器
scp deploy.tar.gz root@123.207.50.64:/opt/3agamemaster/
```

### 2.2 在服务器上解压

```bash
ssh root@123.207.50.64
mkdir -p /opt/3agamemaster
cd /opt/3agamemaster
tar -xzf deploy.tar.gz

# 复制static和public到正确位置
cp -r .next/static .next/
cp -r public .
```

### 2.3 配置环境变量

```bash
cat > /opt/3agamemaster/.env.local << 'EOF'
DATABASE_URL=postgresql://3agamemaster:dengyouming2tll@localhost:15432/3agamemaster
COZE_PROJECT_DOMAIN_DEFAULT=https://3agamemaster.com
COZE_PROJECT_ENV=PROD
ADMIN_PASSWORD=3agame2025
DEPLOY_RUN_PORT=3000
NODE_ENV=production
EOF
```

### 2.4 启动服务

```bash
cd /opt/3agamemaster
pm2 start server.js --name "3agamemaster" -i 1
pm2 save
pm2 startup  # 开机自启
```

验证：
```bash
curl http://localhost:3000/api/health
# 应返回 {"status":"healthy",...}
```

---

## 三、Nginx 反向代理

### 3.1 配置文件

```bash
sudo nano /etc/nginx/sites-available/3agamemaster
```

内容：

```nginx
server {
    listen 80;
    server_name 3agamemaster.com www.3agamemaster.com;

    # 限制上传大小（图片上传）
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存（Next.js编译产物）
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查不走Cloudflare缓存
    location /api/health {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-store";
    }
}
```

### 3.2 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/3agamemaster /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

验证：
```bash
curl -I http://3agamemaster.com
# 应返回 200
```

---

## 四、Cloudflare 配置

### 4.1 添加域名

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击 "Add a site" → 输入 `3agamemaster.com`
3. 选择 Free 计划 → 继续

### 4.2 修改 DNS 记录

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| A | `@` | `123.207.50.64` | ☁️ Proxied（橙色云朵） |
| A | `www` | `123.207.50.64` | ☁️ Proxied |

### 4.3 修改域名 NS

到域名注册商处将 NS 服务器改为 Cloudflare 提供的两个 NS：

```
xxx.ns.cloudflare.com
xxx.ns.cloudflare.com
```

等待 DNS 传播（通常 10分钟~24小时）。

### 4.4 SSL 配置

Cloudflare → SSL/TLS → Overview：
- 加密模式选择 **Full (strict)**

Cloudflare → SSL/TLS → Edge Certificates：
- Always Use HTTPS: **ON**
- Automatic HTTPS Rewrites: **ON**
- Minimum TLS Version: **TLS 1.2**

### 4.5 缓存规则

Cloudflare → Caching → Configuration：
- Caching Level: **Standard**

Cloudflare → Rules → Page Rules（或 Cache Rules）：
```
*.3agamemaster.com/_next/static/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month

*.3agamemaster.com/api/*
  - Cache Level: Bypass
```

### 4.6 性能优化

Cloudflare → Speed → Optimization：
- Auto Minify: JavaScript + CSS + HTML 全部勾选
- Brotli: **ON**
- Early Hints: **ON**
- Rocket Loader: **OFF**（可能与Next.js水合冲突）

---

## 五、每日自动生成（Cron Job）

在服务器上设置定时任务：

```bash
# 编辑 crontab
crontab -e

# 每天 8:00 (UTC) 自动生成3篇文章 + 调度发布
0 8 * * * curl -s -X POST https://3agamemaster.com/api/auto/daily >> /var/log/3agame-cron.log 2>&1
```

---

## 六、部署更新流程

以后每次更新代码后：

```bash
# 1. 本地构建
cd /workspace/projects
pnpm run build

# 2. 打包
tar -czf deploy.tar.gz \
  -C .next/standalone/workspace/projects . \
  -C ../../../.next static \
  -C ../../../ public

# 3. 上传
scp deploy.tar.gz root@123.207.50.64:/opt/3agamemaster/

# 4. 服务器上解压+重启
ssh root@123.207.50.64
cd /opt/3agamemaster
tar -xzf deploy.tar.gz
cp -r .next/static .next/
cp -r public .
pm2 restart 3agamemaster
```

---

## 七、监控与维护

| 项目 | 命令 |
|------|------|
| 查看服务状态 | `pm2 status` |
| 查看实时日志 | `pm2 logs 3agamemaster` |
| 重启服务 | `pm2 restart 3agamemaster` |
| 健康检查 | `curl http://localhost:3000/api/health` |
| Nginx日志 | `tail -f /var/log/nginx/access.log` |
| Cron日志 | `tail -f /var/log/3agame-cron.log` |
