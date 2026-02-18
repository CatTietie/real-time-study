import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class StudyRoom extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public capacity!: number;
  public current_occupancy!: number;
  public location!: string;
  public facilities!: object;
  public image_url!: string;
  public status!: 'active' | 'maintenance' | 'closed';
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