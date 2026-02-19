import React, { useEffect, useRef } from 'react';
import { List, Avatar, Typography } from 'antd';
import type { ChatMessage } from '../../types/chat';

const { Text } = Typography;

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: number;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUserId 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 格式化时间的辅助函数
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div style={{ 
      height: '400px', 
      overflowY: 'auto', 
      border: '1px solid #f0f0f0',
      borderRadius: '4px',
      padding: '12px',
      marginBottom: '12px'
    }}>
      <List
        dataSource={messages}
        renderItem={(message) => (
          <List.Item style={{ 
            border: 'none', 
            padding: '8px 0',
            justifyContent: message.user_id === currentUserId ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '70%',
              textAlign: message.user_id === currentUserId ? 'right' : 'left'
            }}>
              <div>
                <Text strong style={{ fontSize: '12px', color: '#888' }}>
                  {message.username || `用户${message.user_id}`}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                  {formatTime(message.created_at)}
                </Text>
              </div>
              <div style={{
                backgroundColor: message.user_id === currentUserId ? '#1890ff' : '#f0f0f0',
                color: message.user_id === currentUserId ? 'white' : 'black',
                padding: '8px 12px',
                borderRadius: '12px',
                marginTop: '4px',
                display: 'inline-block',
                maxWidth: '100%',
                wordBreak: 'break-word'
              }}>
                {message.content}
              </div>
            </div>
          </List.Item>
        )}
      />
      <div ref={messagesEndRef} />
    </div>
  );
};