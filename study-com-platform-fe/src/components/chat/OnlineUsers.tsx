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
}

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ roomId, socket, sendSystemMessage }) => {
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
        style={{ marginTop: '16px' }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>{onlineUsers.length}人在线</span>
            <Button 
              type="primary" 
              icon={<UsergroupAddOutlined />} 
              size="small"
              onClick={showInviteModal}
            >
              邀请
            </Button>
          </div>
        }
      >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="small" />
          <div style={{ marginTop: 8 }}>加载中...</div>
        </div>
      ) : (
        <List
          dataSource={onlineUsers}
          renderItem={(user) => (
            <List.Item style={{ padding: '8px 0' }}>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{user.username}</span>
                    <Tag color="green">在线</Tag>
                  </div>
                }
                description={
                  <span style={{ fontSize: '12px', color: '#888' }}>
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