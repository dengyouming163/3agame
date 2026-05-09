# 项目上下文 - GameVault Pro (3A游戏攻略自动化发布平台)

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL via Supabase SDK)
- **AI**: coze-coding-dev-sdk (LLM + Image Generation)
- **Storage**: S3 兼容对象存储 (coze-coding-dev-sdk)

## 目录结构

```
├── public/                          # 静态资源
├── src/
│   ├── app/                         # 页面路由与布局
│   │   ├── page.tsx                 # 首页 (攻略展示)
│   │   ├── layout.tsx               # 全局布局
│   │   ├── globals.css              # 全局样式
│   │   ├── robots.ts                # SEO robots.txt
│   │   ├── sitemap.ts               # SEO sitemap
│   │   ├── guides/                  # 攻略展示页面
│   │   │   ├── page.tsx             # 攻略列表
│   │   │   └── [slug]/page.tsx      # 攻略详情
│   │   ├── games/                   # 游戏页面
│   │   │   ├── page.tsx             # 游戏列表
│   │   │   └── [slug]/page.tsx      # 游戏详情 + 关联攻略
│   │   ├── admin/page.tsx           # 管理后台 (AI生成/审核/发布)
│   │   └── api/                     # API 路由
│   │       ├── articles/            # 文章 CRUD
│   │       ├── games/               # 游戏 CRUD
│   │       ├── dashboard/           # 仪表盘统计
│   │       ├── schedule/            # 定时发布队列
│   │       ├── publish/             # 发布执行
│   │       └── generate/            # AI 生成
│   │           ├── article/route.ts # LLM 文章生成
│   │           └── image/route.ts   # 图像生成
│   ├── components/ui/               # shadcn/ui 组件库
│   ├── lib/                         # 工具库
│   │   ├── db.ts                    # 数据库类型定义 + Supabase 客户端
│   │   ├── storage.ts               # 对象存储封装
│   │   ├── game-utils.ts            # 游戏数据 (话题列表/slug生成等)
│   │   └── utils.ts                 # 通用工具函数 (cn)
│   ├── storage/database/            # Supabase 数据库层
│   │   ├── supabase-client.ts       # Supabase 客户端 (平台注入)
│   │   └── shared/schema.ts         # Drizzle ORM Schema
│   └── hooks/                       # 自定义 Hooks
├── next.config.ts                   # Next.js 配置
├── package.json                     # 项目依赖管理
└── tsconfig.json                    # TypeScript 配置
```

## 核心功能模块

### 1. AI 内容生成
- 使用 `coze-coding-dev-sdk` 的 `LLMClient` 调用大语言模型
- 默认模型: `doubao-seed-2-0-lite-260215`
- 支持按游戏自动生成 SEO 优化的英文攻略文章
- 生成结果自动存入数据库，状态为 `generated`

### 2. AI 图像生成
- 使用 `coze-coding-dev-sdk` 的 `ImageGenerationClient`
- 生成游戏风格配图，自动上传至对象存储
- 支持与文章关联（cover_image_key）

### 3. 内容审核流程
- 文章状态: `draft` → `generated` → `reviewed` → `published`
- 管理后台支持一键审核、发布、删除
- 审核后文章可加入定时发布队列

### 4. 定时发布系统
- `/api/schedule` - 创建发布计划
- `/api/publish` - 执行发布（支持重试，最多3次）
- 支持每日自动化完成发布流程

### 5. SEO 优化
- 动态 metadata (generateMetadata)
- robots.txt + sitemap.xml 自动生成
- 文章含 meta_title, meta_description, keywords
- OpenGraph 社交分享标签

## 数据库 Schema (Supabase)

### 核心表
- `games` - 游戏信息 (name, slug, genre, platform, release_date, description)
- `articles` - 文章 (title, slug, content, summary, status, language, meta_title, meta_description, keywords, author)
- `publish_queue` - 发布队列 (article_id, scheduled_at, status, attempts)
- `generation_logs` - AI 生成日志 (article_id, game_id, prompt, model, tokens_used)

### 关键约束
- 所有表启用 RLS，当前策略允许 anon + authenticated 读写
- 字段命名使用 snake_case
- articles.game_id → games.id (外键，SET NULL)
- publish_queue.article_id → articles.id (外键，CASCADE)

## 包管理规范

**仅允许使用 pnpm** 作为包管理器。
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`

## 开发规范

### 编码规范
- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- Supabase 操作必须检查 `{ data, error }` 并处理错误
- 禁止 `select('*')`，只取需要的列
- `.delete()` / `.update()` 必须带 filter
- Supabase SDK 不使用 `createClient<Database>` 泛型

### next.config 配置规范
- 配置路径使用 `path.resolve(__dirname, ...)` 动态拼接

### Hydration 问题防范
- 严禁 JSX 中直接使用 typeof window、Date.now()、Math.random()
- 使用 'use client' + useEffect + useState 处理动态内容
- 禁止 <p> 嵌套 <div> 等非法 HTML 嵌套
- 三方资源通过 globals.css @import 或 next/font 引入

## UI 设计规范

- 采用 shadcn/ui 组件、风格和规范
- 深色模式支持 (dark: 前缀)
- 响应式设计 (sm:, md:, lg: 断点)
- 颜色系统: primary (紫色), 渐变文字 (.gradient-text)
