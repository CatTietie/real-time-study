import api from "./api";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export const fetchCommunityPosts = async (params?: QueryParams & { userId?: number | string }) => {
  const response = await api.get("/community/posts", { params });
  return response.data;
};

export const fetchCommunityPostDetail = async (id: number) => {
  const response = await api.get(`/community/posts/${id}`);
  return response.data;
};

export const fetchMyPermissions = async () => {
  const response = await api.get("/user/permissions");
  return response.data;
};

export const fetchCommunityPostComments = async (
  id: number,
  params?: QueryParams,
) => {
  const response = await api.get(`/community/posts/${id}/comments`, { params });
  return response.data;
};

export const createCommunityPost = async (
  payload:
    | FormData
    | {
        title: string;
        content: string;
        category: string;
        tags?: string[];
        isDraft?: boolean;
        forwardPostId?: number;
      },
) => {
  const isFormData = payload instanceof FormData;
  const response = await api.post("/community/posts", payload, {
    headers: isFormData
      ? {
          "Content-Type": "multipart/form-data",
        }
      : undefined,
  });
  return response.data;
};

export const updateCommunityPost = async (
  id: number,
  payload: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    isDraft?: boolean;
  },
) => {
  const response = await api.put(`/community/posts/${id}`, payload);
  return response.data;
};

export const deleteCommunityPost = async (id: number, confirm?: boolean) => {
  const response = await api.delete(`/community/posts/${id}`, {
    data: { confirm },
  });
  return response.data;
};

export const togglePostLike = async (id: number) => {
  const response = await api.post(`/community/posts/${id}/like`);
  return response.data;
};

export const createCommunityComment = async (
  postId: number,
  payload: { content: string; parentId?: number },
) => {
  const response = await api.post(
    `/community/posts/${postId}/comments`,
    payload,
  );
  return response.data;
};

export const reportCommunityPost = async (
  postId: number,
  payload: { reason: string },
) => {
  const response = await api.post(`/community/posts/${postId}/report`, payload);
  return response.data;
};

export const deleteCommunityComment = async (commentId: number) => {
  const response = await api.delete(`/community/comments/${commentId}`);
  return response.data;
};

export const toggleCommentLike = async (commentId: number) => {
  const response = await api.post(`/community/comments/${commentId}/like`);
  return response.data;
};

export const fetchCommunityComments = async (params?: QueryParams) => {
  const response = await api.get("/community/comments", { params });
  return response.data;
};

export const fetchMyLikedPosts = async (params?: QueryParams) => {
  const response = await api.get("/community/likes", { params });
  return response.data;
};

export const recordCommunityVisit = async () => {
  const response = await api.post("/community/visit");
  return response.data;
};

export const fetchCommunityTagSuggestions = async (keyword: string) => {
  const response = await api.get("/community/tags/suggest", {
    params: { keyword },
  });
  return response.data;
};

export const fetchCommunityLeaderboard = async () => {
  const response = await api.get("/community/leaderboard");
  return response.data;
};

export const fetchCommunityLeaderboardByType = async (
  type: string, 
  timeRange?: string,
  commentPeriod?: string // "7days" 或 "all"
) => {
  const params: Record<string, string> = { type };
  if (timeRange) {
    params.timeRange = timeRange;
  }
  if (commentPeriod) {
    params.commentPeriod = commentPeriod;
  }
  const response = await api.get("/community/leaderboard", {
    params,
  });
  return response.data;
};

export const fetchPointsSummary = async () => {
  const response = await api.get("/community/points/summary");
  return response.data;
};

export const fetchPointsLogs = async (params?: QueryParams) => {
  const response = await api.get("/community/points/logs", { params });
  return response.data;
};

export const fetchCommunityProfileSummary = async () => {
  const response = await api.get("/community/profile/summary");
  return response.data;
};

export const fetchFavoriteFolders = async () => {
  const response = await api.get("/community/favorite-folders");
  return response.data;
};

export const createFavoriteFolder = async (payload: { name: string }) => {
  const response = await api.post("/community/favorite-folders", payload);
  return response.data;
};

export const updateFavoriteFolder = async (
  id: number,
  payload: { name: string },
) => {
  const response = await api.put(`/community/favorite-folders/${id}`, payload);
  return response.data;
};

export const deleteFavoriteFolder = async (id: number) => {
  const response = await api.delete(`/community/favorite-folders/${id}`);
  return response.data;
};

export const fetchFavorites = async (params?: QueryParams) => {
  const response = await api.get("/community/favorites", { params });
  return response.data;
};

