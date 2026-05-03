// 社区公共接口（学生端）
import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import User from "../models/user.model";
import PostLike from "../models/post-like.model";
import CommentLike from "../models/comment-like.model";
import Favorite from "../models/favorite.model";
import FavoriteFolder from "../models/favorite-folder.model";
import PointsLog from "../models/points-log.model";
import Report from "../models/report.model";
import UserRole from "../models/user-role.model";
import RolePermission from "../models/role-permission.model";
import Permission from "../models/permission.model";
import { checkSensitiveWords } from "../services/sensitive-word.service";
import { verifyToken } from "../services/auth.service";
import {
  addPoints,
  calculateLevel,
  getStartOfDay,
} from "../services/points.service";
import {
  addCommunityClient,
  broadcastNewPost,
  removeCommunityClient,
} from "../services/community-realtime.service";
import { recordView, getUserTodayViews } from "../services/view-record.service";
import { uploadFilesToOss } from "../middlewares/upload.middleware";
import {
  getStudyDuration,
  getContentQualityScore,
  getMultiDimTrendData,
} from "../services/learning-stats.service";

const parseTags = (tags?: string[] | string) => {
  const parsed = Array.isArray(tags)
    ? tags
    : typeof tags === "string" && tags.trim().length
      ? tags.split(",").map((t) => t.trim())
      : [];
  return Array.from(new Set(parsed.filter((t) => t.length > 0))).slice(0, 5);
};

const parseImages = (images?: string | string[]) => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const PERMISSION_DELETE_POST = "community.post.manage";

const canDeletePost = async (user: { id: number; role: string }) => {
  if (user.role === "super_admin") {
    return true;
  }

  if (user.role !== "admin") {
    return false;
  }

  const userRole = await UserRole.findOne({ where: { user_id: user.id } });
  if (!userRole) {
    return false;
  }

  const rolePermissions = await RolePermission.findAll({
    where: { role_id: userRole.role_id },
  });
  if (rolePermissions.length === 0) {
    return false;
  }

  const permissionIds = rolePermissions.map((item) => item.permission_id);
  const permission = await Permission.findOne({
    where: { id: permissionIds, code: PERMISSION_DELETE_POST },
  });

  return Boolean(permission);
};

type ViewMode = "latest" | "hot" | "zeroReply";

