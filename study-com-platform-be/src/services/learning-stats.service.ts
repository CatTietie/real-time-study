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
