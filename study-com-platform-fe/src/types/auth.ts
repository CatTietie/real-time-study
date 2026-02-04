export interface AuthUser {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  role: "admin" | "student" | "super_admin";
}
