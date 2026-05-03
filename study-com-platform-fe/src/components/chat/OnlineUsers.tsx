import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, List, Avatar, Tag, Spin, Button, Tooltip, Popover, Badge, Input, Empty, message, Popconfirm, Dropdown, Menu } from 'antd';
import { 
  UserOutlined, 
  UsergroupAddOutlined,
  CrownOutlined,
  StarOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  FireOutlined,
  CoffeeOutlined,
  PauseCircleOutlined,
  SearchOutlined,
  UserAddOutlined,
  ReloadOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { getAvailableUsers, addUserToRoom } from '../../services/chat';
import type { AvailableUser } from '../../types/chat';

interface OnlineUser {
  userId: number;
  username: string;
  joinTime: string;
  status?: 'online' | 'away' | 'busy';
  role?: 'admin' | 'active' | 'normal';
  messageCount?: number;
}

interface EnhancedAvailableUser extends AvailableUser {
  status: 'online' | 'away' | 'offline';
  role: 'admin' | 'active' | 'normal';
  lastActive: string;
  isInviting: boolean;
}

interface OnlineUsersProps {
  roomId: number;
  socket: any;
  sendSystemMessage: (message: string) => void;
  currentUser?: { id: number; username: string; nickname?: string };
  onMentionUser?: (user: { id: number; username: string; nickname?: string }) => void;
}

type UserStatus = 'online' | 'away' | 'busy' | 'offline';
type UserRole = 'admin' | 'active' | 'normal';

interface StatusConfig {
  color: string;
  label: string;
  bgColor: string;
  icon: React.ReactNode;
}

interface RoleConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
}

const STATUS_CONFIG: Record<UserStatus, StatusConfig> = {
  online: {
    color: '#52c41a',
    label: '在线',
    bgColor: 'rgba(82, 196, 26, 0.1)',
    icon: <FireOutlined />
  },
  away: {
    color: '#faad14',
    label: '离开',
    bgColor: 'rgba(250, 173, 20, 0.1)',
    icon: <CoffeeOutlined />
  },
  busy: {
    color: '#ff4d4f',
    label: '勿扰',
    bgColor: 'rgba(255, 77, 79, 0.1)',
    icon: <PauseCircleOutlined />
  },
  offline: {
    color: '#a0aec0',
    label: '离线',
    bgColor: 'rgba(160, 174, 192, 0.1)',
    icon: <ClockCircleOutlined />
  }
};

const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  admin: {
    label: '管理员',
    color: '#faad14',
    icon: <CrownOutlined />
  },
  active: {
    label: '活跃用户',
    color: '#52c41a',
    icon: <StarOutlined />
  },
  normal: {
    label: '普通用户',
    color: '#1890ff',
    icon: <UserOutlined />
  }
};

const getAvatarGradient = (username: string): string => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  ];
  const index = username.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const generateLastActiveTime = (): string => {
  const minutes = Math.floor(Math.random() * 60);
  if (minutes < 5) return '刚刚';
  if (minutes < 30) return `${minutes}分钟前`;
  const hours = Math.floor(Math.random() * 24);
  if (hours < 1) return '1小时内';
  if (hours < 24) return `${hours}小时前`;
  return '1天前';
};

