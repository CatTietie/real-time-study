// 评论服务
import { Op, Sequelize } from "sequelize";
import Comment from "../models/comment.model";
import Post from "../models/post.model";
import User from "../models/user.model";

export const getComments = async (options: {
  page: number;
  pageSize: number;
  status?: number;
  keyword?: string;
}) => {
  const { page, pageSize, status, keyword } = options;

  const where: any = {};
  if (typeof status === "number" && !Number.isNaN(status)) {
    where.status = status;
  }
  if (keyword) {
    where.content = { [Op.like]: `%${keyword}%` };
  }

  const result = await Comment.findAndCountAll({
    where,
    include: [
      {
        model: User,
        attributes: ["id", "username", "nickname"],
      },
      {
        model: Post,
        attributes: ["id", "title"],
      },
    ],
    order: [[Sequelize.col("created_at"), "DESC"]],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  return {
    rows: result.rows,
    count: result.count,
  };
};

export const updateCommentStatus = async (id: number, status: number) => {
  return await Comment.update({ status }, { where: { id } });
};
