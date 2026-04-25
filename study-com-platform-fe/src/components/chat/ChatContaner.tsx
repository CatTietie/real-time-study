import React, { useState } from 'react';
import { Card, Row, Col } from 'antd';
import CompactMessageList from './CompactMessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsers } from './OnlineUsers';
import { ChatRoomSelector } from './ChatRoomSelector';
import { useChatSocket } from '../../hooks/useChatSocket';
import { useAppSelector } from '../../app/hooks';

interface ChatContainerProps {
  roomId: number;
  onRoomChange: (roomId: number) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  roomId, 
  onRoomChange 
}) => {
  const authState = useAppSelector(state => state.auth);
  
  // 提取用户信息
  const { role, username, userId, nickname } = authState;
  
  // 构造user对象用于兼容性
  const user = username && userId ? {
    id: userId,
    username: username,
    nickname: nickname || '',
    role: role || 'student'
  } : undefined;
  
  // 用户信息验证
  const isValidUser = user && 
                     typeof user.id === 'number' && 
                     user.id > 0 && 
                     typeof user.username === 'string' && 
                     user.username.length > 0;
  
  // 提取参数
  const extractedUserId = isValidUser ? user.id : 0;
  const extractedUsername = isValidUser ? user.username : '';
  
  // 初始化hooks（必须在所有条件判断之前）
  const { isConnected, sendMessage, sendSystemMessage, socket } = useChatSocket({
    roomId,
    userId: extractedUserId,
    username: extractedUsername,
    nickname: user?.nickname
  });

  const [inputValue, setInputValue] = useState('');
  
  // 如果用户信息无效，显示错误信息而不是聊天界面
  if (!isValidUser) {
    return (
      <Card 
        title="聊天室" 
        style={{ 
          borderRadius: '16px', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          background: 'rgba(255, 255, 255, 0.95)'
        }}
        headStyle={{ 
          borderBottom: '1px solid #f0f0f0',
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          borderRadius: '16px 16px 0 0',
          padding: '16px 24px'
        }}
      >
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#ff4d4f' }}>
          <p style={{ fontSize: '18px', marginBottom: '12px' }}>❌ 用户信息加载失败</p>
          <p style={{ color: '#718096' }}>请刷新页面或重新登录</p>
        </div>
      </Card>
    );
  }

  const handleSend = () => {
    if (inputValue.trim() && isConnected) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  // 处理图片发送
  const handleSendImage = (fileUrl: string, fileName: string, fileSize: number) => {
    if (isConnected) {
      sendMessage(fileUrl, 'image', {
        file_name: fileName,
        file_size: fileSize,
        file_url: fileUrl
      });
    }
  };

  // 处理文件发送
  const handleSendFile = (fileUrl: string, fileName: string, fileSize: number) => {
    if (isConnected) {
      sendMessage(fileUrl, 'file', {
        file_name: fileName,
        file_size: fileSize,
        file_url: fileUrl
      });
    }
  };

  return (
    <Card 
      title={`学习聊天室`} 
      extra={<span style={{ 
        padding: '4px 12px', 
        borderRadius: '12px', 
        background: isConnected ? 'linear-gradient(90deg, #48bb78 0%, #38a169 100%)' : '#e53e3e',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '500'
      }}>{isConnected ? '在线' : '离线'}</span>}
      style={{ 
        borderRadius: '16px', 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 0.95)',
        height: 'calc(100vh - 48px)'
      }}
      headStyle={{ 
        borderBottom: '1px solid #f0f0f0',
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: '16px 24px'
      }}
      bodyStyle={{ 
        height: 'calc(100% - 64px)', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Row gutter={16} style={{ flex: 1, display: 'flex' }}>
        <Col span={18} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <CompactMessageList 
            roomId={roomId}
            currentUserId={user?.id}
            username={user?.username || ''}
            nickname={user?.nickname}
            onNewMessage={(message) => {
              console.log('收到新消息:', message);
            }}
          />
          <div style={{ marginTop: '16px' }}>
            <MessageInput 
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              onSendImage={handleSendImage}
              onSendFile={handleSendFile}
              disabled={!isConnected}
            />
          </div>
        </Col>
        <Col span={6} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ChatRoomSelector 
            currentRoomId={roomId}
            onRoomChange={onRoomChange}
          />
          <OnlineUsers 
            roomId={roomId} 
            socket={socket}
            sendSystemMessage={sendSystemMessage}
            currentUser={user}
          />
        </Col>
      </Row>
    </Card>
  );
};