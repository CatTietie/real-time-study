import { Request, Response } from 'express';
import User from '../models/user.model';
import UserRole from '../models/user-role.model';
import Role from '../models/role.model';
import { hashPassword, comparePassword } from '../utils/password';
import { validatePasswordStrength } from '../utils/validator';
import { Op } from 'sequelize';

class UserController {
  // 获取用户列表
  async getUsers(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 10, role, status, keyword } = req.query;
      
      const where: any = {};
      if (role) where.role = role;
      if (status !== undefined) where.status = status;
      if (keyword) {
        where[Op.or] = [
          { username: { [Op.like]: `%${keyword}%` } },
          { nickname: { [Op.like]: `%${keyword}%` } }
        ];
      }

      const result = await User.findAndCountAll({
        where,
        include: [{
          model: Role,
          through: { attributes: [] },
          attributes: ['id', 'name', 'code'],
          required: false
        }],
        limit: parseInt(pageSize as string),
        offset: (parseInt(page as string) - 1) * parseInt(pageSize as string),
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: result.count,
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 获取用户详情
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        include: [{
          model: Role,
          through: { attributes: [] },
          required: false
        }]
      });

      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 创建用户
  async createUser(req: Request, res: Response) {
    try {
      const { username, password, nickname, role, avatar } = req.body;
      
      // 检查用户名是否已存在
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }

      // 加密密码
      const hashedPassword = await hashPassword(password);

      const user = await User.create({
        username,
        password: hashedPassword,
        nickname: nickname || username,
        role: role || 'student',
        avatar,
        points: 0,
        status: 1
      });

      res.status(201).json({ success: true, data: user, message: '用户创建成功' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 更新用户信息
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nickname, avatar, role, status, points } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      // 更新用户信息
      await user.update({ nickname, avatar, role, status, points });

      res.json({ success: true, message: '用户更新成功' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 删除用户
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      // 超级管理员不能被删除
      if (user.role === 'super_admin') {
        return res.status(403).json({ success: false, message: '不能删除超级管理员' });
      }

      await user.destroy();
      res.json({ success: true, message: '用户删除成功' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 批量操作用户
  async batchUpdateUsers(req: Request, res: Response) {
    try {
      const { userIds, action, value } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: '请选择要操作的用户' });
      }

      const updates: any = {};
      switch (action) {
        case 'status':
          updates.status = value;
          break;
        case 'role':
          updates.role = value;
          break;
        case 'points':
          updates.points = value;
          break;
        default:
          return res.status(400).json({ success: false, message: '不支持的操作类型' });
      }

      await User.update(updates, {
        where: { id: userIds }
      });

      res.json({ success: true, message: '批量操作成功' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 更新用户密码
  async updatePassword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      // 验证旧密码
      const isValid = await comparePassword(oldPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ success: false, message: '原密码错误' });
      }

      // 密码强度校验（与注册时的校验逻辑一致）
      const passwordStrength = validatePasswordStrength(newPassword);
      if (!passwordStrength.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: passwordStrength.message 
        });
      }

      // 加密新密码
      const hashedPassword = await hashPassword(newPassword);
      await user.update({ password: hashedPassword });

      res.json({ success: true, message: '密码更新成功' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new UserController();