const generateUserStatus = (): 'online' | 'away' | 'offline' => {
  const random = Math.random();
  if (random > 0.3) return 'online';
  if (random > 0.1) return 'away';
  return 'offline';
};

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ 
  roomId, 
  socket, 
  sendSystemMessage, 
  currentUser,
  onMentionUser 
}) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<EnhancedAvailableUser[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'online' | 'available'>('online');
  const [hoveredUserId, setHoveredUserId] = useState<number | null>(null);
  
  const roomIdRef = useRef(roomId);
  const socketRef = useRef(socket);
  const onlineUsersRef = useRef(onlineUsers);

  useEffect(() => {
    roomIdRef.current = roomId;
    socketRef.current = socket;
    onlineUsersRef.current = onlineUsers;
  }, [roomId, socket, onlineUsers]);

  const loadOnlineUsers = useCallback(() => {
    const currentSocket = socketRef.current;
    const currentRoomId = roomIdRef.current;
    
    if (!currentSocket || !currentRoomId) return;
    
    console.log('加载在线用户列表, roomId:', currentRoomId);
    setLoadingOnline(true);
    currentSocket.emit('get_online_users', { roomId: currentRoomId });
  }, []);

  const loadAvailableUsers = useCallback(async () => {
    const currentRoomId = roomIdRef.current;
    const currentOnlineUsers = onlineUsersRef.current;
    
    if (!currentRoomId || currentRoomId <= 0) return;
    
    try {
      setLoadingAvailable(true);
      const userList = await getAvailableUsers(currentRoomId);
      
      const onlineUserIds = currentOnlineUsers.map(u => u.userId);
      const filteredUsers = userList.filter(u => 
        u.id !== currentUser?.id && !onlineUserIds.includes(u.id)
      );
      
      const enhancedUsers: EnhancedAvailableUser[] = filteredUsers.map((user, index) => ({
        ...user,
        status: generateUserStatus(),
        role: index === 0 ? 'admin' : (index < 3 ? 'active' : 'normal'),
        lastActive: generateLastActiveTime(),
        isInviting: false
      }));
      
      setAvailableUsers(enhancedUsers);
    } catch (error) {
      console.error('获取可邀请用户失败:', error);
    } finally {
      setLoadingAvailable(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleOnlineUsersList = (users: OnlineUser[]) => {
      console.log('收到在线用户列表:', users);
      const enhancedUsers = users.map((user, index) => ({
        ...user,
        status: (user.status as UserStatus) || 'online',
        role: index === 0 ? 'admin' as UserRole : (index < 3 ? 'active' as UserRole : 'normal' as UserRole),
        messageCount: Math.floor(Math.random() * 20)
      }));
      setOnlineUsers(enhancedUsers);
      setLoadingOnline(false);
    };

    const handleUserJoined = (data: { userId: number; username: string }) => {
      console.log('用户加入:', data);
      setOnlineUsers(prev => {
        if (!prev.some(user => user.userId === data.userId)) {
          return [...prev, {
            userId: data.userId,
            username: data.username,
            joinTime: new Date().toISOString(),
            status: 'online',
            role: 'normal',
            messageCount: 0
          }];
        }
        return prev;
      });
      loadOnlineUsers();
    };

    const handleUserLeft = (data: { userId: number }) => {
      console.log('用户离开:', data);
      setOnlineUsers(prev => prev.filter(user => user.userId !== data.userId));
      loadOnlineUsers();
    };

    const handleUserStatusChanged = (data: { userId: number; username: string; status: UserStatus }) => {
      console.log('用户状态变化:', data);
      setOnlineUsers(prev => prev.map(user => {
        if (user.userId === data.userId) {
          return { ...user, status: data.status };
        }
        return user;
      }));
    };

    socket.on('online_users_list', handleOnlineUsersList);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_status_changed', handleUserStatusChanged);

    loadOnlineUsers();
    const interval = setInterval(loadOnlineUsers, 10000);

    return () => {
      socket.off('online_users_list', handleOnlineUsersList);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_status_changed', handleUserStatusChanged);
      clearInterval(interval);
    };
  }, [socket, roomId, loadOnlineUsers]);

  useEffect(() => {
    if (activeTab === 'available' && availableUsers.length === 0 && roomId > 0) {
      loadAvailableUsers();
    }
  }, [activeTab, roomId, loadAvailableUsers, availableUsers.length]);

  useEffect(() => {
    const onlineUserIds = onlineUsers.map(u => u.userId);
    setAvailableUsers(prev => prev.filter(u => 
      u.id !== currentUser?.id && !onlineUserIds.includes(u.id)
    ));
  }, [onlineUsers, currentUser]);

  const handleInviteUser = async (userId: number, username: string) => {
    try {
      setAvailableUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isInviting: true } : u
      ));
      
      const result = await addUserToRoom(roomId, userId);
      
      message.success(
        <span>
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
          {username} 已加入聊天室
        </span>
      );
      
      if (result.data?.systemMessage && sendSystemMessage) {
        sendSystemMessage(result.data.systemMessage);
      }
      
      setAvailableUsers(prev => prev.filter(u => u.id !== userId));
      
    } catch (error) {
      console.error('邀请用户失败:', error);
      message.error('邀请用户失败');
      setAvailableUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isInviting: false } : u
      ));
    }
  };

  const filteredAvailableUsers = searchText 
    ? availableUsers.filter(u => 
        u.username.toLowerCase().includes(searchText.toLowerCase()) ||
        (u.nickname && u.nickname.toLowerCase().includes(searchText.toLowerCase()))
      )
    : availableUsers;

  const otherOnlineUsers = onlineUsers.filter(u => u.userId !== currentUser?.id);

  const formatJoinTime = (joinTime: string) => {
    const date = new Date(joinTime);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderOnlineUserItem = (user: OnlineUser) => {
    const isHovered = hoveredUserId === user.userId;
    const statusConfig = STATUS_CONFIG[user.status || 'online'];
    const roleConfig = ROLE_CONFIG[user.role || 'normal'];

    const userDetailContent = (
      <div style={{ padding: '8px', minWidth: '180px' }}>
        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
          {user.username}
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
          <span style={{ marginRight: '12px' }}>
            <InfoCircleOutlined style={{ marginRight: '4px' }} />
            {roleConfig.label}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
          <span style={{ color: statusConfig.color, marginRight: '12px' }}>
            {statusConfig.icon} {statusConfig.label}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
          <ClockCircleOutlined style={{ marginRight: '4px' }} />
          加入于 {formatJoinTime(user.joinTime)}
          {user.messageCount !== undefined && user.messageCount > 0 && (
            <span style={{ marginLeft: '12px' }}>
              <MessageOutlined style={{ marginRight: '4px' }} />
              {user.messageCount} 条消息
            </span>
          )}
        </div>
      </div>
    );

    const menuItems = [
      {
        key: 'mention',
        icon: <UserOutlined style={{ color: '#667eea' }} />,
        label: <span>@用户</span>,
        onClick: () => {
          if (onMentionUser) {
            onMentionUser({
              id: user.userId,
              username: user.username,
              nickname: user.username
            });
            message.success(`已@${user.username}`);
          }
        }
      }
    ];

    return (
      <List.Item
        key={user.userId}
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(226, 232, 240, 0.3)',
          transition: 'all 0.3s ease',
          borderRadius: '8px',
          margin: '2px 8px',
          background: isHovered ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHoveredUserId(user.userId)}
        onMouseLeave={() => setHoveredUserId(null)}
      >
        <List.Item.Meta
          avatar={
            <Dropdown 
              menu={{ items: menuItems }} 
              trigger={['contextMenu', 'hover']}
              placement="left"
            >
              <Popover
                content={userDetailContent}
                title={null}
                placement="left"
                trigger="hover"
                arrowPointAtCenter
              >
                <div style={{ position: 'relative' }}>
                  <Avatar
                    size={32}
                    style={{
                      background: getAvatarGradient(user.username),
                      fontSize: '14px',
                      fontWeight: '600',
                      boxShadow: isHovered 
                        ? `0 4px 12px ${statusConfig.color}30`
                        : 'none',
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.3s ease'
                    }}
                    title={
                      <span>
                        右键点击 @{user.username}
                      </span>
                    }
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Badge
                    status={
                      user.status === 'online' ? 'success' :
                      user.status === 'away' ? 'warning' : 'error'
                    }
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      transform: 'scale(1.2)',
                      boxShadow: '0 0 0 2px #fff'
                    }}
                  />
                </div>
              </Popover>
            </Dropdown>
          }
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px'
            }}>
              <span style={{ 
                fontWeight: '500', 
                color: isHovered ? '#667eea' : '#334155',
                fontSize: '13px',
                transition: 'all 0.3s ease'
              }}>
                {user.username}
              </span>
              
              {user.role !== 'normal' && (
                <span style={{ 
                  fontSize: '11px', 
                  color: roleConfig.color,
                  opacity: 0.8
                }}>
                  {roleConfig.icon}
                </span>
              )}
              
              <span style={{ 
                fontSize: '10px', 
                color: statusConfig.color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                {statusConfig.icon}
              </span>
            </div>
          }
        />
      </List.Item>
    );
  };

  const renderAvailableUserItem = (user: EnhancedAvailableUser) => {
    const isHovered = hoveredUserId === user.id;
    const statusConfig = STATUS_CONFIG[user.status || 'offline'];
    const roleConfig = ROLE_CONFIG[user.role || 'normal'];

    const userDetailContent = (
      <div style={{ padding: '8px', minWidth: '160px' }}>
        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
          {user.nickname || user.username}
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
          @{user.username}
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
          <span style={{ marginRight: '12px' }}>
            {roleConfig.icon} {roleConfig.label}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
          <ClockCircleOutlined style={{ marginRight: '4px' }} />
          最后活跃: {user.lastActive}
        </div>
      </div>
    );

    return (
      <List.Item
        key={user.id}
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid rgba(226, 232, 240, 0.3)',
          transition: 'all 0.3s ease',
          borderRadius: '8px',
          margin: '2px 8px',
          background: isHovered ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center'
        }}
        onMouseEnter={() => setHoveredUserId(user.id)}
        onMouseLeave={() => setHoveredUserId(null)}
        actions={[
          <Popconfirm
            title={
              <span>确认邀请 <strong>{user.nickname || user.username}</strong> 加入聊天室？</span>
            }
            onConfirm={() => handleInviteUser(user.id, user.username)}
            okText="邀请"
            cancelText="取消"
            disabled={user.status === 'offline'}
          >
            <Button
              type="primary"
              icon={user.isInviting ? <LoadingOutlined /> : <UserAddOutlined />}
              size="small"
              loading={user.isInviting}
              disabled={user.status === 'offline'}
              style={{
                borderRadius: '6px',
                padding: '0 10px',
                height: '26px',
                fontSize: '11px',
                background: user.isInviting || user.status === 'offline'
                  ? '#cbd5e0'
                  : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: user.isInviting || user.status === 'offline'
                  ? 'none'
                  : '0 2px 6px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              {user.isInviting ? '邀请中...' : '邀请'}
            </Button>
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          avatar={
            <Popover
              content={userDetailContent}
              title={null}
              placement="left"
              trigger="hover"
              arrowPointAtCenter
            >
              <div style={{ position: 'relative' }}>
                <Avatar
                  size={28}
                  style={{
                    background: getAvatarGradient(user.username),
                    fontSize: '12px',
                    fontWeight: '600',
                    opacity: user.status === 'offline' ? 0.6 : 1,
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
                <Badge
                  status={
                    user.status === 'online' ? 'success' :
                    user.status === 'away' ? 'warning' : 'default'
                  }
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    transform: 'scale(1.1)',
                    boxShadow: '0 0 0 2px #fff'
                  }}
                />
              </div>
            </Popover>
          }
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px'
            }}>
              <span style={{ 
                fontWeight: '500', 
                color: isHovered ? '#667eea' : '#334155',
                fontSize: '13px',
                opacity: user.status === 'offline' ? 0.6 : 1,
                transition: 'all 0.3s ease'
              }}>
                {user.nickname || user.username}
              </span>
              
              {user.role !== 'normal' && (
                <span style={{ 
                  fontSize: '10px', 
                  color: roleConfig.color,
                  opacity: 0.7
                }}>
                  {roleConfig.icon}
                </span>
              )}
              
              <span style={{ 
                fontSize: '10px', 
                color: statusConfig.color,
                display: 'inline-flex',
                alignItems: 'center'
              }}>
                {statusConfig.icon}
              </span>
            </div>
          }
        />
      </List.Item>
    );
  };

  return (
    <Card 
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontWeight: '600',
          color: '#334155'
        }}>
          <UserOutlined style={{ color: '#667eea' }} />
          <span>用户管理</span>
          <Tooltip title="右键点击在线用户头像可以@用户">
            <span style={{ 
              fontSize: '10px', 
              color: '#a0aec0',
              fontWeight: '400',
              marginLeft: '4px'
            }}>
              (右键@用户)
            </span>
          </Tooltip>
        </div>
      }
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
        padding: '10px 16px'
      }}
      bodyStyle={{
        padding: '0'
      }}
    >
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
      }}>
        <div
          onClick={() => setActiveTab('online')}
          style={{
            flex: 1,
            padding: '10px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: activeTab === 'online' ? '600' : '400',
            color: activeTab === 'online' ? '#667eea' : '#718096',
            borderBottom: activeTab === 'online' ? '2px solid #667eea' : '2px solid transparent',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FireOutlined style={{ color: activeTab === 'online' ? '#52c41a' : undefined }} />
          <span>在线用户</span>
          <Tag
            style={{
              margin: 0,
              fontSize: '10px',
              padding: '0 6px',
              height: '16px',
              lineHeight: '14px',
              borderRadius: '8px',
              background: activeTab === 'online' ? 'rgba(102, 126, 234, 0.15)' : 'rgba(160, 174, 192, 0.1)',
              color: activeTab === 'online' ? '#667eea' : '#a0aec0',
              border: 'none'
            }}
          >
            {otherOnlineUsers.length}
          </Tag>
        </div>
        <div
          onClick={() => setActiveTab('available')}
          style={{
            flex: 1,
            padding: '10px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: activeTab === 'available' ? '600' : '400',
            color: activeTab === 'available' ? '#667eea' : '#718096',
            borderBottom: activeTab === 'available' ? '2px solid #667eea' : '2px solid transparent',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <UserAddOutlined />
          <span>可邀请</span>
          <Tag
            style={{
              margin: 0,
              fontSize: '10px',
              padding: '0 6px',
              height: '16px',
              lineHeight: '14px',
              borderRadius: '8px',
              background: activeTab === 'available' ? 'rgba(102, 126, 234, 0.15)' : 'rgba(160, 174, 192, 0.1)',
              color: activeTab === 'available' ? '#667eea' : '#a0aec0',
              border: 'none'
            }}
          >
            {availableUsers.length}
          </Tag>
        </div>
      </div>

      <div 
        style={{ 
          maxHeight: '180px', 
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {activeTab === 'online' && (
          <>
            {loadingOnline ? (
            <div style={{ textAlign: 'center', padding: '24px 20px' }}>
              <Spin size="small" />
              <div style={{ marginTop: 8, color: '#a0aec0', fontSize: '13px' }}>加载中...</div>
            </div>
          ) : otherOnlineUsers.length === 0 ? (
            <Empty 
              description={
                <span style={{ color: '#a0aec0', fontSize: '13px' }}>
                  暂无其他在线用户
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '24px 20px' }}
            />
          ) : (
            <List
              dataSource={otherOnlineUsers}
              style={{ padding: '0' }}
              renderItem={renderOnlineUserItem}
            />
          )}
          </>
        )}

        {activeTab === 'available' && (
          <>
            {searchText === '' && availableUsers.length > 0 && (
              <div style={{ 
                padding: '6px 12px', 
                borderBottom: '1px solid rgba(226, 232, 240, 0.3)',
                fontSize: '11px',
                color: '#718096'
              }}>
                共 {availableUsers.length} 位用户可邀请
              </div>
            )}

            {searchText !== '' && (
              <div style={{ padding: '8px 12px' }}>
                <Input
                  placeholder="搜索用户名..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  prefix={<SearchOutlined style={{ color: '#a0aec0' }} />}
                  allowClear
                  size="small"
                  style={{ borderRadius: '8px' }}
                />
              </div>
            )}

            {loadingAvailable ? (
              <div style={{ textAlign: 'center', padding: '24px 20px' }}>
                <Spin size="small" />
                <div style={{ marginTop: 8, color: '#a0aec0', fontSize: '13px' }}>加载中...</div>
              </div>
            ) : filteredAvailableUsers.length === 0 ? (
              <Empty 
                description={
                  <span style={{ color: '#a0aec0', fontSize: '13px' }}>
                    {searchText ? '未找到匹配的用户' : '暂无可邀请的用户'}
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '24px 20px' }}
              />
            ) : (
              <List
                dataSource={filteredAvailableUsers}
                style={{ padding: '0' }}
                renderItem={renderAvailableUserItem}
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
};
