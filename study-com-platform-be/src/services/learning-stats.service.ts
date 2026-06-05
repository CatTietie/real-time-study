import { Op, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import User from "../models/user.model";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import PostLike from "../models/post-like.model";
import CommentLike from "../models/comment-like.model";
import PointsLog from "../models/points-log.model";
import RoomReservation from "../models/room-reservation.model";
import StudyRoom from "../models/study-room.model";

export interface LearningStatsCardData {
  studyDuration: {
    today: number;
    total: number;
    dailyRecords: Array<{ date: string; duration: number }>;
  };
  loginStreak: {
    current: number;
    isActive: boolean;
    streakHistory: Array<{ date: string; loggedIn: boolean }>;
  };
  contentQuality: {
    score: number;
    totalLikes: number;
    totalComments: number;
    hotPostsCount: number;
    qualityBreakdown: Array<{ category: string; score: number; count: number }>;
  };
  postsStats: {
    today: number;
    total: number;
    hotPosts: number;
  };
  taskCompletion: {
    rate: number;
    completedTasks: number;
    totalTasks: number;
  };
  communityPoints: {
    total: number;
    rank: number;
  };
}

export interface DailyStudyRecord {
  date: string;
  posts: number;
  comments: number;
  likesReceived: number;
  studyDuration: number;
}

const getStartOfDay = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
};

const getStartOfNDaysAgo = (days: number) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
};

const safeGetDate = (obj: any): Date | null => {
  const rawValue =
    (obj as { createdAt?: Date | string }).createdAt ??
    (obj as { created_at?: Date | string }).created_at ??
    (obj as unknown as { get?: (key: string) => unknown }).get?.("createdAt");
  
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
  const date = rawValue instanceof Date ? rawValue : new Date(rawValue as string);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const safeGetDateString = (obj: any): string | null => {
  const date = safeGetDate(obj);
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

export const getLoginStreak = async (userId: number): Promise<{ current: number; isActive: boolean; history: Array<{ date: string; loggedIn: boolean }> }> => {
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
          (log as unknown as { get?: (key: string) => unknown }).get?.("createdAt");
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
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      })
      .filter((value): value is string => Boolean(value)),
  );

  const today = new Date();
  let currentStreak = 0;
  let isActive = false;
  
  const history: Array<{ date: string; loggedIn: boolean }> = [];
  
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const loggedIn = daySet.has(key);
    history.push({ date: key, loggedIn });
  }

  for (let i = 0; i < 31; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (!daySet.has(key)) {
      if (i === 0) {
        isActive = false;
      }
      break;
    }
    if (i === 0) {
      isActive = true;
    }
    currentStreak += 1;
  }

  return {
    current: currentStreak,
    isActive,
    history,
  };
};

export const getStudyDuration = async (userId: number): Promise<{ today: number; total: number; dailyRecords: Array<{ date: string; duration: number }> }> => {
  const todayStart = getStartOfDay();
  const thirtyDaysAgo = getStartOfNDaysAgo(30);

  const user = await User.findByPk(userId);
  const totalDurationFromUser = user?.study_duration || 0;

  const endedReservations = await RoomReservation.findAll({
    where: {
      user_id: userId,
      status: 'ended',
      end_time: {
        [Op.gte]: thirtyDaysAgo
      }
    },
    include: [{
      model: StudyRoom,
      attributes: ['id', 'name']
    }],
    order: [['start_time', 'ASC']]
  });

  let todayDuration = 0;
  let totalDuration = totalDurationFromUser;
  const dailyMap = new Map<string, number>();

  endedReservations.forEach((res: any) => {
    const startTime = new Date(res.start_time);
    const endTime = new Date(res.end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    if (duration > 0) {
      const dateKey = startTime.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + duration);

      if (startTime >= todayStart) {
        todayDuration += duration;
      }
    }
  });

  const dailyRecords: Array<{ date: string; duration: number }> = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    dailyRecords.push({
      date: dateKey,
      duration: dailyMap.get(dateKey) || 0
    });
  }

  return {
    today: todayDuration,
    total: totalDuration,
    dailyRecords,
  };
};

