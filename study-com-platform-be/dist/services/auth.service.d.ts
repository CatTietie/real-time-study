import User from "../models/user.model";
interface TokenPayload {
    id: number;
    username: string;
    role: string;
}
/**
 * 生成 JWT Token（7天有效期）
 */
export declare const generateToken: (user: TokenPayload) => string;
/**
 * 刷新 Token
 */
export declare const refreshToken: (token: string) => string | null;
/**
 * 验证 Token
 */
export declare const verifyToken: (token: string) => TokenPayload | null;
/**
 * 管理员登录
 */
export declare const adminLogin: (username: string, password: string) => Promise<{
    id: number;
    username: string;
    nickname: string;
    avatar: string | undefined;
    role: "admin" | "super_admin";
    token: string;
    expiresIn: string;
}>;
/**
 * 获取管理员信息
 */
export declare const getAdminProfile: (userId: number) => Promise<User>;
/**
 * 更新管理员信息
 */
export declare const updateAdminProfile: (userId: number, data: {
    nickname?: string;
    avatar?: string;
}) => Promise<{
    id: number;
    username: string;
    nickname: string;
    avatar: string | undefined;
    role: "admin" | "super_admin";
}>;
export {};
//# sourceMappingURL=auth.service.d.ts.map