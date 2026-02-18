import api from "./api";

// 获取自习室列表
export const getStudyRooms = async (params?: Record<string, unknown>) => {
  const response = await api.get("/study-rooms", { params });
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

// 加入自习室
export const joinStudyRoom = async (roomId: number) => {
  const response = await api.post("/study-rooms/join", { roomId });
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