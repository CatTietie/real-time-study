import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

// 用户属性接口
interface UserAttributes {
  id: number;
  username: string;
  password: string;
  nickname: string;
  avatar?: string;
  role: 'admin' | 'student' | 'super_admin';
  points: number;
  status: number;
  last_login?: Date;
  study_duration?: number;
  created_at: Date;
  updated_at: Date;
}

// 创建用户时的可选属性
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at'> {}

// 用户模型类
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public password!: string;
  public nickname!: string;
  public avatar?: string;
  public role!: 'admin' | 'student' | 'super_admin';
  public points!: number;
  public status!: number;
  public last_login?: Date;
  public study_duration?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// 初始化用户模型
User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '登录账号（学号/管理员名）'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '加密存储的密码'
  },
  nickname: {
    type: DataTypes.STRING(50),
    defaultValue: '新用户',
    allowNull: true,
    comment: '用户昵称'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '头像URL路径'
  },
  role: {
    type: DataTypes.ENUM('admin', 'student', 'super_admin'),
    defaultValue: 'student',
    allowNull: true,
    comment: '角色权限：super_admin-超级管理员, admin-管理员, student-学生'
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: true,
    comment: '社区总积分（用于排行榜）'
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    allowNull: true,
    comment: '账号状态：1-启用, 0-封禁'
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  },
  study_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '学习时长'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['created_at']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    }
  ]
});

export default User;