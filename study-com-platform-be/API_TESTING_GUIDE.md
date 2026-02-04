# 管理员认证系统 API 测试指南

## 环境信息

- **服务器地址**: http://localhost:3000
- **API 路径**: /api/admin
- **数据库**: study_platform
- **JWT 有效期**: 7 天

## 1. 管理员登录

### 请求

```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### 响应示例

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "超级管理员",
    "avatar": "https://...",
    "role": "admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

**注意**: Token 需要在后续请求的 Authorization header 中使用：

```
Authorization: Bearer <token>
```

---

## 2. 获取管理员信息

### 请求

```http
GET /api/admin/profile
Authorization: Bearer <token>
```

### 响应示例

```json
{
  "success": true,
  "message": "获取信息成功",
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "超级管理员",
    "avatar": "https://...",
    "role": "admin",
    "points": 100,
    "status": 1,
    "last_login": "2026-01-22T07:41:51.000Z",
    "createdAt": "2026-01-22T07:00:00.000Z",
    "updatedAt": "2026-01-22T07:41:51.000Z"
  }
}
```

---

## 3. 修改管理员信息

### 请求

```http
PUT /api/admin/editinfo
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar": "https://..."
}
```

### 响应示例

```json
{
  "success": true,
  "message": "修改成功",
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "新昵称",
    "avatar": "https://...",
    "role": "admin"
  }
}
```

---

## 4. 管理员登出

### 请求

```http
POST /api/admin/logout
Authorization: Bearer <token>
```

### 响应示例

```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 5. 获取操作日志列表

### 请求

```http
GET /api/admin/logs?page=1&pageSize=20&adminId=1&actionType=管理员登录
Authorization: Bearer <token>
```

### 查询参数

| 参数       | 类型   | 说明               |
| ---------- | ------ | ------------------ |
| page       | number | 页码（默认1）      |
| pageSize   | number | 每页数量（默认20） |
| adminId    | number | 管理员ID（可选）   |
| actionType | string | 操作类型（可选）   |

### 响应示例

```json
{
  "success": true,
  "message": "获取操作日志成功",
  "data": [
    {
      "id": 1,
      "admin_id": 1,
      "action_type": "管理员登录",
      "target_table": null,
      "target_id": null,
      "detail": "用户 admin 登录成功",
      "ip_address": "127.0.0.1",
      "created_at": "2026-01-22T07:41:51.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

## 6. 获取操作日志统计

### 请求

```http
GET /api/admin/logs/stats
Authorization: Bearer <token>
```

### 响应示例

```json
{
  "success": true,
  "message": "获取操作日志统计成功",
  "data": {
    "total": 10,
    "todayCount": 5,
    "actionStats": [
      {
        "action_type": "管理员登录",
        "count": 3
      },
      {
        "action_type": "管理员登出",
        "count": 2
      }
    ]
  }
}
```

---

## 错误响应示例

### 登录失败

```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

### 未授权

```json
{
  "success": false,
  "message": "未提供 Token，请先登录"
}
```

### Token 过期

```json
{
  "success": false,
  "message": "Token 无效或已过期，请重新登录"
}
```

### 权限不足

```json
{
  "success": false,
  "message": "只有管理员可以访问此接口"
}
```

---

## 使用 Thunder Client / Postman 测试

### 1. 先登录获取 Token

- 方法: POST
- URL: `http://localhost:3000/api/admin/login`
- Body (JSON):
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```

### 2. 复制返回的 token

### 3. 在后续请求中添加 Authorization Header

- Key: `Authorization`
- Value: `Bearer <复制的token>`

---

## 操作日志自动记录

系统会自动记录以下操作：

| 操作         | 记录类型    |
| ------------ | ----------- |
| 管理员登录   | ✅ 自动记录 |
| 管理员登出   | ✅ 自动记录 |
| 修改个人信息 | ✅ 自动记录 |
| 查询日志     | ❌ 不记录   |

每条日志包含：

- 执行操作的管理员ID
- 操作类型
- 操作时间（UTC）
- 操作者IP地址
- 具体操作描述

---

## 数据库表关系

### users 表

- 存储所有用户（包括管理员）
- 管理员通过 `role='admin'` 标识

### admin_logs 表

- 记录所有管理员操作
- 外键: admin_id → users.id
- 实时记录每个操作

---

## 常见问题

### Q: Token 过期后怎么办？

A: 需要重新调用登录接口获取新的 Token。

### Q: 如何修改 JWT 过期时间？

A: 修改 `src/services/auth.service.ts` 中的 `expiresIn` 参数（目前为 "7d"）。

### Q: 为什么收不到操作日志？

A: 请确保已经在 Authorization header 中正确提供 Token。

### Q: 非管理员用户能登录吗？

A: 不能。如果用户 role 不是 'admin'，登录会被拒绝。
