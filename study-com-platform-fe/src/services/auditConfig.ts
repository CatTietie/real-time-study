import api from "./api";

export interface AuditConfigData {
  id: number;
  audit_mode: "full" | "smart" | "off";
  new_user_days_threshold: number;
  auto_approve_hours: number;
  created_at: string;
  updated_at: string;
}

export const fetchAuditConfig = async () => {
  const response = await api.get("/admin/community/audit-config");
  return response.data;
};

export const updateAuditConfig = async (payload: {
  audit_mode?: string;
  new_user_days_threshold?: number;
  auto_approve_hours?: number;
}) => {
  const response = await api.put("/admin/community/audit-config", payload);
  return response.data;
};
