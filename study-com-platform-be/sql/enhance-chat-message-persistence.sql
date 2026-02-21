-- 增强聊天消息持久化存储的SQL脚本

-- 为聊天消息表添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);

-- 检查并添加updated_at字段
SET @column_exists = (SELECT COUNT(*) 
                     FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() 
                     AND TABLE_NAME = 'chat_messages' 
                     AND COLUMN_NAME = 'updated_at');

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE chat_messages ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'SELECT "updated_at column already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证表结构
DESCRIBE chat_messages;

-- 显示创建的索引
SHOW INDEX FROM chat_messages WHERE Key_name LIKE 'idx_chat_messages_%';