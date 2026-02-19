import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  // 创建聊天房间表
  await queryInterface.createTable('chat_rooms', {
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
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // 创建聊天消息表
  await queryInterface.createTable('chat_messages', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'chat_rooms',
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    message_type: {
      type: DataTypes.ENUM('text', 'image', 'system'),
      defaultValue: 'text'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // 创建白板表
  await queryInterface.createTable('whiteboards', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'chat_rooms',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      defaultValue: '协作白板'
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
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // 创建白板操作记录表
  await queryInterface.createTable('whiteboard_actions', {
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
    action_type: {
      type: DataTypes.ENUM('draw', 'erase', 'clear', 'undo', 'redo'),
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
  });

  // 创建索引
  await queryInterface.addIndex('chat_messages', ['room_id', 'created_at']);
  await queryInterface.addIndex('whiteboard_actions', ['whiteboard_id', 'timestamp']);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('whiteboard_actions');
  await queryInterface.dropTable('whiteboards');
  await queryInterface.dropTable('chat_messages');
  await queryInterface.dropTable('chat_rooms');
}