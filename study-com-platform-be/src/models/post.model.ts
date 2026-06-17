// 帖子数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Post extends Model {
  public id!: number;
  public user_id!: number;
  public title!: string;
  public category?: string;
  public tags?: string;
  public content!: string;
  public status!: number;
  public publish_status!: number;
  public audit_admin_id?: number;
  public audit_reason?: string;
  public audit_at?: Date;
  public view_count!: number;
  public like_count!: number;
  public comment_count!: number;
  public is_top!: number;
  public edit_count!: number;
  public last_edited_at?: Date;
  public images?: string;
  public deleted_at?: Date;
  public forward_post_id?: number;
  public forward_user_id?: number;
  public question_id?: number;
  public ForwardPost?: Post;
  public ForwardUser?: any;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Post.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "发帖人ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "标题",
    },
    category: {
      type: DataTypes.STRING(50),
      comment: "帖子分类",
    },
    tags: {
      type: DataTypes.TEXT,
      comment: "标签（JSON数组字符串）",
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "帖子正文内容",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: "审核状态：0-待审核, 1-审核通过, 2-违规退回",
    },
    publish_status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "发布状态：0-草稿, 1-已发布, 2-已删除, 3-已锁定",
    },
    audit_admin_id: {
      type: DataTypes.INTEGER,
      comment: "审核管理员ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    audit_reason: {
      type: DataTypes.STRING(255),
      comment: "审核原因/备注",
    },
    audit_at: {
      type: DataTypes.DATE,
      comment: "审核时间",
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "浏览量",
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "点赞数",
    },
    comment_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "评论总数",
    },
    is_top: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: "是否置顶：1-是, 0-否",
    },
    edit_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "编辑次数",
    },
    images: {
      type: DataTypes.TEXT,
      comment: "帖子图片(JSON数组字符串)",
    },
    last_edited_at: {
      type: DataTypes.DATE,
      comment: "最后编辑时间",
    },
    deleted_at: {
      type: DataTypes.DATE,
      comment: "删除时间（回收站）",
    },
    forward_post_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "转发的原帖ID",
      references: {
        model: "posts",
        key: "id",
      },
    },
    forward_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "被转发的原作者ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "关联题目ID（题库讨论帖）",
      references: {
        model: "questions",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "Post",
    tableName: "posts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["status"] },
      { fields: ["publish_status"] },
      { fields: ["category"] },
      { fields: ["created_at"] },
      { fields: ["audit_admin_id"] },
      { fields: ["forward_post_id"] },
      { fields: ["forward_user_id"] },
      { fields: ["question_id"] },
    ],
  },
);

export default Post;
