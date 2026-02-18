import api from "./api";

// 获取自习室列表
export const getStudyRooms = async (params?: Record<string, unknown>) => {
  const response = await api.get("/study-rooms", { params });
  return response.data;
};

// 确认预约
export const confirmReservation = async (reservationId: number) => {
  const response = await api.post("/study-rooms/reservations/confirm", { reservationId });
  return response.data;
};

// 完成预约
export const completeReservation = async (reservationId: number) => {
  const response = await api.post("/study-rooms/reservations/complete", { reservationId });
  return response.data;
};

// 结束预约
export const endReservation = async (reservationId: number) => {
  const response = await api.post("/study-rooms/reservations/end", { reservationId });
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