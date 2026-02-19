import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class WhiteboardAction extends Model {
  public id!: number;
  public whiteboard_id!: number;
  public user_id!: number;
  public action_type!: 'draw' | 'erase' | 'text' | 'shape' | 'image' | 'clear' | 'undo' | 'redo';
  public data!: string; // JSON格式的操作数据
  public timestamp!: Date;
}

WhiteboardAction.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  whiteboard_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  action_type: {
    type: DataTypes.ENUM('draw', 'erase', 'text', 'shape', 'image', 'clear', 'undo', 'redo'),
    allowNull: false
  },
  data: {
    type: DataTypes.JSON,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'whiteboard_actions',
  timestamps: false,
  underscored: true
});

export default WhiteboardAction;