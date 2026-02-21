import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";
import User from "./user.model";

class WhiteboardSnapshot extends Model {
  public id!: number;
  public whiteboard_id!: number;
  public user_id!: number;
  public name!: string;
  public data!: string; // JSON字符串存储Tldraw快照数据
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WhiteboardSnapshot.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  whiteboard_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'whiteboards',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  data: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'whiteboard_snapshots',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['whiteboard_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['whiteboard_id', 'user_id']
    }
  ]
});

// 关联关系
WhiteboardSnapshot.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User'
});

export default WhiteboardSnapshot;