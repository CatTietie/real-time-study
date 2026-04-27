import { DataTypes, Model, Op } from "sequelize";
import sequelize from "../config/sequelize";
import ChatRoom from "./chat-room.model";
import User from "./user.model";

interface UnreadMessageAttributes {
  id: number;
  user_id: number;
  room_id: number;
  last_read_message_id: number;
  unread_count: number;
  last_message_id: number;
  last_message_content: string;
  last_message_type: string;
  last_sender_id: number;
  last_sender_nickname: string;
  last_sender_avatar: string;
  created_at?: Date;
  updated_at?: Date;
}

interface UnreadMessageCreationAttributes extends Omit<UnreadMessageAttributes, 'id' | 'created_at' | 'updated_at'> {}

class UnreadMessage extends Model<UnreadMessageAttributes, UnreadMessageCreationAttributes> 
  implements UnreadMessageAttributes {
  public id!: number;
  public user_id!: number;
  public room_id!: number;
  public last_read_message_id!: number;
  public unread_count!: number;
  public last_message_id!: number;
  public last_message_content!: string;
  public last_message_type!: string;
  public last_sender_id!: number;
  public last_sender_nickname!: string;
  public last_sender_avatar!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static async incrementUnreadCount(
    roomId: number,
    messageId: number,
    messageContent: string,
    messageType: string,
    senderId: number,
    senderNickname: string,
    senderAvatar: string
  ): Promise<void> {
    try {
      const [unreadRecord, created] = await UnreadMessage.findOrCreate({
        where: {
          room_id: roomId,
          user_id: { [Op.ne]: senderId }
        },
        defaults: {
          user_id: 0,
          room_id: roomId,
          last_read_message_id: 0,
          unread_count: 1,
          last_message_id: messageId,
          last_message_content: messageContent,
          last_message_type: messageType,
          last_sender_id: senderId,
          last_sender_nickname: senderNickname,
          last_sender_avatar: senderAvatar
        }
      });

      if (!created) {
        await UnreadMessage.increment(
          { unread_count: 1 },
          {
            where: {
              room_id: roomId,
              user_id: { [Op.ne]: senderId }
            }
          }
        );

        await UnreadMessage.update(
          {
            last_message_id: messageId,
            last_message_content: messageContent,
            last_message_type: messageType,
            last_sender_id: senderId,
            last_sender_nickname: senderNickname,
            last_sender_avatar: senderAvatar
          },
          {
            where: {
              room_id: roomId,
              user_id: { [Op.ne]: senderId }
            }
          }
        );
      }
    } catch (error) {
      console.error('增加未读消息计数失败:', error);
    }
  }

  public static async incrementUnreadCountForUser(
    userId: number,
    roomId: number,
    messageId: number,
    messageContent: string,
    messageType: string,
    senderId: number,
    senderNickname: string,
    senderAvatar: string
  ): Promise<void> {
    try {
      const [unreadRecord, created] = await UnreadMessage.findOrCreate({
        where: {
          room_id: roomId,
          user_id: userId
        },
        defaults: {
          user_id: userId,
          room_id: roomId,
          last_read_message_id: 0,
          unread_count: 1,
          last_message_id: messageId,
          last_message_content: messageContent,
          last_message_type: messageType,
          last_sender_id: senderId,
          last_sender_nickname: senderNickname,
          last_sender_avatar: senderAvatar
        }
      });

      if (!created) {
        await unreadRecord.increment({ unread_count: 1 });
        await unreadRecord.update({
          last_message_id: messageId,
          last_message_content: messageContent,
          last_message_type: messageType,
          last_sender_id: senderId,
          last_sender_nickname: senderNickname,
          last_sender_avatar: senderAvatar
        });
      }
    } catch (error) {
      console.error('为用户增加未读消息计数失败:', error);
    }
  }

  public static async markAsRead(
    userId: number,
    roomId: number
  ): Promise<void> {
    try {
      await UnreadMessage.update(
        {
          unread_count: 0
        },
        {
          where: {
            user_id: userId,
            room_id: roomId
          }
        }
      );
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }

  public static async getUserUnreadList(
    userId: number
  ): Promise<any[]> {
    try {
      const unreadList = await UnreadMessage.findAll({
        where: {
          user_id: userId,
          unread_count: { [Op.gt]: 0 }
        },
        include: [{
          model: ChatRoom,
          attributes: ['id', 'name', 'type']
        }],
        order: [['updated_at', 'DESC']]
      });

      return unreadList.map(item => {
        const itemJson = item.toJSON();
        return {
          ...itemJson,
          room: itemJson.ChatRoom
        };
      });
    } catch (error) {
      console.error('获取用户未读列表失败:', error);
      return [];
    }
  }

  public static async getTotalUnreadCount(
    userId: number
  ): Promise<number> {
    try {
      const count = await UnreadMessage.sum('unread_count', {
        where: {
          user_id: userId
        }
      });
      return count || 0;
    } catch (error) {
      console.error('获取总未读计数失败:', error);
      return 0;
    }
  }
}

UnreadMessage.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '聊天室ID'
  },
  last_read_message_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '最后读取的消息ID'
  },
  unread_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '未读消息数量'
  },
  last_message_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '最后消息ID'
  },
  last_message_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '最后消息内容摘要'
  },
  last_message_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '最后消息类型'
  },
  last_sender_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最后发送者ID'
  },
  last_sender_nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '最后发送者昵称'
  },
  last_sender_avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '最后发送者头像'
  }
}, {
  sequelize,
  tableName: 'unread_messages',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'room_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['room_id']
    }
  ]
});

UnreadMessage.belongsTo(ChatRoom, {
  foreignKey: 'room_id',
  as: 'ChatRoom'
});

ChatRoom.hasMany(UnreadMessage, {
  foreignKey: 'room_id'
});

export default UnreadMessage;
