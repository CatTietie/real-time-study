// 认证服务
import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import User from "../models/user.model";
import { comparePassword } from "../utils/password";

interface TokenPayload {
  id: number;
  username: string;
  role: string;
}

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
export const adminLogin = async (username: string, password: string) => {
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

  // 检查是否为管理员
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("该账户无管理员权限");
  }

  // 验证密码
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error("用户名或密码错误");
  }

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
