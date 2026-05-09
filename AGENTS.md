# 项目上下文 - 3A Game Master (3A游戏攻略自动化发布平台)

### 品牌定位
- **品牌名**: 3A Game Master
- **目标用户**: 全球英语区3A单机硬核玩家
- **核心目标**: 流量获取 → 广告变现 + Steam联盟转化
- **网站风格**: 硬核游戏暗黑美学，深黑底+霓虹紫/青/红点缀
- **域名**: 3agamemaster.com

### 版本技术栈

- **Framework**: Next.js 16 (App Router, standalone output for Cloudflare Pages)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4 (暗黑游戏主题)
- **Database**: PostgreSQL (生产: 123.207.50.64 / 开发: 平台Supabase自动回退)
- **AI**: coze-coding-dev-sdk (LLM: doubao-seed-2-0-lite + Image Generation)
- **Storage**: S3 兼容对象存储 (coze-coding-dev-sdk)
- **Deploy**: Cloudflare Pages (全球CDN加速)

## 目录结构

```
├── public/                          # 静态资源 (OG图/placeholder等)
├── src/
│   ├── app/                         # 页面路由与布局
│   │   ├── page.tsx                 # 首页 (热门攻略+游戏专区入口)
│   │   ├── layout.tsx               # 全局布局 (硬核导航+JSON-LD+Footer)
│   │   ├── globals.css              # 全局样式 (暗黑游戏主题)
│   │   ├── robots.ts                # SEO robots.txt
│   │   ├── sitemap.ts               # SEO sitemap.xml (动态生成)
│   │   ├── guides/                  # 攻略展示页面
│   │   │   ├── page.tsx             # 攻略列表 (按分类/游戏筛选)
│   │   │   └── [slug]/page.tsx      # 攻略详情 (SEO核心+JSON-LD)
│   │   ├── games/                   # 游戏专区
│   │   │   ├── page.tsx             # 游戏列表
│   │   │   └── [slug]/page.tsx      # 游戏详情 + 关联攻略
│   │   ├── admin/page.tsx           # 管理后台 (4Tab: Dashboard/Review/AI生成/调度)
│   │   └── api/                     # API 路由
│   │       ├── articles/            # 文章 CRUD
│   │       │   ├── route.ts         # 列表+筛选
│   │       │   ├── [id]/route.ts    # 单篇操作(审核/发布/删除/重写)
│   │       │   └── batch/route.ts   # 批量操作(审核/发布/删除)
│   │       ├── games/route.ts       # 游戏列表
│   │       ├── dashboard/route.ts   # 仪表盘统计+报表数据
│   │       ├── schedule/route.ts    # 定时发布队列+每日自动调度
│   │       ├── publish/route.ts     # 发布执行(重试3次)
│   │       ├── health/route.ts      # 健康检查(DB+Storage)
│   │       └── generate/            # AI 生成
│   │           ├── article/route.ts # LLM 文章生成(5种模板)
│   │           ├── image/route.ts   # 图像生成+对象存储上传
│   │           ├── topics/route.ts  # 话题引擎(可用/趋势话题)
│   │           └── batch/route.ts   # 批量生成规划
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 组件库
│   │   └── mobile-nav.tsx           # 移动端导航(iconName字符串映射)
│   ├── lib/                         # 工具库
│   │   ├── db.ts                    # pg连接池(双链路: DATABASE_URL/PGDATABASE_URL)
│   │   ├── storage.ts               # 对象存储封装(CDN分发+签名URL)
│   │   ├── game-utils.ts            # SEO关键词库+话题引擎+5种模板+游戏数据
│   │   └── utils.ts                 # 通用工具函数 (cn)
│   └── storage/database/            # 数据库层
│       ├── supabase-client.ts       # Supabase 客户端 (开发回退用)
│       └── shared/schema.ts         # 数据库Schema
```

## 核心功能模块

### 1. AI 内容生成
- 5种攻略模板: Boss Guide / Build Guide / Collectible Guide / Walkthrough / Tips & Tricks
- SEO关键词库: 中文核心词+英文长尾词
- 话题引擎: 按游戏自动选题，避免重复已写话题
- 批量生成: 一次规划N篇，逐篇生成
- 自动填充SEO字段: meta_title, meta_description, keywords

### 2. AI 图像生成
- ImageGenerationClient 生成游戏风格配图
- 自动上传至S3对象存储，获取CDN分发URL
- 支持与文章关联 (cover_image_key)

