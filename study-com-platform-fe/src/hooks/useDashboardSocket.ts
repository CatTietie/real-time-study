import { useState, useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { API_BASE } from "../services/api";
import { store } from "../app/store";

interface TimeSeriesPoint {
  timestamp: number;
  count: number;
}

interface KpiCards {
  newUsersToday: number;
  newUsersTodayChange: number;
  newPostsToday: number;
  newPostsTodayChange: number;
  activeUsersToday: number;
  activeUsersTodayChange: number;
  totalViewsToday: number;
  totalViewsTodayChange: number;
}

interface RecentPost {
  id: number;
  title: string;
  author: string;
  category: string;
  createdAt: string;
  status: number;
  likeCount: number;
  commentCount: number;
}

export interface DashboardRealtimeData {
  onlineUsers: {
    current: number;
    timeSeries: TimeSeriesPoint[];
  };
  kpiCards: KpiCards;
  provinceHeatmap: Array<{ name: string; value: number }>;
  recentPosts: RecentPost[];
}

export function useDashboardSocket() {
  const [data, setData] = useState<DashboardRealtimeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = store.getState().auth.token;
    if (!token) return;

    const socket = io(API_BASE.replace("/api", ""), {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("dashboard:join", { token });
    });

    socket.on("dashboard:joined", () => {});

    socket.on("dashboard:data", (payload: DashboardRealtimeData) => {
      setData(payload);
    });

    socket.on("dashboard:new_post", (post: RecentPost) => {
      setData((prev) =>
        prev
          ? { ...prev, recentPosts: [post, ...prev.recentPosts.slice(0, 19)] }
          : prev
      );
    });

    socket.on("dashboard:error", (err: { message: string }) => {
      console.error("Dashboard socket error:", err.message);
    });

    socket.on("disconnect", () => setIsConnected(false));

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  return { data, isConnected };
}
