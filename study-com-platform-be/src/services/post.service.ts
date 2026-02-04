// 帖子服务
import Post from "../models/post.model";

export const createPost = async (postData: any) => {
  return await Post.create(postData);
};

export const getPostById = async (id: number) => {
  return await Post.findByPk(id);
};

export const getAllPosts = async () => {
  return await Post.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const updatePost = async (id: number, data: any) => {
  return await Post.update(data, { where: { id } });
};

export const deletePost = async (id: number) => {
  return await Post.destroy({ where: { id } });
};

export const getPostsByAuthor = async (author: string) => {
  return await Post.findAll({
    where: { author },
    order: [["createdAt", "DESC"]],
  });
};
