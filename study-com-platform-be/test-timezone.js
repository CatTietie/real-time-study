// 时区测试脚本
const { sequelize } = require('./dist/config/sequelize');
const { PostLike } = require('./dist/models/post-like.model');

async function testTimezone() {
  try {
    console.log('=== 时区测试开始 ===');
    
    // 连接数据库
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 获取当前时间和时区信息
    const now = new Date();
    console.log('当前系统时间:', now.toString());
    console.log('当前ISO时间:', now.toISOString());
    console.log('当前本地时间:', now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
    
    // 测试创建一条点赞记录
    console.log('\n=== 创建测试点赞记录 ===');
    const testLike = await PostLike.create({
      user_id: 1,
      post_id: 1
    });
    
    console.log('创建的点赞记录:');
    console.log('- ID:', testLike.id);
    console.log('- 用户ID:', testLike.user_id);
    console.log('- 帖子ID:', testLike.post_id);
    console.log('- 创建时间 (数据库):', testLike.createdAt);
    console.log('- 创建时间 (ISO):', testLike.createdAt.toISOString());
    console.log('- 创建时间 (本地):', testLike.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
    
    // 查询刚创建的记录
    console.log('\n=== 查询测试记录 ===');
    const foundLike = await PostLike.findByPk(testLike.id);
    console.log('查询到的记录:');
    console.log('- 创建时间 (数据库):', foundLike.createdAt);
    console.log('- 创建时间 (ISO):', foundLike.createdAt.toISOString());
    console.log('- 创建时间 (本地):', foundLike.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
    
    // 清理测试数据
    await testLike.destroy();
    console.log('\n测试记录已清理');
    
    console.log('\n=== 时区测试完成 ===');
    
  } catch (error) {
    console.error('时区测试失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 运行测试
testTimezone();