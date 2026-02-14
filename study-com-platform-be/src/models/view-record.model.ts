// 浏览记录模型
import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

const ViewRecord = sequelize.define(
  "ViewRecord",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "用户ID",
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "帖子ID",
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "IP地址",
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "用户代理",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "创建时间",
    },
  },
  {
    tableName: "view_records",
    timestamps: false,
    indexes: [
      {
        fields: ["user_id", "post_id", "created_at"],
        name: "idx_user_post_time",
      },
      {
        fields: ["post_id"],
        name: "idx_post_id",
      },
      {
        fields: ["user_id", "created_at"],
        name: "idx_user_time",
      },
    ],
  }
);

export default ViewRecord;