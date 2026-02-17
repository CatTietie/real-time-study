// 用户服务
import User from "../models/user.model";

export const getUserById = async (id: number) => {
  return await User.findByPk(id);
};

export const updateUserById = async (id: number, data: any) => {
  return await User.update(data, { where: { id } });
};

export const createUser = async (userData: any) => {
  return await User.create(userData);
};

export const getUserByEmail = async (email: string) => {
  return await User.findOne({ where: { email } });
};

export const getUserByUsername = async (username: string) => {
  return await User.findOne({ where: { username } });
};

export const getAllUsers = async () => {
  return await User.findAll();
};

// 获取用户基本信息（用于学习目标设置）
export const getUserBasicInfo = async (userId: number) => {
  return await User.findByPk(userId, {
    attributes: ['id', 'username', 'nickname']
  });
};
