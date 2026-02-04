export interface AdminLog {
  id: number;
  admin_id: number;
  action_type: string;
  target_table?: string;
  target_id?: number;
  detail?: string;
  created_at: string;
}
