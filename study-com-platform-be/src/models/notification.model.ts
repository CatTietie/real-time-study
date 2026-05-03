import { DataTypes, Model, Op } from "sequelize";
import sequelize from "../config/sequelize";
import StudyRoom from "./study-room.model";

interface NotificationAttributes {
  id: number;
  user_id: number;
  title: string;
  content: string;
  notification_type: 'reservation_start' | 'reservation_renewal' | 'chat_message' | 'system';
  reservation_id: number | null;
  chat_room_id: number | null;
  is_read: boolean;
  metadata: Record<string, any> | null;
  created_at?: Date;
  updated_at?: Date;
}

interface NotificationCreationAttributes extends Omit<NotificationAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> 
  implements NotificationAttributes {
  public id!: number;
  public user_id!: number;
  public title!: string;
  public content!: string;
  public notification_type!: 'reservation_start' | 'reservation_renewal' | 'chat_message' | 'system';
  public reservation_id!: number | null;
  public chat_room_id!: number | null;
  public is_read!: boolean;
  public metadata!: Record<string, any> | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static async createReservationReminder(
    userId: number,
    title: string,
    content: string,
    reservationId: number,
    notificationType: 'reservation_start' | 'reservation_renewal',
    metadata?: Record<string, any>
  ): Promise<Notification> {
    return Notification.create({
      user_id: userId,
      title,
      content,
      notification_type: notificationType,
      reservation_id: reservationId,
      chat_room_id: null,
      is_read: false,
      metadata: metadata || null
    });
  }

  public static async createChatNotification(
    userId: number,
    title: string,
    content: string,
    chatRoomId: number,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    return Notification.create({
      user_id: userId,
      title,
      content,
      notification_type: 'chat_message',
      reservation_id: null,
      chat_room_id: chatRoomId,
      is_read: false,
      metadata: metadata || null
    });
  }

  public static async getUserUnreadNotifications(
    userId: number,
    limit: number = 20
  ): Promise<Notification[]> {
    return Notification.findAll({
      where: {
        user_id: userId,
        is_read: false
      },
      include: [{
        model: StudyRoom,
        as: 'StudyRoom',
        attributes: ['id', 'name', 'location', 'capacity']
      }],
      order: [['created_at', 'DESC']],
      limit
    });
  }

  public static async getTotalUnreadCount(
    userId: number
  ): Promise<number> {
    return Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
  }

  public static async markAsRead(
    notificationId: number,
    userId: number
  ): Promise<number> {
    const [affectedCount] = await Notification.update(
      { is_read: true },
      {
        where: {
          id: notificationId,
          user_id: userId
        }
      }
    );
    return affectedCount;
  }

  public static async markAllAsRead(
    userId: number
  ): Promise<number> {
    const [affectedCount] = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );
    return affectedCount;
  }
}

Notification.init({
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '消息标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '消息内容'
  },
  notification_type: {
    type: DataTypes.ENUM('reservation_start', 'reservation_renewal', 'chat_message', 'system'),
    allowNull: false,
    defaultValue: 'system',
    comment: '通知类型：reservation_start(预约开始提醒), reservation_renewal(可续期提醒), chat_message(聊天消息), system(系统消息)'
  },
  reservation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联的预约ID'
  },
  chat_room_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联的聊天室ID'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否已读'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外的元数据'
  }
}, {
  sequelize,
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['user_id', 'is_read']
    },
    {
      fields: ['reservation_id']
    },
    {
      fields: ['chat_room_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

Notification.belongsTo(StudyRoom, {
  foreignKey: 'reservation_id',
  targetKey: 'id',
  as: 'StudyRoom',
  constraints: false
});

export default Notification;
