-- ============================================
-- 成就中心系统 - 数据库建表脚本
-- 说明：此脚本包含徽章系统、用户徽章记录、签到记录等相关表
-- 数据库：MySQL
-- ============================================

-- --------------------------------------------------------
-- 1. 徽章定义表 (badges)
-- 存储所有徽章的定义配置
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    badge_id VARCHAR(50) NOT NULL UNIQUE COMMENT '徽章唯一标识（如 first_post）',
    name VARCHAR(100) NOT NULL COMMENT '徽章名称',
    description VARCHAR(500) COMMENT '徽章描述',
    icon VARCHAR(100) NOT NULL DEFAULT 'TrophyOutlined' COMMENT '徽章图标名称',
    category ENUM('learning', 'community', 'challenge') NOT NULL DEFAULT 'community' COMMENT '徽章分类：learning-学习类, community-社区类, challenge-挑战类',
    old_category ENUM('achievement', 'activity', 'quality', 'special') COMMENT '旧分类（兼容用）',
    threshold INT NOT NULL DEFAULT 1 COMMENT '解锁目标值',
    requirement VARCHAR(200) COMMENT '解锁条件描述',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重（从小到大）',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：1-启用, 0-禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='徽章定义表';

-- --------------------------------------------------------
-- 2. 用户徽章记录表 (user_badges)
-- 记录用户获得的徽章
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_badges (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    user_id INT NOT NULL COMMENT '用户ID',
    badge_id VARCHAR(50) NOT NULL COMMENT '徽章标识',
    progress INT NOT NULL DEFAULT 0 COMMENT '当前进度值',
    is_unlocked TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已解锁：1-已解锁, 0-未解锁',
    unlocked_at TIMESTAMP NULL COMMENT '解锁时间',
    last_progress_at TIMESTAMP NULL COMMENT '最后进度更新时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY uk_user_badge (user_id, badge_id),
    INDEX idx_user_id (user_id),
    INDEX idx_badge_id (badge_id),
    INDEX idx_is_unlocked (is_unlocked),
    INDEX idx_unlocked_at (unlocked_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户徽章记录表';

-- --------------------------------------------------------
-- 3. 签到记录表 (checkin_records)
-- 记录用户每日签到/获取积分的日期（用于计算连续天数）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkin_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    user_id INT NOT NULL COMMENT '用户ID',
    checkin_date DATE NOT NULL COMMENT '签到日期',
    points_earned INT NOT NULL DEFAULT 0 COMMENT '当日获得积分数',
    checkin_type ENUM('auto', 'manual') NOT NULL DEFAULT 'auto' COMMENT '签到类型：auto-自动（通过积分记录）, manual-手动签到',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    UNIQUE KEY uk_user_date (user_id, checkin_date),
    INDEX idx_user_id (user_id),
    INDEX idx_checkin_date (checkin_date),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='签到记录表';

-- --------------------------------------------------------
-- 初始化徽章数据
-- 插入当前系统中定义的所有徽章
-- --------------------------------------------------------
INSERT INTO badges (badge_id, name, description, icon, category, old_category, threshold, requirement, sort_order, is_active) VALUES
-- 学习类
('centurion', '百分达人', '累计获得100积分', 'StarOutlined', 'learning', 'achievement', 100, '累计积分 ≥ 100', 10, 1),
('thousandaire', '千分精英', '累计获得1000积分', 'CrownOutlined', 'learning', 'achievement', 1000, '累计积分 ≥ 1000', 11, 1),

-- 社区类
('first_post', '初次发文', '发布你的第一篇帖子', 'EditOutlined', 'community', 'achievement', 1, '累计发帖 ≥ 1', 1, 1),
('regular_poster', '积极创作者', '累计发布10篇帖子', 'EditFilled', 'community', 'activity', 10, '累计发帖 ≥ 10', 2, 1),
('content_master', '内容大师', '累计发布50篇帖子', 'TrophyOutlined', 'community', 'achievement', 50, '累计发帖 ≥ 50', 3, 1),
('first_comment', '初次互动', '发表第一条评论', 'MessageOutlined', 'community', 'activity', 1, '累计评论 ≥ 1', 4, 1),
('social_butterfly', '社交达人', '累计发表30条评论', 'TeamOutlined', 'community', 'activity', 30, '累计评论 ≥ 30', 5, 1),
('first_like_received', '初获认可', '获得第一个点赞', 'LikeOutlined', 'community', 'quality', 1, '获得点赞 ≥ 1', 12, 1),
('popular_author', '人气作者', '累计获得50个点赞', 'HeartOutlined', 'community', 'quality', 50, '获得点赞 ≥ 50', 13, 1),

-- 挑战类
('streak_3', '三天连续', '连续3天都获得积分', 'FireOutlined', 'challenge', 'activity', 3, '连续3天有积分记录', 6, 1),
('streak_7', '周周坚持', '连续7天都获得积分', 'CalendarOutlined', 'challenge', 'activity', 7, '连续7天有积分记录', 7, 1),
('streak_30', '月度达人', '连续30天都获得积分', 'RocketOutlined', 'challenge', 'achievement', 30, '连续30天有积分记录', 8, 1),
('daily_high', '高产日', '单日获得积分≥20', 'RiseOutlined', 'challenge', 'quality', 20, '单日积分 ≥ 20', 9, 1);

-- --------------------------------------------------------
-- 可选：创建视图用于快速查询用户徽章进度
-- --------------------------------------------------------

-- 用户徽章概览视图
CREATE OR REPLACE VIEW v_user_badges_overview AS
SELECT 
    ub.user_id,
    COUNT(DISTINCT CASE WHEN ub.is_unlocked = 1 THEN ub.badge_id END) AS unlocked_count,
    COUNT(DISTINCT b.badge_id) AS total_count,
    ROUND(COUNT(DISTINCT CASE WHEN ub.is_unlocked = 1 THEN ub.badge_id END) * 100.0 / COUNT(DISTINCT b.badge_id), 0) AS completion_rate,
    b.category,
    COUNT(DISTINCT CASE WHEN ub.is_unlocked = 1 AND b.category = 'learning' THEN ub.badge_id END) AS learning_unlocked,
    COUNT(DISTINCT CASE WHEN b.category = 'learning' THEN b.badge_id END) AS learning_total,
    COUNT(DISTINCT CASE WHEN ub.is_unlocked = 1 AND b.category = 'community' THEN ub.badge_id END) AS community_unlocked,
    COUNT(DISTINCT CASE WHEN b.category = 'community' THEN b.badge_id END) AS community_total,
    COUNT(DISTINCT CASE WHEN ub.is_unlocked = 1 AND b.category = 'challenge' THEN ub.badge_id END) AS challenge_unlocked,
    COUNT(DISTINCT CASE WHEN b.category = 'challenge' THEN b.badge_id END) AS challenge_total
FROM badges b
CROSS JOIN users u
LEFT JOIN user_badges ub ON u.id = ub.user_id AND b.badge_id = ub.badge_id
WHERE b.is_active = 1 AND u.status = 1
GROUP BY ub.user_id, b.category;

-- --------------------------------------------------------
-- 可选：为用户表添加连续签段相关字段
-- 如果需要在用户表中缓存连续签到天数以便快速查询
-- --------------------------------------------------------

-- ALTER TABLE users ADD COLUMN current_streak INT NOT NULL DEFAULT 0 COMMENT '当前连续签到天数' AFTER study_duration;
-- ALTER TABLE users ADD COLUMN max_streak INT NOT NULL DEFAULT 0 COMMENT '历史最大连续签到天数' AFTER current_streak;
-- ALTER TABLE users ADD COLUMN last_checkin_date DATE NULL COMMENT '最后签到日期' AFTER max_streak;
-- CREATE INDEX idx_current_streak ON users(current_streak);
-- CREATE INDEX idx_last_checkin_date ON users(last_checkin_date);

-- --------------------------------------------------------
-- 完成说明
-- --------------------------------------------------------
/*
建表完成后，您可以：

1. 直接运行此脚本创建表结构和初始化数据
2. 当前系统中的徽章定义是硬编码在代码中的，
   这些表可以作为未来扩展的基础，或者用于统计分析

主要表说明：
- badges: 存储所有徽章的定义，包含分类、图标、解锁条件等
- user_badges: 记录每个用户的徽章进度和解锁状态
- checkin_records: 记录用户每日获得积分的情况，用于计算连续天数

注意：
- 外键约束要求 users 表已存在
- 如果需要与现有代码无缝集成，可以考虑：
  a. 修改代码从数据库读取徽章定义
  b. 或者保持代码中的硬编码，用这些表做记录和统计
*/
