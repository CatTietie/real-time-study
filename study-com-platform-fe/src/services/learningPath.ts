import api from "./api";

// ===== 管理端 API =====

export const getAdminPaths = async (params?: Record<string, unknown>) => {
  const response = await api.get("/learning-paths/admin/paths", { params });
  return response.data;
};

export const createPath = async (data: Record<string, unknown>) => {
  const response = await api.post("/learning-paths/admin/paths", data);
  return response.data;
};

export const getAdminPathById = async (id: number) => {
  const response = await api.get(`/learning-paths/admin/paths/${id}`);
  return response.data;
};

export const updatePath = async (id: number, data: Record<string, unknown>) => {
  const response = await api.put(`/learning-paths/admin/paths/${id}`, data);
  return response.data;
};

export const deletePath = async (id: number) => {
  const response = await api.delete(`/learning-paths/admin/paths/${id}`);
  return response.data;
};

export const updatePathStatus = async (id: number, status: number) => {
  const response = await api.patch(`/learning-paths/admin/paths/${id}/status`, { status });
  return response.data;
};

export const saveTree = async (id: number, data: Record<string, unknown>) => {
  const response = await api.put(`/learning-paths/admin/paths/${id}/tree`, data);
  return response.data;
};

export const createNode = async (data: Record<string, unknown>) => {
  const response = await api.post("/learning-paths/admin/nodes", data);
  return response.data;
};

export const updateNode = async (id: number, data: Record<string, unknown>) => {
  const response = await api.put(`/learning-paths/admin/nodes/${id}`, data);
  return response.data;
};

export const deleteNode = async (id: number) => {
  const response = await api.delete(`/learning-paths/admin/nodes/${id}`);
  return response.data;
};

export const createEdge = async (data: Record<string, unknown>) => {
  const response = await api.post("/learning-paths/admin/edges", data);
  return response.data;
};

export const deleteEdge = async (id: number) => {
  const response = await api.delete(`/learning-paths/admin/edges/${id}`);
  return response.data;
};

export const addNodeResource = async (nodeId: number, data: Record<string, unknown>) => {
  const response = await api.post(`/learning-paths/admin/nodes/${nodeId}/resources`, data);
  return response.data;
};

export const updateNodeResource = async (id: number, data: Record<string, unknown>) => {
  const response = await api.put(`/learning-paths/admin/resources/${id}`, data);
  return response.data;
};

export const deleteNodeResource = async (id: number) => {
  const response = await api.delete(`/learning-paths/admin/resources/${id}`);
  return response.data;
};

// ===== 学生端 API =====

export const getPublishedPaths = async () => {
  const response = await api.get("/learning-paths/published");
  return response.data;
};

export const getMyPaths = async () => {
  const response = await api.get("/learning-paths/my-paths");
  return response.data;
};

export const enrollInPath = async (pathId: number) => {
  const response = await api.post(`/learning-paths/enroll/${pathId}`);
  return response.data;
};

export const getPathTree = async (pathId: number) => {
  const response = await api.get(`/learning-paths/${pathId}/tree`);
  return response.data;
};

export const getNodeResources = async (nodeId: number) => {
  const response = await api.get(`/learning-paths/nodes/${nodeId}/resources`);
  return response.data;
};

export const abandonPath = async (pathId: number) => {
  const response = await api.post(`/learning-paths/abandon/${pathId}`);
  return response.data;
};
