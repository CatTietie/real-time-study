const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

// 读取配置
const env = process.env.NODE_ENV || 'development';
const configPath = path.join(__dirname, '..', 'config', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 创建 Sequelize 实例
const sequelizeConfig = config[env];
const sequelize = new Sequelize(
  sequelizeConfig.database,
  sequelizeConfig.username,
  sequelizeConfig.password,
  {
    host: sequelizeConfig.host,
    dialect: sequelizeConfig.dialect,
    port: sequelizeConfig.port,
    logging: console.log,
  }
);

// 获取迁移文件列表
const migrationsPath = path.join(__dirname, '..', 'migrations');
const migrationFiles = fs.readdirSync(migrationsPath)
  .filter(file => {
    // 只处理 .js 文件或 .ts 文件，但要避免重复
    // 如果同时存在 .js 和 .ts 版本，优先使用 .js
    const baseName = file.replace(/\.(js|ts)$/, '');
    const hasJsVersion = fs.existsSync(path.join(migrationsPath, `${baseName}.js`));
    if (file.endsWith('.ts') && hasJsVersion) {
      return false; // 如果有 .js 版本，跳过 .ts 版本
    }
    return file.endsWith('.js') || file.endsWith('.ts');
  })
  .sort();

console.log('📋 找到以下迁移文件:');
migrationFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

// 运行迁移
async function runMigrations() {
  console.log('\n🚀 开始运行迁移...\n');

  for (const file of migrationFiles) {
    console.log(`⏳ 正在运行: ${file}`);
    
    try {
      const filePath = path.join(migrationsPath, file);
      
      // 对于 .ts 文件，使用 require 加载（需要 ts-node）
      // 对于 .js 文件，直接使用 require
      let migration;
      
      if (file.endsWith('.ts')) {
        // 使用 ts-node 注册后再 require
        require('ts-node').register({
          transpileOnly: true,
          compilerOptions: {
            module: 'CommonJS'
          }
        });
        migration = require(filePath);
      } else {
        migration = require(filePath);
      }
      
      // 处理不同的导出格式
      let upFunction;
      
      if (migration.up) {
        // CommonJS 格式: module.exports = { up: ..., down: ... }
        upFunction = migration.up;
      } else if (typeof migration === 'function') {
        // 直接导出函数
        upFunction = migration;
      } else {
        // ES 模块格式: export async function up() { ... }
        // 可能需要检查 default 导出或命名导出
        const moduleExports = migration.default || migration;
        upFunction = moduleExports.up || Object.values(migration).find(v => typeof v === 'function' && v.name === 'up');
      }
      
      if (upFunction) {
        await upFunction(sequelize.getQueryInterface(), Sequelize);
        console.log(`✅ 完成: ${file}\n`);
      } else {
        console.log(`⚠️  无法找到 up 函数: ${file}\n`);
      }
      
    } catch (error) {
      console.log(`❌ 失败: ${file}`);
      console.log(`   错误: ${error.message}\n`);
      throw error;
    }
  }

  console.log('🎉 所有迁移完成！');
  await sequelize.close();
}

// 执行迁移
runMigrations().catch(async (error) => {
  console.error('\n❌ 迁移失败:', error);
  await sequelize.close();
  process.exit(1);
});