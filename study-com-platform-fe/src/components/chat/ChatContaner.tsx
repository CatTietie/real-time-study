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
  const { user } = useAppSelector(state => state.auth);
  const { messages, isConnected, sendMessage } = useChatSocket({
    roomId,
    userId: user?.id || 0,
    username: user?.username || ''
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
          <OnlineUsers roomId={roomId} />
        </Col>
      </Row>
    </Card>
  );
};