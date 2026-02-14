// 浏览记录服务
import { Op } from "sequelize";
import ViewRecord from "../models/view-record.model";
import Post from "../models/post.model";
import { getStartOfDay } from "../utils/helper";

/**
 * 记录用户浏览帖子行为
 * @param userId 用户ID
 * @param postId 帖子ID
 * @param ipAddress IP地址（可选）
 * @param userAgent 用户代理（可选）
 */
export const recordView = async (
  userId: number,
  postId: number,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    console.log(`recordView 开始: userId=${userId}, postId=${postId}`);
    
    // 检查帖子是否存在且已发布
    const post = await Post.findOne({
      where: { 
        id: postId, 
        status: 1, 
        publish_status: 1 
      }
    });
    
    if (!post) {
      console.log(`帖子不存在或未发布: postId=${postId}`);
      throw new Error("帖子不存在或未发布");
    }
    
    console.log(`帖子信息: id=${post.id}, user_id=${post.user_id}, title=${post.title}`);
    
    // 检查是否是作者自己浏览自己的帖子（不计入浏览量）
    if (post.user_id === userId) {
      console.log(`用户 ${userId} 是帖子作者，不计入浏览量`);
      return { success: true, message: "作者浏览自己的帖子不计入统计" };
    }
    
    // 检查今天是否已经浏览过该帖子（防止刷浏览量）
    const todayStart = getStartOfDay();
    console.log(`今日开始时间: ${todayStart.toISOString()}`);
    
    const existingTodayView = await ViewRecord.findOne({
      where: {
        user_id: userId,
        post_id: postId,
        created_at: {
          [Op.gte]: todayStart
        }
      }
    });
    
    if (existingTodayView) {
      console.log(`用户 ${userId} 今日已浏览过帖子 ${postId}`);
      return { success: true, message: "今日已浏览过该帖子" };
    }
    
    console.log(`准备创建浏览记录...`);
    
    // 创建浏览记录
    const viewRecord = await ViewRecord.create({
      user_id: userId,
      post_id: postId,
      ip_address: ipAddress,
      user_agent: userAgent
    });
    
    console.log(`浏览记录创建成功:`, viewRecord.toJSON());
    
    // 更新帖子的浏览次数
    console.log(`准备增加帖子 ${postId} 的浏览次数`);
    await Post.increment({ view_count: 1 }, { where: { id: postId } });
    
    console.log(`帖子浏览次数增加完成`);
    
    return { 
      success: true, 
      message: "浏览记录已保存",
      data: viewRecord 
    };
  } catch (error) {
    console.error('recordView 错误:', error);
    throw error;
  }
};

/**
 * 获取用户今日浏览量统计
 * @param userId 用户ID
 */
export const getUserTodayViews = async (userId: number) => {
  try {
    console.log(`getUserTodayViews 开始: userId=${userId}`);
    const todayStart = getStartOfDay();
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`查询时间范围: ${todayStart.toISOString()} 到 ${tomorrow.toISOString()}`);
    
    const todayViews = await ViewRecord.count({
      where: {
        user_id: userId,
        created_at: {
          [Op.gte]: todayStart,
          [Op.lt]: tomorrow
        }
      }
    });
    
    console.log(`用户 ${userId} 今日浏览记录数: ${todayViews}`);
    
    return todayViews;
  } catch (error) {
    console.error('getUserTodayViews 错误:', error);
    throw error;
  }
};

/**
 * 获取帖子的总浏览量
 * @param postId 帖子ID
 */
export const getPostTotalViews = async (postId: number) => {
  try {
    const totalViews = await ViewRecord.count({
      where: { post_id: postId }
    });
    
    return totalViews;
  } catch (error) {
    throw error;
  }
};

/**
 * 获取用户浏览历史（分页）
 * @param userId 用户ID
 * @param page 页码
 * @param pageSize 每页数量
 */
export const getUserViewHistory = async (
  userId: number,
  page: number = 1,
  pageSize: number = 10
) => {
  try {
    const result = await ViewRecord.findAndCountAll({
      where: { user_id: userId },
      include: [{
        model: Post,
        attributes: ['id', 'title', 'created_at']
      }],
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize
    });
    
    return {
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total: result.count
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * 获取热门帖子（按浏览量排序）
 * @param limit 限制数量
 */
export const getHotPostsByViews = async (limit: number = 10) => {
  try {
    const hotPosts = await Post.findAll({
      where: { 
        status: 1, 
        publish_status: 1 
      },
      order: [['view_count', 'DESC']],
      limit: limit
    });
    
    return hotPosts;
  } catch (error) {
    throw error;
  }
};