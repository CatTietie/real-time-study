import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Tag, Spin, Button } from 'antd';
import { UserOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { useChatSocket } from '../../hooks/useChatSocket';
import { UserInviteModal } from './UserInviteModal';

interface OnlineUser {
  userId: number;
  username: string;
  joinTime: string;
}

interface OnlineUsersProps {
  roomId: number;
  socket: any;
  sendSystemMessage: (message: string) => void;
  currentUser?: { id: number; username: string };
}

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ roomId, socket, sendSystemMessage, currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  // 移除本地的useChatSocket调用，使用传入的socket和sendSystemMessage

  useEffect(() => {
    if (!socket || !roomId) return;

    const loadOnlineUsers = () => {
      setLoading(true);
      socket.emit('get_online_users', { roomId });
    };

    // 监听在线用户列表更新
    socket.on('online_users_list', (users: OnlineUser[]) => {
      setOnlineUsers(users);
      setLoading(false);
    });

    // 用户加入事件
    socket.on('user_joined', (data: { userId: number; username: string }) => {
      setOnlineUsers(prev => {
        // 避免重复添加
        if (!prev.some(user => user.userId === data.userId)) {
          return [...prev, {
            userId: data.userId,
            username: data.username,
            joinTime: new Date().toISOString()
          }];
        }
        return prev;
      });
    });

    // 用户离开事件
    socket.on('user_left', (data: { userId: number }) => {
      setOnlineUsers(prev => prev.filter(user => user.userId !== data.userId));
    });

    // 初始加载
    loadOnlineUsers();

    // 定期更新在线用户列表
    const interval = setInterval(loadOnlineUsers, 10000);

    return () => {
      socket.off('online_users_list');
      socket.off('user_joined');
      socket.off('user_left');
      clearInterval(interval);
    };
  }, [socket, roomId]);

  const formatJoinTime = (joinTime: string) => {
    const date = new Date(joinTime);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const showInviteModal = () => {
    setInviteModalVisible(true);
  };

  const closeInviteModal = () => {
    setInviteModalVisible(false);
  };

  return (
    <>
      <Card 
        title="在线用户" 
        size="small"
        style={{ 
          marginTop: '0',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          transition: 'all 0.3s ease'
        }}
        headStyle={{
          background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
          borderRadius: '16px 16px 0 0',
          padding: '12px 16px'
        }}
        bodyStyle={{
          padding: '16px'
        }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontSize: '12px', 
              color: '#718096',
              background: 'rgba(102, 126, 234, 0.1)',
              padding: '4px 12px',
              borderRadius: '12px',
              fontWeight: '500'
            }}>
              {onlineUsers.filter(user => user.userId !== currentUser?.id).length}人在线
            </span>
            <Button 
              type="primary" 
              icon={<UsergroupAddOutlined />} 
              size="small"
              onClick={showInviteModal}
              style={{
                borderRadius: '12px',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                height: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
              }}
            >
              邀请
            </Button>
          </div>
        }
      >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 20px' }}>
          <Spin size="small" />
          <div style={{ marginTop: 12, color: '#a0aec0', fontSize: '14px' }}>加载中...</div>
        </div>
      ) : onlineUsers.filter(user => user.userId !== currentUser?.id).length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 20px',
          color: '#a0aec0',
          fontSize: '14px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
          <div>暂无其他在线用户</div>
        </div>
      ) : (
        <List
          dataSource={onlineUsers.filter(user => user.userId !== currentUser?.id)}
          renderItem={(user) => (
            <List.Item 
              style={{ 
                padding: '12px 0',
                borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                transition: 'all 0.3s ease',
                borderRadius: '8px',
                marginTop: '4px',
                marginBottom: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)';
                e.currentTarget.style.paddingLeft = '12px';
                e.currentTarget.style.paddingRight = '12px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.paddingLeft = '0';
                e.currentTarget.style.paddingRight = '0';
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    style={{ 
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }} 
                    icon={<UserOutlined />} 
                  />
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '500', color: '#2d3748' }}>{user.username}</span>
                    <Tag 
                      color="green" 
                      style={{ 
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: '500',
                        border: 'none',
                        background: 'linear-gradient(90deg, #48bb78 0%, #38a169 100%)',
                        color: '#fff'
                      }}
                    >
                      在线
                    </Tag>
                  </div>
                }
                description={
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#a0aec0',
                    marginTop: '4px',
                    display: 'block'
                  }}>
                    加入时间: {formatJoinTime(user.joinTime)}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>

    <UserInviteModal
      visible={inviteModalVisible}
      roomId={roomId}
      onClose={closeInviteModal}
      onUserAdded={closeInviteModal}
      sendSystemMessage={sendSystemMessage}
    />
    </>
  );
};