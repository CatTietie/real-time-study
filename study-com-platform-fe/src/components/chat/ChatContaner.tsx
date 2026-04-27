import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Button,
  Input,
  Select,
  Empty,
  Spin
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
  UserOutlined,
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  CloseOutlined,
  BellOutlined
} from '@ant-design/icons';
import CompactMessageList from './CompactMessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsers } from './OnlineUsers';
import { ChatRoomSelector } from './ChatRoomSelector';
import { useChatSocket } from '../../hooks/useChatSocket';
import { useAppSelector } from '../../app/hooks';
import type { ChatRoom, ChatMessage, AvailableUser } from '../../types/chat';
import { 
  forwardMessage, 
  deleteMessage, 
  getChatRooms, 
  getImageBase64, 
  uploadChatFile, 
  searchChatMessages,
  getUnreadMessages,
  markRoomAsRead,
  type UnreadMessageItem
} from '../../services/chat';
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
  const { role, username, userId, nickname } = authState;
  
  const [userStatus, setUserStatus] = useState<UserStatus>('online');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuMessage, setContextMenuMessage] = useState<ChatMessage | null>(null);
  
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [selectedTargetRoom, setSelectedTargetRoom] = useState<number | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewImageName, setPreviewImageName] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchPagination, setSearchPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [unreadList, setUnreadList] = useState<UnreadMessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const unreadPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (searchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchVisible]);
  
  const loadUnreadMessages = useCallback(async () => {
    if (!userId) return;
    
    try {
      const result = await getUnreadMessages();
      setUnreadCount(result.totalCount);
      setUnreadList(result.unreadList);
    } catch (error) {
      console.error('加载未读消息失败:', error);
    }
  }, [userId]);
  
  useEffect(() => {
    loadUnreadMessages();
    
    unreadPollingRef.current = setInterval(() => {
      loadUnreadMessages();
    }, 5000);
    
    return () => {
      if (unreadPollingRef.current) {
        clearInterval(unreadPollingRef.current);
      }
    };
  }, [loadUnreadMessages]);
  
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

  const handleImageClick = useCallback((imageUrl: string, fileName?: string) => {
    setPreviewImageUrl(imageUrl);
    setPreviewImageName(fileName || '');
    setImagePreviewVisible(true);
  }, []);

  const handleDownloadImage = useCallback(async () => {
    if (!previewImageUrl) return;
    
    try {
      const link = document.createElement('a');
      link.href = previewImageUrl;
      link.download = previewImageName || `chat-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('图片下载中...');
    } catch (error) {
      console.error('下载图片失败:', error);
      message.error('下载图片失败，请右键保存图片');
    }
  }, [previewImageUrl, previewImageName]);

  const handleCopyPreviewImage = useCallback(async () => {
    if (!previewImageUrl) return;
    
    try {
      setImageLoading(true);
      const imageData = await getImageBase64(previewImageUrl);
      const blob = base64ToBlob(imageData.base64, imageData.mimeType);
      const clipboardItem = new ClipboardItem({ [imageData.mimeType]: blob });
      await navigator.clipboard.write([clipboardItem]);
      message.success('图片已复制到剪贴板，可直接粘贴发送');
    } catch (clipboardError) {
      console.log('剪贴板复制失败，尝试复制链接:', clipboardError);
      try {
        await navigator.clipboard.writeText(previewImageUrl);
        message.success('图片链接已复制到剪贴板');
      } catch {
        message.error('复制失败，请手动复制');
      }
    } finally {
      setImageLoading(false);
    }
  }, [previewImageUrl, base64ToBlob]);

  const handleSearch = useCallback(async (page: number = 1) => {
    if (!searchKeyword.trim() || !roomId) return;
    
    setSearching(true);
    try {
      const result = await searchChatMessages(roomId, searchKeyword.trim(), page, searchPagination.limit);
      setSearchResults(result.messages);
      setSearchPagination({
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total
      });
      setShowSearchResults(true);
    } catch (error) {
      console.error('搜索消息失败:', error);
      message.error('搜索消息失败，请重试');
    } finally {
      setSearching(false);
    }
  }, [searchKeyword, roomId, searchPagination.limit]);

  const handleClearSearch = useCallback(() => {
    setSearchKeyword('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchPagination({
      page: 1,
      limit: 20,
      total: 0
    });
  }, []);

  const handleClickUnreadMessage = useCallback(async (item: UnreadMessageItem) => {
    const targetRoomId = item.room_id;
    
    try {
      await markRoomAsRead(targetRoomId);
      loadUnreadMessages();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
    
    onRoomChange(targetRoomId);
    
    setTimeout(() => {
      const messageElement = document.getElementById(`chat-message-${item.last_message_id}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.style.backgroundColor = 'rgba(102, 126, 234, 0.15)';
        setTimeout(() => {
          if (messageElement) {
            messageElement.style.transition = 'background-color 0.5s ease';
            messageElement.style.backgroundColor = 'transparent';
          }
        }, 2000);
      }
    }, 500);
  }, [onRoomChange, loadUnreadMessages]);

  const handleCloseImagePreview = useCallback(() => {
    setImagePreviewVisible(false);
    setPreviewImageUrl('');
    setPreviewImageName('');
  }, []);

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
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }
    }, 50);
    
    message.success(`已@${targetUser.nickname || targetUser.username}`);
  }, []);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              visibility: searchVisible ? 'visible' : 'hidden',
              opacity: searchVisible ? 1 : 0,
              position: searchVisible ? 'static' : 'absolute',
              transition: 'all 0.2s ease'
            }}>
              <Input.Search
                ref={searchInputRef}
                placeholder="搜索消息..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onSearch={() => handleSearch(1)}
                style={{ width: '250px' }}
                enterButton={
                  <Button type="primary" style={{ 
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}>
                    搜索
                  </Button>
                }
              />
              <Button 
                type="text" 
                icon={<CloseOutlined />}
                onClick={() => {
                  setSearchVisible(false);
                  handleClearSearch();
                }}
                style={{ color: '#fff' }}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              visibility: searchVisible ? 'hidden' : 'visible',
              opacity: searchVisible ? 0 : 1,
              position: searchVisible ? 'absolute' : 'static',
              transition: 'all 0.2s ease'
            }}>
              <Dropdown
                dropdownRender={() => (
                  <div style={{
                    minWidth: '350px',
                    maxHeight: '400px',
                    overflow: 'hidden',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.15)'
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                        未读消息
                      </span>
                      {unreadCount > 0 && (
                        <Tag color="error" style={{ margin: 0 }}>
                          {unreadCount} 条未读
                        </Tag>
                      )}
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {unreadList.length === 0 ? (
                        <div style={{
                          padding: '40px 20px',
                          textAlign: 'center',
                          color: '#999'
                        }}>
                          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                          <div>暂无未读消息</div>
                        </div>
                      ) : (
                        <List
                          dataSource={unreadList}
                          renderItem={(item) => (
                            <List.Item
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f5f5f5',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f9f9f9';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              onClick={() => handleClickUnreadMessage(item)}
                            >
                              <List.Item.Meta
                                avatar={
                                  <div style={{ position: 'relative' }}>
                                    <Avatar 
                                      src={item.last_sender_avatar} 
                                      size={40}
                                      style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        fontSize: '16px',
                                        fontWeight: '600'
                                      }}
                                    >
                                      {(item.last_sender_nickname || 'U').charAt(0)}
                                    </Avatar>
                                    <div style={{
                                      position: 'absolute',
                                      top: 0,
                                      right: 0,
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      background: '#ff4d4f',
                                      border: '2px solid #fff'
                                    }} />
                                  </div>
                                }
                                title={
                                  <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '4px'
                                  }}>
                                    <span style={{ 
                                      fontWeight: '600', 
                                      color: '#333',
                                      fontSize: '14px'
                                    }}>
                                      {item.last_sender_nickname}
                                    </span>
                                    <span style={{ 
                                      fontSize: '11px', 
                                      color: '#999'
                                    }}>
                                      {new Date(item.updated_at).toLocaleString('zh-CN', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                }
                                description={
                                  <div style={{ marginTop: '4px' }}>
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#667eea',
                                      marginBottom: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <MessageOutlined style={{ fontSize: '11px' }} />
                                      {item.room?.name || `聊天室 ${item.room_id}`}
                                    </div>
                                    <div style={{
                                      fontSize: '13px',
                                      color: '#666',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '280px'
                                    }}>
                                      {item.last_message_type === 'image' ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span>🖼️</span>
                                          <span style={{ color: '#667eea' }}>[图片消息]</span>
                                        </span>
                                      ) : item.last_message_type === 'file' ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span>📄</span>
                                          <span style={{ color: '#667eea' }}>[文件消息]</span>
                                        </span>
                                      ) : (
                                        item.last_message_content
                                      )}
                                    </div>
                                    {item.unread_count > 1 && (
                                      <Tag 
                                        color="error" 
                                        style={{ 
                                          marginTop: '6px',
                                          fontSize: '11px',
                                          padding: '1px 6px'
                                        }}
                                      >
                                        {item.unread_count} 条消息
                                      </Tag>
                                    )}
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}
                trigger={['click']}
                placement="bottomRight"
              >
                <Tooltip title={unreadCount > 0 ? `有 ${unreadCount} 条未读消息` : '暂无未读消息'}>
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  >
                    <BellOutlined style={{ 
                      fontSize: '18px', 
                      color: '#fff' 
                    }} />
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '9px',
                        background: '#ff4d4f',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '18px',
                        padding: '0 4px',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </Tooltip>
              </Dropdown>
              
              <Tooltip title="搜索消息">
                <Button 
                  type="text" 
                  icon={<SearchOutlined />}
                  onClick={() => setSearchVisible(true)}
                  style={{ color: '#fff' }}
                />
              </Tooltip>
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
            </div>
          </div>
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
            {showSearchResults ? (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                minHeight: 0, 
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <SearchOutlined style={{ color: '#667eea' }} />
                    <span style={{ color: '#334155', fontWeight: '500' }}>
                      搜索结果：找到 {searchPagination.total} 条消息
                    </span>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    onClick={handleClearSearch}
                    style={{ color: '#667eea' }}
                  >
                    返回聊天
                  </Button>
                </div>

                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  background: 'linear-gradient(180deg, rgba(226, 232, 240, 0.6) 0%, rgba(203, 213, 225, 0.6) 100%)',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  border: '1px solid rgba(160, 174, 192, 0.3)'
                }}>
                  {searching ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '200px'
                    }}>
                      <Spin tip="搜索中..." />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '200px',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '48px' }}>🔍</div>
                      <Empty description="未找到相关消息" />
                    </div>
                  ) : (
                    <div>
                      {searchResults.map((msg) => {
                        const isOwn = msg.user_id === user?.id;
                        return (
                          <div 
                            key={msg.id} 
                            style={{ 
                              marginBottom: '16px',
                              textAlign: isOwn ? 'right' : 'left',
                              padding: '12px 16px',
                              background: isOwn 
                                ? 'rgba(102, 126, 234, 0.08)' 
                                : 'rgba(255, 255, 255, 0.9)',
                              borderRadius: '12px',
                              border: '1px solid rgba(102, 126, 234, 0.15)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isOwn 
                                ? 'rgba(102, 126, 234, 0.12)' 
                                : '#fff';
                              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isOwn 
                                ? 'rgba(102, 126, 234, 0.08)' 
                                : 'rgba(255, 255, 255, 0.9)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px',
                              justifyContent: isOwn ? 'flex-end' : 'flex-start'
                            }}>
                              <Avatar size={24} src={msg.avatar} style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                fontSize: '12px'
                              }}>
                                {(msg.nickname || msg.username || 'U').charAt(0)}
                              </Avatar>
                              <span style={{ fontSize: '12px', color: '#718096' }}>
                                {msg.nickname || msg.username}
                              </span>
                              <span style={{ fontSize: '11px', color: '#a0aec0' }}>
                                {new Date(msg.created_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            <div style={{
                              color: '#334155',
                              fontSize: '14px',
                              lineHeight: '1.6',
                              wordBreak: 'break-word'
                            }}>
                              {msg.message_type === 'image' ? (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  color: '#667eea'
                                }}
                                onClick={() => {
                                  if (msg.file_url || msg.content) {
                                    handleImageClick(msg.file_url || msg.content, msg.file_name);
                                  }
                                }}
                                >
                                  <span style={{ fontSize: '20px' }}>🖼️</span>
                                  <span>[图片消息] {msg.file_name || '点击查看'}</span>
                                </div>
                              ) : msg.message_type === 'file' ? (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#667eea'
                                }}>
                                  <span style={{ fontSize: '20px' }}>📄</span>
                                  <span>[文件消息] {msg.file_name || '文件'}</span>
                                </div>
                              ) : (
                                <span>{msg.content}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {searchPagination.total > searchPagination.limit && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '8px',
                          marginTop: '16px',
                          padding: '12px'
                        }}>
                          <Button
                            size="small"
                            disabled={searchPagination.page <= 1}
                            onClick={() => {
                              const prevPage = searchPagination.page - 1;
                              handleSearch(prevPage);
                            }}
                          >
                            上一页
                          </Button>
                          <span style={{
                            fontSize: '13px',
                            color: '#718096',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            第 {searchPagination.page} 页 / 共 {Math.ceil(searchPagination.total / searchPagination.limit)} 页
                          </span>
                          <Button
                            size="small"
                            disabled={searchPagination.page >= Math.ceil(searchPagination.total / searchPagination.limit)}
                            onClick={() => {
                              const nextPage = searchPagination.page + 1;
                              handleSearch(nextPage);
                            }}
                          >
                            下一页
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
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
                    onImageClick={handleImageClick}
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
                  />
                </div>
              </>
            )}
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

      <Modal
        open={imagePreviewVisible}
        onCancel={handleCloseImagePreview}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyPreviewImage}
              loading={imageLoading}
            >
              复制图片
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadImage}
              style={{
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              下载图片
            </Button>
          </div>
        }
        centered
        maskClosable
        closable
        width={800}
        styles={{
          body: {
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            background: '#1a1a1a'
          },
          header: {
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderBottom: 'none'
          }
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EyeOutlined />
            <span>{previewImageName || '图片预览'}</span>
          </div>
        }
      >
        {imageLoading ? (
          <div style={{ color: '#fff', fontSize: '16px' }}>
            <Spin tip="加载中..." />
          </div>
        ) : (
          <div style={{
            maxWidth: '100%',
            maxHeight: '60vh',
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img
              src={previewImageUrl}
              alt={previewImageName || '图片'}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
};
