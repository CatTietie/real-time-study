import { Router } from 'express';
import userController from '../controllers/user-management.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// 用户管理路由 - 需要管理员权限
router.use(authMiddleware);
router.use(adminMiddleware);

// 用户管理API
router.get('/', userController.getUsers);           // 获取用户列表
router.get('/:id', userController.getUserById);     // 获取用户详情
router.post('/', userController.createUser);        // 创建用户
router.put('/:id', userController.updateUser);      // 更新用户信息
router.delete('/:id', userController.deleteUser);   // 删除用户
router.post('/batch', userController.batchUpdateUsers); // 批量操作
router.put('/:id/password', userController.updatePassword); // 更新密码

export default router;