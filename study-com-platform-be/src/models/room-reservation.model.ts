import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class RoomReservation extends Model {
  public id!: number;
  public user_id!: number;
  public room_id!: number;
  public start_time!: Date;
  public end_time!: Date;
  public status!: 'confirmed' | 'in_progress' | 'ended' | 'cancelled';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RoomReservation.init(
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    user_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      comment: "用户ID"
    },
    room_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      comment: "自习室ID"
    },
    start_time: { 
      type: DataTypes.DATE, 
      allowNull: false,
      comment: "开始时间"
    },
    end_time: { 
      type: DataTypes.DATE, 
      allowNull: false,
      comment: "结束时间"
    },
    status: { 
      type: DataTypes.ENUM('confirmed', 'in_progress', 'ended', 'cancelled'), 
      defaultValue: 'confirmed',
      comment: "预约状态：confirmed(已确认), in_progress(已进入/进行中), ended(已结束), cancelled(已取消)"
    },
  },
  {
    sequelize,
    modelName: "RoomReservation",
    tableName: "room_reservations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default RoomReservation;