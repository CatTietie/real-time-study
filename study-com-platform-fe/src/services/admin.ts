import api from "./api";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export const fetchAdminLogs = async (params?: QueryParams) => {
  const response = await api.get("/admin/logs", { params });
  return response.data;
};

export const fetchDashboard = async () => {
  const response = await api.get("/dashboard");
  return response.data;
};

export const fetchAdmins = async (params?: QueryParams) => {
  const response = await api.get("/admin/admins", { params });
  return response.data;
};

export const createAdmin = async (payload: {
  username: string;
  password: string;
  nickname?: string;
}) => {
  const response = await api.post("/admin/admins", payload);
  return response.data;
};

export const deleteAdmin = async (id: number) => {
  const response = await api.delete(`/admin/admins/${id}`);
  return response.data;
};

export const fetchRoles = async () => {
  const response = await api.get("/admin/rbac/roles");
  return response.data;
};

export const createRole = async (payload: {
  name: string;
  description?: string;
  permissionIds?: number[];
}) => {
  const response = await api.post("/admin/rbac/roles", payload);
  return response.data;
};

export const fetchPermissions = async () => {
  const response = await api.get("/admin/rbac/permissions");
  return response.data;
};

export const setRolePermissions = async (
  roleId: number,
  permissionIds: number[],
) => {
  const response = await api.post(`/admin/rbac/roles/${roleId}/permissions`, {
    permissionIds,
  });
  return response.data;
};

export const setAdminRole = async (adminId: number, roleId: number) => {
  const response = await api.post(`/admin/admins/${adminId}/role`, { roleId });
  return response.data;
};

export const fetchPointsRules = async (params?: QueryParams) => {
  const response = await api.get("/admin/points-rules", { params });
  return response.data;
};
