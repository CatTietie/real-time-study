import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Tag, Spin, Button, Tooltip, Popover, Badge, Space } from 'antd';
import { 
  UserOutlined, 
  UsergroupAddOutlined,
  CrownOutlined,
  StarOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  FireOutlined,
  CoffeeOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { useChatSocket } from '../../hooks/useChatSocket';
import { UserInviteModal } from './UserInviteModal';

interface OnlineUser {
  userId: number;
  username: string;
  joinTime: string;
  status?: 'online' | 'away' | 'busy';
  role?: 'admin' | 'active' | 'normal';
  lastMessage?: string;
  messageCount?: number;
}

interface OnlineUsersProps {
  roomId: number;
  socket: any;
  sendSystemMessage: (message: string) => void;
  currentUser?: { id: number; username: string };
}

type UserStatus = 'online' | 'away' | 'busy';
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
    label: '忙碌',
    bgColor: 'rgba(255, 77, 79, 0.1)',
    icon: <PauseCircleOutlined />
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

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ roomId, socket, sendSystemMessage, currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [hoveredUserId, setHoveredUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    const loadOnlineUsers = () => {
      setLoading(true);
      socket.emit('get_online_users', { roomId });
    };

    socket.on('online_users_list', (users: OnlineUser[]) => {
      const enhancedUsers = users.map((user, index) => ({
        ...user,
        status: (['online', 'away', 'busy'] as UserStatus[])[Math.floor(Math.random() * 3)],
        role: index === 0 ? 'admin' : (index < 3 ? 'active' : 'normal') as UserRole,
        messageCount: Math.floor(Math.random() * 20)
      }));
      setOnlineUsers(enhancedUsers);
      setLoading(false);
    });

    socket.on('user_joined', (data: { userId: number; username: string }) => {
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
    });

    socket.on('user_left', (data: { userId: number }) => {
      setOnlineUsers(prev => prev.filter(user => user.userId !== data.userId));
    });

    loadOnlineUsers();

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

  const otherUsers = onlineUsers.filter(user => user.userId !== currentUser?.id);
  const statusCounts = {
    online: otherUsers.filter(u => u.status === 'online').length,
    away: otherUsers.filter(u => u.status === 'away').length,
    busy: otherUsers.filter(u => u.status === 'busy').length
  };

  return (
    <>
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
            <span>在线用户</span>
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
          padding: '12px 16px'
        }}
        bodyStyle={{
          padding: '12px'
        }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '11px'
            }}>
              <Badge color={STATUS_CONFIG.online.color} />
              <span style={{ color: '#718096' }}>{statusCounts.online}</span>
              <Badge color={STATUS_CONFIG.away.color} />
              <span style={{ color: '#718096' }}>{statusCounts.away}</span>
              <Badge color={STATUS_CONFIG.busy.color} />
              <span style={{ color: '#718096' }}>{statusCounts.busy}</span>
            </div>
            
            <Tag 
              style={{ 
                margin: 0,
                fontSize: '11px',
                padding: '2px 10px',
                height: '22px',
                lineHeight: '20px',
                borderRadius: '11px',
                background: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                border: 'none',
                fontWeight: '500'
              }}
            >
              {otherUsers.length}人在线
            </Tag>
            
            <Tooltip title="邀请用户加入聊天室">
              <Button 
                type="primary" 
                icon={<UsergroupAddOutlined />} 
                size="small"
                onClick={() => setInviteModalVisible(true)}
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
            </Tooltip>
          </div>
        }
      >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 20px' }}>
          <Spin size="small" />
          <div style={{ marginTop: 12, color: '#a0aec0', fontSize: '14px' }}>加载中...</div>
        </div>
      ) : otherUsers.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 20px',
          color: '#a0aec0',
          fontSize: '14px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
          <div>暂无其他在线用户</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>点击上方邀请按钮拉同学加入</div>
        </div>
      ) : (
        <List
          dataSource={otherUsers}
          renderItem={(user) => {
            const isHovered = hoveredUserId === user.userId;
            const statusConfig = STATUS_CONFIG[user.status || 'online'];
            const roleConfig = ROLE_CONFIG[user.role || 'normal'];

            return (
              <Popover
                key={user.userId}
                content={
                  <div style={{ minWidth: '220px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ position: 'relative' }}>
                        <Avatar
                          size={48}
                          style={{
                            background: getAvatarGradient(user.username),
                            fontSize: '20px',
                            fontWeight: '600'
                          }}
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
                            transform: 'scale(1.3)'
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#334155' }}>
                          {user.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                          @{user.username}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <Tag 
                        style={{ 
                          margin: 0,
                          background: statusConfig.bgColor,
                          color: statusConfig.color,
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 10px',
                          height: '24px',
                          lineHeight: '22px'
                        }}
                      >
                        {statusConfig.icon}
                        <span style={{ marginLeft: '4px' }}>{statusConfig.label}</span>
                      </Tag>
                      <Tag 
                        style={{ 
                          margin: 0,
                          background: `rgba(${parseInt(roleConfig.color.slice(1,3),16)}, ${parseInt(roleConfig.color.slice(3,5),16)}, ${parseInt(roleConfig.color.slice(5,7),16)}, 0.1)`,
                          color: roleConfig.color,
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 10px',
                          height: '24px',
                          lineHeight: '22px'
                        }}
                      >
                        {roleConfig.icon}
                        <span style={{ marginLeft: '4px' }}>{roleConfig.label}</span>
                      </Tag>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                      <ClockCircleOutlined style={{ marginRight: '4px' }} />
                      加入时间: {formatJoinTime(user.joinTime)}
                    </div>
                    
                    {user.messageCount !== undefined && user.messageCount > 0 && (
                      <div style={{ fontSize: '12px', color: '#718096' }}>
                        <MessageOutlined style={{ marginRight: '4px' }} />
                        本次发言: {user.messageCount} 条
                      </div>
                    )}
                  </div>
                }
                title={null}
                placement="left"
                trigger="hover"
                arrow={{ pointAtCenter: true }}
                styles={{
                  body: {
                    padding: '16px',
                    borderRadius: '12px'
                  }
                }}
              >
                <List.Item
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                    transition: 'all 0.3s ease',
                    borderRadius: '10px',
                    marginTop: '4px',
                    marginBottom: '4px',
                    background: isHovered ? 'rgba(102, 126, 234, 0.05)' : 'transparent'
                  }}
                  onMouseEnter={() => setHoveredUserId(user.userId)}
                  onMouseLeave={() => setHoveredUserId(null)}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ position: 'relative' }}>
                        <Avatar 
                          size={42}
                          style={{ 
                            background: getAvatarGradient(user.username),
                            fontSize: '18px',
                            fontWeight: '600',
                            boxShadow: isHovered 
                              ? `0 4px 15px ${user.status === 'online' ? 'rgba(82, 196, 26, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`
                              : 'none',
                            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.3s ease'
                          }}
                          icon={<UserOutlined />} 
                        />
                        <Badge
                          status={
                            user.status === 'online' ? 'success' :
                            user.status === 'away' ? 'warning' : 'error'
                          }
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            transform: 'scale(1.4)',
                            boxShadow: '0 0 0 2px #fff'
                          }}
                        />
                      </div>
                    }
                    title={
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ 
                          fontWeight: '500', 
                          color: isHovered ? '#667eea' : '#334155',
                          fontSize: '14px',
                          transition: 'all 0.3s ease'
                        }}>
                          {user.username}
                        </span>
                        
                        {user.role !== 'normal' && (
                          <Tooltip title={roleConfig.label}>
                            <Tag
                              style={{
                                margin: 0,
                                fontSize: '10px',
                                padding: '0 6px',
                                height: '18px',
                                lineHeight: '18px',
                                borderRadius: '4px',
                                background: `rgba(${parseInt(roleConfig.color.slice(1,3),16)}, ${parseInt(roleConfig.color.slice(3,5),16)}, ${parseInt(roleConfig.color.slice(5,7),16)}, 0.15)`,
                                color: roleConfig.color,
                                border: 'none'
                              }}
                            >
                              {roleConfig.icon}
                              <span style={{ marginLeft: '3px' }}>{roleConfig.label}</span>
                            </Tag>
                          </Tooltip>
                        )}
                        
                        <Tag
                          style={{
                            margin: 0,
                            fontSize: '10px',
                            padding: '0 8px',
                            height: '18px',
                            lineHeight: '18px',
                            borderRadius: '9px',
                            background: statusConfig.bgColor,
                            color: statusConfig.color,
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Tag>
                      </div>
                    }
                    description={
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginTop: '4px',
                        fontSize: '12px'
                      }}>
                        <span style={{ 
                          color: '#718096',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <ClockCircleOutlined />
                          加入于 {formatJoinTime(user.joinTime)}
                        </span>
                        
                        {user.messageCount !== undefined && user.messageCount > 0 && (
                          <span style={{ 
                            color: '#667eea',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '500'
                          }}>
                            <MessageOutlined />
                            {user.messageCount} 条消息
                          </span>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              </Popover>
            );
          }}
        />
      )}
    </Card>

    <UserInviteModal
      visible={inviteModalVisible}
      roomId={roomId}
      onClose={() => setInviteModalVisible(false)}
      onUserAdded={() => setInviteModalVisible(false)}
      sendSystemMessage={sendSystemMessage}
    />
    </>
  );
};
