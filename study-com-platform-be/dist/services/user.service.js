"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBasicInfo = exports.getAllUsers = exports.getUserByUsername = exports.getUserByEmail = exports.createUser = exports.updateUserById = exports.getUserById = void 0;
// 用户服务
const user_model_1 = __importDefault(require("../models/user.model"));
const getUserById = async (id) => {
    return await user_model_1.default.findByPk(id);
};
exports.getUserById = getUserById;
const updateUserById = async (id, data) => {
    return await user_model_1.default.update(data, { where: { id } });
};
exports.updateUserById = updateUserById;
const createUser = async (userData) => {
    return await user_model_1.default.create(userData);
};
exports.createUser = createUser;
const getUserByEmail = async (email) => {
    return await user_model_1.default.findOne({ where: { email } });
};
exports.getUserByEmail = getUserByEmail;
const getUserByUsername = async (username) => {
    return await user_model_1.default.findOne({ where: { username } });
};
exports.getUserByUsername = getUserByUsername;
const getAllUsers = async () => {
    return await user_model_1.default.findAll();
};
exports.getAllUsers = getAllUsers;
// 获取用户基本信息（用于学习目标设置）
const getUserBasicInfo = async (userId) => {
    return await user_model_1.default.findByPk(userId, {
        attributes: ['id', 'username', 'nickname']
    });
};
exports.getUserBasicInfo = getUserBasicInfo;
//# sourceMappingURL=user.service.js.map