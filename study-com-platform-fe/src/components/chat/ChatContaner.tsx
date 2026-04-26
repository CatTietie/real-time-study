import React, { useState } from 'react';
import { Card, Row, Col, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { 
  MessageOutlined, 
  GlobalOutlined, 
  LockOutlined, 
  BookOutlined,
  FireOutlined,
  CoffeeOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  DownOutlined
} from '@ant-design/icons';
import CompactMessageList from './CompactMessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsers } from './OnlineUsers';
import { ChatRoomSelector } from './ChatRoomSelector';
import { useChatSocket } from '../../hooks/useChatSocket';
import { useAppSelector } from '../../app/hooks';
import type { ChatRoom } from '../../types/chat';

type UserStatus = 'online' | 'away' | 'busy';

interface StatusConfig {
  color: string;
  label: string;
  icon: React.ReactNode;
}

const STATUS_CONFIG: Record<UserStatus, StatusConfig> = {
  online: {
    color: '#52c41a',
    label: '在线',
    icon: <FireOutlined />
  },
  away: {
    color: '#faad14',
    label: '离开',
    icon: <CoffeeOutlined />
  },
  busy: {
    color: '#ff4d4f',
    label: '勿扰',
    icon: <PauseCircleOutlined />
  }
};

interface ChatContainerProps {
  roomId: number;
  onRoomChange: (roomId: number) => void;
  currentRoom?: ChatRoom;
}

type RoomType = 'public' | 'private' | 'study_group';

interface RoomTypeConfig {
  icon: React.ReactNode;
  label: string;
}

const ROOM_TYPE_CONFIG: Record<RoomType, RoomTypeConfig> = {
  public: {
    icon: <GlobalOutlined />,
    label: '公开房间'
  },
  private: {
    icon: <LockOutlined />,
    label: '私密房间'
  },
  study_group: {
    icon: <BookOutlined />,
    label: '学习小组'
  }
};

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  roomId, 
  onRoomChange,
  currentRoom
}) => {
  const authState = useAppSelector(state => state.auth);
  const [userStatus, setUserStatus] = useState<UserStatus>('online');
  
  const { role, username, userId, nickname } = authState;
  
  const user = username && userId ? {
    id: userId,
    username: username,
    nickname: nickname || '',
    role: role || 'student'
  } : undefined;
  
  const isValidUser = user && 
                     typeof user.id === 'number' && 
                     user.id > 0 && 
                     typeof user.username === 'string' && 
                     user.username.length > 0;
  
  const extractedUserId = isValidUser ? user.id : 0;
  const extractedUsername = isValidUser ? user.username : '';
  
  const { isConnected, sendMessage, sendSystemMessage, socket } = useChatSocket({
    roomId,
    userId: extractedUserId,
    username: extractedUsername,
    nickname: user?.nickname
  });

  const [inputValue, setInputValue] = useState('');

  const handleStatusChange = (status: UserStatus) => {
    setUserStatus(status);
    if (socket && isConnected) {
      socket.emit('update_user_status', { 
        roomId, 
        userId: user?.id, 
        status 
      });
    }
  };

  const statusMenuItems: MenuProps['items'] = (['online', 'away', 'busy'] as UserStatus[]).map(status => ({
    key: status,
    icon: <span style={{ color: STATUS_CONFIG[status].color }}>{STATUS_CONFIG[status].icon}</span>,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{STATUS_CONFIG[status].label}</span>
        {userStatus === status && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
      </span>
    ),
    onClick: () => handleStatusChange(status)
  }));

  const roomType = (currentRoom?.type || 'study_group') as RoomType;
  const typeConfig = ROOM_TYPE_CONFIG[roomType];
  const statusConfig = STATUS_CONFIG[userStatus];

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
          padding: '10px 20px'
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

  const handleSendImage = (fileUrl: string, fileName: string, fileSize: number) => {
    if (isConnected) {
      sendMessage(fileUrl, 'image', {
        file_name: fileName,
        file_size: fileSize,
        file_url: fileUrl
      });
    }
  };

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
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px'
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            <MessageOutlined />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontWeight: '600', 
              fontSize: '15px',
              lineHeight: '1.2'
            }}>
              {currentRoom?.name || '学习聊天室'}
            </span>
            <span style={{ 
              fontSize: '11px', 
              opacity: 0.8,
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{typeConfig.icon}</span>
              <span>{typeConfig.label}</span>
              {currentRoom?.max_users && (
                <span>· {currentRoom.max_users}人上限</span>
              )}
            </span>
          </div>
        </div>
      } 
      extra={
        <Dropdown 
          menu={{ items: statusMenuItems }} 
          trigger={['click']}
          placement="bottomRight"
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
          >
            <div style={{ 
              width: '20px', 
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '12px', color: statusConfig.color }}>
                {statusConfig.icon}
              </span>
            </div>
            <span style={{ 
              fontSize: '13px', 
              color: '#fff',
              fontWeight: '500'
            }}>
              {statusConfig.label}
            </span>
            <DownOutlined style={{ 
              fontSize: '10px', 
              color: 'rgba(255, 255, 255, 0.8)',
              marginLeft: '2px'
            }} />
          </div>
        </Dropdown>
      }
      style={{ 
        borderRadius: '16px', 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 0.95)',
        height: '100vh'
      }}
      headStyle={{ 
        borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: '8px 20px',
        minHeight: '44px'
      }}
      bodyStyle={{ 
        height: 'calc(100% - 44px)', 
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Row gutter={12} style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Col span={18} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <CompactMessageList 
              roomId={roomId}
              currentUserId={user?.id}
              username={user?.username || ''}
              nickname={user?.nickname}
              onNewMessage={(message) => {
                console.log('收到新消息:', message);
              }}
            />
          </div>
          <div style={{ 
            marginTop: '12px',
            flexShrink: 0
          }}>
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
        <Col span={6} style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
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

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </Card>
  );
};
