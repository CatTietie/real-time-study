import cron from "node-cron";
import { Op, fn, col, literal } from "sequelize";
import { sequelize } from "../config/sequelize";
import User from "../models/user.model";
import Post from "../models/post.model";
import ViewRecord from "../models/view-record.model";
import PostLike from "../models/post-like.model";
import Comment from "../models/comment.model";
import StudyRoom from "../models/study-room.model";
import RoomReservation from "../models/room-reservation.model";
import RoomOccupancy from "../models/room-occupancy.model";
import UserRecommendation from "../models/user-recommendation.model";
import { log } from "../utils/logger";

interface InterestMap {
  [key: string]: number;
}

const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const ONE_DAY_AGO = () => new Date(Date.now() - 24 * 60 * 60 * 1000);
const MAX_RECOMMENDATIONS = 20;
const MAX_POST_RECOMMENDATIONS = 15;
const MAX_ROOM_RECOMMENDATIONS = 5;

// 时间衰减因子：帖子每过1天热度衰减 5%
function timeDecayFactor(createdAt: Date): number {
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.95, daysSinceCreation);
}

async function collectUserInterests(userId: number): Promise<{ categories: InterestMap; tags: InterestMap }> {
  const sevenDaysAgo = SEVEN_DAYS_AGO();
  const categories: InterestMap = {};
  const tags: InterestMap = {};

  const addInterest = (category: string | null, postTags: string | null, weight: number) => {
    if (category) {
      categories[category] = (categories[category] || 0) + weight;
    }
    if (postTags) {
      try {
        const parsed = JSON.parse(postTags);
        if (Array.isArray(parsed)) {
          for (const tag of parsed) {
            if (typeof tag === "string" && tag.trim()) {
              tags[tag.trim()] = (tags[tag.trim()] || 0) + weight;
            }
          }
        }
      } catch {}
    }
  };

  // 浏览记录 (权重 1)
  const viewedPosts = await ViewRecord.findAll({
    where: { user_id: userId, created_at: { [Op.gte]: sevenDaysAgo } },
    include: [{ model: Post, as: "Post", attributes: ["category", "tags"] }],
    attributes: ["post_id"],
    raw: false,
  });
  for (const record of viewedPosts) {
    const post = (record as any).Post;
    if (post) addInterest(post.category, post.tags, 1);
  }

  // 点赞记录 (权重 3)
  const likedPosts = await PostLike.findAll({
    where: { user_id: userId, created_at: { [Op.gte]: sevenDaysAgo } },
    include: [{ model: Post, attributes: ["category", "tags"] }],
    attributes: ["post_id"],
    raw: false,
  });
  for (const record of likedPosts) {
    const post = (record as any).Post;
    if (post) addInterest(post.category, post.tags, 3);
  }

  // 评论记录 (权重 2)
  const commentedPosts = await Comment.findAll({
    where: { user_id: userId, created_at: { [Op.gte]: sevenDaysAgo }, is_deleted: 0 },
    include: [{ model: Post, attributes: ["category", "tags"] }],
    attributes: ["post_id"],
    raw: false,
  });
  for (const record of commentedPosts) {
    const post = (record as any).Post;
    if (post) addInterest(post.category, post.tags, 2);
  }

  return { categories, tags };
}

function computePostScore(
  post: any,
  categories: InterestMap,
  tags: InterestMap,
  maxCategoryWeight: number,
  maxTagWeight: number
): number {
  let interestScore = 0;

  // 分类匹配得分 (归一化到 0~50)
  if (post.category && categories[post.category]) {
    interestScore += (categories[post.category] / maxCategoryWeight) * 50;
  }

  // 标签匹配得分 (归一化到 0~30，取匹配标签的平均)
  if (post.tags) {
    try {
      const postTags = JSON.parse(post.tags);
      if (Array.isArray(postTags) && postTags.length > 0) {
        let tagScore = 0;
        let matchCount = 0;
        for (const tag of postTags) {
          if (tags[tag]) {
            tagScore += tags[tag] / maxTagWeight;
            matchCount++;
          }
        }
        if (matchCount > 0) {
          interestScore += (tagScore / matchCount) * 30;
        }
      }
    } catch {}
  }

  // 热度分 (带时间衰减，归一化到 0~20)
  const rawHotness = (post.like_count || 0) * 3 + (post.comment_count || 0) * 2 + (post.view_count || 0);
  const decay = timeDecayFactor(new Date(post.created_at));
  const decayedHotness = rawHotness * decay;
  // 用 chat.log 压缩大值，避免极热帖子压倒一切
  const hotnessScore = Math.min(20, Math.log1p(decayedHotness) * 2);

  return interestScore + hotnessScore;
}