export const createFavorite = async (payload: {
  postId: number;
  folderId?: number | null;
  note?: string;
  tags?: string[];
}) => {
  const response = await api.post("/community/favorites", payload);
  return response.data;
};

export const deleteFavorite = async (id: number) => {
  const response = await api.delete(`/community/favorites/${id}`);
  return response.data;
};

export const moveFavorites = async (payload: {
  favoriteIds: number[];
  folderId?: number | null;
}) => {
  const response = await api.post("/community/favorites/move", payload);
  return response.data;
};

export const exportFavorites = async () => {
  const response = await api.get("/community/favorites/export", {
    responseType: "blob",
  });
  return response.data;
};

export const fetchFavoriteStatus = async (postId: number) => {
  const response = await api.get(`/community/favorites/status/${postId}`);
  return response.data;
};

export const fetchUserTodayStats = async () => {
  const response = await api.get("/community/user/today-stats");
  return response.data;
};

// ========================================
// 草稿相关 API
// ========================================

export const fetchCommunityDrafts = async (params?: { page?: number; pageSize?: number }) => {
  const response = await api.get("/community/drafts", { params });
  return response.data;
};

export const fetchCommunityDraftDetail = async (id: number) => {
  const response = await api.get(`/community/drafts/${id}`);
  return response.data;
};

export const deleteCommunityDraft = async (id: number) => {
  const response = await api.delete(`/community/drafts/${id}`);
  return response.data;
};

// ========================================
// 学习统计相关 API
// ========================================

export interface StudyDurationData {
  today: number;
  total: number;
  dailyRecords: Array<{ date: string; duration: number }>;
}

export interface LoginStreakData {
  current: number;
  isActive: boolean;
  history: Array<{ date: string; loggedIn: boolean }>;
}

export interface ContentQualityData {
  score: number;
  totalLikes: number;
  totalComments: number;
  hotPostsCount: number;
  qualityBreakdown: Array<{ category: string; score: number; count: number }>;
}

export interface LearningStatsCardsData {
  studyDuration: StudyDurationData;
  loginStreak: LoginStreakData;
  contentQuality: ContentQualityData;
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

export const fetchLearningStatsCards = async () => {
  const response = await api.get("/community/learning-stats");
  return response.data;
};

export const fetchStudyDurationDetail = async () => {
  const response = await api.get("/community/learning-stats/duration");
  return response.data;
};

export const fetchLoginStreakDetail = async () => {
  const response = await api.get("/community/learning-stats/streak");
  return response.data;
};

export const fetchContentQualityDetail = async () => {
  const response = await api.get("/community/learning-stats/quality");
  return response.data;
};

export const fetchDailyStudyRecords = async (days: number = 7) => {
  const response = await api.get(`/community/learning-stats/daily?days=${days}`);
  return response.data;
};

// ========================================
// 增强学习统计 API - 多维趋势、对比、热力图
// ========================================

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

export type TrendDataType = 'posts' | 'views' | 'points' | 'duration';

export const fetchMultiDimTrend = async (days: number = 14) => {
  const response = await api.get(`/community/learning-stats/trend?days=${days}`);
  return response.data;
};

export const fetchWeeklyComparison = async () => {
  const response = await api.get("/community/learning-stats/comparison");
  return response.data;
};

export const fetchActivityHeatmap = async (weeks: number = 12) => {
  const response = await api.get(`/community/learning-stats/heatmap?weeks=${weeks}`);
  return response.data;
};

// ========================================
// 行为驱动 API - 行动推荐、排行榜
// ========================================

export type TaskType = 'post' | 'learn' | 'points' | 'streak' | 'badge';
export type ActionType = 'create_post' | 'start_learning' | 'earn_points' | 'check_in';

export interface ActionTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: TaskType;
  current: number;
  target: number;
  progress: number;
  reward: string;
  actionText: string;
  actionType: ActionType;
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
  trends: Array<{
    day: string;
    rank: number;
  }>;
}

export interface ActionRecommendations {
  tasks: ActionTask[];
  ranking: RankingSnapshot;
}

export const fetchActionRecommendations = async (): Promise<{ success: boolean; data: ActionRecommendations }> => {
  const response = await api.get("/community/learning-stats/actions");
  return response.data;
};

export const fetchRankingSnapshot = async (): Promise<{ success: boolean; data: RankingSnapshot }> => {
  const response = await api.get("/community/learning-stats/ranking");
  return response.data;
};
