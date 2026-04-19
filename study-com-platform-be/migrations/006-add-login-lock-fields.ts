import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn('users', 'failed_login_attempts', {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: '登录失败次数'
  });

  await queryInterface.addColumn('users', 'lock_until', {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '账号锁定截止时间'
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn('users', 'failed_login_attempts');
  await queryInterface.removeColumn('users', 'lock_until');
}
