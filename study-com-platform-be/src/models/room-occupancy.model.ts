import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class RoomOccupancy extends Model {
  public id!: number;
  public user_id!: number;
  public room_id!: number;
  public join_time!: Date;
  public leave_time!: Date | null;
  public status!: 'active' | 'left';
}

RoomOccupancy.init(
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
    join_time: { 
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "加入时间"
    },
    leave_time: { 
      type: DataTypes.DATE,
      allowNull: true,
      comment: "离开时间"
    },
    status: { 
      type: DataTypes.ENUM('active', 'left'), 
      defaultValue: 'active',
      comment: "状态"
    },
  },
  {
    sequelize,
    modelName: "RoomOccupancy",
    tableName: "room_occupancy",
    timestamps: false,
  }
);

export default RoomOccupancy;