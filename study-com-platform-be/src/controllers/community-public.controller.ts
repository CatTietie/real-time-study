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

export const getCommunityPosts = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, category, keyword, order, userId } = req.query;

    const where: any = {
      status: 1,
      publish_status: 1,
    };

    // 如果提供了userId参数，则只返回该用户的帖子
    if (userId) {
      where.user_id = Number(userId);
    }

    if (category) {
      where.category = category;
    }

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const orderBy: any =
      order === "hot"
        ? [
            [Sequelize.col("like_count"), "DESC"],
            [Sequelize.col("comment_count"), "DESC"],
            [Sequelize.col("created_at"), "DESC"],
          ]
        : [[Sequelize.col("created_at"), "DESC"]];

    const result = await Post.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname"],
        },
      ],
      order: orderBy,
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

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
    if (keyword.length < 1) {
      return res.json({ success: true, message: "获取成功", data: [] });
    }

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

    const { title, content, category, tags, isDraft } = req.body as {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[] | string;
      isDraft?: string | boolean;
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
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const imageUrls = files.map(
      (file) => `${baseUrl}/uploads/posts/${file.filename}`,
    );

    const isDraftFlag =
      typeof isDraft === "string" ? isDraft === "true" : Boolean(isDraft);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    const isNewUser = user.createdAt >= todayStart;
    const textToCheck = [title, content, category, uniqueTags.join(" ")]
      .filter(Boolean)
      .join(" ");
    const { hit, matches } = await checkSensitiveWords(textToCheck);

    const status = isDraftFlag ? 0 : hit || isNewUser ? 0 : 1;
    const auditReason = hit
      ? `包含敏感词：${matches.slice(0, 10).join("、")}`
      : undefined;

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

    const where: any = { post_id: postId };
    if (viewerId) {
      where[Op.or] = [{ status: 1 }, { status: 0, user_id: viewerId }];
    } else {
      where.status = 1;
    }

    const result = await Comment.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname"],
        },
      ],
      order: orderBy,
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

    const isNewUser = user.createdAt >= getStartOfDay();
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
    const { page = 1, pageSize = 10 } = req.query;

    const result = await Comment.findAndCountAll({
      where: { status: 1 },
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname"],
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

export const getCommunityLeaderboard = async (req: Request, res: Response) => {
  try {
    const type = String((req.query as any)?.type || "total");

    if (type === "post_hot") {
      // 热门内容榜 - 返回帖子相关信息，按热度排序
      const posts = await Post.findAll({
        where: { status: 1, publish_status: 1 },
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
        limit: 50,
      });

      const data = posts.map((post: any) => {
        const postData = post.toJSON();
        return {
          id: postData.id,
          title: postData.title,
          view_count: postData.view_count,
          like_count: postData.like_count,
          comment_count: postData.comment_count,
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
      });
    }

    if (type === "comment_count") {
      // 评论之星榜 - 按评论数量统计
      const rows = await Comment.findAll({
        attributes: [
          "user_id",
          [Sequelize.fn("COUNT", Sequelize.col("Comment.id")), "comment_count"],
        ],
        where: { status: 1 },
        group: ["user_id"],
        include: [{
          model: User,
          attributes: ["id", "nickname", "username", "avatar", "points"]
        }],
        order: [[Sequelize.literal("comment_count"), "DESC"]],
        limit: 50,
      });

      const data = rows.map((row: any) => {
        const rawData = row.toJSON();
        return {
          id: rawData.user_id,
          nickname: rawData.User?.nickname,
          username: rawData.User?.username,
          avatar: rawData.User?.avatar,
          level: calculateLevel(Number(rawData.User?.points || 0)),
          comment_count: Number(rawData.comment_count || 0),
        };
      });

      return res.json({ success: true, message: "获取排行榜成功", data });
    }

    // 默认是 total - 社区达人榜（按总积分排行）
    const users = await User.findAll({
      where: { status: 1 },
      attributes: ["id", "username", "nickname", "avatar", "points"],
      order: [["points", "DESC"]],
      limit: 100,
    });

    res.json({
      success: true,
      message: "获取排行榜成功",
      data: users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        username: user.username,
        avatar: user.avatar,
        points: user.points,
        level: calculateLevel(user.points),
      })),
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

    const { page = 1, pageSize = 10, folderId, keyword, category } = req.query;
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
      order: [[Sequelize.col("created_at"), "DESC"]],
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
        where: { user_id: user.id, createdAt: { [Op.gte]: startOfDay } },
      }),
      PointsLog.sum("change", {
        where: { user_id: user.id, createdAt: { [Op.gte]: startOfWeek } },
      }),
      PointsLog.sum("change", {
        where: { user_id: user.id, createdAt: { [Op.gte]: startOfMonth } },
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
      order: [["createdAt", "DESC"]],
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
