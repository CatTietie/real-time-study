import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Dropdown, 
  Modal, 
  List, 
  Avatar, 
  Tag, 
  Tooltip, 
  Popconfirm, 
  message,
  Button
} from 'antd';
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
  DownOutlined,
  CopyOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  UserOutlined
} from '@ant-design/icons';
import CompactMessageList from './CompactMessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsers } from './OnlineUsers';
import { ChatRoomSelector } from './ChatRoomSelector';
import { useChatSocket } from '../../hooks/useChatSocket';
import { useAppSelector } from '../../app/hooks';
import type { ChatRoom, ChatMessage, AvailableUser } from '../../types/chat';
import { forwardMessage, deleteMessage, getChatRooms, getImageBase64, uploadChatFile } from '../../services/chat';
import type { PendingImage } from './MessageInput';

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
  const [inputValue, setInputValue] = useState('');
  const [inputRef, setInputRef] = useState<HTMLTextAreaElement | null>(null);
  
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuMessage, setContextMenuMessage] = useState<ChatMessage | null>(null);
  
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [selectedTargetRoom, setSelectedTargetRoom] = useState<number | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  
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
  
  const { isConnected, sendMessage, sendSystemMessage, socket, messages, setAllMessages } = useChatSocket({
    roomId,
    userId: extractedUserId,
    username: extractedUsername,
    nickname: user?.nickname
  });

  useEffect(() => {
    if (forwardModalVisible) {
      loadChatRooms();
    }
  }, [forwardModalVisible]);

  const loadChatRooms = async () => {
    setLoadingRooms(true);
    try {
      const rooms = await getChatRooms();
      const filteredRooms = rooms.filter(r => r.id !== roomId);
      setChatRooms(filteredRooms);
    } catch (error) {
      console.error('获取聊天室列表失败:', error);
      message.error('获取聊天室列表失败');
    } finally {
      setLoadingRooms(false);
    }
  };

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

  const handleSendImages = useCallback(async (images: PendingImage[]) => {
    if (!isConnected || images.length === 0) return;

    for (const image of images) {
      try {
        const result = await uploadChatFile(image.file);
        handleSendImage(result.file_url, result.file_name, result.file_size);
        message.success(`图片「${result.file_name}」发送成功`);
      } catch (error) {
        console.error('发送图片失败:', error);
        message.error(`图片「${image.fileName}」发送失败，请重试`);
      }
    }
  }, [isConnected, handleSendImage]);

  const handleContextMenu = useCallback((e: React.MouseEvent, message: ChatMessage) => {
    e.preventDefault();
    if (message.message_type === 'system') return;
    
    setContextMenuMessage(message);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuMessage(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuVisible) {
        handleCloseContextMenu();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenuVisible, handleCloseContextMenu]);

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
  };

  const handleCopyMessage = useCallback(async () => {
    if (!contextMenuMessage) return;
    
    try {
      if (contextMenuMessage.message_type === 'text') {
        await navigator.clipboard.writeText(contextMenuMessage.content);
        message.success('文字已复制到剪贴板');
      } else if (contextMenuMessage.message_type === 'image') {
        const imageUrl = contextMenuMessage.file_url || contextMenuMessage.content;
        
        try {
          const imageData = await getImageBase64(imageUrl);
          const blob = base64ToBlob(imageData.base64, imageData.mimeType);
          const clipboardItem = new ClipboardItem({ [imageData.mimeType]: blob });
          await navigator.clipboard.write([clipboardItem]);
          message.success('图片已复制到剪贴板，可直接粘贴发送');
        } catch (clipboardError) {
          console.log('剪贴板复制失败，尝试复制链接:', clipboardError);
          try {
            await navigator.clipboard.writeText(imageUrl);
            message.success('图片链接已复制到剪贴板');
          } catch {
            message.error('复制失败，请手动复制');
          }
        }
      } else if (contextMenuMessage.message_type === 'file') {
        const fileUrl = contextMenuMessage.file_url || contextMenuMessage.content;
        await navigator.clipboard.writeText(fileUrl);
        message.success('文件链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('复制失败:', error);
      let textToCopy = '';
      if (contextMenuMessage.message_type === 'text') {
        textToCopy = contextMenuMessage.content;
      } else {
        textToCopy = contextMenuMessage.file_url || contextMenuMessage.content;
      }
      try {
        await navigator.clipboard.writeText(textToCopy);
        message.success('内容已复制到剪贴板');
      } catch (e) {
        message.error('复制失败，请手动复制');
      }
    }
    
    handleCloseContextMenu();
  }, [contextMenuMessage, handleCloseContextMenu]);

  const handleForwardMessage = useCallback(() => {
    if (!contextMenuMessage) return;
    setForwardingMessage(contextMenuMessage);
    setForwardModalVisible(true);
    setSelectedTargetRoom(null);
    handleCloseContextMenu();
  }, [contextMenuMessage, handleCloseContextMenu]);

  const handleConfirmForward = useCallback(async () => {
    if (!forwardingMessage || !selectedTargetRoom) {
      message.warning('请选择目标聊天室');
      return;
    }
    
    setForwarding(true);
    try {
      const result = await forwardMessage(forwardingMessage.id, selectedTargetRoom);
      message.success(`消息已转发到「${result.targetRoomName}」`);
      setForwardModalVisible(false);
      setForwardingMessage(null);
      
      onRoomChange(selectedTargetRoom);
    } catch (error) {
      console.error('转发消息失败:', error);
      message.error('转发消息失败');
    } finally {
      setForwarding(false);
    }
  }, [forwardingMessage, selectedTargetRoom, onRoomChange]);

  const handleDeleteMessage = useCallback(async () => {
    if (!contextMenuMessage) return;
    
    try {
      await deleteMessage(contextMenuMessage.id);
      message.success('消息已删除');
      
      setAllMessages(prev => prev.filter(m => m.id !== contextMenuMessage.id));
      
    } catch (error: any) {
      console.error('删除消息失败:', error);
      if (error?.response?.status === 403) {
        message.error('只能删除自己发送的消息');
      } else {
        message.error('删除消息失败');
      }
    }
    
    handleCloseContextMenu();
  }, [contextMenuMessage, setAllMessages, handleCloseContextMenu]);

  const handleMentionUser = useCallback((targetUser: { id: number; username: string; nickname?: string }) => {
    const mentionText = `@${targetUser.nickname || targetUser.username} `;
    setInputValue(prev => {
      const newValue = prev + mentionText;
      return newValue;
    });
    
    setTimeout(() => {
      if (inputRef) {
        inputRef.focus();
        inputRef.setSelectionRange(inputRef.value.length, inputRef.value.length);
      }
    }, 50);
    
    message.success(`已@${targetUser.nickname || targetUser.username}`);
  }, [inputRef]);

  const contextMenuItems: MenuProps['items'] = contextMenuMessage ? [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制',
      onClick: handleCopyMessage
    },
    {
      key: 'forward',
      icon: <ShareAltOutlined />,
      label: '转发',
      onClick: handleForwardMessage
    },
    ...(contextMenuMessage.user_id === user?.id ? [{
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: handleDeleteMessage
    }] : [])
  ] : [];

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

  return (
    <>
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
        <Row gutter={12} style={{ flex: 1, display: 'flex', minHeight: 0, height: '100%' }}>
          <Col 
            span={18} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: 0, 
              overflow: 'hidden',
              height: '100%'
            }}
          >
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: 0, 
              overflow: 'hidden'
            }}>
              <CompactMessageList 
                roomId={roomId}
                currentUserId={user?.id}
                username={user?.username || ''}
                nickname={user?.nickname}
                onContextMenu={handleContextMenu}
                onMentionUser={handleMentionUser}
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
                onSendImages={handleSendImages}
                disabled={!isConnected}
                inputRef={inputRef}
                setInputRef={setInputRef}
              />
            </div>
          </Col>
          <Col 
            span={6} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              overflow: 'hidden',
              minHeight: 0,
              height: '100%'
            }}
          >
            <ChatRoomSelector 
              currentRoomId={roomId}
              onRoomChange={onRoomChange}
            />
            <OnlineUsers 
              roomId={roomId} 
              socket={socket}
              sendSystemMessage={sendSystemMessage}
              currentUser={user}
              onMentionUser={handleMentionUser}
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

      {contextMenuVisible && contextMenuMessage && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1000,
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            padding: '4px',
            minWidth: '140px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={handleCopyMessage}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <CopyOutlined style={{ color: '#667eea' }} />
            <span>复制</span>
          </div>
          <div
            onClick={handleForwardMessage}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ShareAltOutlined style={{ color: '#667eea' }} />
            <span>转发</span>
          </div>
          {contextMenuMessage.user_id === user?.id && (
            <div
              onClick={handleDeleteMessage}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#ff4d4f',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 77, 79, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <DeleteOutlined />
              <span>删除</span>
            </div>
          )}
        </div>
      )}

      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontWeight: '600',
            fontSize: '16px'
          }}>
            <ShareAltOutlined style={{ color: '#667eea' }} />
            <span>转发消息</span>
          </div>
        }
        open={forwardModalVisible}
        onCancel={() => {
          setForwardModalVisible(false);
          setForwardingMessage(null);
          setSelectedTargetRoom(null);
        }}
        onOk={handleConfirmForward}
        okText="确认转发"
        cancelText="取消"
        confirmLoading={forwarding}
        okButtonProps={{
          style: {
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }
        }}
        width={480}
      >
        {forwardingMessage && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '13px', 
              color: '#718096', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <UserOutlined />
              <span>原消息内容：</span>
            </div>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(102, 126, 234, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              {forwardingMessage.message_type === 'text' ? (
                <span style={{ color: '#334155' }}>{forwardingMessage.content}</span>
              ) : forwardingMessage.message_type === 'image' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🖼️</span>
                  <span style={{ color: '#334155' }}>
                    {forwardingMessage.file_name || '图片消息'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📄</span>
                  <span style={{ color: '#334155' }}>
                    {forwardingMessage.file_name || '文件消息'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div style={{ 
          fontSize: '13px', 
          color: '#718096', 
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <UserOutlined style={{ display: 'none' }} />
          <span>选择目标聊天室：</span>
        </div>
        
        {loadingRooms ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>
            加载聊天室列表中...
          </div>
        ) : chatRooms.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: '#a0aec0' 
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div>暂无其他聊天室</div>
          </div>
        ) : (
          <div style={{ 
            maxHeight: '240px', 
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            <List
              dataSource={chatRooms}
              renderItem={(room) => {
                const isSelected = selectedTargetRoom === room.id;
                const roomType = room.type as RoomType;
                const typeConfig = ROOM_TYPE_CONFIG[roomType] || ROOM_TYPE_CONFIG.study_group;
                
                return (
                  <List.Item
                    key={room.id}
                    onClick={() => setSelectedTargetRoom(room.id)}
                    style={{
                      padding: '12px 16px',
                      marginBottom: '4px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected 
                        ? 'rgba(102, 126, 234, 0.1)' 
                        : 'transparent',
                      border: isSelected 
                        ? '2px solid rgba(102, 126, 234, 0.4)' 
                        : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
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
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size={40}
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : typeConfig.label === '公开房间'
                                ? 'rgba(82, 196, 26, 0.1)'
                                : typeConfig.label === '私密房间'
                                  ? 'rgba(114, 46, 209, 0.1)'
                                  : 'rgba(24, 144, 255, 0.1)',
                            color: isSelected ? '#fff' 
                              : typeConfig.label === '公开房间' ? '#52c41a'
                                : typeConfig.label === '私密房间' ? '#722ed1'
                                  : '#1890ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                          }}
                          icon={typeConfig.icon}
                        />
                      }
                      title={
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontWeight: isSelected ? '600' : '500',
                          color: isSelected ? '#667eea' : '#334155'
                        }}>
                          <span>{room.name}</span>
                          {isSelected && (
                            <CheckCircleOutlined style={{ color: '#667eea' }} />
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
                              padding: '0 6px',
                              height: '18px',
                              lineHeight: '18px',
                              borderRadius: '4px',
                              background: isSelected 
                                ? 'rgba(102, 126, 234, 0.1)'
                                : typeConfig.label === '公开房间'
                                  ? 'rgba(82, 196, 26, 0.1)'
                                  : typeConfig.label === '私密房间'
                                    ? 'rgba(114, 46, 209, 0.1)'
                                    : 'rgba(24, 144, 255, 0.1)',
                              color: isSelected ? '#667eea'
                                : typeConfig.label === '公开房间' ? '#52c41a'
                                  : typeConfig.label === '私密房间' ? '#722ed1'
                                    : '#1890ff',
                              border: 'none'
                            }}
                          >
                            {typeConfig.icon}
                            <span style={{ marginLeft: '4px' }}>{typeConfig.label}</span>
                          </Tag>
                          <span style={{ color: '#718096' }}>
                            最多 {room.max_users} 人
                          </span>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
};
