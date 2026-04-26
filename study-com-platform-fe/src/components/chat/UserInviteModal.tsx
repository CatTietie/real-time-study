import React, { useState, useEffect } from 'react';
import { Modal, List, Avatar, Button, message, Spin, Input, Tag, Badge, Tooltip, Popover } from 'antd';
import { 
  UserAddOutlined, 
  SearchOutlined, 
  UserOutlined,
  CrownOutlined,
  StarOutlined,
  CoffeeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { getAvailableUsers, addUserToRoom } from '../../services/chat';
import type { AvailableUser } from '../../types/chat';

interface UserInviteModalProps {
  visible: boolean;
  roomId: number;
  onClose: () => void;
  onUserAdded?: () => void;
  sendSystemMessage?: (message: string) => void;
}

type UserStatus = 'online' | 'away' | 'offline';

interface UserStatusConfig {
  color: string;
  label: string;
  bgColor: string;
}

const USER_STATUS_CONFIG: Record<UserStatus, UserStatusConfig> = {
  online: {
    color: '#52c41a',
    label: '在线',
    bgColor: 'rgba(82, 196, 26, 0.1)'
  },
  away: {
    color: '#faad14',
    label: '离开',
    bgColor: 'rgba(250, 173, 20, 0.1)'
  },
  offline: {
    color: '#a0aec0',
    label: '离线',
    bgColor: 'rgba(160, 174, 192, 0.1)'
  }
};

const generateUserStatus = (): UserStatus => {
  const random = Math.random();
  if (random > 0.6) return 'online';
  if (random > 0.3) return 'away';
  return 'offline';
};

const generateUserRole = (index: number): { type: 'admin' | 'active' | 'normal'; label: string; color: string; icon: React.ReactNode } => {
  if (index === 0) return { type: 'admin', label: '管理员', color: '#faad14', icon: <CrownOutlined /> };
  if (index < 3) return { type: 'active', label: '活跃用户', color: '#52c41a', icon: <StarOutlined /> };
  return { type: 'normal', label: '普通用户', color: '#1890ff', icon: <UserOutlined /> };
};

interface EnhancedUser extends AvailableUser {
  status: UserStatus;
  role: { type: string; label: string; color: string; icon: React.ReactNode };
  lastActive: string;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({
  visible,
  roomId,
  onClose,
  onUserAdded,
  sendSystemMessage
}) => {
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<EnhancedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null);

  useEffect(() => {
    if (visible && roomId) {
      loadAvailableUsers();
    }
  }, [visible, roomId]);

  useEffect(() => {
    if (searchText) {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchText.toLowerCase()) ||
        (user.nickname && user.nickname.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchText, users]);

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      const userList = await getAvailableUsers(roomId);
      
      const enhancedUsers: EnhancedUser[] = userList.map((user, index) => ({
        ...user,
        status: generateUserStatus(),
        role: generateUserRole(index),
        lastActive: generateLastActiveTime()
      }));
      
      setUsers(enhancedUsers);
      setFilteredUsers(enhancedUsers);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
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

  const handleAddUser = async (userId: number, username: string) => {
    try {
      setInvitingUserId(userId);
      const result = await addUserToRoom(roomId, userId);
      message.success(
        <span>
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
          {username} 已加入聊天室
        </span>
      );
      
      if (result.data?.systemMessage && sendSystemMessage) {
        console.log('调用sendSystemMessage:', result.data.systemMessage);
        sendSystemMessage(result.data.systemMessage);
      }
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      setFilteredUsers(prev => prev.filter(u => u.id !== userId));
      
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      message.error('添加用户失败');
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
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

  const onlineCount = filteredUsers.filter(u => u.status === 'online').length;
  const awayCount = filteredUsers.filter(u => u.status === 'away').length;

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          fontWeight: '600',
          fontSize: '16px',
          color: '#334155'
        }}>
          <div style={{ 
            width: '36px', 
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '18px'
          }}>
            <UserAddOutlined />
          </div>
          <div>
            <div>拉同学进入聊天室</div>
            <div style={{ fontSize: '12px', fontWeight: '400', color: '#718096', marginTop: '2px' }}>
              选择要邀请的用户加入当前聊天室
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={560}
      centered
      styles={{
        header: {
          padding: '20px 24px',
          borderBottom: '1px solid #f0f0f0'
        },
        content: {
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        },
        body: {
          padding: '0'
        }
      }}
    >
      <div style={{ padding: '20px 24px' }}>
        <Input
          placeholder="搜索用户名或昵称..."
          prefix={<SearchOutlined style={{ color: '#a0aec0' }} />}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
          size="large"
          style={{
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            border: '2px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        
        {!loading && filteredUsers.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            marginTop: '12px',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Badge color={USER_STATUS_CONFIG.online.color} />
              <span style={{ color: '#718096' }}>在线: {onlineCount}人</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Badge color={USER_STATUS_CONFIG.away.color} />
              <span style={{ color: '#718096' }}>离开: {awayCount}人</span>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ color: '#a0aec0' }}>
              共 {filteredUsers.length} 位用户可邀请
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Spin 
            size="large" 
            tip="加载用户列表中..."
            style={{ color: '#667eea' }}
          />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 40px',
          color: '#a0aec0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '16px', marginBottom: '4px' }}>
            {searchText ? '未找到匹配的用户' : '暂无可邀请的用户'}
          </div>
          <div style={{ fontSize: '12px' }}>
            {searchText ? '请尝试其他关键词' : '所有用户都已在聊天室中'}
          </div>
        </div>
      ) : (
        <List
          dataSource={filteredUsers}
          style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            padding: '0 12px'
          }}
          renderItem={(user) => {
            const statusConfig = USER_STATUS_CONFIG[user.status];
            const isInviting = invitingUserId === user.id;

            return (
              <Popover
                key={user.id}
                content={
                  <div style={{ minWidth: '220px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
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
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#334155' }}>
                          {user.nickname || user.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>
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
                          borderRadius: '6px'
                        }}
                      >
                        <Badge color={statusConfig.color} style={{ marginRight: '4px' }} />
                        {statusConfig.label}
                      </Tag>
                      <Tag 
                        style={{ 
                          margin: 0,
                          background: user.role.color ? `rgba(${parseInt(user.role.color.slice(1,3),16)}, ${parseInt(user.role.color.slice(3,5),16)}, ${parseInt(user.role.color.slice(5,7),16)}, 0.1)` : 'rgba(24, 144, 255, 0.1)',
                          color: user.role.color,
                          border: 'none',
                          borderRadius: '6px'
                        }}
                      >
                        {user.role.icon}
                        <span style={{ marginLeft: '4px' }}>{user.role.label}</span>
                      </Tag>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#718096' }}>
                      <ClockCircleOutlined style={{ marginRight: '4px' }} />
                      最近活跃: {user.lastActive}
                    </div>
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
                    padding: '12px 12px',
                    marginBottom: '4px',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  actions={[
                    <Tooltip title={`拉入 ${user.nickname || user.username}`}>
                      <Button
                        type="primary"
                        icon={isInviting ? <Spin size="small" /> : <UserAddOutlined />}
                        size="small"
                        onClick={() => handleAddUser(user.id, user.username)}
                        loading={isInviting}
                        style={{
                          borderRadius: '10px',
                          padding: '0 16px',
                          height: '32px',
                          background: isInviting
                            ? '#cbd5e0'
                            : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          boxShadow: isInviting
                            ? 'none'
                            : '0 4px 15px rgba(102, 126, 234, 0.3)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          if (!isInviting) {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isInviting) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                          }
                        }}
                      >
                        {isInviting ? '拉入中...' : '拉入'}
                      </Button>
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ position: 'relative' }}>
                        <Avatar
                          size={44}
                          style={{
                            background: getAvatarGradient(user.username),
                            fontSize: '18px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            boxShadow: user.status === 'online' 
                              ? `0 0 0 3px ${statusConfig.bgColor}`
                              : 'none'
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
                            bottom: '2px',
                            right: '2px',
                            transform: 'scale(1.2)'
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
                          color: '#334155',
                          fontSize: '14px'
                        }}>
                          {user.nickname || user.username}
                        </span>
                        
                        {user.role.type !== 'normal' && (
                          <Tooltip title={user.role.label}>
                            <Tag
                              style={{
                                margin: 0,
                                fontSize: '10px',
                                padding: '0 6px',
                                height: '18px',
                                lineHeight: '18px',
                                borderRadius: '4px',
                                background: user.role.color 
                                  ? `rgba(${parseInt(user.role.color.slice(1,3),16)}, ${parseInt(user.role.color.slice(3,5),16)}, ${parseInt(user.role.color.slice(5,7),16)}, 0.15)` 
                                  : 'rgba(24, 144, 255, 0.15)',
                                color: user.role.color,
                                border: 'none'
                              }}
                            >
                              {user.role.icon}
                              <span style={{ marginLeft: '3px' }}>{user.role.label}</span>
                            </Tag>
                          </Tooltip>
                        )}
                        
                        <Badge
                          style={{
                            backgroundColor: statusConfig.color,
                            fontSize: '10px',
                            padding: '0 6px',
                            height: '18px',
                            lineHeight: '18px',
                            borderRadius: '9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          count={
                            <span>
                              {user.status === 'online' && '在线'}
                              {user.status === 'away' && '离开'}
                              {user.status === 'offline' && '离线'}
                            </span>
                          }
                          showZero
                        />
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
                        <span style={{ color: '#a0aec0' }}>
                          @{user.username}
                        </span>
                        <span style={{ color: '#cbd5e0' }}>|</span>
                        <span style={{ color: '#718096' }}>
                          <ClockCircleOutlined style={{ marginRight: '4px' }} />
                          {user.lastActive}
                        </span>
                      </div>
                    }
                  />
                </List.Item>
              </Popover>
            );
          }}
        />
      )}
    </Modal>
  );
};
