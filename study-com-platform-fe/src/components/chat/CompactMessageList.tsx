import React, { useState, useEffect, useRef } from 'react';
import { Spin, Button, Modal, Space } from 'antd';
import { HistoryOutlined, DownOutlined } from "@ant-design/icons";
import type { ChatMessage } from '../../types/chat';
import { getChatHistory } from '../../services/chat';
import EnhancedMessageList from './EnhancedMessageList';
import { useChatSocket } from '../../hooks/useChatSocket';

interface CompactMessageListProps {
  roomId: number;
  currentUserId?: number;
  onNewMessage?: (message: ChatMessage) => void;
  username: string;
  nickname?: string;
}

const CompactMessageList: React.FC<CompactMessageListProps> = ({ 
  roomId, 
  currentUserId,
  onNewMessage,
  username,
  nickname
}) => {
  const [loading, setLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 使用聊天Socket hook获取实时消息
  const { messages, isConnected } = useChatSocket({
    roomId,
    userId: currentUserId || 0,
    username,
    nickname
  });

  // 当有新消息时，滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载总消息数用于显示历史消息按钮
  useEffect(() => {
    if (roomId > 0) {
      loadTotalMessageCount();
    }
  }, [roomId]);

  const loadTotalMessageCount = async () => {
    try {
      const result = await getChatHistory(roomId, 1, 1); // 只需要总数，不需要具体消息
      setTotalMessageCount(result.pagination.total);
    } catch (error) {
      console.error('加载消息总数失败:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string | Date) => {
    console.log('格式化时间:', timestamp, typeof timestamp);
    const date = new Date(timestamp);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.log('无效日期:', timestamp);
      return '时间未知';
    }
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isSystemMessage = (message: ChatMessage) => {
    return message.message_type === 'system' || message.user_id === 0;
  };

  const getMessageSenderName = (message: ChatMessage) => {
    if (isSystemMessage(message)) {
      return '系统';
    }
    
    // 优先使用昵称，如果没有则使用用户名
    const displayName = message.nickname || message.username || `用户${message.user_id}`;
    return displayName;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部历史消息按钮 */}
      {totalMessageCount > 4 && (
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid #f0f0f0',
          background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          borderRadius: '12px',
          margin: '8px'
        }}>
          <Button 
            type="primary" 
            icon={<HistoryOutlined />}
            onClick={() => setShowHistoryModal(true)}
            style={{ 
              padding: '8px 20px', 
              height: 'auto',
              borderRadius: '12px',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            查看历史消息 ({totalMessageCount}条)
          </Button>
        </div>
      )}

      {/* 消息列表 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(226, 232, 240, 0.6) 0%, rgba(203, 213, 225, 0.6) 100%)',
        borderRadius: '20px',
        margin: '12px',
        border: '1px solid rgba(160, 174, 192, 0.3)',
        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.03)'
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1 
          }}>
            <Spin tip="加载消息中..." />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1,
            color: '#a0aec0',
            fontSize: '16px',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>💬</div>
            <div>暂无消息</div>
            <div style={{ fontSize: '12px', color: '#cbd5e0' }}>开始发送第一条消息吧</div>
          </div>
        ) : (
          <>
            {messages.slice(-4).map((message) => (
              <div 
                key={message.id} 
                style={{ 
                  marginBottom: '16px',
                  textAlign: isSystemMessage(message) ? 'center' : 
                           message.user_id === currentUserId ? 'right' : 'left',
                  transition: 'all 0.3s ease'
                }}
                className="message-item"
              >
                {/* 发送人信息 */}
                {!isSystemMessage(message) && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#718096', 
                    marginBottom: '4px',
                    textAlign: message.user_id === currentUserId ? 'right' : 'left',
                    fontWeight: '500',
                    letterSpacing: '0.5px'
                  }}>
                    {getMessageSenderName(message)}
                  </div>
                )}
                
                {/* 消息内容 */}
                <div style={{ 
                  display: 'inline-block',
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: isSystemMessage(message) 
                    ? 'rgba(226, 232, 240, 0.9)'  // 系统消息：浅灰色背景
                    : message.user_id === currentUserId 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'  // 自己的消息：蓝紫渐变
                      : 'rgba(255, 255, 255, 0.98)',  // 他人消息：白色背景
                  color: isSystemMessage(message) 
                    ? '#4a5568'  // 系统消息文字：深灰色
                    : message.user_id === currentUserId 
                      ? '#ffffff'  // 自己的消息文字：纯白色
                      : '#1a202c',  // 他人消息文字：深黑色
                  border: isSystemMessage(message) 
                    ? 'none' 
                    : message.user_id === currentUserId 
                      ? 'none' 
                      : '1px solid rgba(160, 174, 192, 0.5)',  // 他人消息：添加边框增加区分度
                  wordWrap: 'break-word',
                  boxShadow: message.user_id === currentUserId 
                    ? '0 6px 20px rgba(102, 126, 234, 0.4)'  // 自己的消息：较深阴影
                    : isSystemMessage(message)
                      ? '0 2px 8px rgba(0, 0, 0, 0.05)'  // 系统消息：浅阴影
                      : '0 3px 12px rgba(0, 0, 0, 0.08)',  // 他人消息：中等阴影
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  fontWeight: '500',  // 增加字体粗细提高可读性
                  lineHeight: '1.6'  // 增加行高提高可读性
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = message.user_id === currentUserId 
                    ? '0 8px 25px rgba(102, 126, 234, 0.4)' 
                    : '0 6px 20px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = message.user_id === currentUserId 
                    ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.06)';
                }}
                >
                  {message.content}
                </div>
                
                {/* 发送时间 */}
                <div style={{ 
                  fontSize: '11px', 
                  color: '#a0aec0', 
                  marginTop: '4px',
                  textAlign: message.user_id === currentUserId ? 'right' : 'left',
                  fontWeight: '400'
                }}>
                  {formatTime(message.created_at)}
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 历史消息弹窗 */}
      <Modal
        title="历史消息"
        open={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        footer={null}
        width={800}
        destroyOnClose
        centered
        styles={{
          header: {
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderRadius: '16px 16px 0 0',
            borderBottom: 'none',
            padding: '16px 24px'
          },
          content: {
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
          },
          body: {
            padding: '0'
          }
        }}
      >
        <div style={{ height: '60vh' }}>
          <EnhancedMessageList 
            roomId={roomId}
            currentUserId={currentUserId}
          />
        </div>
      </Modal>
    </div>
  );
};

export default CompactMessageList;