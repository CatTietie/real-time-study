import User from "../models/user.model";
interface TokenPayload {
    id: number;
    username: string;
    role: string;
}
export interface LoginResult {
    id: number;
    username: string;
    nickname: string;
    avatar?: string;
    role: string;
    token: string;
    expiresIn: string;
    failedAttempts?: number;
    remainingAttempts?: number;
    isLocked?: boolean;
    lockUntil?: Date;
}
/**
 * 检查账号是否被锁定
 */
export declare const checkAccountLock: (user: User) => {
    isLocked: boolean;
    remainingMinutes?: number;
};
/**
 * 记录登录失败
 */
export declare const recordFailedLogin: (user: User) => Promise<{
    failedAttempts: number;
    remainingAttempts: number;
    isLocked: boolean;
    lockUntil?: Date;
}>;
/**
 * 重置登录失败次数
 */
export declare const resetFailedLoginAttempts: (user: User) => Promise<void>;
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
export declare const adminLogin: (username: string, password: string) => Promise<LoginResult>;
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