import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || '',
  process.env.DB_USER || '',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false
  }
);

async function runMigrations() {
  try {
    console.log('开始运行数据库迁移...');
    
    // 同步所有模型
    await sequelize.sync({ alter: true });
    console.log('数据库表结构同步完成');
    
    // 运行特定的迁移文件
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts'))
      .sort();
    
    console.log('找到迁移文件:', migrationFiles);
    
    for (const file of migrationFiles) {
      console.log(`运行迁移: ${file}`);
      try {
        const migration = require(path.join(migrationsDir, file));
        if (migration.up) {
          await migration.up(sequelize.getQueryInterface());
          console.log(`✓ ${file} 迁移完成`);
        }
      } catch (error) {
        console.log(`⚠ ${file} 迁移可能已执行或出错:`, (error as Error).message);
      }
    }
    
    console.log('所有迁移完成！');
    await sequelize.close();
  } catch (error) {
    console.error('迁移失败:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();