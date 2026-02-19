import React, { useState } from 'react';
import { Card, Row, Col } from 'antd';
import { MessageList } from './MessageList';
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
  
  // 正确提取用户信息
  const { token, role, username, userId, nickname } = authState;
  
  // 构造user对象用于兼容性
  const user = username && userId ? {
    id: userId,
    username: username,
    nickname: nickname || '',
    role: role || 'student'
  } : undefined;
  
  // 强制调试输出
  console.log('%c=== ChatContainer 调试信息 ===', 'color: blue; font-weight: bold');
  console.log('完整auth state:', authState);
  console.log('user对象:', user);
  
  // 更严格的用户信息验证
  const isValidUser = user && 
                     typeof user.id === 'number' && 
                     user.id > 0 && 
                     typeof user.username === 'string' && 
                     user.username.length > 0;
  
  console.log('用户信息是否有效:', isValidUser);
  
  // 只有在用户信息有效时才提取参数
  const extractedUserId = isValidUser ? user.id : 0;
  const extractedUsername = isValidUser ? user.username : '';
  
  console.log('最终使用的参数:', { roomId, userId: extractedUserId, username: extractedUsername });
  
  // 如果用户信息无效，显示错误信息而不是聊天界面
  if (!isValidUser) {
    console.log('%c用户信息无效，显示错误界面', 'color: red; font-weight: bold');
    return (
      <Card title="聊天室">
        <div style={{ textAlign: 'center', padding: '40px', color: '#ff4d4f' }}>
          <p>❌ 用户信息加载失败</p>
          <p>请刷新页面或重新登录</p>
        </div>
      </Card>
    );
  }
  
  const { messages, isConnected, sendMessage, sendSystemMessage, socket } = useChatSocket({
    roomId,
    userId: extractedUserId,
    username: extractedUsername
  });

  const [inputValue, setInputValue] = useState('');

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
          <MessageList messages={messages} currentUserId={user?.id} />
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
          />
        </Col>
      </Row>
    </Card>
  );
};