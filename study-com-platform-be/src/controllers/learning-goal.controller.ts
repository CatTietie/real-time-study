import { Request, Response } from "express";
import * as learningGoalService from "../services/learning-goal.service";
import * as userService from "../services/user.service";
import { verifyToken } from "../utils/jwt";

/**
 * 获取当前用户的学习目标
 */
export async function getCurrentUserLearningGoal(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, message: "未提供认证令牌" });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: "无效的认证令牌" });
    }
    const userId = decoded.id;

    const goal = await learningGoalService.getUserLearningGoal(userId);
    
    if (!goal) {
      return res.json({ success: true, message: "暂无学习目标设置", data: null });
    }

    res.json({ success: true, message: "获取学习目标成功", data: goal });
  } catch (error) {
    console.error("获取学习目标失败:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "获取学习目标失败" });
  }
}

/**
 * 设置当前用户的学习目标
 */
export async function setCurrentUserLearningGoal(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, message: "未提供认证令牌" });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: "无效的认证令牌" });
    }
    const userId = decoded.id;

    const { goal_posts, goal_comments, goal_hot_posts, goal_points } = req.body;
    
    // 参数验证
    if (goal_posts === undefined || goal_comments === undefined || 
        goal_hot_posts === undefined || goal_points === undefined) {
      return res.status(400).json({ success: false, message: "缺少必要的学习目标参数" });
    }

    // 数值范围验证
    if (goal_posts < 0 || goal_posts > 50) {
      return res.status(400).json({ success: false, message: "发帖目标应在0-50之间" });
    }
    
    if (goal_comments < 0 || goal_comments > 200) {
      return res.status(400).json({ success: false, message: "评论目标应在0-200之间" });
    }
    
    if (goal_hot_posts < 0 || goal_hot_posts > 20) {
      return res.status(400).json({ success: false, message: "热榜目标应在0-20之间" });
    }
    
    if (goal_points < 0 || goal_points > 10000) {
      return res.status(400).json({ success: false, message: "积分目标应在0-10000之间" });
    }

    // 获取用户信息
    let user;
    try {
      user = await userService.getUserBasicInfo(userId);
      if (!user) {
        return res.status(400).json({ success: false, message: "用户不存在" });
      }
    } catch (userError) {
      console.error("获取用户信息失败:", userError);
      return res.status(500).json({ success: false, message: "获取用户信息失败" });
    }

    const goalData = {
      user_id: userId,
      nickname: user.nickname || user.username,
      username: user.username,
      goal_posts: parseInt(goal_posts),
      goal_comments: parseInt(goal_comments),
      goal_hot_posts: parseInt(goal_hot_posts),
      goal_points: parseInt(goal_points)
    };

    const result = await learningGoalService.setLearningGoal(goalData);
    
    res.json({ success: true, message: "学习目标设置成功", data: result });
  } catch (error) {
    console.error("设置学习目标失败:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "设置学习目标失败" });
  }
}

/**
 * 获取指定用户的学习目标（管理员功能）
 */
export async function getUserLearningGoalById(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({ success: false, message: "无效的用户ID" });
    }

    const goal = await learningGoalService.getUserLearningGoal(parseInt(userId));
    
    if (!goal) {
      return res.json({ success: true, message: "该用户暂无学习目标设置", data: null });
    }

    res.json({ success: true, message: "获取学习目标成功", data: goal });
  } catch (error) {
    console.error("获取学习目标失败:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "获取学习目标失败" });
  }
}

/**
 * 获取所有学习目标列表（管理员功能）
 */
export async function getAllLearningGoals(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({ success: false, message: "无效的分页参数" });
    }

    const result = await learningGoalService.getAllLearningGoals(page, pageSize);
    
    res.json({ success: true, message: "获取学习目标列表成功", data: result });
  } catch (error) {
    console.error("获取学习目标列表失败:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "获取学习目标列表失败" });
  }
}

/**
 * 删除用户的学习目标（管理员功能）
 */
export async function deleteUserLearningGoal(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({ success: false, message: "无效的用户ID" });
    }

    const success = await learningGoalService.deleteLearningGoal(parseInt(userId));
    
    if (success) {
      res.json({ success: true, message: "学习目标删除成功" });
    } else {
      res.status(404).json({ success: false, message: "学习目标删除失败或不存在" });
    }
  } catch (error) {
    console.error("删除学习目标失败:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "删除学习目标失败" });
  }
}

/**
 * 批量获取用户学习目标
 */
export async function getBatchLearningGoals(req: Request, res: Response) {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: "用户ID数组不能为空" });
    }

    // 验证所有ID都是有效的数字
    const validUserIds = userIds.filter((id: any) => 
      typeof id === 'number' && id > 0
    );

    if (validUserIds.length === 0) {
      return res.status(400).json({ success: false, message: "无效的用户ID" });
    }

    const goals = await learningGoalService.getBatchLearningGoals(validUserIds);
    
    res.json({ success: true, message: "批量获取学习目标成功", data: goals });
  } catch (error) {
    console.error("批量获取学习目标失败:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "批量获取学习目标失败" });
  }
}