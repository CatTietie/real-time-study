import api from "./api";
import type { CreateVideoRoomParams, PomodoroConfigParams } from "../types/video-study-room";

export const createVideoStudyRoom = async (data: CreateVideoRoomParams) => {
  const response = await api.post("/video-study-rooms", data);
  return response.data;
};

export const getVideoStudyRooms = async (params?: Record<string, unknown>) => {
  const response = await api.get("/video-study-rooms", { params });
  return response.data;
};

export const getVideoStudyRoomDetail = async (id: number) => {
  const response = await api.get(`/video-study-rooms/${id}`);
  return response.data;
};

export const closeVideoStudyRoom = async (id: number) => {
  const response = await api.post(`/video-study-rooms/${id}/close`);
  return response.data;
};

export const updateVideoStudyRoomConfig = async (id: number, config: PomodoroConfigParams) => {
  const response = await api.patch(`/video-study-rooms/${id}/config`, config);
  return response.data;
};

export const getRoomRecordings = async (roomId: number, params?: Record<string, unknown>) => {
  const response = await api.get(`/video-study-rooms/${roomId}/recordings`, { params });
  return response.data;
};

export const uploadRecording = async (roomId: number, file: Blob, title?: string, duration?: number) => {
  const formData = new FormData();
  formData.append("file", file, `recording-${Date.now()}.webm`);
  if (title) formData.append("title", title);
  if (duration !== undefined) formData.append("duration", String(Math.round(duration)));
  const response = await api.post(`/video-study-rooms/${roomId}/recordings/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 600000,
  });
  return response.data;
};

export const deleteRecording = async (recordingId: number) => {
  const response = await api.delete(`/video-study-rooms/recordings/${recordingId}`);
  return response.data;
};
