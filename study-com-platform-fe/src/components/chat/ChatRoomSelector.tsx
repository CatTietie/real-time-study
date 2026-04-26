import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Input, Modal, Popconfirm, message, List, Tag, Badge, Avatar, Popover, Tooltip, Select } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  LogoutOutlined, 
  TeamOutlined,
  GlobalOutlined,
  LockOutlined,
  BookOutlined,
  UserOutlined,
  FireOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { getChatRooms, createChatRoom, deleteChatRoom, leaveChatRoom } from '../../services/chat';
import type { ChatRoom } from '../../types/chat';
import { useAppSelector } from '../../app/hooks';

const { Option } = Select;

interface ChatRoomSelectorProps {
  currentRoomId: number;
  onRoomChange: (roomId: number) => void;
  onlineUsersCount?: number;
}

type RoomType = 'public' | 'private' | 'study_group';

interface RoomTypeConfig {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}

const ROOM_TYPE_CONFIG: Record<RoomType, RoomTypeConfig> = {
  public: {
    icon: <GlobalOutlined />,
    label: '公开房间',
    color: '#52c41a',
    bgColor: 'rgba(82, 196, 26, 0.1)'
  },
  private: {
    icon: <LockOutlined />,
    label: '私密房间',
    color: '#722ed1',
    bgColor: 'rgba(114, 46, 209, 0.1)'
  },
  study_group: {
    icon: <BookOutlined />,
    label: '学习小组',
    color: '#1890ff',
    bgColor: 'rgba(24, 144, 255, 0.1)'
  }
};

