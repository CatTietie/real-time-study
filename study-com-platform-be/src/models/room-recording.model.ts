import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class RoomRecording extends Model {
  declare id: number;
  declare room_id: number;
  declare recorder_user_id: number;
  declare title: string;
  declare file_url: string;
  declare file_size: number;
  declare duration: number;
  declare thumbnail_url: string | null;
  declare mime_type: string;
  declare status: "uploading" | "ready" | "failed";
  declare created_at: Date;
  declare updated_at: Date;
}

RoomRecording.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "study_rooms", key: "id" },
    },
    recorder_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    file_url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    file_size: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    thumbnail_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    mime_type: {
      type: DataTypes.STRING(50),
      defaultValue: "video/webm",
    },
    status: {
      type: DataTypes.ENUM("uploading", "ready", "failed"),
      defaultValue: "uploading",
    },
  },
  {
    sequelize,
    modelName: "RoomRecording",
    tableName: "room_recordings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default RoomRecording;
