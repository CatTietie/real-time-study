import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../config/sequelize";

// 学习目标模型类定义
interface LearningGoalAttributes {
  id: CreationOptional<number>;
  user_id: number;
  nickname: string;
  username: string;
  goal_posts: number;
  goal_comments: number;
  goal_hot_posts: number;
  goal_points: number;
  created_at: CreationOptional<Date>;
  updated_at: CreationOptional<Date>;
}

class LearningGoalModel extends Model<InferAttributes<LearningGoalModel>, InferCreationAttributes<LearningGoalModel>> {
  declare id: CreationOptional<number>;
  declare user_id: number;
  declare nickname: string;
  declare username: string;
  declare goal_posts: number;
  declare goal_comments: number;
  declare goal_hot_posts: number;
  declare goal_points: number;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

// 学习目标表
export const LearningGoal = LearningGoalModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "学习目标ID"
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "用户ID"
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "用户昵称"
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "用户账号"
    },
    goal_posts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: "发帖目标（篇/天）"
    },
    goal_comments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      comment: "评论目标（条/天）"
    },
    goal_hot_posts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "热榜目标（篇/周）"
    },
    goal_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 500,
      comment: "积分目标（分/月）"
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "创建时间"
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "更新时间"
    }
  },
  {
    sequelize,
    tableName: "learning_goals",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "idx_user_id",
        fields: ["user_id"]
      },
      {
        name: "idx_username",
        fields: ["username"]
      }
    ]
  }
);

// 创建表的SQL语句
export const CREATE_LEARNING_GOALS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS learning_goals (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '学习目标ID',
  user_id INT NOT NULL COMMENT '用户ID',
  nickname VARCHAR(50) NOT NULL COMMENT '用户昵称',
  username VARCHAR(50) NOT NULL COMMENT '用户账号',
  goal_posts INT NOT NULL DEFAULT 3 COMMENT '发帖目标（篇/天）',
  goal_comments INT NOT NULL DEFAULT 20 COMMENT '评论目标（条/天）',
  goal_hot_posts INT NOT NULL DEFAULT 1 COMMENT '热榜目标（篇/周）',
  goal_points INT NOT NULL DEFAULT 500 COMMENT '积分目标（分/月）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_username (username),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习目标设置表';
`;

// 插入示例数据的SQL语句
export const INSERT_SAMPLE_LEARNING_GOALS_SQL = `
INSERT INTO learning_goals (user_id, nickname, username, goal_posts, goal_comments, goal_hot_posts, goal_points) VALUES
(1, '张三', 'zhangsan', 3, 20, 1, 500),
(2, '李四', 'lisi', 2, 15, 2, 800),
(3, '王五', 'wangwu', 5, 30, 1, 1000)
ON DUPLICATE KEY UPDATE 
  nickname = VALUES(nickname),
  username = VALUES(username),
  goal_posts = VALUES(goal_posts),
  goal_comments = VALUES(goal_comments),
  goal_hot_posts = VALUES(goal_hot_posts),
  goal_points = VALUES(goal_points);
`;

// 查询学习目标的SQL语句
export const QUERY_LEARNING_GOALS_BY_USER_ID_SQL = `
SELECT 
  id,
  user_id,
  nickname,
  username,
  goal_posts,
  goal_comments,
  goal_hot_posts,
  goal_points,
  created_at,
  updated_at
FROM learning_goals 
WHERE user_id = ?
`;

// 更新学习目标的SQL语句
export const UPDATE_LEARNING_GOALS_SQL = `
UPDATE learning_goals 
SET 
  nickname = ?,
  username = ?,
  goal_posts = ?,
  goal_comments = ?,
  goal_hot_posts = ?,
  goal_points = ?,
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = ?
`;

// 插入或更新学习目标的SQL语句（使用UPSERT）
export const UPSERT_LEARNING_GOALS_SQL = `
INSERT INTO learning_goals (user_id, nickname, username, goal_posts, goal_comments, goal_hot_posts, goal_points)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  username = VALUES(username),
  goal_posts = VALUES(goal_posts),
  goal_comments = VALUES(goal_comments),
  goal_hot_posts = VALUES(goal_hot_posts),
  goal_points = VALUES(goal_points),
  updated_at = CURRENT_TIMESTAMP
`;