// 认证服务
import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import User from "../models/user.model";
import { comparePassword } from "../utils/password";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

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
export const checkAccountLock = (user: User): { isLocked: boolean; remainingMinutes?: number } => {
  if (user.lock_until && new Date() < user.lock_until) {
    const remainingMinutes = Math.ceil(
      (user.lock_until.getTime() - new Date().getTime()) / 60000
    );
    return { isLocked: true, remainingMinutes };
  }
  return { isLocked: false };
};

/**
 * 记录登录失败
 */
export const recordFailedLogin = async (user: User): Promise<{ 
  failedAttempts: number; 
  remainingAttempts: number;
  isLocked: boolean;
  lockUntil?: Date;
}> => {
  const newAttempts = (user.failed_login_attempts || 0) + 1;
  const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts;
  
  let isLocked = false;
  let lockUntil: Date | undefined = undefined;
  
  const updateData: any = {
    failed_login_attempts: newAttempts,
  };
  
  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    isLocked = true;
    lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
    updateData.lock_until = lockUntil;
  }
  
  await user.update(updateData);
  
  return {
    failedAttempts: newAttempts,
    remainingAttempts: Math.max(0, remainingAttempts),
    isLocked,
    lockUntil,
  };
};

/**
 * 重置登录失败次数
 */
export const resetFailedLoginAttempts = async (user: User): Promise<void> => {
  user.failed_login_attempts = 0;
  // 使用类型断言来设置 lock_until 为 null
  (user as any).lock_until = null;
  await user.save();
};

/**
 * 生成 JWT Token（7天有效期）
 */
export const generateToken = (user: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: "7d",
  };
  return jwt.sign(
    user,
    process.env.JWT_SECRET || "default-secret-key",
    options,
  );
};

/**
 * 刷新 Token
 */
export const refreshToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default-secret-key",
    ) as TokenPayload;
    return generateToken(decoded);
  } catch (error) {
    return null;
  }
};

/**
 * 验证 Token
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || "default-secret-key",
    ) as TokenPayload;
  } catch (error) {
    return null;
  }
};

/**
 * 管理员登录
 */
export const adminLogin = async (username: string, password: string): Promise<LoginResult> => {
  // 查找用户
  const user = await User.findOne({
    where: { username },
  });

  if (!user) {
    throw new Error("用户名或密码错误");
  }

  // 检查用户是否被封禁
  if (user.status === 0) {
    throw new Error("账户已被封禁，无法登录");
  }

  // 检查账号是否被锁定
  const lockStatus = checkAccountLock(user);
  if (lockStatus.isLocked) {
    throw new Error(`账号已被临时锁定，请 ${lockStatus.remainingMinutes} 分钟后重试`);
  }

  // 检查是否为管理员
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("该账户无管理员权限");
  }

  // 验证密码
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    const failedInfo = await recordFailedLogin(user);
    if (failedInfo.isLocked) {
      throw new Error(`登录失败次数过多，账号已被临时锁定 ${LOCK_DURATION_MINUTES} 分钟`);
    }
    throw new Error(`用户名或密码错误（剩余尝试次数：${failedInfo.remainingAttempts} 次）`);
  }

  // 登录成功，重置失败次数
  await resetFailedLoginAttempts(user);

  // 更新最后登录时间
  await user.update({ last_login: new Date() });

  // 生成 Token
  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
    token,
    expiresIn: "7d",
  };
};

/**
 * 获取管理员信息
 */
export const getAdminProfile = async (userId: number) => {
  const user = await User.findByPk(userId, {
    attributes: {
      exclude: ["password"],
    },
  });

  if (!user) {
    throw new Error("用户不存在");
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("该账户无管理员权限");
  }

  return user;
};

/**
 * 更新管理员信息
 */
export const updateAdminProfile = async (
  userId: number,
  data: { nickname?: string; avatar?: string },
) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("用户不存在");
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("该账户无管理员权限");
  }

  // 更新允许的字段
  const updateData: any = {};
  if (data.nickname !== undefined) updateData.nickname = data.nickname;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;

  await user.update(updateData);

  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
  };
};
