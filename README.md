

# Real-Time Study Platform

实时学习平台后端服务

## 项目介绍

这是一个实时学习交流平台的后端服务，提供用户帖子发布、评论、举报、管理员 dashboard 等功能。系统采用 TypeScript 开发，使用 Express.js 框架和 Sequelize ORM，支持 JWT 身份验证。

## 技术栈

- **运行时**: Node.js
- **语言**: TypeScript
- **框架**: Express.js
- **数据库**: MySQL (通过 Sequelize ORM)
- **认证**: JWT (JSON Web Token)
- **密码加密**: bcrypt

## 项目结构

```
study-com-platform-be/
├── src/
│   ├── config/          # 数据库配置
│   ├── controllers/     # 控制器层
│   │   ├── admin.controller.ts
│   │   ├── comment.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── post.controller.ts
│   │   ├── report.controller.ts
│   │   └── user.controller.ts
│   ├── middlewares/     # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logger.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/          # 数据模型
│   │   ├── admin-log.model.ts
│   │   ├── comment.model.ts
│   │   ├── post-like.model.ts
│   │   ├── post.model.ts
│   │   ├── report.model.ts
│   │   ├── sensitive-word.model.ts
│   │   └── user.model.ts
│   ├── routes/          # 路由
│   ├── services/        # 业务逻辑层
│   ├── types/           # 类型定义
│   ├── utils/           # 工具函数
│   ├── app.ts           # 应用入口
│   └── server.ts        # 服务器入口
├── dist/                # 编译输出
├── .env                 # 环境变量
└── package.json
```

## 功能特性

- **用户管理**: 用户注册、登录、信息修改
- **帖子系统**: 发布帖子、查看帖子、敏感词过滤
- **评论系统**: 发表评论、删除评论
- **点赞系统**: 帖子点赞功能
- **举报系统**: 帖子/评论举报及管理
- **管理员系统**: 
  - 管理员登录认证
  - 操作日志记录
  - 数据统计 dashboard
  - 举报管理
- **安全特性**:
  - JWT 身份验证
  - 密码 bcrypt 加密
  - 敏感词过滤
  - 请求日志记录
  - 统一错误处理

## 快速开始

### 安装依赖

```bash
cd study-com-platform-be
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并配置相关参数：

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=study_platform
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=3000
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
# 编译 TypeScript
npm run build

# 运行生产版本
npm start
```

## API 端点

### 用户接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/users/register | 用户注册 |
| POST | /api/users/login | 用户登录 |
| GET | /api/users/:id | 获取用户信息 |
| PUT | /api/users/:id | 更新用户信息 |

### 帖子接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/posts | 创建帖子 |
| GET | /api/posts/:id | 获取帖子详情 |
| GET | /api/posts | 获取帖子列表 |

### 评论接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/comments | 创建评论 |
| DELETE | /api/comments/:id | 删除评论 |

### 举报接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/reports | 创建举报 |
| GET | /api/reports | 获取举报列表 |

### 管理员接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/stats | 获取统计信息 |
| GET | /api/admin/logs | 操作日志 |

### Dashboard 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/dashboard | 获取仪表盘数据 |

## 数据库模型

### User (用户)
- id, username, email, password, role, createdAt, updatedAt

### Post (帖子)
- id, title, content, authorId, createdAt, updatedAt

### Comment (评论)
- id, content, postId, authorId, createdAt, updatedAt

### PostLike (帖子点赞)
- id, postId, userId, createdAt

### Report (举报)
- id, type, targetId, reporterId, reason, status, createdAt, updatedAt

### AdminLog (操作日志)
- id, adminId, action, details, createdAt

### SensitiveWord (敏感词)
- id, word, createdAt

## 许可证

MIT License