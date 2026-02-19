import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class ChatMessage extends Model {
  public id!: number;
  public room_id!: number;
  public user_id!: number;
  public content!: string;
  public message_type!: 'text' | 'image' | 'system';
  public readonly created_at!: Date;
}

ChatMessage.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'system'),
    defaultValue: 'text'
  }
}, {
  sequelize,
  tableName: 'chat_messages',
  timestamps: true,
  underscored: true
});

export default ChatMessage;