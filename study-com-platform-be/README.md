# 项目说明

这是一个使用 TypeScript 与 Express 构建的学习平台后端项目，结构清晰、约定一致，适合快速上手与迭代。

## 项目结构

- `src/config/` - 配置文件（数据库等）
- `src/controllers/` - 控制器层
- `src/middlewares/` - 中间件
- `src/models/` - 数据模型
- `src/routes/` - 路由定义
- `src/services/` - 业务逻辑层
- `src/types/` - TypeScript 类型定义
- `src/utils/` - 工具函数
- `uploads/` - 文件上传目录

## 快速开始（上手友好）

以下步骤保持最少配置即可启动，推荐用于新成员快速验证环境：

1. 复制环境变量示例文件并配置数据库连接
2. 安装依赖
3. 启动开发服务

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
npm start
```

## API 端点

- `/api/admin` - 管理员相关接口
- `/api/user` - 用户相关接口
- `/api/post` - 帖子相关接口
- `/api/dashboard` - 仪表板相关接口

## 环境变量

请复制 `.env.example` 为 `.env` 并配置相关环境变量（尤其是数据库连接与 JWT 秘钥）。

## 亮点

- **分层清晰**：控制器/服务/模型/路由分层明确，修改范围易定位、可控。
- **约定统一**：统一响应格式与错误处理中间件，新增接口按规范接入即可。
- **可回滚**：每个功能点可以独立提交，建议小步提交便于回退。
- **数据安全建议**：本地开发优先使用独立数据库或测试库，避免影响生产数据。

## 技术栈

- Node.js + Express
- TypeScript
- MySQL + Sequelize
- JWT 认证
- Bcrypt 密码加密
