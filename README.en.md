# Real-Time Study Platform

Backend service for the real-time learning platform

## Project Introduction

This is the backend service for a real-time learning and communication platform, offering features such as user post publishing, commenting, reporting, and an administrator dashboard. The system is developed in TypeScript using the Express.js framework and Sequelize ORM, with JWT authentication support.

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MySQL (via Sequelize ORM)
- **Authentication**: JWT (JSON Web Token)
- **Password Encryption**: bcrypt

## Project Structure

```
study-com-platform-be/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Controller layer
│   │   ├── admin.controller.ts
│   │   ├── comment.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── post.controller.ts
│   │   ├── report.controller.ts
│   │   └── user.controller.ts
│   ├── middlewares/     # Middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logger.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/          # Data models
│   │   ├── admin-log.model.ts
│   │   ├── comment.model.ts
│   │   ├── post-like.model.ts
│   │   ├── post.model.ts
│   │   ├── report.model.ts
│   │   ├── sensitive-word.model.ts
│   │   └── user.model.ts
│   ├── routes/          # Routes
│   ├── services/        # Business logic layer
│   ├── types/           # Type definitions
│   ├── utils/           # Utility functions
│   ├── app.ts           # Application entry
│   └── server.ts        # Server entry
├── dist/                # Compiled output
├── .env                 # Environment variables
└── package.json
```

## Features

- **User Management**: User registration, login, and profile updates
- **Post System**: Create posts, view posts, and sensitive word filtering
- **Comment System**: Post and delete comments
- **Like System**: Post liking functionality
- **Reporting System**: Report and manage posts/comments
- **Admin System**:
  - Admin login authentication
  - Operation log recording
  - Data statistics dashboard
  - Report management
- **Security Features**:
  - JWT authentication
  - Password encryption with bcrypt
  - Sensitive word filtering
  - Request logging
  - Unified error handling

## Quick Start

### Install Dependencies

```bash
cd study-com-platform-be
npm install
```

### Configure Environment Variables

Copy `.env.example` to `.env` and configure the parameters:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=study_platform
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=3000
```

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
# Compile TypeScript
npm run build

# Run production version
npm start
```

## API Endpoints

### User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/users/register | User registration |
| POST   | /api/users/login | User login |
| GET    | /api/users/:id | Get user information |
| PUT    | /api/users/:id | Update user information |

### Post Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/posts | Create a post |
| GET    | /api/posts/:id | Get post details |
| GET    | /api/posts | Get post list |

### Comment Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/comments | Create a comment |
| DELETE | /api/comments/:id | Delete a comment |

### Report Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/reports | Create a report |
| GET    | /api/reports | Get report list |

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/admin/login | Admin login |
| GET    | /api/admin/stats | Get statistics |
| GET    | /api/admin/logs | Get operation logs |

### Dashboard Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/dashboard | Get dashboard data |

## Database Models

### User
- id, username, email, password, role, createdAt, updatedAt

### Post
- id, title, content, authorId, createdAt, updatedAt

### Comment
- id, content, postId, authorId, createdAt, updatedAt

### PostLike
- id, postId, userId, createdAt

### Report
- id, type, targetId, reporterId, reason, status, createdAt, updatedAt

### AdminLog
- id, adminId, action, details, createdAt

### SensitiveWord
- id, word, createdAt

## License

MIT License