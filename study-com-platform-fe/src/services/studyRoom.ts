import api from "./api";

// 获取自习室列表
export const getStudyRooms = async (params?: Record<string, unknown>) => {
  const response = await api.get("/study-rooms", { params });
  return response.data;
};

// 结束预约
export const endReservation = async (reservationId: number) => {
  const response = await api.post("/study-rooms/reservations/end", { reservationId });
  return response.data;
};

// 提前退出预约
export const earlyExitReservation = async (reservationId: number) => {
  const response = await api.post("/study-rooms/reservations/early-exit", { reservationId });
  return response.data;
};

// 取消预约
export const cancelReservation = async (reservationId: number) => {
  const response = await api.post("/study-rooms/reservations/cancel", { reservationId });
  return response.data;
};

// 获取自习室详情
export const getStudyRoomDetail = async (id: number) => {
  const response = await api.get(`/study-rooms/${id}`);
  return response.data;
};

// 预约自习室
export const reserveStudyRoom = async (data: Record<string, unknown>) => {
  const response = await api.post("/study-rooms/reserve", data);
  return response.data;
};



// 退出自习室
export const leaveStudyRoom = async () => {
  const response = await api.post("/study-rooms/leave");
  return response.data;
};

// 原子化退出自习室并结束预约
export const leaveAndEndReservation = async (reservationId: number) => {
  const response = await api.post("/study-rooms/reservations/leave-and-end", { reservationId });
  return response.data;
};

// 获取我的预约记录
export const getMyReservations = async (params?: Record<string, unknown>) => {
  const response = await api.get("/study-rooms/my/reservations", { params });
  return response.data;
};

// 手动检查过期预约
export const checkExpiredReservations = async () => {
  const response = await api.post("/study-rooms/check-expired");
  return response.data;
};

// 强制更新过期状态
export const forceUpdateExpired = async () => {
  const response = await api.post("/study-rooms/force-update-expired");
  return response.data;
};

// 获取每小时可用状态（用于时间轴视图）
export const getHourlyAvailability = async (date?: string) => {
  const params = date ? { date } : {};
  const response = await api.get("/study-rooms/hourly/availability", { params });
  return response.data;
};

interface DailyDuration {
  date: string;
  duration: number;
}

interface RoomUsage {
  roomId: number;
  roomName: string;
  duration: number;
  count: number;
}

export interface StudyStats {
  totalDuration: number;
  totalSessions: number;
  dailyDurations: DailyDuration[];
  roomUsages: RoomUsage[];
}

export interface OverallStudyStats {
  totalDuration: number;
  totalSessions: number;
  roomUsages: RoomUsage[];
}

export const getStudyStats = async (month?: number, year?: number) => {
  const params: Record<string, unknown> = {};
  if (month !== undefined) params.month = month;
  if (year !== undefined) params.year = year;
  const response = await api.get("/study-rooms/my/stats", { params });
  return response.data;
};

export const getOverallStudyStats = async () => {
  const response = await api.get("/study-rooms/my/stats/overall");
  return response.data;
};