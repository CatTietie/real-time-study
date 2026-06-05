import { Server, Socket } from "socket.io";
import { Op } from "sequelize";
import { verifyToken } from "./auth.service";
import { getProvinceHeatmapData } from "./login-log.service";
import User from "../models/user.model";
import Post from "../models/post.model";
import ViewRecord from "../models/view-record.model";
import type {
  DashboardRealtimePayload,
  TimeSeriesPoint,
  KpiCards,
  RecentPost,
} from "../types/dashboard-realtime.types";

const TIME_SERIES_MAX = 360; // 30 minutes at 5s intervals
const BROADCAST_INTERVAL = 5000;
const KPI_REFRESH_INTERVAL = 30000;
const PROVINCE_REFRESH_INTERVAL = 60000;

let onlineTimeSeries: TimeSeriesPoint[] = [];
let cachedKpi: KpiCards = {
  newUsersToday: 0,
  newUsersTodayChange: 0,
  newPostsToday: 0,
  newPostsTodayChange: 0,
  activeUsersToday: 0,
  activeUsersTodayChange: 0,
  totalViewsToday: 0,
  totalViewsTodayChange: 0,
};
let cachedProvince: Array<{ name: string; value: number }> = [];
let cachedRecentPosts: RecentPost[] = [];
let ioInstance: Server | null = null;

function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getYesterday(): { start: Date; end: Date } {
  const today = getStartOfDay();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  return { start: yesterday, end: today };
}

async function refreshKpiData(): Promise<void> {
  try {
    const todayStart = getStartOfDay();
    const { start: yesterdayStart, end: yesterdayEnd } = getYesterday();

    const [
      newUsersToday,
      newUsersYesterday,
      newPostsToday,
      newPostsYesterday,
      activeUsersToday,
      activeUsersYesterday,
      viewsToday,
      viewsYesterday,
    ] = await Promise.all([
      User.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      User.count({ where: { created_at: { [Op.gte]: yesterdayStart, [Op.lt]: yesterdayEnd } } }),
      Post.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      Post.count({ where: { created_at: { [Op.gte]: yesterdayStart, [Op.lt]: yesterdayEnd } } }),
      User.count({ where: { last_login: { [Op.gte]: todayStart } } }),
      User.count({ where: { last_login: { [Op.gte]: yesterdayStart, [Op.lt]: yesterdayEnd } } }),
      ViewRecord.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      ViewRecord.count({ where: { created_at: { [Op.gte]: yesterdayStart, [Op.lt]: yesterdayEnd } } }),
    ]);

    const calcChange = (today: number, yesterday: number) =>
      yesterday === 0 ? (today > 0 ? 100 : 0) : Math.round(((today - yesterday) / yesterday) * 100);

    cachedKpi = {
      newUsersToday,
      newUsersTodayChange: calcChange(newUsersToday, newUsersYesterday),
      newPostsToday,
      newPostsTodayChange: calcChange(newPostsToday, newPostsYesterday),
      activeUsersToday,
      activeUsersTodayChange: calcChange(activeUsersToday, activeUsersYesterday),
      totalViewsToday: viewsToday,
      totalViewsTodayChange: calcChange(viewsToday, viewsYesterday),
    };
  } catch (err) {
    console.error("[Dashboard] KPI refresh error:", err);
  }
}

async function refreshProvinceData(): Promise<void> {
  try {
    cachedProvince = await getProvinceHeatmapData(24);
  } catch (err) {
    console.error("[Dashboard] Province refresh error:", err);
  }
}

async function refreshRecentPosts(): Promise<void> {
  try {
    const posts = await Post.findAll({
      order: [["created_at", "DESC"]],
      limit: 20,
      include: [{ model: User, attributes: ["nickname"] }],
    });
    cachedRecentPosts = posts.map((p) => ({
      id: p.id,
      title: p.title || "",
      author: (p as any).User?.nickname || "匿名",
      category: p.category || "",
      createdAt: p.createdAt?.toISOString() || "",
      status: p.status,
      likeCount: p.like_count || 0,
      commentCount: p.comment_count || 0,
    }));
  } catch (err) {
    console.error("[Dashboard] Recent posts refresh error:", err);
  }
}

function recordOnlineCount(): void {
  if (!ioInstance) return;
  const count = ioInstance.engine.clientsCount || 0;
  const point: TimeSeriesPoint = { timestamp: Date.now(), count };
  onlineTimeSeries.push(point);
  if (onlineTimeSeries.length > TIME_SERIES_MAX) {
    onlineTimeSeries = onlineTimeSeries.slice(-TIME_SERIES_MAX);
  }
}

export function aggregateDashboardPayload(): DashboardRealtimePayload {
  return {
    onlineUsers: {
      current: ioInstance?.engine.clientsCount || 0,
      timeSeries: onlineTimeSeries,
    },
    kpiCards: cachedKpi,
    provinceHeatmap: cachedProvince,
    recentPosts: cachedRecentPosts,
  };
}

export function notifyNewPost(post: RecentPost): void {
  cachedRecentPosts = [post, ...cachedRecentPosts.slice(0, 19)];
  if (ioInstance) {
    ioInstance.to("dashboard_admin").emit("dashboard:new_post", post);
  }
}

export function initDashboardRealtimeService(io: Server): void {
  ioInstance = io;

  io.on("connection", (socket: Socket) => {
    socket.on("dashboard:join", (data: { token: string }) => {
      const payload = verifyToken(data?.token || "");
      if (!payload || (payload.role !== "admin" && payload.role !== "super_admin")) {
        socket.emit("dashboard:error", { message: "Unauthorized" });
        return;
      }
      socket.join("dashboard_admin");
      socket.emit("dashboard:joined", {});
    });
  });

  // Initial data load
  refreshKpiData();
  refreshProvinceData();
  refreshRecentPosts();

  // Staggered cache refresh
  setInterval(refreshKpiData, KPI_REFRESH_INTERVAL);
  setInterval(refreshProvinceData, PROVINCE_REFRESH_INTERVAL);

  // Broadcast loop every 5 seconds
  setInterval(async () => {
    recordOnlineCount();

    const room = io.sockets.adapter.rooms.get("dashboard_admin");
    if (!room || room.size === 0) return;

    const payload = aggregateDashboardPayload();
    io.to("dashboard_admin").emit("dashboard:data", payload);
  }, BROADCAST_INTERVAL);

  console.log("📊 Dashboard real-time service initialized");
}