### 3. 内容审核流程
- 文章状态: draft → generated → reviewed → published
- 批量审核: 支持多篇文章一键审核/发布/删除
- 后台内容预览: 展开查看摘要+关键词

### 4. 定时发布系统
- 每日自动调度: 配置每日篇数/起始小时/间隔
- 自动选择reviewed文章错峰安排
- 发布失败自动重试(最多3次)
- /api/schedule - 创建发布计划+每日调度
- /api/publish - 执行发布

### 5. 报表系统
- 统计卡片: 总文章/待审核/待发布/今日发布/周生成/成功率/今日安排/游戏数
- 发布趋势: 7天柱状图
- 生成趋势: 7天柱状图
- 状态分布: 文章状态占比
- TOP5游戏: 按文章数排名

### 6. SEO 优化
- 动态 metadata (generateMetadata)
- robots.txt + sitemap.xml 自动生成
- JSON-LD 结构化数据 (WebSite + Article)
- OpenGraph 社交分享标签 + OG Image
- 文章含 meta_title, meta_description, keywords

### 7. Cloudflare Pages 适配
- next.config.ts: standalone output + 图片优化禁用(不依赖CF Image Optimization)
- 图片通过S3对象存储+CDN分发
- Cache-Control: CSS/JS 1年, HTML no-store
- 预连接配置: fonts.googleapis.cn

## 数据库 Schema (PostgreSQL)

### 核心表
- `games` - 游戏信息 (name, slug, genre, platform, release_date, description)
- `articles` - 文章 (title, slug, content, summary, status, language, meta_title, meta_description, keywords, author)
- `publish_queue` - 发布队列 (article_id, scheduled_at, status, attempts)
- `generation_logs` - AI 生成日志 (article_id, game_id, prompt, model, tokens_used)

### 数据库连接
- 生产: `DATABASE_URL=postgresql://3agame:dengyouming@123.207.50.64:5432/3agame`
- 开发回退: 自动使用 `PGDATABASE_URL` (平台Supabase)
- 连接池: max 10, idle timeout 30s, connection timeout 10s

### 关键约束
- 所有表启用 RLS
- 字段命名使用 snake_case
- articles.game_id → games.id (外键，SET NULL)
- publish_queue.article_id → articles.id (外键，CASCADE)

## 包管理规范

**仅允许使用 pnpm** 作为包管理器。

## 开发规范

### 编码规范
- TypeScript strict 心智
- 禁止隐式 any 和 as any
- pg 操作必须检查 error
- .delete() / .update() 必须带 WHERE 条件
- Lucide图标不使用`Map`名称(与JS内置冲突)，用`MapIcon`替代
- Server→Client组件传图标用 iconName 字符串映射，不传函数组件

### next.config 配置规范
- output: 'standalone' (Cloudflare Pages兼容)
- images.unoptimized: true (不依赖Next Image Optimization)
- 配置路径使用 path.resolve(__dirname, ...)

### Hydration 问题防范
- 严禁 JSX 中直接使用 typeof window、Date.now()、Math.random()
- 使用 'use client' + useEffect + useState 处理动态内容
- 禁止 <p> 嵌套 <div> 等非法 HTML 嵌套
- 三方资源通过 globals.css @import 引入

## UI 设计规范

- 暗黑游戏美学: 深黑底(#0a0a1a) + 霓虹紫/青/红点缀
- shadcn/ui 组件 + 自定义游戏主题变量
- 渐变文字: .gradient-text (紫→青渐变)
- hover光晕效果: hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]
- 响应式设计 (sm:, md:, lg: 断点)
- 颜色系统: primary (#7c3aed紫), accent (#06b6d4青), destructive (#ef4444红)

## API 端点清单

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/articles | GET | 文章列表(支持status/limit/game_id筛选) |
| /api/articles/[id] | GET/PATCH/DELETE | 单篇文章操作 |
| /api/articles/[id] | POST(action=review/publish) | 审核/发布 |
| /api/articles/batch | POST | 批量操作(review/publish/delete) |
| /api/games | GET | 游戏列表 |
| /api/dashboard | GET | 仪表盘统计+报表数据 |
| /api/schedule | GET/POST | 发布队列+每日自动调度 |
| /api/publish | POST | 执行发布 |
| /api/health | GET | 健康检查(DB+Storage) |
| /api/generate/article | POST | AI文章生成 |
| /api/generate/image | POST | AI图像生成 |
| /api/generate/topics | GET | 话题引擎 |
| /api/generate/batch | POST | 批量生成规划 |