export const getContentQualityScore = async (userId: number): Promise<{
  score: number;
  totalLikes: number;
  totalComments: number;
  hotPostsCount: number;
  qualityBreakdown: Array<{ category: string; score: number; count: number }>;
}> => {
  const posts = await Post.findAll({
    where: {
      user_id: userId,
      status: 1,
      publish_status: 1
    },
    attributes: ['id', 'title', 'category', 'like_count', 'comment_count', 'view_count', 'created_at']
  });

  let totalLikes = 0;
  let totalComments = 0;
  let hotPostsCount = 0;
  const categoryMap = new Map<string, { likes: number; comments: number; count: number }>();

  posts.forEach((post) => {
    const likes = post.like_count || 0;
    const comments = post.comment_count || 0;
    const category = post.category || '未分类';

    totalLikes += likes;
    totalComments += comments;

    const heatScore = likes * 3 + comments * 2 + (post.view_count || 0) * 0.5;
    if (heatScore >= 100) {
      hotPostsCount += 1;
    }

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { likes: 0, comments: 0, count: 0 });
    }
    const catData = categoryMap.get(category)!;
    catData.likes += likes;
    catData.comments += comments;
    catData.count += 1;
  });

  const qualityBreakdown: Array<{ category: string; score: number; count: number }> = [];
  categoryMap.forEach((data, category) => {
    const score = data.likes * 3 + data.comments * 2;
    qualityBreakdown.push({
      category,
      score,
      count: data.count
    });
  });

  qualityBreakdown.sort((a, b) => b.score - a.score);

  const totalScore = totalLikes * 3 + totalComments * 2;

  return {
    score: totalScore,
    totalLikes,
    totalComments,
    hotPostsCount,
    qualityBreakdown,
  };
};

export const getPostsStats = async (userId: number): Promise<{ today: number; total: number; hotPosts: number }> => {
  const todayStart = getStartOfDay();

  const todayPosts = await Post.count({
    where: {
      user_id: userId,
      [Op.and]: [
        Sequelize.where(Sequelize.col("created_at"), {
          [Op.gte]: todayStart,
        }),
      ],
    },
  });

  const totalPosts = await Post.count({
    where: {
      user_id: userId,
      publish_status: { [Op.ne]: 2 }
    },
  });

  const hotPosts = await Post.count({
    where: {
      user_id: userId,
      status: 1,
      publish_status: 1,
      [Op.and]: [
        Sequelize.where(
          Sequelize.literal(`(like_count * 3 + comment_count * 2 + view_count * 0.5)`),
          { [Op.gte]: 100 }
        ),
      ],
    },
  });

  return {
    today: todayPosts,
    total: totalPosts,
    hotPosts,
  };
};

export const getCommunityPointsStats = async (userId: number): Promise<{ total: number; rank: number }> => {
  const user = await User.findByPk(userId);
  const totalPoints = user?.points || 0;

  const usersWithHigherPoints = await User.count({
    where: {
      status: 1,
      points: { [Op.gt]: totalPoints }
    }
  });

  const rank = usersWithHigherPoints + 1;

  return {
    total: totalPoints,
    rank,
  };
};

export const getDailyRecords = async (userId: number, days: number = 7): Promise<DailyStudyRecord[]> => {
  const startDate = getStartOfNDaysAgo(days - 1);
  const endDate = new Date();

  const posts = await Post.findAll({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });

  const comments = await Comment.findAll({
    where: {
      user_id: userId,
      is_deleted: 0,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });

  const reservations = await RoomReservation.findAll({
    where: {
      user_id: userId,
      status: 'ended',
      end_time: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    },
    attributes: ['start_time', 'end_time']
  });

  const dailyMap = new Map<string, { posts: number; comments: number; likes: number; duration: number }>();

  for (let i = 0; i < days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateKey = d.toISOString().split('T')[0];
    dailyMap.set(dateKey, { posts: 0, comments: 0, likes: 0, duration: 0 });
  }

  posts.forEach((post) => {
    const dateKey = safeGetDateString(post);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.posts += 1;
      record.likes += post.like_count || 0;
    }
  });

  comments.forEach((comment) => {
    const dateKey = safeGetDateString(comment);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.comments += 1;
    }
  });

  reservations.forEach((res: any) => {
    const startTime = new Date(res.start_time);
    const endTime = new Date(res.end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
    if (duration > 0) {
      const dateKey = startTime.toISOString().split('T')[0];
      const record = dailyMap.get(dateKey);
      if (record) {
        record.duration += duration;
      }
    }
  });

  const records: DailyStudyRecord[] = [];
  dailyMap.forEach((data, date) => {
    records.push({
      date,
      posts: data.posts,
      comments: data.comments,
      likesReceived: data.likes,
      studyDuration: data.duration
    });
  });

  records.sort((a, b) => a.date.localeCompare(b.date));

  return records;
};

