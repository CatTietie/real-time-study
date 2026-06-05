# 实时协同自习室与学习社区平台

## 项目简介

集实时协同自习室和学习社区功能于一体的全栈 Web 平台，面向学生群体提供在线自习、白板协作、实时聊天、社区交流、积分激励等功能，并配备完整的管理员后台。

## 技术栈

### 前端 (study-com-platform-fe)

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite 7 |
| UI 组件库 | Ant Design 5 + Ant Design Pro Components |
| 样式 | Tailwind CSS 4 + Less |
| 状态管理 | Redux Toolkit + React-Redux |
| 路由 | React Router DOM 7 |
| 富文本编辑器 | TipTap 3 |
| 白板 | tldraw 4 |
| 图表 | ECharts 6 + Recharts |
| 实时通信 | Socket.IO Client |
| HTTP 请求 | Axios |

### 后端 (study-com-platform-be)

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js + TypeScript |
| 框架 | Express 4 |
| ORM | Sequelize 6 |
| 数据库 | MySQL 8.0+ |
| 实时通信 | Socket.IO 4 |
| 认证 | JWT (jsonwebtoken) |
| 密码加密 | bcrypt |
| 文件存储 | 阿里云 OSS |
| 安全 | Helmet + express-rate-limit + CORS |
| 定时任务 | node-cron |
| 输入校验 | express-validator |

## 项目结构

```
real-time-study/
├── study-com-platform-fe/          # 前端项目
│   └── src/
│       ├── pages/
│       │   ├── admin/              # 管理员后台页面
│       │   ├── student/            # 学生端页面
│       │   ├── community/          # 社区页面
│       │   └── shared/             # 共享页面
│       ├── components/             # 公共组件
│       │   ├── admin/              # 管理端组件
│       │   ├── student/            # 学生端组件
│       │   ├── community/          # 社区组件
│       │   ├── chat/               # 聊天组件
│       │   ├── whiteboard/         # 白板组件
│       │   └── common/             # 通用组件
│       ├── features/               # Redux 状态切片
│       ├── services/               # API 请求封装
│       ├── hooks/                  # 自定义 Hooks
│       ├── types/                  # TypeScript 类型定义
│       ├── utils/                  # 工具函数
│       └── styles/                 # 全局样式
├── study-com-platform-be/          # 后端项目
│   └── src/
│       ├── controllers/            # 控制器层
│       ├── models/                 # 数据模型 (Sequelize)
│       ├── routes/                 # 路由定义
│       ├── services/               # 业务逻辑层
│       ├── middlewares/            # 中间件 (认证/日志/校验等)
│       ├── config/                 # 配置 (数据库/OSS等)
│       ├── constants/              # 常量定义
│       ├── seed/                   # 数据种子脚本
│       ├── types/                  # TypeScript 类型定义
│       └── utils/                  # 工具函数
├── start-all.bat                   # Windows 一键启动脚本
└── package.json                    # 根级依赖
```

## 功能模块

### 学生端

| 模块 | 说明 |
|------|------|
| 自习室 | 实时在线自习、座位预约、学习计时统计 |
| 白板协作 | 多人实时协同白板 (tldraw) |
| 实时聊天 | 自习室内聊天 (Socket.IO) |
| 学习分析 | 学习时长统计、目标管理、数据可视化 |
| 个人中心 | 个人资料编辑、预约管理 |

### 社区端

| 模块 | 说明 |
|------|------|
| 帖子系统 | 发帖、评论、点赞、收藏 |
| 积分中心 | 积分获取与消费规则、积分日志 |
| 排行榜 | 学习时长/积分排行 |
| 徽章中心 | 成就徽章解锁与展示 |
| 用户主页 | 社区个人主页 |

### 管理员后台

| 模块 | 说明 |
|------|------|
| 数据看板 | 平台运营数据概览 |
| 用户管理 | 用户查询、封禁、信息修改 |
| 内容审核 | 帖子与评论审核 |
| 社区管理 | 社区帖子/评论管理、数据统计 |
| 举报处理 | 用户举报受理与处置 |
| 积分规则 | 积分规则配置与积分日志 |
| 敏感词库 | 敏感词管理与内容过滤 |
| RBAC 权限 | 角色权限管理系统 |
| 操作日志 | 管理员操作审计日志 |

## 环境要求

- Node.js >= 18
- MySQL >= 8.0
- npm >= 9

## 快速开始

### 1. 数据库准备

```bash
# 安装 MySQL 8.0+ 并创建数据库
CREATE DATABASE study_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 后端启动

```bash
cd study-com-platform-be
cp .env.example .env
# 编辑 .env 文件，填写数据库连接信息和 JWT_SECRET
npm install
npm run dev
```

### 3. 前端启动

```bash
cd study-com-platform-fe
cp .env.example .env
# 编辑 .env 文件，确认 API 地址
npm install
npm run dev
```

### 4. 一键启动 (Windows)

```bash
# 双击根目录下的 start-all.bat 即可同时启动前后端
start-all.bat
```

## 端口配置

| 服务 | 端口 | 地址 |
|------|------|------|
| 前端 | 5173 | http://localhost:5173 |
| 后端 API | 3000 | http://localhost:3000/api |
| MySQL | 3306 | localhost:3306 |

## 默认账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 超级管理员 | superadmin01 | 123456 |
| 管理员 | admin01 | 123456 |

## 数据种子

```bash
cd study-com-platform-be

# 初始化权限数据
npm run seed:permissions

# 初始化积分规则
npm run seed:points-rules

# 生成学生测试数据
npm run seed:student

# 生成社区样本数据
npm run seed:community:sample
```

## 注意事项

1. 首次运行后端会自动创建数据库表并初始化基础数据
2. 生产环境务必修改 JWT_SECRET 和数据库密码
3. 阿里云 OSS 需在 `.env` 中配置 AccessKey 信息
4. 前后端必须使用相同的端口配置以保证 Socket.IO 正常连接