export const ChatRoomSelector: React.FC<ChatRoomSelectorProps> = ({
  currentRoomId,
  onRoomChange,
  onlineUsersCount = 0
}) => {
  const { user } = useAppSelector(state => state.auth);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomList = await getChatRooms();
      setRooms(roomList);
    } catch (error) {
      console.error('获取聊天室列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = async (values: any) => {
    try {
      const newRoom = await createChatRoom({
        name: values.name,
        type: values.type,
        maxUsers: values.maxUsers
      });
      setRooms(prev => [...prev, newRoom]);
      onRoomChange(newRoom.id);
      setModalVisible(false);
      form.resetFields();
      message.success('聊天室创建成功');
    } catch (error) {
      console.error('创建聊天室失败:', error);
      message.error('创建聊天室失败');
    }
  };

  const handleDeleteRoom = async () => {
    try {
      await deleteChatRoom(currentRoomId);
      const updatedRooms = rooms.filter(room => room.id !== currentRoomId);
      setRooms(updatedRooms);
      
      if (updatedRooms.length > 0) {
        onRoomChange(updatedRooms[0].id);
      } else {
        onRoomChange(0);
      }
      
      message.success('聊天室删除成功');
    } catch (error) {
      console.error('删除聊天室失败:', error);
      message.error('删除聊天室失败');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveChatRoom(currentRoomId);
      const updatedRooms = rooms.filter(room => room.id !== currentRoomId);
      setRooms(updatedRooms);
      
      if (updatedRooms.length > 0) {
        onRoomChange(updatedRooms[0].id);
      } else {
        onRoomChange(0);
      }
      
      message.success('退出聊天室成功');
    } catch (error) {
      console.error('退出聊天室失败:', error);
      message.error('退出聊天室失败');
    }
  };

  const getActivityLevel = (room: ChatRoom): { level: 'high' | 'medium' | 'low'; label: string; color: string } => {
    const createdDate = new Date(room.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 3) return { level: 'high', label: '活跃', color: '#52c41a' };
    if (diffDays < 14) return { level: 'medium', label: '一般', color: '#faad14' };
    return { level: 'low', label: '冷清', color: '#a0aec0' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  const currentRoom = rooms.find(r => r.id === currentRoomId);

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
            <TeamOutlined style={{ color: '#667eea' }} />
            <span>聊天室</span>
            {currentRoom && (
              <Badge 
                count={onlineUsersCount} 
                style={{ 
                  backgroundColor: '#52c41a',
                  fontSize: '10px'
                }}
                showZero
              />
            )}
          </div>
        }
        size="small"
        styles={{
          body: { 
            padding: '12px' 
          }
        }}
        style={{ 
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
        extra={
          <Tooltip title="创建新聊天室">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              size="small"
              onClick={() => setModalVisible(true)}
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
              创建
            </Button>
          </Tooltip>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ color: '#a0aec0' }}>加载房间列表中...</div>
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px 20px',
            color: '#a0aec0'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div>暂无聊天室</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>点击上方按钮创建</div>
          </div>
        ) : (
          <div style={{ 
            maxHeight: '180px', 
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '4px'
          }}>
            <List
              dataSource={rooms}
              renderItem={(room) => {
              const isSelected = room.id === currentRoomId;
              const isOwner = room.created_by === user?.id;
              const roomType = room.type as RoomType;
              const typeConfig = ROOM_TYPE_CONFIG[roomType] || ROOM_TYPE_CONFIG.public;
              const activity = getActivityLevel(room);

              return (
                <Popover
                  key={room.id}
                  content={
                    <div style={{ minWidth: '200px' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        marginBottom: '8px',
                        color: '#334155'
                      }}>
                        {room.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                        <InfoCircleOutlined style={{ marginRight: '4px' }} />
                        类型: {typeConfig.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                        <UserOutlined style={{ marginRight: '4px' }} />
                        最大人数: {room.max_users} 人
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                        创建时间: {formatDate(room.created_at)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>
                        <FireOutlined style={{ marginRight: '4px', color: activity.color }} />
                        活跃度: {activity.label}
                      </div>
                    </div>
                  }
                  title={null}
                  placement="right"
                  trigger="hover"
                  arrow={{ pointAtCenter: true }}
                  styles={{
                    body: {
                      padding: '12px',
                      borderRadius: '12px'
                    }
                  }}
                >
                  <List.Item
                    style={{
                      padding: '10px 12px',
                      marginBottom: '4px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: isSelected 
                        ? 'linear-gradient(90deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%)'
                        : 'transparent',
                      border: isSelected 
                        ? '2px solid rgba(102, 126, 234, 0.4)'
                        : '2px solid transparent',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => onRoomChange(room.id)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                    actions={
                      isSelected
                        ? [
                            isOwner ? (
                              <Popconfirm
                                title={
                                  <div style={{ padding: '8px 0' }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>确定要删除这个聊天室吗？</div>
                                    <div style={{ fontSize: '12px', color: '#718096' }}>删除后所有消息将被清除且无法恢复</div>
                                  </div>
                                }
                                onConfirm={handleDeleteRoom}
                                okText="确定"
                                cancelText="取消"
                                okButtonProps={{ danger: true }}
                              >
                                <Button 
                                  danger 
                                  type="text"
                                  icon={<DeleteOutlined />} 
                                  size="small"
                                  style={{ 
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease'
                                  }}
                                />
                              </Popconfirm>
                            ) : (
                              <Popconfirm
                                title="确定要退出这个聊天室吗？"
                                onConfirm={handleLeaveRoom}
                                okText="确定"
                                cancelText="取消"
                              >
                                <Button 
                                  type="text"
                                  icon={<LogoutOutlined />} 
                                  size="small"
                                  style={{ 
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease'
                                  }}
                                />
                              </Popconfirm>
                            )
                          ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size={40}
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : typeConfig.bgColor,
                            color: isSelected ? '#fff' : typeConfig.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: isSelected 
                              ? '0 4px 15px rgba(102, 126, 234, 0.4)'
                              : 'none',
                            transition: 'all 0.3s ease'
                          }}
                          icon={typeConfig.icon}
                        />
                      }
                      title={
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontWeight: '500',
                          color: isSelected ? '#667eea' : '#334155',
                          fontSize: '14px'
                        }}>
                          <span>{room.name}</span>
                          {isOwner && (
                            <Tag 
                              color="gold" 
                              style={{ 
                                margin: 0,
                                fontSize: '10px',
                                padding: '0 6px',
                                height: '18px',
                                lineHeight: '18px',
                                borderRadius: '4px'
                              }}
                            >
                              管理员
                            </Tag>
                          )}
                          {isSelected && (
                            <CheckCircleOutlined 
                              style={{ 
                                color: '#52c41a',
                                fontSize: '14px'
                              }} 
                            />
                          )}
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
                          <Tag 
                            style={{ 
                              margin: 0,
                              fontSize: '10px',
                              padding: '0 8px',
                              height: '20px',
                              lineHeight: '20px',
                              borderRadius: '6px',
                              background: typeConfig.bgColor,
                              color: typeConfig.color,
                              border: 'none'
                            }}
                          >
                            {typeConfig.icon}
                            <span style={{ marginLeft: '4px' }}>{typeConfig.label}</span>
                          </Tag>
                          
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            color: '#718096',
                            gap: '4px'
                          }}>
                            <TeamOutlined />
                            <span>{room.max_users}人</span>
                          </div>

                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Badge 
                              color={activity.color} 
                              style={{ width: '6px', height: '6px', borderRadius: '50%' }}
                            />
                            <span style={{ color: activity.color, fontSize: '11px' }}>
                              {activity.label}
                            </span>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                </Popover>
              );
            }}
          />
          </div>
        )}
      </Card>

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
              <PlusOutlined />
            </div>
            <div>
              <div>创建新聊天室</div>
              <div style={{ fontSize: '12px', fontWeight: '400', color: '#718096', marginTop: '2px' }}>
                创建一个专属的聊天空间
              </div>
            </div>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={520}
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
            padding: '24px'
          }
        }}
      >
        <Form
          form={form}
          onFinish={handleCreateRoom}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label={
              <span style={{ fontWeight: '500', color: '#334155' }}>
                聊天室名称
                <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
              </span>
            }
            rules={[{ required: true, message: '请输入聊天室名称' }]}
            extra="请输入一个有意义的名称，帮助其他人了解这个房间的用途"
          >
            <Input 
              placeholder="例如：高数学习小组、项目讨论群" 
              size="large"
              style={{ 
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '15px',
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
              prefix={<TeamOutlined style={{ color: '#a0aec0' }} />}
            />
          </Form.Item>
          
          <Form.Item
            name="type"
            label={
              <span style={{ fontWeight: '500', color: '#334155' }}>
                聊天室类型
              </span>
            }
            initialValue="study_group"
            extra="选择适合你需求的房间类型"
          >
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '12px' 
            }}>
              {(['public', 'private', 'study_group'] as RoomType[]).map((type) => {
                const config = ROOM_TYPE_CONFIG[type];
                return (
                  <Form.Item key={type} noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const isSelected = getFieldValue('type') === type;
                      return (
                        <div
                          onClick={() => form.setFieldValue('type', type)}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: isSelected 
                              ? '2px solid #667eea'
                              : '2px solid #e2e8f0',
                            background: isSelected 
                              ? 'rgba(102, 126, 234, 0.08)'
                              : '#fafafa',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            textAlign: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#cbd5e0';
                              e.currentTarget.style.background = '#f5f5f5';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.background = '#fafafa';
                            }
                          }}
                        >
                          <div style={{ 
                            fontSize: '28px', 
                            marginBottom: '8px',
                            color: isSelected ? '#667eea' : config.color
                          }}>
                            {config.icon}
                          </div>
                          <div style={{ 
                            fontWeight: isSelected ? '600' : '500',
                            color: isSelected ? '#667eea' : '#334155',
                            fontSize: '14px',
                            marginBottom: '4px'
                          }}>
                            {config.label}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#a0aec0' 
                          }}>
                            {type === 'public' && '任何人可见'}
                            {type === 'private' && '需要邀请加入'}
                            {type === 'study_group' && '学习专用'}
                          </div>
                          {isSelected && (
                            <div style={{ marginTop: '8px' }}>
                              <CheckCircleOutlined style={{ color: '#667eea', fontSize: '18px' }} />
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </Form.Item>
                );
              })}
            </div>
          </Form.Item>
          
          <Form.Item
            name="maxUsers"
            label={
              <span style={{ fontWeight: '500', color: '#334155' }}>
                最大人数
              </span>
            }
            initialValue={50}
            extra="设置聊天室可以容纳的最大用户数"
          >
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '8px' 
            }}>
              {[10, 20, 50, 100].map((num) => (
                <Form.Item key={num} noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const isSelected = getFieldValue('maxUsers') === num;
                    return (
                      <Button
                        type={isSelected ? 'primary' : 'default'}
                        onClick={() => form.setFieldValue('maxUsers', num)}
                        style={{
                          height: '44px',
                          borderRadius: '10px',
                          fontWeight: isSelected ? '600' : '400',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#fafafa',
                          border: isSelected 
                            ? 'none'
                            : '2px solid #e2e8f0',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {num}人
                      </Button>
                    );
                  }}
                </Form.Item>
              ))}
            </div>
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              size="large"
              style={{
                height: '48px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.35)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.35)';
              }}
            >
              <PlusOutlined />
              创建聊天室
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
