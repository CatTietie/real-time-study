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
      <Card title="聊天室">
        <div style={{ textAlign: 'center', padding: '40px', color: '#ff4d4f' }}>
          <p>❌ 用户信息加载失败</p>
          <p>请刷新页面或重新登录</p>
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

  return (
    <Card 
      title={`学习聊天室`} 
      extra={<span>{isConnected ? '在线' : '离线'}</span>}
    >
      <Row gutter={16}>
        <Col span={18}>
          <CompactMessageList 
            roomId={roomId}
            currentUserId={user?.id}
            username={user?.username || ''}
            nickname={user?.nickname}
            onNewMessage={(message) => {
              // 这里可以处理新消息的通知或其他逻辑
              console.log('收到新消息:', message);
            }}
          />
          <MessageInput 
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            disabled={!isConnected}
          />
        </Col>
        <Col span={6}>
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