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
          padding: '8px 12px', 
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#fafafa'
        }}>
          <Button 
            type="link" 
            icon={<HistoryOutlined />}
            onClick={() => setShowHistoryModal(true)}
            style={{ padding: 0, height: 'auto' }}
          >
            查看历史消息 ({totalMessageCount}条)
          </Button>
        </div>
      )}

      {/* 消息列表 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '12px',
        display: 'flex',
        flexDirection: 'column'
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
            color: '#999'
          }}>
            暂无消息
          </div>
        ) : (
          <>
            {messages.slice(-4).map((message) => (
              <div 
                key={message.id} 
                style={{ 
                  marginBottom: '12px',
                  textAlign: isSystemMessage(message) ? 'center' : 
                           message.user_id === currentUserId ? 'right' : 'left'
                }}
              >
                {/* 发送人信息 */}
                {!isSystemMessage(message) && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '2px',
                    textAlign: message.user_id === currentUserId ? 'right' : 'left'
                  }}>
                    {getMessageSenderName(message)}
                  </div>
                )}
                
                {/* 消息内容 */}
                <div style={{ 
                  display: 'inline-block',
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  backgroundColor: isSystemMessage(message) ? '#f0f0f0' : 
                                 message.user_id === currentUserId ? '#1890ff' : '#fff',
                  color: isSystemMessage(message) ? '#666' : 
                        message.user_id === currentUserId ? '#fff' : '#333',
                  border: isSystemMessage(message) ? 'none' : '1px solid #d9d9d9',
                  wordWrap: 'break-word',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {message.content}
                </div>
                
                {/* 发送时间 */}
                <div style={{ 
                  fontSize: '11px', 
                  color: '#999', 
                  marginTop: '2px',
                  textAlign: message.user_id === currentUserId ? 'right' : 'left'
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