export interface MultiDimTrendData {
  date: string;
  posts: number;
  views: number;
  points: number;
  duration: number;
}

export interface ComparisonData {
  currentWeek: MultiDimTrendData[];
  previousWeek: MultiDimTrendData[];
}

export interface HeatmapData {
  date: string;
  level: number;
  count: number;
  details: {
    posts: number;
    comments: number;
    likes: number;
    duration: number;
  };
}

export interface ActionTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'post' | 'learn' | 'points' | 'streak' | 'badge';
  current: number;
  target: number;
  progress: number;
  reward: string;
  actionText: string;
  actionType: 'create_post' | 'start_learning' | 'earn_points' | 'check_in';
  isCompleted: boolean;
  priority: number;
}

export interface RankingSnapshot {
  currentRank: number;
  totalUsers: number;
  nextRankScore: number;
  gapToNext: number;
  leadToPrev: number;
  myPoints: number;
  rankPercent: number;
  trends: {
    day: string;
    rank: number;
  }[];
}

export interface ActionRecommendations {
  tasks: ActionTask[];
  ranking: RankingSnapshot;
}

export const getMultiDimTrendData = async (
  userId: number,
  days: number = 14
): Promise<MultiDimTrendData[]> => {
  const startDate = getStartOfNDaysAgo(days - 1);
  const endDate = new Date();

  const posts = await Post.findAll({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });

  const comments = await Comment.findAll({
    where: {
      user_id: userId,
      is_deleted: 0,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });

  const pointsLogs = await PointsLog.findAll({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });

  const reservations = await RoomReservation.findAll({
    where: {
      user_id: userId,
      status: 'ended',
      end_time: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    },
    attributes: ['start_time', 'end_time']
  });

  const dailyMap = new Map<string, {
    posts: number;
    views: number;
    points: number;
    duration: number;
  }>();

  for (let i = 0; i < days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateKey = d.toISOString().split('T')[0];
    dailyMap.set(dateKey, { posts: 0, views: 0, points: 0, duration: 0 });
  }

  posts.forEach((post) => {
    const dateKey = safeGetDateString(post);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.posts += 1;
      record.views += post.view_count || 0;
    }
  });

  comments.forEach(() => {});

  pointsLogs.forEach((log: any) => {
    const dateKey = safeGetDateString(log);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.points += log.change || 0;
    }
  });

  reservations.forEach((res: any) => {
    const startTime = new Date(res.start_time);
    const endTime = new Date(res.end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
    if (duration > 0) {
      const dateKey = startTime.toISOString().split('T')[0];
      const record = dailyMap.get(dateKey);
      if (record) {
        record.duration += duration;
      }
    }
  });

  const records: MultiDimTrendData[] = [];
  dailyMap.forEach((data, date) => {
    records.push({
      date,
      posts: data.posts,
      views: data.views,
      points: data.points,
      duration: data.duration
    });
  });

  records.sort((a, b) => a.date.localeCompare(b.date));

  return records;
};

