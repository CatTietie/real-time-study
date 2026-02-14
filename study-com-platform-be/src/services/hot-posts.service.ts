// 热榜帖子服务
import Post from "../models/post.model";
import User from "../models/user.model";
import { Op, Sequelize } from "sequelize";

/**
 * 获取用户进入热榜前十的帖子数量
 * @param userId 用户ID
 * @returns 进入热榜前十的帖子数量
 */
export const getUserHotPostsCount = async (userId: number): Promise<number> => {
  try {
    // 获取当前热榜前十的帖子ID
    const hotPosts = await Post.findAll({
      where: { 
        status: 1, 
        publish_status: 1 
      },
      attributes: ['id'],
      order: [
        [Sequelize.col("view_count"), "DESC"],
        [Sequelize.col("like_count"), "DESC"],
        [Sequelize.col("comment_count"), "DESC"],
        [Sequelize.col("created_at"), "DESC"]
      ],
      limit: 10,
      raw: true
    });

    const hotPostIds = hotPosts.map((post: any) => post.id);

    if (hotPostIds.length === 0) {
      return 0;
    }

    // 统计该用户有多少帖子在热榜前十中
    const userHotPostsCount = await Post.count({
      where: {
        id: {
          [Op.in]: hotPostIds
        },
        user_id: userId,
        status: 1,
        publish_status: 1
      }
    });

    return userHotPostsCount;
  } catch (error) {
    console.error('获取用户热榜帖子数量失败:', error);
    return 0;
  }
};

/**
 * 获取用户的热榜帖子详情
 * @param userId 用户ID
 * @returns 热榜帖子列表
 */
export const getUserHotPosts = async (userId: number) => {
  try {
    // 获取当前热榜前十
    const hotPosts = await Post.findAll({
      where: { 
        status: 1, 
        publish_status: 1 
      },
      include: [{
        model: User,
        attributes: ["id", "nickname", "username", "avatar"]
      }],
      order: [
        [Sequelize.col("view_count"), "DESC"],
        [Sequelize.col("like_count"), "DESC"],
        [Sequelize.col("comment_count"), "DESC"],
        [Sequelize.col("created_at"), "DESC"]
      ],
      limit: 10,
      raw: false
    });

    const hotPostIds = hotPosts.map((post: any) => post.id);

    // 筛选出属于该用户的热榜帖子
    const userHotPosts = hotPosts.filter((post: any) => post.user_id === userId);

    return userHotPosts.map((post: any) => {
      const postData = post.toJSON();
      return {
        id: postData.id,
        title: postData.title,
        view_count: postData.view_count,
        like_count: postData.like_count,
        comment_count: postData.comment_count,
        created_at: postData.created_at,
        // 热度排名（在前十中的位置）
        rank: hotPostIds.indexOf(postData.id) + 1
      };
    });
  } catch (error) {
    console.error('获取用户热榜帖子详情失败:', error);
    return [];
  }
};