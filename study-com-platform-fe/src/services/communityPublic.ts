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

export const fetchCommunityLeaderboardByType = async (type: string) => {
  const response = await api.get("/community/leaderboard", {
    params: { type },
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