export const getComparisonData = async (
  userId: number
): Promise<ComparisonData> => {
  const currentWeekData = await getMultiDimTrendData(userId, 7);
  
  const previousWeekStart = getStartOfNDaysAgo(14);
  const previousWeekEnd = getStartOfNDaysAgo(7);
  
  const posts = await Post.findAll({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: previousWeekStart,
        [Op.lt]: previousWeekEnd
      }
    }
  });

  const pointsLogs = await PointsLog.findAll({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: previousWeekStart,
        [Op.lt]: previousWeekEnd
      }
    }
  });

  const reservations = await RoomReservation.findAll({
    where: {
      user_id: userId,
      status: 'ended',
      end_time: {
        [Op.gte]: previousWeekStart,
        [Op.lt]: previousWeekEnd
      }
    },
    attributes: ['start_time', 'end_time']
  });

  const dailyMap = new Map<string, {
    posts: number;
    views: number;
    points: number;
    duration: number;
  }>();

  for (let i = 7; i < 14; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    dailyMap.set(dateKey, { posts: 0, views: 0, points: 0, duration: 0 });
  }

  posts.forEach((post) => {
    const dateKey = safeGetDateString(post);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.posts += 1;
      record.views += post.view_count || 0;
    }
  });

  pointsLogs.forEach((log: any) => {
    const dateKey = safeGetDateString(log);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.points += log.change || 0;
    }
  });

  reservations.forEach((res: any) => {
    const startTime = new Date(res.start_time);
    const endTime = new Date(res.end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
    if (duration > 0) {
      const dateKey = startTime.toISOString().split('T')[0];
      const record = dailyMap.get(dateKey);
      if (record) {
        record.duration += duration;
      }
    }
  });

  const previousWeekData: MultiDimTrendData[] = [];
  dailyMap.forEach((data, date) => {
    previousWeekData.push({
      date,
      posts: data.posts,
      views: data.views,
      points: data.points,
      duration: data.duration
    });
  });

  previousWeekData.sort((a, b) => a.date.localeCompare(b.date));

  return {
    currentWeek: currentWeekData,
    previousWeek: previousWeekData
  };
};

export const getHeatmapData = async (
  userId: number,
  weeks: number = 12
): Promise<HeatmapData[]> => {
  const days = weeks * 7;
  const startDate = getStartOfNDaysAgo(days - 1);
  const endDate = new Date();

  const posts = await Post.findAll({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });

  const comments = await Comment.findAll({
    where: {
      user_id: userId,
      is_deleted: 0,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });

  const reservations = await RoomReservation.findAll({
    where: {
      user_id: userId,
      status: 'ended',
      end_time: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    },
    attributes: ['start_time', 'end_time']
  });

  const dailyMap = new Map<string, {
    posts: number;
    comments: number;
    likes: number;
    duration: number;
  }>();

  for (let i = 0; i < days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateKey = d.toISOString().split('T')[0];
    dailyMap.set(dateKey, { posts: 0, comments: 0, likes: 0, duration: 0 });
  }

  posts.forEach((post) => {
    const dateKey = safeGetDateString(post);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.posts += 1;
      record.likes += post.like_count || 0;
    }
  });

  comments.forEach((comment) => {
    const dateKey = safeGetDateString(comment);
    if (!dateKey) return;
    const record = dailyMap.get(dateKey);
    if (record) {
      record.comments += 1;
    }
  });

  reservations.forEach((res: any) => {
    const startTime = new Date(res.start_time);
    const endTime = new Date(res.end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
    if (duration > 0) {
      const dateKey = startTime.toISOString().split('T')[0];
      const record = dailyMap.get(dateKey);
      if (record) {
        record.duration += duration;
      }
    }
  });

  const heatmapData: HeatmapData[] = [];
  dailyMap.forEach((data, date) => {
    const totalActivity = data.posts * 3 + data.comments * 2 + data.duration / 30;
    
    let level = 0;
    if (totalActivity >= 15) level = 4;
    else if (totalActivity >= 8) level = 3;
    else if (totalActivity >= 3) level = 2;
    else if (totalActivity >= 1) level = 1;

    heatmapData.push({
      date,
      level,
      count: Math.round(totalActivity),
      details: {
        posts: data.posts,
        comments: data.comments,
        likes: data.likes,
        duration: data.duration
      }
    });
  });

  heatmapData.sort((a, b) => a.date.localeCompare(b.date));

  return heatmapData;
};

export const getAllLearningStats = async (userId: number): Promise<LearningStatsCardData> => {
  const [
    studyDuration,
    loginStreak,
    contentQuality,
    postsStats,
    communityPoints
  ] = await Promise.all([
    getStudyDuration(userId),
    getLoginStreak(userId),
    getContentQualityScore(userId),
    getPostsStats(userId),
    getCommunityPointsStats(userId)
  ]);

  return {
    studyDuration,
    loginStreak: {
      current: loginStreak.current,
      isActive: loginStreak.isActive,
      streakHistory: loginStreak.history,
    },
    contentQuality,
    postsStats,
    taskCompletion: {
      rate: 75,
      completedTasks: 3,
      totalTasks: 4,
    },
    communityPoints,
  };
};

export const getRankingSnapshot = async (userId: number): Promise<RankingSnapshot> => {
  const user = await User.findByPk(userId);
  const myPoints = user?.points || 0;

  const totalUsers = await User.count({
    where: { status: 1 }
  });

  const usersWithHigherPoints = await User.count({
    where: {
      status: 1,
      points: { [Op.gt]: myPoints }
    }
  });

  const currentRank = usersWithHigherPoints + 1;
  const rankPercent = Math.round((1 - (currentRank / totalUsers)) * 100);

  const nextUser = await User.findOne({
    where: {
      status: 1,
      points: { [Op.gt]: myPoints }
    },
    order: [['points', 'ASC']]
  });

  const prevUser = await User.findOne({
    where: {
      status: 1,
      points: { [Op.lt]: myPoints }
    },
    order: [['points', 'DESC']]
  });

  const nextRankScore = nextUser?.points || myPoints + 50;
  const gapToNext = nextRankScore - myPoints;
  const leadToPrev = prevUser ? myPoints - prevUser.points : 0;

  const today = new Date();
  const trends = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    trends.push({
      day: d.toISOString().split('T')[0],
      rank: Math.max(1, currentRank + Math.floor(Math.random() * 5) - 2)
    });
  }

  return {
    currentRank,
    totalUsers,
    nextRankScore,
    gapToNext: Math.max(1, gapToNext),
    leadToPrev,
    myPoints,
    rankPercent,
    trends
  };
};

