import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class StudyRoom extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public type!: 'physical' | 'video';
  public capacity!: number;
  public current_occupancy!: number;
  public location!: string;
  public facilities!: object;
  public image_url!: string;
  public status!: 'active' | 'maintenance' | 'closed';
  public owner_id!: number | null;
  public max_participants!: number;
  public pomodoro_focus_duration!: number;
  public pomodoro_break_duration!: number;
  public pomodoro_rounds!: number;
  public is_active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudyRoom.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "自习室名称"
    },
    description: {
      type: DataTypes.TEXT,
      comment: "自习室描述"
    },
    type: {
      type: DataTypes.ENUM('physical', 'video'),
      defaultValue: 'physical',
      comment: "自习室类型：物理/视频"
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      comment: "容纳人数"
    },
    current_occupancy: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "当前人数"
    },
    location: {
      type: DataTypes.STRING(200),
      comment: "位置信息"
    },
    facilities: {
      type: DataTypes.JSON,
      comment: "设施信息"
    },
    image_url: {
      type: DataTypes.STRING(500),
      comment: "图片URL"
    },
    status: {
      type: DataTypes.ENUM('active', 'maintenance', 'closed'),
      defaultValue: 'active',
      comment: "状态"
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "视频自习室创建者ID"
    },
    max_participants: {
      type: DataTypes.INTEGER,
      defaultValue: 9,
      comment: "视频自习室最大参与人数"
    },
    pomodoro_focus_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 25,
      comment: "番茄钟专注时长(分钟)"
    },
    pomodoro_break_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      comment: "番茄钟休息时长(分钟)"
    },
    pomodoro_rounds: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
      comment: "番茄钟轮数"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "视频自习室是否在线"
    },
  },
  {
    sequelize,
    modelName: "StudyRoom",
    tableName: "study_rooms",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default StudyRoom;