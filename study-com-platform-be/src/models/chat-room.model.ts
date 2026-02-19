import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class ChatRoom extends Model {
  public id!: number;
  public name!: string;
  public type!: 'public' | 'private' | 'study_group';
  public max_users!: number;
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ChatRoom.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('public', 'private', 'study_group'),
    defaultValue: 'public'
  },
  max_users: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'chat_rooms',
  timestamps: true,
  underscored: true
});

export default ChatRoom;