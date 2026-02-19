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
    // 处理各种可能的时间格式
    let date: Date;
    
    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'string') {
      // 尝试解析ISO字符串
      date = new Date(dateString);
      // 如果解析失败，尝试其他格式
      if (isNaN(date.getTime())) {
        date = new Date(Date.parse(dateString));
      }
    } else {
      date = new Date();
    }
    
    // 如果日期仍然无效，返回默认值
    if (isNaN(date.getTime())) {
      return '刚刚';
    }
    
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
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: '#fff'
    }}>
      <List
        dataSource={messages}
        locale={{ emptyText: '暂无消息，快来发送第一条消息吧！' }}
        renderItem={(message) => {
          // 系统消息的特殊处理
          if (message.message_type === 'system') {
            return (
              <List.Item style={{ 
                border: 'none', 
                padding: '8px 0',
                justifyContent: 'center'
              }}>
                <div style={{
                  backgroundColor: '#e6f7ff',
                  color: '#1890ff',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  display: 'inline-block',
                  maxWidth: '90%',
                  textAlign: 'center',
                  border: '1px solid #91d5ff',
                  fontSize: '14px'
                }}>
                  <Text type="secondary" style={{ fontSize: '12px', marginRight: '8px' }}>
                    {formatTime(message.created_at)}
                  </Text>
                  <Text style={{ color: '#1890ff' }}>
                    {message.content}
                  </Text>
                </div>
              </List.Item>
            );
          }
          
          // 普通消息的处理
          return (
            <List.Item style={{ 
              border: 'none', 
              padding: '12px 0',
              justifyContent: message.user_id === currentUserId ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '80%',
                textAlign: message.user_id === currentUserId ? 'right' : 'left'
              }}>
                <div>
                  <Text strong style={{ fontSize: '12px', color: message.user_id === currentUserId ? '#fff' : '#888' }}>
                    {message.username || message.nickname || `用户${message.user_id}`}
                  </Text>
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: '12px', 
                      marginLeft: '8px',
                      color: message.user_id === currentUserId ? 'rgba(255,255,255,0.7)' : '#aaa'
                    }}
                  >
                    {formatTime(message.created_at)}
                  </Text>
                </div>
                <div style={{
                  backgroundColor: message.user_id === currentUserId ? '#1890ff' : '#f0f0f0',
                  color: message.user_id === currentUserId ? 'white' : 'rgba(0,0,0,0.85)',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  marginTop: '4px',
                  display: 'inline-block',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  boxShadow: message.user_id === currentUserId 
                    ? '0 2px 8px rgba(24, 144, 255, 0.2)' 
                    : '0 1px 4px rgba(0,0,0,0.1)'
                }}>
                  {message.content}
                </div>
              </div>
            </List.Item>
          );
        }}
      />
      <div ref={messagesEndRef} />
    </div>
  );
};