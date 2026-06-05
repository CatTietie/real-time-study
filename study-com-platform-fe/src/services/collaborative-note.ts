import { api } from "./api";
import type { CollaborativeNote, NoteVersion, NoteComment } from "../types/collaborative-note";

export const createCollaborativeNote = async (data: {
  title?: string;
  room_id?: number;
}): Promise<CollaborativeNote> => {
  const response = await api.post("/collaborative-notes", data);
  return response.data.data;
};

export const listCollaborativeNotes = async (
  page = 1,
  pageSize = 20,
  status = "active"
): Promise<{ list: CollaborativeNote[]; total: number; page: number; pageSize: number }> => {
  const response = await api.get("/collaborative-notes", {
    params: { page, pageSize, status },
  });
  return response.data.data;
};

export const getCollaborativeNote = async (id: number): Promise<CollaborativeNote> => {
  const response = await api.get(`/collaborative-notes/${id}`);
  return response.data.data;
};

export const updateCollaborativeNote = async (
  id: number,
  data: { title?: string; status?: string }
): Promise<CollaborativeNote> => {
  const response = await api.put(`/collaborative-notes/${id}`, data);
  return response.data.data;
};

export const deleteCollaborativeNote = async (id: number): Promise<void> => {
  await api.delete(`/collaborative-notes/${id}`);
};

// 版本管理 API
export const listNoteVersions = async (
  noteId: number,
  page = 1,
  pageSize = 20
): Promise<{ list: NoteVersion[]; total: number }> => {
  const response = await api.get(`/collaborative-notes/${noteId}/versions`, {
    params: { page, pageSize },
  });
  return { list: response.data.data, total: response.data.pagination?.total || 0 };
};

export const getNoteVersion = async (noteId: number, versionId: number): Promise<NoteVersion> => {
  const response = await api.get(`/collaborative-notes/${noteId}/versions/${versionId}`);
  return response.data.data;
};

export const restoreNoteVersion = async (noteId: number, versionId: number): Promise<void> => {
  await api.post(`/collaborative-notes/${noteId}/versions/${versionId}/restore`);
};

export const createManualVersion = async (noteId: number): Promise<void> => {
  await api.post(`/collaborative-notes/${noteId}/versions`);
};

// 行级评论 API
export const listNoteComments = async (noteId: number, status = "active"): Promise<NoteComment[]> => {
  const response = await api.get(`/collaborative-notes/${noteId}/comments`, {
    params: { status },
  });
  return response.data.data;
};

export const createNoteComment = async (
  noteId: number,
  data: {
    content: string;
    position_start: string;
    position_end: string;
    quoted_text?: string;
    parent_id?: number;
  }
): Promise<NoteComment> => {
  const response = await api.post(`/collaborative-notes/${noteId}/comments`, data);
  return response.data.data;
};

export const resolveNoteComment = async (noteId: number, commentId: number): Promise<void> => {
  await api.patch(`/collaborative-notes/${noteId}/comments/${commentId}`, { status: "resolved" });
};

export const deleteNoteComment = async (noteId: number, commentId: number): Promise<void> => {
  await api.delete(`/collaborative-notes/${noteId}/comments/${commentId}`);
};
