"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostsByAuthor = exports.deletePost = exports.updatePost = exports.getAllPosts = exports.getPostById = exports.createPost = void 0;
// 帖子服务
const post_model_1 = __importDefault(require("../models/post.model"));
const createPost = async (postData) => {
    return await post_model_1.default.create(postData);
};
exports.createPost = createPost;
const getPostById = async (id) => {
    return await post_model_1.default.findByPk(id);
};
exports.getPostById = getPostById;
const getAllPosts = async () => {
    return await post_model_1.default.findAll({
        order: [["createdAt", "DESC"]],
    });
};
exports.getAllPosts = getAllPosts;
const updatePost = async (id, data) => {
    return await post_model_1.default.update(data, { where: { id } });
};
exports.updatePost = updatePost;
const deletePost = async (id) => {
    return await post_model_1.default.destroy({ where: { id } });
};
exports.deletePost = deletePost;
const getPostsByAuthor = async (author) => {
    return await post_model_1.default.findAll({
        where: { author },
        order: [["createdAt", "DESC"]],
    });
};
exports.getPostsByAuthor = getPostsByAuthor;
//# sourceMappingURL=post.service.js.map