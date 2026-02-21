import { DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: any) => {
    await queryInterface.createTable('whiteboard_snapshots', {
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
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      data: {
        type: DataTypes.TEXT('long'),
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // 添加索引
    await queryInterface.addIndex('whiteboard_snapshots', ['whiteboard_id']);
    await queryInterface.addIndex('whiteboard_snapshots', ['user_id']);
    await queryInterface.addIndex('whiteboard_snapshots', ['whiteboard_id', 'user_id']);
  },

  down: async (queryInterface: any) => {
    await queryInterface.dropTable('whiteboard_snapshots');
  }
};