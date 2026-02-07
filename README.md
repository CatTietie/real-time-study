# 实时协同自习室与学习社区平台

## 项目简介
这是一个集实时协同自习室和学习社区功能于一体的平台，包含管理员后台和学生端两个主要部分。

## 环境配置

### 1. 数据库准备
- 安装 MySQL 8.0+
- 创建数据库：`study_platform`

### 2. 后端配置
```bash
cd study-com-platform-be
cp .env.example .env
# 编辑 .env 文件，填写数据库连接信息
npm install
npm run dev
```

### 3. 前端配置
```bash
cd study-com-platform-fe
cp .env.example .env
# 编辑 .env 文件，确认 API 地址
npm install
npm run dev
```

## 默认账号
- 管理员账号：`admin01` 密码：`123456`
- 管理员账号：`superadmin01` 密码：`123456`

## 开发约定
- 后端端口：8080
- 前端端口：5173
- 数据库端口：3306

## 注意事项
1. 首次运行会自动创建数据库表和初始化数据
2. 生产环境请修改 JWT_SECRET 和数据库密码
3. 前后端必须使用相同的端口配置