export const getActionRecommendations = async (userId: number): Promise<ActionRecommendations> => {
  const [
    postsStats,
    studyDuration,
    loginStreak,
    contentQuality,
    ranking
  ] = await Promise.all([
    getPostsStats(userId),
    getStudyDuration(userId),
    getLoginStreak(userId),
    getContentQualityScore(userId),
    getRankingSnapshot(userId)
  ]);

  const tasks: ActionTask[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const dailyPostTarget = 3;
  const postProgress = Math.min(100, (postsStats.today / dailyPostTarget) * 100);
  tasks.push({
    id: `task-post-${todayStr}`,
    title: '发帖目标',
    description: postProgress >= 100 
      ? '今日发帖目标已完成！继续保持' 
      : `再发 ${Math.max(1, dailyPostTarget - postsStats.today)} 篇帖子可提升排名`,
    icon: 'book',
    type: 'post',
    current: postsStats.today,
    target: dailyPostTarget,
    progress: postProgress,
    reward: `提升排名，获得 ${Math.floor(dailyPostTarget * 10)} 积分`,
    actionText: postProgress >= 100 ? '已完成' : '去发帖',
    actionType: 'create_post',
    isCompleted: postProgress >= 100,
    priority: 1
  });

  const dailyDurationTarget = 60;
  const durationProgress = Math.min(100, (studyDuration.today / dailyDurationTarget) * 100);
  tasks.push({
    id: `task-duration-${todayStr}`,
    title: '学习时长',
    description: durationProgress >= 100 
      ? '今日学习目标已完成！' 
      : `再学习 ${Math.max(1, dailyDurationTarget - studyDuration.today)} 分钟完成今日目标`,
    icon: 'clock',
    type: 'learn',
    current: studyDuration.today,
    target: dailyDurationTarget,
    progress: durationProgress,
    reward: '获得专注徽章',
    actionText: durationProgress >= 100 ? '已完成' : '去学习',
    actionType: 'start_learning',
    isCompleted: durationProgress >= 100,
    priority: 2
  });

  const streakTarget = 7;
  const streakProgress = Math.min(100, (loginStreak.current / streakTarget) * 100);
  tasks.push({
    id: `task-streak-${todayStr}`,
    title: '连续签到',
    description: loginStreak.isActive 
      ? `已连续活跃 ${loginStreak.current} 天，继续保持！` 
      : `开始签到，连续 ${streakTarget} 天可获得活跃徽章`,
    icon: 'fire',
    type: 'streak',
    current: loginStreak.current,
    target: streakTarget,
    progress: streakProgress,
    reward: loginStreak.current >= streakTarget ? '已获得活跃徽章' : '获得活跃徽章',
    actionText: loginStreak.isActive ? '已签到' : '去签到',
    actionType: 'check_in',
    isCompleted: loginStreak.current >= streakTarget,
    priority: 3
  });

  if (ranking.gapToNext > 0 && ranking.gapToNext < 100) {
    tasks.push({
      id: `task-rank-${todayStr}`,
      title: '排名追赶',
      description: `距离上一名还差 ${ranking.gapToNext} 积分，加油！`,
      icon: 'trophy',
      type: 'points',
      current: ranking.myPoints,
      target: ranking.nextRankScore,
      progress: Math.min(100, (ranking.myPoints / ranking.nextRankScore) * 100),
      reward: `超越上一名，排名提升至第 ${ranking.currentRank - 1} 名`,
      actionText: '获取积分',
      actionType: 'earn_points',
      isCompleted: false,
      priority: 0
    });
  }

  const qualityTarget = 80;
  const qualityProgress = Math.min(100, (contentQuality.score / qualityTarget) * 100);
  if (contentQuality.score > 0) {
    tasks.push({
      id: `task-quality-${todayStr}`,
      title: '内容质量',
      description: qualityProgress >= 100 
        ? '内容质量优秀！' 
        : `发布更高质量内容，提升质量分至 ${qualityTarget}`,
      icon: 'star',
      type: 'badge',
      current: contentQuality.score,
      target: qualityTarget,
      progress: qualityProgress,
      reward: '获得优质创作者徽章',
      actionText: qualityProgress >= 100 ? '已获得' : '去创作',
      actionType: 'create_post',
      isCompleted: qualityProgress >= 100,
      priority: 4
    });
  }

  tasks.sort((a, b) => a.priority - b.priority);
  const recommendedTasks = tasks.slice(0, 3);

  return {
    tasks: recommendedTasks,
    ranking
  };
};

export const getStudyDurationPercentile = async (userId: number): Promise<{
  totalHours: number;
  percentile: number;
}> => {
  const user = await User.findByPk(userId);
  const myDuration = user?.study_duration || 0;

  const totalUsers = await User.count({ where: { status: 1 } }) as number;
  const usersWithLowerDuration = await User.count({
    where: {
      status: 1,
      id: { [Op.ne]: userId },
      [Op.or]: [
        { study_duration: { [Op.lt]: myDuration } },
        { study_duration: { [Op.is]: null as any } }
      ]
    }
  }) as number;

  const percentile = totalUsers > 1
    ? Math.round((usersWithLowerDuration / (totalUsers - 1)) * 100)
    : 100;

  return {
    totalHours: Math.round((myDuration / 60) * 10) / 10,
    percentile: Math.min(99, Math.max(0, percentile))
  };
};

export interface PointsSourceBreakdown {
  sourceType: string;
  totalPoints: number;
  count: number;
}

export const getPointsSourceBreakdown = async (userId: number): Promise<PointsSourceBreakdown[]> => {
  const results = await PointsLog.findAll({
    where: {
      user_id: userId,
      change: { [Op.gt]: 0 }
    },
    attributes: [
      'source_type',
      [Sequelize.fn('SUM', Sequelize.col('change')), 'totalPoints'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    group: ['source_type'],
    raw: true
  });

  return (results as any[]).map(r => ({
    sourceType: r.source_type,
    totalPoints: Number(r.totalPoints) || 0,
    count: Number(r.count) || 0
  }));
};
