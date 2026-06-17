export interface TimeSeriesPoint {
  timestamp: number;
  count: number;
}

export interface KpiCards {
  newUsersToday: number;
  newUsersTodayChange: number;
  newPostsToday: number;
  newPostsTodayChange: number;
  activeUsersToday: number;
  activeUsersTodayChange: number;
  totalViewsToday: number;
  totalViewsTodayChange: number;
}

export interface RecentPost {
  id: number;
  title: string;
  author: string;
  category: string;
  createdAt: string;
  status: number;
  likeCount: number;
  commentCount: number;
}

export interface DashboardRealtimePayload {
  onlineUsers: {
    current: number;
    timeSeries: TimeSeriesPoint[];
  };
  kpiCards: KpiCards;
  provinceHeatmap: Array<{ name: string; value: number }>;
  recentPosts: RecentPost[];
}
