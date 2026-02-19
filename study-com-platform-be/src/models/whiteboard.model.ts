import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class Whiteboard extends Model {
  public id!: number;
  public room_id!: number;
  public name!: string;
  public type!: string;
  public width!: number;
  public height!: number;
  public background_color!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Whiteboard.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
    // 移除unique约束，允许多个白板关联同一个房间
  },
  name: {
    type: DataTypes.STRING(100),
    defaultValue: '协作白板'
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'general', // general, brainstorming, diagram, sketch 等
    allowNull: false
  },
  width: {
    type: DataTypes.INTEGER,
    defaultValue: 1200
  },
  height: {
    type: DataTypes.INTEGER,
    defaultValue: 800
  },
  background_color: {
    type: DataTypes.STRING(7),
    defaultValue: '#FFFFFF'
  }
}, {
  sequelize,
  tableName: 'whiteboards',
  timestamps: true,
  underscored: true
});

export default Whiteboard;