async function generatePostRecommendations(userId: number, categories: InterestMap, tags: InterestMap) {
  const sevenDaysAgo = SEVEN_DAYS_AGO();

  // 用户近7天已浏览的帖子ID
  const viewedPostIds = await ViewRecord.findAll({
    where: { user_id: userId, created_at: { [Op.gte]: sevenDaysAgo } },
    attributes: ["post_id"],
    raw: true,
  });
  const viewedSet = new Set(viewedPostIds.map((r: any) => r.post_id));

  const maxCategoryWeight = Math.max(1, ...Object.values(categories));
  const maxTagWeight = Math.max(1, ...Object.values(tags));

  // 候选帖子：已发布、非自己、近30天内发布的
  const candidates = await Post.findAll({
    where: {
      status: 1,
      publish_status: 1,
      user_id: { [Op.ne]: userId },
      created_at: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    attributes: ["id", "category", "tags", "like_count", "comment_count", "view_count", "created_at"],
    raw: true,
    limit: 200,
    order: [["created_at", "DESC"]],
  });

  const scored = candidates
    .filter((p: any) => !viewedSet.has(p.id))
    .map((post: any) => ({
      target_id: post.id,
      target_type: "post" as const,
      score: computePostScore(post, categories, tags, maxCategoryWeight, maxTagWeight),
      reason: generatePostReason(post, categories, tags),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_POST_RECOMMENDATIONS);

  return scored;
}

function generatePostReason(post: any, categories: InterestMap, tags: InterestMap): string {
  if (post.category && categories[post.category]) {
    return `基于你对「${post.category}」类别的兴趣`;
  }
  if (post.tags) {
    try {
      const postTags = JSON.parse(post.tags);
      if (Array.isArray(postTags)) {
        for (const tag of postTags) {
          if (tags[tag]) return `基于你关注的「${tag}」话题`;
        }
      }
    } catch {}
  }
  return "社区热门内容推荐";
}

async function generateRoomRecommendations(userId: number) {
  // 统计用户历史预约/入座频率
  const reservations = await RoomReservation.findAll({
    where: { user_id: userId, status: { [Op.in]: ["confirmed", "in_progress", "ended"] } },
    attributes: ["room_id", [fn("COUNT", col("id")), "visit_count"]],
    group: ["room_id"],
    raw: true,
    order: [[literal("visit_count"), "DESC"]],
    limit: 10,
  });

  // 当天已有预约的自习室 — 排除
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayReservations = await RoomReservation.findAll({
    where: {
      user_id: userId,
      status: { [Op.in]: ["confirmed", "in_progress"] },
      start_time: { [Op.lte]: todayEnd },
      end_time: { [Op.gte]: todayStart },
    },
    attributes: ["room_id"],
    raw: true,
  });
  const todayRoomIds = new Set(todayReservations.map((r: any) => r.room_id));

  // 只推荐当前可用的自习室
  const activeRoomIds = await StudyRoom.findAll({
    where: { status: "active" },
    attributes: ["id"],
    raw: true,
  });
  const activeSet = new Set(activeRoomIds.map((r: any) => r.id));

  const results = reservations
    .filter((r: any) => activeSet.has(r.room_id) && !todayRoomIds.has(r.room_id))
    .slice(0, MAX_ROOM_RECOMMENDATIONS)
    .map((r: any, idx: number) => ({
      target_id: r.room_id,
      target_type: "study_room" as const,
      score: 100 - idx * 10,
      reason: "你常去的自习室",
    }));

  return results;
}

async function computeRecommendationsForUser(userId: number) {
  const { categories, tags } = await collectUserInterests(userId);

  // 如果用户没有任何行为数据，跳过
  const totalInterest = Object.values(categories).reduce((a, b) => a + b, 0)
    + Object.values(tags).reduce((a, b) => a + b, 0);

  let postRecs: any[] = [];
  if (totalInterest > 0) {
    postRecs = await generatePostRecommendations(userId, categories, tags);
  } else {
    // 冷启动：推荐近期热帖
    const hotPosts = await Post.findAll({
      where: { status: 1, publish_status: 1, user_id: { [Op.ne]: userId } },
      attributes: ["id", "created_at", "like_count", "comment_count", "view_count"],
      order: [[literal("like_count * 3 + comment_count * 2 + view_count"), "DESC"]],
      limit: 10,
      raw: true,
    });
    postRecs = hotPosts.map((p: any, idx: number) => ({
      target_id: p.id,
      target_type: "post" as const,
      score: 50 - idx * 3,
      reason: "社区热门内容推荐",
    }));
  }

  const roomRecs = await generateRoomRecommendations(userId);
  const allRecs = [...postRecs, ...roomRecs].slice(0, MAX_RECOMMENDATIONS);

  return allRecs;
}

export async function runRecommendationEngine() {
  log("info", "推荐引擎开始执行...");
  const startTime = Date.now();

  try {
    // 获取所有活跃学生用户
    const users = await User.findAll({
      where: { role: "student", status: 1 },
      attributes: ["id"],
      raw: true,
    });

    let processedCount = 0;
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    for (const user of users) {
      try {
        // 清除旧的 active 推荐
        await UserRecommendation.destroy({
          where: {
            user_id: user.id,
            status: "active",
            created_at: { [Op.lt]: ONE_DAY_AGO() },
          },
        });

        const recommendations = await computeRecommendationsForUser(user.id);

        if (recommendations.length > 0) {
          // 使用 upsert 避免唯一索引冲突
          for (const rec of recommendations) {
            await UserRecommendation.upsert({
              user_id: user.id,
              target_type: rec.target_type,
              target_id: rec.target_id,
              score: rec.score,
              reason: rec.reason,
              status: "active",
              expired_at: expiredAt,
            });
          }
        }

        processedCount++;
      } catch (err) {
        log("error", `推荐引擎处理用户 ${user.id} 失败: ${err}`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log("info", `推荐引擎执行完成，处理 ${processedCount}/${users.length} 个用户，耗时 ${elapsed}s`);
  } catch (error) {
    log("error", `推荐引擎执行失败: ${error}`);
  }
}

export function initRecommendationCron() {
  // 每天凌晨 2:00 执行
  cron.schedule("0 2 * * *", () => {
    runRecommendationEngine();
  });
  log("info", "推荐引擎定时任务已启动 (每天 02:00)");
}