export const getCommunityPosts = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, category, keyword, order, userId, viewMode } = req.query;

    console.log('getCommunityPosts - 接收到的参数:', {
      viewMode,
      order,
      category,
      keyword,
      userId
    });

    const where: any = {};

    // 如果提供了userId参数（用户查看自己的帖子），则显示所有状态的帖子（除了已删除）
    if (userId) {
      where.user_id = Number(userId);
      where.publish_status = { [Op.ne]: 2 }; // 排除已删除的帖子
    } else {
      // 没有userId参数（公开列表），只显示已发布且审核通过的帖子
      where.status = 1;
      where.publish_status = 1;
    }

    // 处理视图模式
    const mode = (viewMode as ViewMode) || "latest";
    console.log('getCommunityPosts - 确定的视图模式:', mode);
    
    // 零回复模式：仅显示"问题求助"分类且评论数为0的帖子
    if (mode === "zeroReply") {
      where.category = "问题求助";
      // 处理 comment_count 可能为 null 或 0 的情况
      where[Op.or] = [
        { comment_count: 0 },
        { comment_count: null },
      ];
    } else if (category) {
      // 非零回复模式时，才应用用户选择的分类
      where.category = category;
    }

    if (keyword) {
      // 如果已有 where[Op.or]（来自零回复模式），需要合并
      if (where[Op.or]) {
        // 零回复模式下的 keyword 搜索：在 comment_count 为 0/null 且 category="问题求助" 的基础上，添加 keyword 条件
        const existingOr = where[Op.or];
        delete where[Op.or];
        where[Op.and] = [
          { [Op.or]: existingOr },
          {
            [Op.or]: [
              { title: { [Op.like]: `%${keyword}%` } },
              { content: { [Op.like]: `%${keyword}%` } },
            ],
          },
        ];
      } else {
        where[Op.or] = [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } },
        ];
      }
    }

    // 根据视图模式确定排序
    let orderBy: any;
    
    if (mode === "hot") {
      // 热门推荐：综合算法排序 - 点赞(权重3) + 评论(权重2) + 浏览量(权重1)
      console.log('getCommunityPosts - 使用热门排序');
      orderBy = [
        [Sequelize.literal(`(Post.like_count * 3 + Post.comment_count * 2 + Post.view_count)`), "DESC"],
        [Sequelize.col("Post.created_at"), "DESC"],
      ];
    } else if (mode === "zeroReply") {
      // 零回复模式：按创建时间倒序，最新的问题优先
      console.log('getCommunityPosts - 使用零回复排序');
      orderBy = [[Sequelize.col("Post.created_at"), "DESC"]];
    } else {
      // 最新发布（默认）：按创建时间倒序
      // 同时支持旧的 order 参数（兼容历史代码）
      console.log('getCommunityPosts - 使用最新发布排序');
      orderBy =
        order === "hot"
          ? [
              [Sequelize.col("Post.like_count"), "DESC"],
              [Sequelize.col("Post.comment_count"), "DESC"],
              [Sequelize.col("Post.created_at"), "DESC"],
            ]
          : [[Sequelize.col("Post.created_at"), "DESC"]];
    }

    console.log('getCommunityPosts - 最终 orderBy:', JSON.stringify(orderBy));
    console.log('getCommunityPosts - 最终 where:', JSON.stringify(where));

    const result = await Post.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname"],
        },
        {
          model: Post,
          as: "ForwardPost",
          attributes: ["id", "title", "content", "like_count", "comment_count", "user_id"],
          include: [
            {
              model: User,
              attributes: ["id", "username", "nickname"],
            },
          ],
        },
        {
          model: User,
          as: "ForwardUser",
          attributes: ["id", "username", "nickname"],
        },
      ],
      order: orderBy,
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    console.log('getCommunityPosts - 查询结果数量:', result.count);
    if (result.rows.length > 0) {
      const firstPost = result.rows[0] as any;
      console.log('getCommunityPosts - 第一条帖子:', {
        id: firstPost.id,
        title: firstPost.title,
        like_count: firstPost.like_count,
        comment_count: firstPost.comment_count,
        view_count: firstPost.view_count,
        created_at: firstPost.created_at
      });
    }

    const data = result.rows.map((post) => {
      const raw = post.toJSON() as any;
      return {
        ...raw,
        images: parseImages(raw.images),
        favoriteCount: 0,
      };
    });

    const postIds = data.map((item) => item.id);
    if (postIds.length > 0) {
      const favoriteCounts = await Favorite.findAll({
        attributes: [
          "post_id",
          [Sequelize.fn("COUNT", Sequelize.col("post_id")), "count"],
        ],
        where: { post_id: postIds },
        group: ["post_id"],
        raw: true,
      });
      const countMap = new Map<number, number>(
        favoriteCounts.map((item: any) => [
          Number(item.post_id),
          Number(item.count || 0),
        ]),
      );
      data.forEach((item) => {
        item.favoriteCount = countMap.get(item.id) || 0;
      });
    }

    res.json({
      success: true,
      message: "获取帖子成功",
      data,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取帖子失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCommunityTagSuggestions = async (
  req: Request,
  res: Response,
) => {
  try {
    const keyword = String(req.query.keyword || "").trim();

    // 如果没有关键词，返回热门标签（从已发布的帖子中提取）
    if (keyword.length < 1) {
      // 获取最近200条已发布的帖子，提取所有标签并统计频率
      const posts = await Post.findAll({
        attributes: ["tags"],
        where: {
          status: 1, // 审核通过
          publish_status: 1, // 已发布
          tags: { [Op.ne]: null },
        },
        limit: 200,
        order: [["created_at", "DESC"]],
      });

      // 统计标签出现频率
      const tagCount = new Map<string, number>();
      posts.forEach((post) => {
        const raw = (post as any).tags as string | undefined;
        if (!raw) return;
        
        let tags: string[] = [];
        try {
          // 尝试解析为 JSON 数组
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed)) {
            tags = parsed;
          }
        } catch {
          // 如果不是 JSON，尝试按逗号分割
          tags = raw
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
        }

        tags.forEach((tag) => {
          const key = tag.trim();
          if (key && key.length > 0) {
            tagCount.set(key, (tagCount.get(key) || 0) + 1);
          }
        });
      });

      // 按频率排序，返回前15个热门标签
      const hotTags = Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag]) => tag);

      return res.json({
        success: true,
        message: "获取成功",
        data: hotTags,
        isHotTags: true,
      });
    }

    // 如果有关键词，执行联想搜索
    const posts = await Post.findAll({
      attributes: ["tags"],
      where: {
        tags: { [Op.like]: `%${keyword}%` },
      },
      limit: 50,
    });

    const lowerKeyword = keyword.toLowerCase();
    const tags = new Set<string>();
    posts.forEach((post) => {
      const raw = (post as any).tags as string | undefined;
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as string[];
        parsed.forEach((tag) => {
          if (tag.toLowerCase().includes(lowerKeyword)) {
            tags.add(tag);
          }
        });
      } catch {
        return;
      }
    });

    res.json({
      success: true,
      message: "获取成功",
      data: Array.from(tags).slice(0, 10),
      isHotTags: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCommunityPostDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user?.id;

    const post = await Post.findOne({
      where: { id, status: 1, publish_status: 1 },
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname", "avatar"],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    // 如果用户已登录，记录浏览行为
    if (userId) {
      console.log(`用户 ${userId} 正在浏览帖子 ${id}`);
      try {
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';
        console.log(`准备记录浏览: userId=${userId}, postId=${id}, ip=${ipAddress}`);
        const viewResult = await recordView(userId, id, ipAddress, userAgent);
        console.log('浏览记录结果:', viewResult);
      } catch (viewError) {
        // 浏览记录失败不影响主要功能
        console.warn('记录浏览行为失败:', viewError);
      }
    } else {
      console.log(`未登录用户浏览帖子 ${id}，直接增加浏览量`);
      // 未登录用户也增加浏览量（但不记录具体用户）
      await Post.increment({ view_count: 1 }, { where: { id } });
    }

    const likeUsers = await PostLike.findAll({
      where: { post_id: id },
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname", "avatar"],
        },
      ],
      order: [[Sequelize.col("PostLike.created_at"), "DESC"]],
      limit: 10,
    });

    const postData = post.toJSON() as any;
    const favoriteCount = await Favorite.count({ where: { post_id: id } });

    res.json({
      success: true,
      message: "获取帖子详情成功",
      data: {
        ...postData,
        images: parseImages(postData.images),
        favoriteCount,
        likeUsers: likeUsers.map((item) => (item as any).User),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取帖子详情失败";
    res.status(500).json({ success: false, message });
  }
};

export const createCommunityPost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { title, content, category, tags, isDraft, forwardPostId } = req.body as {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[] | string;
      isDraft?: string | boolean;
      forwardPostId?: number;
    };

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "标题和内容不能为空" });
    }

    if (title.trim().length < 2 || title.trim().length > 100) {
      return res
        .status(400)
        .json({ success: false, message: "标题长度需为2-100字符" });
    }

    const allowedCategories = ["学习心得", "问题求助", "经验分享", "聊天交友"];
    if (!category || !allowedCategories.includes(category)) {
      return res
        .status(400)
        .json({ success: false, message: "请选择有效的分类" });
    }

    const todayStart = getStartOfDay();
    const dailyCount = await Post.count({
      where: {
        user_id: req.user.id,
        [Op.and]: [
          Sequelize.where(Sequelize.col("created_at"), {
            [Op.gte]: todayStart,
          }),
        ],
      },
    });
    if (dailyCount >= 10) {
      return res
        .status(400)
        .json({ success: false, message: "每天最多发布10个帖子" });
    }

    const uniqueTags = parseTags(tags);
    const files = (req.files || []) as Express.Multer.File[];
    if (files.length > 4) {
      return res
        .status(400)
        .json({ success: false, message: "最多只能上传4张图片" });
    }
    
    // 使用 OSS 上传（如果 OSS 可用）
    const imageUrls = await uploadFilesToOss(req);

    const isDraftFlag =
      typeof isDraft === "string" ? isDraft === "true" : Boolean(isDraft);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    const isNewUser = user.created_at >= todayStart;
    const textToCheck = [title, content, category, uniqueTags.join(" ")]
      .filter(Boolean)
      .join(" ");
    const { hit, matches } = await checkSensitiveWords(textToCheck);

    const status = isDraftFlag ? 0 : hit || isNewUser ? 0 : 1;
    const auditReason = hit
      ? `包含敏感词：${matches.slice(0, 10).join("、")}`
      : undefined;

    let forwardPost: any = null;
    if (forwardPostId) {
      forwardPost = await Post.findOne({
        where: { id: forwardPostId, status: 1, publish_status: 1 },
      });
    }

    const post = await Post.create({
      user_id: req.user.id,
      title,
      category,
      tags: JSON.stringify(uniqueTags),
      content,
      status,
      publish_status: isDraftFlag ? 0 : 1,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      is_top: 0,
      edit_count: 0,
      forward_post_id: forwardPost ? forwardPost.id : null,
      forward_user_id: forwardPost ? forwardPost.user_id : null,
      ...(auditReason
        ? { audit_reason: auditReason, audit_at: new Date() }
        : {}),
      ...(imageUrls.length ? { images: JSON.stringify(imageUrls) } : {}),
    });

    if (status === 1) {
      await addPoints({
        userId: req.user.id,
        change: 10,
        reason: "post_created",
        sourceType: "post",
        sourceId: post.id,
      });
    }

    if (status === 1 && post.publish_status === 1) {
      broadcastNewPost({
        postId: post.id,
        title: post.title,
        authorUsername: user.username,
        authorNickname: user.nickname,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: isDraftFlag
        ? "草稿已保存"
        : hit
          ? "内容包含敏感词，已进入审核"
          : isNewUser
            ? "发帖成功，等待审核"
            : "发帖成功",
      data: post,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "发帖失败";
    res.status(500).json({ success: false, message });
  }
};

export const streamCommunityEvents = async (req: Request, res: Response) => {
  try {
    const tokenRaw = req.query.token;
    let token: string | undefined;
    if (typeof tokenRaw === "string") {
      token = tokenRaw;
    } else if (Array.isArray(tokenRaw)) {
      const first = tokenRaw[0];
      if (typeof first === "string") {
        token = first;
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "未提供 Token" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res
        .status(401)
        .json({ success: false, message: "Token 无效或已过期" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const clientId = `${decoded.id}-${Date.now()}-${Math.random()}`;
    addCommunityClient({ id: clientId, userId: decoded.id, res });

    const heartbeat = setInterval(() => {
      res.write(":keep-alive\n\n");
    }, 20000);

    res.on("close", () => {
      clearInterval(heartbeat);
      removeCommunityClient(clientId);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "连接失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateCommunityPost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const { title, content, category, tags, isDraft } = req.body as {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[] | string;
      isDraft?: boolean;
    };

    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "仅作者可编辑" });
    }

    if (post.publish_status === 3) {
      return res
        .status(403)
        .json({ success: false, message: "帖子已锁定，无法编辑" });
    }

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(parseTags(tags));
    }

    if (typeof isDraft === "boolean") {
      updateData.publish_status = isDraft ? 0 : 1;
    }

    if (title !== undefined) {
      const createdAt = post.getDataValue("createdAt") as Date;
      const diffHours = (Date.now() - createdAt.getTime()) / 36e5;
      if (diffHours > 24) {
        return res.status(403).json({
          success: false,
          message: "帖子发布24小时后不可修改标题",
        });
      }
      updateData.title = title;
    }

    updateData.edit_count = (post.edit_count || 0) + 1;
    updateData.last_edited_at = new Date();

    await post.update(updateData);

    res.json({ success: true, message: "更新成功", data: post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteCommunityPost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const { confirm } = req.body as { confirm?: boolean };

    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    const isOwner = post.user_id === req.user.id;
    const canDelete = isOwner ? true : await canDeletePost(req.user);
    if (!canDelete) {
      return res
        .status(403)
        .json({ success: false, message: "无权限删除该帖子" });
    }

    if ((post.comment_count || 0) > 0 && !confirm) {
      return res.status(400).json({
        success: false,
        message: "帖子已有评论，需确认删除",
        code: "NEED_CONFIRM",
      });
    }

    await post.update({
      publish_status: 2,
      deleted_at: new Date(),
    });

    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCommunityPostComments = async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const { page = 1, pageSize = 10, order } = req.query;

    const orderBy: any =
      order === "like"
        ? [
            ["like_count", "DESC"],
            [Sequelize.col("created_at"), "ASC"],
          ]
        : [[Sequelize.col("created_at"), "ASC"]];

    const token = req.headers.authorization?.split(" ")[1];
    const decoded = token ? verifyToken(token) : null;
    const viewerId = decoded?.id;

    // 获取主评论的条件
    const mainCommentWhere: any = { 
      post_id: postId, 
      parent_id: null 
    };
    if (viewerId) {
      mainCommentWhere[Op.or] = [{ status: 1 }, { status: 0, user_id: viewerId }];
    } else {
      mainCommentWhere.status = 1;
    }

    // 获取主评论的总数（用于分页）
    const totalMainComments = await Comment.count({
      where: mainCommentWhere,
    });

    // 获取主评论及其子评论
    const result = await Comment.findAndCountAll({
      where: mainCommentWhere,
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname", "avatar"],
        },
        {
          model: Comment,
          as: "Replies",
          include: [
            {
              model: User,
              attributes: ["id", "username", "nickname", "avatar"],
            },
            {
              model: Comment,
              as: "ParentComment",
              include: [
                {
                  model: User,
                  attributes: ["id", "username", "nickname", "avatar"],
                },
              ],
            },
          ],
          order: [["created_at", "ASC"]],
        },
      ],
      order: orderBy,
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    const rows = result.rows.map((item) => {
      const raw = item.toJSON() as any;
      if (raw.is_deleted) {
        return { ...raw, content: "该评论已被删除", Replies: [] };
      }
      
      // 处理子评论
      if (raw.Replies && raw.Replies.length > 0) {
        raw.Replies = raw.Replies.map((reply: any) => {
          if (reply.is_deleted) {
            return { ...reply, content: "该评论已被删除" };
          }
          return reply;
        });
      }
      
      return raw;
    });

    res.json({
      success: true,
      message: "获取评论成功",
      data: rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: totalMainComments,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取评论失败";
    res.status(500).json({ success: false, message });
  }
};

export const createCommunityComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const postId = Number(req.params.id);
    const { content, parentId } = req.body as {
      content?: string;
      parentId?: number;
    };

    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: "评论内容不能为空" });
    }

    if (content.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: "评论长度不能超过500字符" });
    }

    const post = await Post.findOne({
      where: { id: postId, status: 1, publish_status: 1 },
    });
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "帖子不存在或未通过审核" });
    }

    if (parentId) {
      const parent = await Comment.findByPk(parentId);
      if (!parent || parent.post_id !== postId) {
        return res
          .status(400)
          .json({ success: false, message: "父评论不存在" });
      }
      if (parent.parent_id) {
        return res
          .status(400)
          .json({ success: false, message: "仅支持一级回复" });
      }
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    const isNewUser = user.created_at >= getStartOfDay();
    const { hit } = await checkSensitiveWords(content);
    const status = isNewUser || hit ? 0 : 1;

    const comment = await Comment.create({
      post_id: postId,
      user_id: req.user.id,
      parent_id: parentId,
      content,
      status,
      is_deleted: 0,
      like_count: 0,
    });

    if (status === 1) {
      await Post.increment({ comment_count: 1 }, { where: { id: postId } });

      await addPoints({
        userId: req.user.id,
        change: 1,
        reason: "comment_created",
        sourceType: "comment",
        sourceId: comment.id,
        dailyCap: 10,
      });
    }

    res.json({
      success: true,
      message:
        status === 1
          ? "评论成功"
          : hit
            ? "评论包含敏感词，已进入审核"
            : "评论提交成功，等待审核",
      data: comment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "评论失败";
    res.status(500).json({ success: false, message });
  }
};

export const createCommunityReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const postId = Number(req.params.id);
    const { reason } = req.body as { reason?: string };

    if (!reason || reason.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, message: "请输入举报原因" });
    }

    const post = await Post.findOne({
      where: { id: postId, publish_status: 1 },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    const report = await Report.create({
      reporter_id: req.user.id,
      target_type: "post",
      target_id: postId,
      reason: reason.trim(),
      status: 0,
    });

    res.json({ success: true, message: "举报成功", data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "举报失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCommunityComments = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, userId } = req.query;

    // 构建 where 条件
    const where: any = { status: 1 };
    if (userId) {
      where.user_id = Number(userId);
    }

    const result = await Comment.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname", "avatar"],
        },
        {
          model: Post,
          attributes: ["id", "title"],
        },
      ],
      order: [[Sequelize.col("created_at"), "DESC"]],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    const rows = result.rows.map((item) => {
      const raw = item.toJSON() as any;
      if (raw.is_deleted) {
        return { ...raw, content: "该评论已被删除" };
      }
      return raw;
    });

    res.json({
      success: true,
      message: "获取评论成功",
      data: rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取评论失败";
    res.status(500).json({ success: false, message });
  }
};

const getStartOfWeek = () => {
  const start = new Date();
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getStartOfNDaysAgo = (days: number) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getCommunityLeaderboard = async (req: Request, res: Response) => {
  try {
    const type = String((req.query as any)?.type || "total");
    const timeRange = String((req.query as any)?.timeRange || "all");

    if (type === "post_hot") {
      // 热门内容榜 - 返回帖子相关信息，按热度排序
      const where: any = { status: 1, publish_status: 1 };

      // 时间筛选 - 必须明确指定 Post.created_at，因为 User 表也有 created_at 字段
      if (timeRange === "today") {
        where[Op.and] = [
          Sequelize.where(Sequelize.col("Post.created_at"), {
            [Op.gte]: getStartOfDay(),
          }),
        ];
      } else if (timeRange === "week") {
        where[Op.and] = [
          Sequelize.where(Sequelize.col("Post.created_at"), {
            [Op.gte]: getStartOfWeek(),
          }),
        ];
      }

      const posts = await Post.findAll({
        where,
        include: [{
          model: User,
          attributes: ["id", "nickname", "username", "avatar"]
        }],
        order: [
          [Sequelize.literal(`(Post.view_count * 0.5 + Post.like_count * 2 + Post.comment_count)`), "DESC"],
          [Sequelize.col("Post.created_at"), "DESC"]
        ],
        limit: 50,
      });

      // 热度计算规则
      const heatRules = {
        viewWeight: 0.5,
        likeWeight: 2,
        commentWeight: 1,
        formula: "热度值 = 浏览量 × 0.5 + 点赞数 × 2 + 评论数",
        description: "热度值综合考虑浏览、点赞、评论三个维度，其中点赞权重最高，评论次之，浏览最低。"
      };

      const data = posts.map((post: any) => {
        const postData = post.toJSON();
        // 计算热度值
        const heatScore = Math.round(
          (postData.view_count || 0) * 0.5 +
          (postData.like_count || 0) * 2 +
          (postData.comment_count || 0)
        );
        return {
          id: postData.id,
          title: postData.title,
          view_count: postData.view_count,
          like_count: postData.like_count,
          comment_count: postData.comment_count,
          heat_score: heatScore,
          user_id: postData.User?.id,
          user_nickname: postData.User?.nickname,
          user_username: postData.User?.username,
          user_avatar: postData.User?.avatar,
          created_at: postData.created_at,
        };
      });

      return res.json({
        success: true,
        message: "获取排行榜成功",
        data,
        heat_rules: heatRules,
        time_range: timeRange,
      });
    }

    if (type === "comment_count") {
      // 评论之星榜 - 区分总评论数和周期（近7天）评论数
      const sevenDaysAgo = getStartOfNDaysAgo(7);
      const commentPeriod = String((req.query as any)?.commentPeriod || "7days"); // "7days" 或 "all"
      
      // 1. 先查询所有有评论的用户的基础数据（总评论数）
      const totalRows = await Comment.findAll({
        attributes: [
          "user_id",
          [Sequelize.fn("COUNT", Sequelize.col("Comment.id")), "total_comment_count"],
          [Sequelize.fn("MAX", Sequelize.col("Comment.created_at")), "last_comment_time"],
        ],
        where: { status: 1 },
        group: ["user_id"],
        include: [{
          model: User,
          attributes: ["id", "nickname", "username", "avatar", "points"]
        }],
        limit: 200,
      });
      
      // 2. 查询近7天的评论数
      const periodRows = await Comment.findAll({
        attributes: [
          "user_id",
          [Sequelize.fn("COUNT", Sequelize.col("Comment.id")), "period_comment_count"],
        ],
        where: { 
          status: 1,
          created_at: { [Op.gte]: sevenDaysAgo }
        },
        group: ["user_id"],
        raw: true,
      });
      
      // 3. 构建周期评论数的Map
      const periodMap = new Map<number, number>();
      periodRows.forEach((item: any) => {
        periodMap.set(Number(item.user_id), Number(item.period_comment_count || 0));
      });
      
      // 4. 组合数据
      const combinedData = totalRows.map((row: any) => {
        const rawData = row.toJSON();
        const userId = Number(rawData.user_id);
        const totalCount = Number(rawData.total_comment_count || 0);
        const periodCount = periodMap.get(userId) || 0;
        
        // 根据参数决定使用哪个作为主要排序字段
        const mainCommentCount = commentPeriod === "all" ? totalCount : periodCount;
        const periodType = commentPeriod === "all" ? "all" : "7days";
        const periodLabel = commentPeriod === "all" ? "全部" : "近7天";
        
        return {
          id: userId,
          nickname: rawData.User?.nickname,
          username: rawData.User?.username,
          avatar: rawData.User?.avatar,
          points: Number(rawData.User?.points || 0),
          level: calculateLevel(Number(rawData.User?.points || 0)),
          // 主要评论数（用于排序和显示）
          comment_count: mainCommentCount,
          period_comment_count: periodCount,
          total_comment_count: totalCount,
          // 最新评论时间
          last_comment_time: rawData.last_comment_time,
          // 周期类型
          period_type: periodType,
          period_label: periodLabel,
        };
      });
      
      // 按选择的评论数降序排序
      if (commentPeriod === "all") {
        combinedData.sort((a, b) => b.total_comment_count - a.total_comment_count);
      } else {
        combinedData.sort((a, b) => b.period_comment_count - a.period_comment_count);
      }
      
      // 只取前50条
      const data = combinedData.slice(0, 50);

      return res.json({ 
        success: true, 
        message: "获取排行榜成功", 
        data,
        meta: {
          period_type: commentPeriod === "all" ? "all" : "7days",
          period_label: commentPeriod === "all" ? "全部" : "近7天",
          description: commentPeriod === "all" 
            ? "评论之星榜按历史总评论数排序" 
            : "评论之星榜按近7天评论数排序，更公平地反映近期活跃度"
        }
      });
    }

    // 默认是 total - 社区达人榜（按总积分排行）
    const users = await User.findAll({
      where: { status: 1 },
      attributes: ["id", "username", "nickname", "avatar", "points"],
      order: [["points", "DESC"]],
      limit: 100,
    });

    // 收集用户ID，用于批量查询统计数据
    const userIds = users.map((user) => user.id);
    
    // 查询每个用户的发帖数
    const postCounts = await Post.findAll({
      attributes: [
        "user_id",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "post_count"],
      ],
      where: { 
        user_id: { [Op.in]: userIds },
        status: 1,
        publish_status: 1 
      },
      group: ["user_id"],
      raw: true,
    });
    
    // 查询每个用户的帖子获赞数（其他用户给该用户的帖子点赞）
    const postLikeCounts = await Post.findAll({
      attributes: [
        "Post.user_id",
        [Sequelize.fn("COUNT", Sequelize.col("PostLikes.id")), "like_count"],
      ],
      where: { 
        user_id: { [Op.in]: userIds },
        status: 1,
        publish_status: 1 
      },
      include: [{
        model: PostLike,
        attributes: [],
        as: "PostLikes",
        required: false,
      }],
      group: ["Post.user_id"],
      raw: true,
    });

    // 查询每个用户的评论获赞数（其他用户给该用户的评论点赞）
    const commentLikeCounts = await Comment.findAll({
      attributes: [
        "Comment.user_id",
        [Sequelize.fn("COUNT", Sequelize.col("CommentLikes.id")), "like_count"],
      ],
      where: { 
        user_id: { [Op.in]: userIds },
        is_deleted: 0,
        status: 1 
      },
      include: [{
        model: CommentLike,
        attributes: [],
        as: "CommentLikes",
        required: false,
      }],
      group: ["Comment.user_id"],
      raw: true,
    });

    // 构建统计数据的Map
    const postCountMap = new Map<number, number>();
    const postLikeCountMap = new Map<number, number>();
    const commentLikeCountMap = new Map<number, number>();

    postCounts.forEach((item: any) => {
      postCountMap.set(Number(item.user_id), Number(item.post_count || 0));
    });

    postLikeCounts.forEach((item: any) => {
      postLikeCountMap.set(Number(item["Post.user_id"]), Number(item.like_count || 0));
    });

    commentLikeCounts.forEach((item: any) => {
      commentLikeCountMap.set(Number(item["Comment.user_id"]), Number(item.like_count || 0));
    });

    res.json({
      success: true,
      message: "获取排行榜成功",
      data: users.map((user) => {
        const postCount = postCountMap.get(user.id) || 0;
        const postLikes = postLikeCountMap.get(user.id) || 0;
        const commentLikes = commentLikeCountMap.get(user.id) || 0;
        const totalLikes = postLikes + commentLikes;
        
        return {
          id: user.id,
          nickname: user.nickname,
          username: user.username,
          avatar: user.avatar,
          points: user.points,
          level: calculateLevel(user.points),
          post_count: postCount,
          like_count: totalLikes,
          post_like_count: postLikes,
          comment_like_count: commentLikes,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取排行榜失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteCommunityComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "评论不存在" });
    }

    if (comment.is_deleted) {
      return res.json({ success: true, message: "评论已删除" });
    }

    const post = await Post.findByPk(comment.post_id);
    const isAuthor = comment.user_id === req.user.id;
    const isPostOwner = post?.user_id === req.user.id;

    if (!isAuthor && !isPostOwner) {
      return res
        .status(403)
        .json({ success: false, message: "无权限删除该评论" });
    }

    await comment.update({ is_deleted: 1, deleted_at: new Date() });

    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    res.status(500).json({ success: false, message });
  }
};

export const togglePostLike = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const postId = Number(req.params.id);
    const post = await Post.findOne({
      where: { id: postId, status: { [Op.in]: [0, 1] }, publish_status: 1 },
    });
    if (!post) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    if (post.user_id === req.user.id) {
      return res
        .status(400)
        .json({ success: false, message: "不能给自己的帖子点赞" });
    }

    const existing = await PostLike.findOne({
      where: { post_id: postId, user_id: req.user.id },
    });

    let liked = false;
    if (existing) {
      await existing.destroy();
      await Post.decrement({ like_count: 1 }, { where: { id: postId } });
      liked = false;
    } else {
      await PostLike.create({ post_id: postId, user_id: req.user.id });
      await Post.increment({ like_count: 1 }, { where: { id: postId } });
      liked = true;

      await addPoints({
        userId: post.user_id,
        change: 2,
        reason: "post_liked",
        sourceType: "post",
        sourceId: postId,
        dailyCap: 20,
      });
    }

    const likeUsers = await PostLike.findAll({
      where: { post_id: postId },
      include: [
        {
          model: User,
          attributes: ["id", "nickname", "avatar", "username"],
        },
      ],
      order: [[Sequelize.col("PostLike.created_at"), "DESC"]],
      limit: 5,
    });

    const updated = await Post.findByPk(postId);

    if (liked && (updated?.like_count || 0) >= 50) {
      const existingBonus = await PointsLog.findOne({
        where: {
          user_id: post.user_id,
          reason: "post_quality",
          source_id: postId,
        },
      });
      if (!existingBonus) {
        await addPoints({
          userId: post.user_id,
          change: 30,
          reason: "post_quality",
          sourceType: "post",
          sourceId: postId,
        });
      }
    }

    res.json({
      success: true,
      message: liked ? "点赞成功" : "取消点赞",
      data: {
        liked,
        likeCount: updated?.like_count || 0,
        likeUsers: likeUsers.map((item) => (item as any).User),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "点赞失败";
    res.status(500).json({ success: false, message });
  }
};

const hasLoginToday = async (userId: number) => {
  const startOfDay = getStartOfDay();
  const count = await PointsLog.count({
    where: {
      user_id: userId,
      reason: "community_daily_login",
      [Op.and]: [
        Sequelize.where(Sequelize.col("created_at"), {
          [Op.gte]: startOfDay,
        }),
      ],
    },
  });
  return count > 0;
};

const getLoginStreak = async (userId: number) => {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const logs = await PointsLog.findAll({
    where: {
      user_id: userId,
      reason: "community_daily_login",
      [Op.and]: [
        Sequelize.where(Sequelize.col("created_at"), {
          [Op.gte]: start,
        }),
      ],
    },
    attributes: [[Sequelize.col("created_at"), "createdAt"]],
  });

  const daySet = new Set(
    logs
      .map((log) => {
        const rawValue =
          (log as { createdAt?: Date | string }).createdAt ??
          (log as { created_at?: Date | string }).created_at ??
          (log as unknown as { get?: (key: string) => unknown }).get?.(
            "createdAt",
          );
        if (!rawValue) return null;
        if (
          !(
            rawValue instanceof Date ||
            typeof rawValue === "string" ||
            typeof rawValue === "number"
          )
        ) {
          return null;
        }
        const date =
          rawValue instanceof Date ? rawValue : new Date(rawValue as string);
        if (Number.isNaN(date.getTime())) return null;
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      })
      .filter((value): value is string => Boolean(value)),
  );

  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 31; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!daySet.has(key)) {
      break;
    }
    streak += 1;
  }
  return streak;
};

export const recordCommunityVisit = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const already = await hasLoginToday(req.user.id);
    if (already) {
      return res.json({ success: true, message: "今日已记录" });
    }

    await addPoints({
      userId: req.user.id,
      change: 1,
      reason: "community_daily_login",
      sourceType: "system",
    });

    const streak = await getLoginStreak(req.user.id);
    if (streak === 3) {
      await addPoints({
        userId: req.user.id,
        change: 3,
        reason: "community_streak_3",
        sourceType: "system",
      });
    }
    if (streak === 7) {
      await addPoints({
        userId: req.user.id,
        change: 10,
        reason: "community_streak_7",
        sourceType: "system",
      });
    }
    if (streak === 30) {
      await addPoints({
        userId: req.user.id,
        change: 50,
        reason: "community_streak_30",
        sourceType: "system",
      });
    }

    res.json({ success: true, message: "已记录", data: { streak } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "记录失败";
    res.status(500).json({ success: false, message });
  }
};

export const toggleCommentLike = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const commentId = Number(req.params.id);
    const comment = await Comment.findByPk(commentId);
    if (!comment || comment.is_deleted) {
      return res.status(404).json({ success: false, message: "评论不存在" });
    }

    if (comment.user_id === req.user.id) {
      return res
        .status(400)
        .json({ success: false, message: "不能点赞自己的评论" });
    }

    const existing = await CommentLike.findOne({
      where: { comment_id: commentId, user_id: req.user.id },
    });

    let liked = false;
    if (existing) {
      await existing.destroy();
      await Comment.decrement({ like_count: 1 }, { where: { id: commentId } });
      liked = false;
    } else {
      await CommentLike.create({ comment_id: commentId, user_id: req.user.id });
      await Comment.increment({ like_count: 1 }, { where: { id: commentId } });
      liked = true;

      await addPoints({
        userId: comment.user_id,
        change: 1,
        reason: "comment_liked",
        sourceType: "comment",
        sourceId: commentId,
        dailyCap: 10,
      });
    }

    const updated = await Comment.findByPk(commentId);

    res.json({
      success: true,
      message: liked ? "点赞成功" : "取消点赞",
      data: {
        liked,
        likeCount: updated?.like_count || 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "点赞失败";
    res.status(500).json({ success: false, message });
  }
};

export const getFavoriteFolders = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const folders = await FavoriteFolder.findAll({
      where: { user_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, message: "获取收藏夹成功", data: folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const createFavoriteFolder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { name } = req.body as { name?: string };
    if (!name || name.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "请输入收藏夹名称" });
    }

    const exists = await FavoriteFolder.findOne({
      where: { user_id: req.user.id, name: name.trim() },
    });
    if (exists) {
      return res.status(400).json({ success: false, message: "收藏夹已存在" });
    }

    const folder = await FavoriteFolder.create({
      user_id: req.user.id,
      name: name.trim(),
    });

    res.json({ success: true, message: "创建成功", data: folder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateFavoriteFolder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const { name } = req.body as { name?: string };
    if (!name || name.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "请输入收藏夹名称" });
    }

    const folder = await FavoriteFolder.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!folder) {
      return res.status(404).json({ success: false, message: "收藏夹不存在" });
    }

    await folder.update({ name: name.trim() });
    res.json({ success: true, message: "更新成功", data: folder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteFavoriteFolder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const folder = await FavoriteFolder.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!folder) {
      return res.status(404).json({ success: false, message: "收藏夹不存在" });
    }

    await Favorite.update(
      { folder_id: null },
      { where: { folder_id: id, user_id: req.user.id } },
    );
    await folder.destroy();

    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    res.status(500).json({ success: false, message });
  }
};

export const getFavorites = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { page = 1, pageSize = 10, folderId, keyword, category, sortBy, sortOrder } = req.query;
    const where: any = { user_id: req.user.id };
    if (folderId) where.folder_id = Number(folderId);

    const postWhere: any = {};
    if (category) postWhere.category = category;
    if (keyword) {
      postWhere[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }

    let orderBy: any;
    const order = sortBy || "created_at";
    const orderDir = (sortOrder as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    if (order === "view_count") {
      orderBy = [
        [Sequelize.col("Post.view_count"), orderDir],
        [Sequelize.col("created_at"), "DESC"],
      ];
    } else if (order === "like_count") {
      orderBy = [
        [Sequelize.col("Post.like_count"), orderDir],
        [Sequelize.col("created_at"), "DESC"],
      ];
    } else if (order === "comment_count") {
      orderBy = [
        [Sequelize.col("Post.comment_count"), orderDir],
        [Sequelize.col("created_at"), "DESC"],
      ];
    } else {
      orderBy = [[Sequelize.col("created_at"), orderDir]];
    }

    const result = await Favorite.findAndCountAll({
      where,
      include: [
        {
          model: Post,
          where: Object.keys(postWhere).length ? postWhere : undefined,
          required: Boolean(Object.keys(postWhere).length),
          include: [
            { model: User, attributes: ["id", "username", "nickname"] },
          ],
        },
        { model: FavoriteFolder, attributes: ["id", "name"] },
      ],
      order: orderBy,
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    res.json({
      success: true,
      message: "获取收藏成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const createFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { postId, folderId, note, tags } = req.body as {
      postId?: number;
      folderId?: number;
      note?: string;
      tags?: string[] | string;
    };

    if (!postId) {
      return res.status(400).json({ success: false, message: "缺少帖子ID" });
    }

    const post = await Post.findOne({
      where: { id: postId, status: 1, publish_status: 1 },
    });
    if (!post) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    const uniqueTags = parseTags(tags);

    const existing = await Favorite.findOne({
      where: { user_id: req.user.id, post_id: postId },
    });

    if (existing) {
      await existing.update({
        folder_id: folderId || null,
        note,
        tags: JSON.stringify(uniqueTags),
      });
      return res.json({
        success: true,
        message: "收藏已更新",
        data: existing,
      });
    }

    const favorite = await Favorite.create({
      user_id: req.user.id,
      post_id: postId,
      folder_id: folderId || null,
      note,
      tags: JSON.stringify(uniqueTags),
    });

    res.json({ success: true, message: "收藏成功", data: favorite });
  } catch (error) {
    const message = error instanceof Error ? error.message : "收藏失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const favorite = await Favorite.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!favorite) {
      return res.status(404).json({ success: false, message: "收藏不存在" });
    }

    await favorite.destroy();
    res.json({ success: true, message: "取消收藏成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取消收藏失败";
    res.status(500).json({ success: false, message });
  }
};

export const getMyLikedPosts = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { page = 1, pageSize = 10, keyword, category } = req.query;

    const postWhere: any = {};
    if (category) postWhere.category = category;
    if (keyword) {
      postWhere[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const result = await PostLike.findAndCountAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Post,
          where: Object.keys(postWhere).length ? postWhere : undefined,
          required: Boolean(Object.keys(postWhere).length),
          include: [
            { model: User, attributes: ["id", "username", "nickname"] },
          ],
        },
      ],
      order: [[Sequelize.col("created_at"), "DESC"]],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    res.json({
      success: true,
      message: "获取点赞帖子成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const moveFavorites = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { favoriteIds, folderId } = req.body as {
      favoriteIds?: number[];
      folderId?: number | null;
    };

    if (!favoriteIds || favoriteIds.length === 0) {
      return res.status(400).json({ success: false, message: "请选择收藏项" });
    }

    await Favorite.update(
      { folder_id: folderId || null },
      { where: { id: favoriteIds, user_id: req.user.id } },
    );

    res.json({ success: true, message: "移动成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "移动失败";
    res.status(500).json({ success: false, message });
  }
};

export const exportFavorites = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const favorites = await Favorite.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Post,
          include: [{ model: User, attributes: ["username", "nickname"] }],
        },
        { model: FavoriteFolder, attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const header = [
      "id",
      "post_id",
      "title",
      "author",
      "folder",
      "note",
      "tags",
      "created_at",
    ];

    const rows = favorites.map((item) => {
      const raw = item.toJSON() as any;
      const post = raw.Post || {};
      const author = post.User?.nickname || post.User?.username || "";
      const folder = raw.FavoriteFolder?.name || "";
      return [
        raw.id,
        raw.post_id,
        post.title || "",
        author,
        folder,
        raw.note || "",
        raw.tags || "",
        raw.created_at || "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=favorites.csv");
    res.send(csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出失败";
    res.status(500).json({ success: false, message });
  }
};

export const getFavoriteStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const postId = Number(req.params.postId);
    const favorite = await Favorite.findOne({
      where: { user_id: req.user.id, post_id: postId },
    });

    res.json({
      success: true,
      message: "获取成功",
      data: { favorited: Boolean(favorite), favoriteId: favorite?.id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getPointsSummary = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    const startOfDay = getStartOfDay();
    const startOfWeek = new Date();
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [today, week, month] = await Promise.all([
      PointsLog.sum("change", {
        where: {
          user_id: user.id,
          [Op.and]: [Sequelize.where(Sequelize.col("created_at"), { [Op.gte]: startOfDay })],
        },
      }),
      PointsLog.sum("change", {
        where: {
          user_id: user.id,
          [Op.and]: [Sequelize.where(Sequelize.col("created_at"), { [Op.gte]: startOfWeek })],
        },
      }),
      PointsLog.sum("change", {
        where: {
          user_id: user.id,
          [Op.and]: [Sequelize.where(Sequelize.col("created_at"), { [Op.gte]: startOfMonth })],
        },
      }),
    ]);

    res.json({
      success: true,
      message: "获取成功",
      data: {
        total: user.points,
        today: Number(today || 0),
        week: Number(week || 0),
        month: Number(month || 0),
        level: calculateLevel(user.points),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCommunityProfileSummary = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "username", "nickname", "avatar", "points", "status"],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    const higherCount = await User.count({
      where: { status: 1, points: { [Op.gt]: user.points } },
    });

    // 添加今日统计数据查询
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 查询用户今天发布的帖子和评论
    const [userTodayPosts, userTodayComments] = await Promise.all([
      Post.findAll({
        where: {
          user_id: req.user.id,
          created_at: { [Op.gte]: today, [Op.lt]: tomorrow }
        },
        attributes: ['id']
      }),
      Comment.findAll({
        where: {
          user_id: req.user.id,
          created_at: { [Op.gte]: today, [Op.lt]: tomorrow }
        },
        attributes: ['id']
      })
    ]);
    
    const userTodayPostIds = userTodayPosts.map((post: any) => post.id);
    const userTodayCommentIds = userTodayComments.map((comment: any) => comment.id);
    
    // 查询这些帖子和评论今天获得的点赞数
    const [todayPostLikes, todayCommentLikes] = await Promise.all([
      userTodayPostIds.length > 0 
        ? Post.sum('like_count', {
            where: {
              id: { [Op.in]: userTodayPostIds }
            }
          })
        : 0,
      userTodayCommentIds.length > 0
        ? Comment.sum('like_count', {
            where: {
              id: { [Op.in]: userTodayCommentIds }
            }
          })
        : 0
    ]);

    const totalTodayLikes = (todayPostLikes || 0) + (todayCommentLikes || 0);
    const todayPosts = userTodayPosts.length;
    const todayComments = userTodayComments.length;

    res.json({
      success: true,
      message: "获取成功",
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        points: user.points,
        level: calculateLevel(user.points),
        rank: higherCount + 1,
        // 新增字段
        todayPosts: todayPosts || 0,
        todayComments: todayComments || 0,
        todayLikes: totalTodayLikes
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getPointsLogs = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { page = 1, pageSize = 10 } = req.query;
    const result = await PointsLog.findAndCountAll({
      where: { user_id: req.user.id },
      order: [[Sequelize.col("created_at"), "DESC"]],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    res.json({
      success: true,
      message: "获取成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getUserTodayStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查询用户今天发布的帖子和评论
    const [userTodayPosts, userTodayComments] = await Promise.all([
      Post.findAll({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        attributes: ['id']
      }),
      Comment.findAll({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        attributes: ['id']
      })
    ]);

    const userTodayPostIds = userTodayPosts.map((post: any) => post.id);
    const userTodayCommentIds = userTodayComments.map((comment: any) => comment.id);

    // 查询这些帖子和评论今天获得的点赞数（保持原有逻辑用于其他用途）
    const [todayPostLikes, todayCommentLikes] = await Promise.all([
      userTodayPostIds.length > 0 
        ? Post.sum('like_count', {
            where: {
              id: { [Op.in]: userTodayPostIds }
            }
          })
        : 0,
      userTodayCommentIds.length > 0
        ? Comment.sum('like_count', {
            where: {
              id: { [Op.in]: userTodayCommentIds }
            }
          })
        : 0
    ]);

    const totalTodayReceivedLikes = todayPostLikes + todayCommentLikes;

    // 新增：统计用户今天点过的赞数（包括帖子点赞和评论点赞）
    const [todayPostGivenLikes, todayCommentGivenLikes] = await Promise.all([
      PostLike.count({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      }),
      CommentLike.count({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      })
    ]);

    const totalTodayGivenLikes = todayPostGivenLikes + todayCommentGivenLikes;

    // 获取今日发帖数和评论数
    const todayPosts = userTodayPosts.length;
    const todayComments = userTodayComments.length;

    // 获取今日浏览量
    console.log(`获取用户 ${userId} 的今日浏览量`);
    const todayViews = await getUserTodayViews(userId);
    console.log(`用户 ${userId} 今日浏览量: ${todayViews}`);

    res.json({
      success: true,
      message: "获取成功",
      data: {
        todayPosts,
        todayComments,
        todayLikes: totalTodayGivenLikes, // 改为统计点过的赞数
        todayViews,
        // 保留原始数据供其他用途使用
        receivedLikes: totalTodayReceivedLikes,
        givenPostLikes: todayPostGivenLikes,
        givenCommentLikes: todayCommentGivenLikes
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

// ========================================
// 草稿相关接口
// ========================================

/**
 * 获取用户的草稿列表
 */
export const getCommunityDrafts = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { page = 1, pageSize = 20 } = req.query;
    const userId = req.user.id;

    const where: any = {
      user_id: userId,
      publish_status: 0, // 草稿状态
    };

    const total = await Post.count({ where });

    const drafts = await Post.findAll({
      where,
      attributes: ['id', 'title', 'content', 'category', 'tags', 'images', 'created_at', 'updated_at'],
      order: [['updated_at', 'DESC']],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
      raw: true,
    });

    // 处理 tags 和 images
    const processedDrafts = drafts.map((draft: any) => ({
      ...draft,
      tags: parseTags(draft.tags),
      images: parseImages(draft.images),
    }));

    res.json({
      success: true,
      message: "获取草稿列表成功",
      data: processedDrafts,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取草稿列表失败";
    res.status(500).json({ success: false, message });
  }
};

/**
 * 获取单个草稿详情
 */
export const getCommunityDraftDetail = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);

    const draft = await Post.findOne({
      where: {
        id,
        user_id: req.user.id,
        publish_status: 0, // 必须是草稿状态
      },
      attributes: ['id', 'title', 'content', 'category', 'tags', 'images', 'created_at', 'updated_at'],
      raw: true,
    });

    if (!draft) {
      return res.status(404).json({ success: false, message: "草稿不存在" });
    }

    const processedDraft = {
      ...draft,
      tags: parseTags(draft.tags),
      images: parseImages(draft.images),
    };

    res.json({
      success: true,
      message: "获取草稿详情成功",
      data: processedDraft,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取草稿详情失败";
    res.status(500).json({ success: false, message });
  }
};

/**
 * 删除草稿
 */
export const deleteCommunityDraft = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);

    const draft = await Post.findOne({
      where: {
        id,
        user_id: req.user.id,
        publish_status: 0, // 只能删除草稿
      },
    });

    if (!draft) {
      return res.status(404).json({ success: false, message: "草稿不存在" });
    }

    // 软删除
    await draft.update({
      publish_status: 2,
      deleted_at: new Date(),
    });

    res.json({ success: true, message: "草稿已删除" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除草稿失败";
    res.status(500).json({ success: false, message });
  }
};

export const getPointsOverviewPlus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const userId = req.user.id;

    const [user, loginStreak, studyDuration, contentQuality, trendData] = await Promise.all([
      User.findByPk(userId),
      getLoginStreak(userId),
      getStudyDuration(userId),
      getContentQualityScore(userId),
      getMultiDimTrendData(userId, 7),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    const startOfDay = getStartOfDay();
    const todayPoints = await PointsLog.sum("change", {
      where: {
        user_id: userId,
        [Op.and]: [Sequelize.where(Sequelize.col("created_at"), { [Op.gte]: startOfDay })],
      },
    });

    const totalLikes = contentQuality.totalLikes || 0;
    const totalPosts = await Post.count({
      where: {
        user_id: userId,
        status: 1,
        publish_status: 1,
      },
    });

    const totalViewsResult = await Post.sum('view_count', {
      where: {
        user_id: userId,
        status: 1,
        publish_status: 1,
      },
    });
    const totalViews = Number(totalViewsResult || 0);

    let qualityScore = 0;
    if (totalPosts > 0 && totalViews > 0) {
      const likeViewRatio = totalLikes / Math.max(totalViews, 1);
      qualityScore = Math.round(likeViewRatio * 1000);
    } else if (totalPosts > 0) {
      qualityScore = totalLikes * 10;
    }

    res.json({
      success: true,
      message: "获取成功",
      data: {
        totalPoints: user.points || 0,
        todayPoints: Number(todayPoints || 0),
        level: calculateLevel(user.points || 0),
        streakDays: loginStreak,
        studyDuration: studyDuration.total,
        todayStudyDuration: studyDuration.today,
        qualityScore: qualityScore,
        trendData,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getPointsActions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const actions = [
      {
        id: "create_post",
        title: "发布帖子",
        description: "发布一篇新帖子",
        points: 10,
        sourceType: "post",
        dailyCap: 50,
        icon: "edit",
        route: "/community/post/create",
        buttonText: "去发帖",
      },
      {
        id: "create_comment",
        title: "发表评论",
        description: "对他人的帖子发表评论",
        points: 1,
        sourceType: "comment",
        dailyCap: 10,
        icon: "message",
        route: "/community",
        buttonText: "去互动",
      },
      {
        id: "give_like",
        title: "点赞互动",
        description: "对喜欢的帖子或评论点赞",
        points: 0,
        note: "被点赞者获得积分",
        sourceType: "like",
        dailyCap: 20,
        icon: "like",
        route: "/community",
        buttonText: "去逛逛",
      },
      {
        id: "daily_visit",
        title: "每日签到",
        description: "每日首次访问社区",
        points: 1,
        sourceType: "system",
        dailyCap: 1,
        icon: "calendar",
        route: "/community",
        buttonText: "去签到",
      },
      {
        id: "study_duration",
        title: "学习时长",
        description: "使用自习室学习",
        points: 0,
        note: "学习时长单独统计",
        sourceType: "study",
        dailyCap: 0,
        icon: "clock-circle",
        route: "/study-room",
        buttonText: "去学习",
      },
      {
        id: "task_complete",
        title: "完成任务",
        description: "完成系统任务",
        points: 5,
        sourceType: "task",
        dailyCap: 50,
        icon: "check-circle",
        route: "/community",
        buttonText: "查看任务",
      },
    ];

    const streakRewards = [
      { days: 3, points: 3, description: "连续签到3天" },
      { days: 7, points: 10, description: "连续签到7天" },
      { days: 30, points: 50, description: "连续签到30天" },
    ];

    const qualityRewards = [
      { condition: "帖子获赞≥50", points: 30, description: "优质内容奖励" },
    ];

    res.json({
      success: true,
      message: "获取成功",
      data: {
        actions,
        streakRewards,
        qualityRewards,
        todayEarned: {},
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};
