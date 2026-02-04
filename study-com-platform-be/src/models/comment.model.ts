// 评论数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Comment extends Model {
  public id!: number;
  public post_id!: number;
  public user_id!: number;
  public parent_id?: number;
  public content!: string;
  public status!: number;
  public like_count!: number;
  public is_deleted!: number;
  public deleted_at?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Comment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "所属帖子ID",
      references: {
        model: "posts",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "评论人ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    parent_id: {
      type: DataTypes.INTEGER,
      comment: "父评论ID（楼中楼）",
      references: {
        model: "comments",
        key: "id",
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "评论内容",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-显示, 0-因违规隐藏",
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "点赞数",
    },
    is_deleted: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: "是否删除：1-已删除",
    },
    deleted_at: {
      type: DataTypes.DATE,
      comment: "删除时间",
    },
  },
  {
    sequelize,
    modelName: "Comment",
    tableName: "comments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["post_id"] },
      { fields: ["user_id"] },
      { fields: ["created_at"] },
      { fields: ["parent_id"] },
      { fields: ["is_deleted"] },
    ],
  },
);

export default Comment;
