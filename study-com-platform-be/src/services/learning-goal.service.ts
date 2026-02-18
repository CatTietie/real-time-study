import { LearningGoal } from "../models/learning-goal.model";
import { User } from "../models/user.model";

// 学习目标数据类型
export interface LearningGoalData {
  user_id: number;
  nickname: string;
  username: string;
  goal_posts: number;
  goal_comments: number;
  goal_hot_posts: number;
  goal_points: number;
}

// 单个学习目标返回类型
export interface SingleLearningGoalResponse {
  id: number;
  user_id: number;
  nickname: string;
  username: string;
  goal_posts: number;
  goal_comments: number;
  goal_hot_posts: number;
  goal_points: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 获取用户的学习目标
 * @param userId 用户ID
 * @returns 学习目标数据或null
 */
export async function getUserLearningGoal(userId: number): Promise<SingleLearningGoalResponse | null> {
  try {
    const goal = await LearningGoal.findOne({
      where: { user_id: userId }
    });
    
    if (!goal) {
      return null;
    }
    
    return {
      id: goal.id,
      user_id: goal.user_id,
      nickname: goal.nickname,
      username: goal.username,
      goal_posts: goal.goal_posts,
      goal_comments: goal.goal_comments,
      goal_hot_posts: goal.goal_hot_posts,
      goal_points: goal.goal_points,
      created_at: goal.created_at,
      updated_at: goal.updated_at
    };
  } catch (error) {
    console.error("获取学习目标失败:", error);
    throw new Error("获取学习目标失败");
  }
}

/**
 * 设置或更新用户的学习目标
 * @param goalData 学习目标数据
 * @returns 更新后的学习目标
 */
export async function setLearningGoal(goalData: LearningGoalData): Promise<SingleLearningGoalResponse> {
  try {
    // 验证用户是否存在
    const user = await User.findByPk(goalData.user_id);
    if (!user) {
      throw new Error("用户不存在");
    }
    
    // 使用upsert方法插入或更新
    const [goal, created] = await LearningGoal.findOrCreate({
      where: { user_id: goalData.user_id },
      defaults: {
        user_id: goalData.user_id,
        nickname: goalData.nickname,
        username: goalData.username,
        goal_posts: goalData.goal_posts,
        goal_comments: goalData.goal_comments,
        goal_hot_posts: goalData.goal_hot_posts,
        goal_points: goalData.goal_points
      }
    });
    
    // 如果记录已存在，则更新
    if (!created) {
      await goal.update({
        nickname: goalData.nickname,
        username: goalData.username,
        goal_posts: goalData.goal_posts,
        goal_comments: goalData.goal_comments,
        goal_hot_posts: goalData.goal_hot_posts,
        goal_points: goalData.goal_points
      });
    }
    
    // 重新查询以获取最新的数据
    const updatedGoal = await LearningGoal.findOne({
      where: { user_id: goalData.user_id }
    });
    
    if (!updatedGoal) {
      throw new Error("更新学习目标失败");
    }
    
    return {
      id: updatedGoal.id,
      user_id: updatedGoal.user_id,
      nickname: updatedGoal.nickname,
      username: updatedGoal.username,
      goal_posts: updatedGoal.goal_posts,
      goal_comments: updatedGoal.goal_comments,
      goal_hot_posts: updatedGoal.goal_hot_posts,
      goal_points: updatedGoal.goal_points,
      created_at: updatedGoal.created_at,
      updated_at: updatedGoal.updated_at
    };
  } catch (error) {
    console.error("设置学习目标失败:", error);
    throw new Error(error instanceof Error ? error.message : "设置学习目标失败");
  }
}

/**
 * 批量获取多个用户的学习目标
 * @param userIds 用户ID数组
 * @returns 学习目标数据数组
 */
export async function getBatchLearningGoals(userIds: number[]): Promise<SingleLearningGoalResponse[]> {
  try {
    const goals = await LearningGoal.findAll({
      where: {
        user_id: userIds
      }
    });
    
    return goals.map(goal => ({
      id: goal.id,
      user_id: goal.user_id,
      nickname: goal.nickname,
      username: goal.username,
      goal_posts: goal.goal_posts,
      goal_comments: goal.goal_comments,
      goal_hot_posts: goal.goal_hot_posts,
      goal_points: goal.goal_points,
      created_at: goal.created_at,
      updated_at: goal.updated_at
    }));
  } catch (error) {
    console.error("批量获取学习目标失败:", error);
    throw new Error("批量获取学习目标失败");
  }
}

/**
 * 删除用户的学习目标
 * @param userId 用户ID
 * @returns 是否删除成功
 */
export async function deleteLearningGoal(userId: number): Promise<boolean> {
  try {
    const result = await LearningGoal.destroy({
      where: { user_id: userId }
    });
    
    return result > 0;
  } catch (error) {
    console.error("删除学习目标失败:", error);
    throw new Error("删除学习目标失败");
  }
}

/**
 * 获取所有学习目标（管理员功能）
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 学习目标列表和总数
 */
export interface GetAllLearningGoalsResponse {
  goals: Array<{
    id: number;
    user_id: number;
    nickname: string;
    username: string;
    goal_posts: number;
    goal_comments: number;
    goal_hot_posts: number;
    goal_points: number;
    created_at: Date;
    updated_at: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAllLearningGoals(page: number = 1, pageSize: number = 10): Promise<GetAllLearningGoalsResponse> {
  try {
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await LearningGoal.findAndCountAll({
      limit: pageSize,
      offset: offset,
      order: [['updated_at', 'DESC']]
    });
    
    const goals = rows.map(goal => ({
      id: goal.id,
      user_id: goal.user_id,
      nickname: goal.nickname,
      username: goal.username,
      goal_posts: goal.goal_posts,
      goal_comments: goal.goal_comments,
      goal_hot_posts: goal.goal_hot_posts,
      goal_points: goal.goal_points,
      created_at: goal.created_at,
      updated_at: goal.updated_at
    }));
    
    return {
      goals,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    };
  } catch (error) {
    console.error("获取所有学习目标失败:", error);
    throw new Error("获取所有学习目标失败");
  }
}