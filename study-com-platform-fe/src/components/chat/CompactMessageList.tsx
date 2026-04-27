import React, { useState, useEffect, useRef } from 'react';
import { Spin, Button, Avatar, Dropdown, Tooltip, Popover } from 'antd';
import type { MenuProps } from 'antd';
import { HistoryOutlined, LoadingOutlined, UserOutlined } from "@ant-design/icons";
import type { ChatMessage } from '../../types/chat';
import { useChatSocket } from '../../hooks/useChatSocket';

interface CompactMessageListProps {
  roomId: number;
  currentUserId?: number;
  onNewMessage?: (message: ChatMessage) => void;
  username: string;
  nickname?: string;
  onContextMenu?: (e: React.MouseEvent, message: ChatMessage) => void;
  onMentionUser?: (user: { id: number; username: string; nickname?: string }) => void;
}

const getAvatarGradient = (username: string): string => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  ];
  const index = username?.charCodeAt(0) || 0;
  return gradients[index % gradients.length];
};

const CompactMessageList: React.FC<CompactMessageListProps> = ({ 
  roomId, 
  currentUserId,
  onNewMessage,
  username,
  nickname,
  onContextMenu,
  onMentionUser
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  
  const { 
    messages, 
    loadingHistory, 
    hasMoreHistory, 
    totalMessageCount,
    collapsedMessageCount,
    isAllHistoryLoaded,
    loadMoreHistory,
    isConnected
  } = useChatSocket({
    roomId,
    userId: currentUserId || 0,
    username,
    nickname
  });

  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setInitialScrollDone(true);
    }
  }, [messages.length, initialScrollDone]);

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '时间未知';
    }
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isSystemMessage = (message: ChatMessage) => {
    return message.message_type === 'system' || message.user_id === 0;
  };

  const getMessageSenderName = (message: ChatMessage) => {
    if (isSystemMessage(message)) {
      return '系统';
    }
    const displayName = message.nickname || message.username || `用户${message.user_id}`;
    return displayName;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '未知大小';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string): string => {
    if (!fileName) return '📄';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const docExts = ['doc', 'docx', 'pdf', 'txt', 'md'];
    const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
    const zipExts = ['zip', 'rar', '7z', 'tar', 'gz'];
    
    if (imageExts.includes(ext)) return '🖼️';
    if (docExts.includes(ext)) return '📄';
    if (videoExts.includes(ext)) return '🎬';
    if (audioExts.includes(ext)) return '🎵';
    if (zipExts.includes(ext)) return '📦';
    return '📄';
  };

  const renderMessageContent = (message: ChatMessage) => {
    const isOwn = message.user_id === currentUserId;
    
    if (message.message_type === 'image') {
      const imageUrl = message.file_url || message.content;
      return (
        <div style={{
          display: 'inline-block',
          maxWidth: '280px',
          borderRadius: '12px',
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative'
        }}>
          <img 
            src={imageUrl}
            alt={message.file_name || '图片'}
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              borderRadius: '12px',
              display: 'block',
              objectFit: 'cover'
            }}
            onClick={() => {
              window.open(imageUrl, '_blank');
            }}
          />
          {message.file_name && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
              padding: '20px 12px 8px',
              borderRadius: '0 0 12px 12px',
              fontSize: '12px',
              color: '#fff'
            }}>
              {message.file_name}
              {message.file_size && (
                <span style={{ opacity: 0.8, marginLeft: '8px' }}>
                  {formatFileSize(message.file_size)}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
    
    if (message.message_type === 'file') {
      return (
        <a 
          href={message.file_url || message.content}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: isOwn 
              ? 'rgba(255,255,255,0.15)' 
              : 'rgba(102, 126, 234, 0.05)',
            borderRadius: '12px',
            textDecoration: 'none',
            color: isOwn ? '#fff' : '#334155',
            border: isOwn 
              ? 'none' 
              : '1px solid rgba(102, 126, 234, 0.2)',
            transition: 'all 0.3s ease',
            minWidth: '200px'
          }}
          onMouseEnter={(e) => {
            if (!isOwn) {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOwn) {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
            }
          }}
        >
          <div style={{
            fontSize: '32px',
            lineHeight: '1'
          }}>
            {getFileIcon(message.file_name || '')}
          </div>
          <div style={{
            flex: 1,
            minWidth: 0
          }}>
            <div style={{
              fontWeight: '600',
              fontSize: '14px',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {message.file_name || '文件'}
            </div>
            <div style={{
              fontSize: '12px',
              opacity: 0.7
            }}>
              {formatFileSize(message.file_size || 0)}
              <span style={{ marginLeft: '8px' }}>点击下载</span>
            </div>
          </div>
        </a>
      );
    }
    
    return <span>{message.content}</span>;
  };

  const showHistoryButton = collapsedMessageCount > 0 || hasMoreHistory || (totalMessageCount > 0 && messages.length > 0);

  const handleMessageContextMenu = (e: React.MouseEvent, message: ChatMessage) => {
    if (onContextMenu) {
      onContextMenu(e, message);
    }
  };

  const handleMentionUser = (message: ChatMessage) => {
    if (onMentionUser && !isSystemMessage(message)) {
      onMentionUser({
        id: message.user_id,
        username: message.username || `用户${message.user_id}`,
        nickname: message.nickname
      });
    }
  };

  const renderMessageAvatar = (message: ChatMessage, isOwn: boolean) => {
    if (isSystemMessage(message)) return null;

    const displayName = getMessageSenderName(message);
    const userMenuItems: MenuProps['items'] = [{
      key: 'mention',
      icon: <UserOutlined style={{ color: '#667eea' }} />,
      label: '@用户',
      onClick: () => handleMentionUser(message)
    }];

    const avatarContent = message.avatar ? (
      <Avatar
        size={32}
        src={message.avatar}
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
      />
    ) : (
      <Avatar
        size={32}
        style={{
          background: getAvatarGradient(message.username || ''),
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
      >
        {displayName.charAt(0).toUpperCase()}
      </Avatar>
    );

    const avatarWithMenu = onMentionUser ? (
      <Dropdown 
        menu={{ items: userMenuItems }} 
        trigger={['contextMenu']}
        placement={isOwn ? 'topRight' : 'topLeft'}
      >
        <div style={{ cursor: 'context-menu' }}>
          {avatarContent}
        </div>
      </Dropdown>
    ) : (
      avatarContent
    );

    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        flexDirection: isOwn ? 'row-reverse' : 'row'
      }}>
        {avatarWithMenu}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start'
        }}>
          <span style={{ 
            fontSize: '12px', 
            color: '#718096', 
            marginBottom: '4px',
            fontWeight: '500',
            letterSpacing: '0.5px'
          }}>
            {displayName}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div 
        ref={messagesContainerRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(226, 232, 240, 0.6) 0%, rgba(203, 213, 225, 0.6) 100%)',
          borderRadius: '20px',
          margin: '12px',
          border: '1px solid rgba(160, 174, 192, 0.3)',
          boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.03)'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1,
            color: '#a0aec0',
            fontSize: '16px',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>💬</div>
            <div>暂无消息</div>
            <div style={{ fontSize: '12px', color: '#cbd5e0' }}>开始发送第一条消息吧</div>
          </div>
        ) : (
          <>
            {showHistoryButton && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '12px 0',
                flexShrink: 0
              }}>
                <Button
                  type="text"
                  icon={loadingHistory ? <LoadingOutlined spin /> : <HistoryOutlined />}
                  onClick={loadMoreHistory}
                  disabled={loadingHistory || !hasMoreHistory}
                  style={{
                    padding: '6px 16px',
                    height: 'auto',
                    borderRadius: '20px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    color: '#667eea',
                    fontSize: '12px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingHistory && hasMoreHistory) {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  }}
                >
                  {loadingHistory 
                    ? '加载中...' 
                    : collapsedMessageCount > 0 
                      ? `查看历史消息 (${collapsedMessageCount}条被折叠)`
                      : hasMoreHistory 
                        ? '查看更早的消息'
                        : '已加载全部历史消息'}
                </Button>
              </div>
            )}

            {messages.map((message) => {
              const isOwn = message.user_id === currentUserId;
              const isSystem = isSystemMessage(message);

              return (
                <div 
                  key={message.id} 
                  style={{ 
                    marginBottom: '16px',
                    padding: '0 20px',
                    textAlign: isSystem ? 'center' : 
                             isOwn ? 'right' : 'left',
                    transition: 'all 0.3s ease'
                  }}
                  className="message-item"
                  onContextMenu={(e) => handleMessageContextMenu(e, message)}
                >
                  {!isSystem && (
                    <div style={{
                      marginBottom: '4px',
                      display: isOwn ? 'flex' : 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start'
                    }}>
                      {renderMessageAvatar(message, isOwn)}
                    </div>
                  )}
                  
                  {message.message_type === 'image' || message.message_type === 'file' ? (
                    <div style={{
                      display: 'inline-block',
                      maxWidth: '80%',
                      transition: 'all 0.3s ease'
                    }}>
                      {renderMessageContent(message)}
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'inline-block',
                      maxWidth: '80%',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: isSystem 
                        ? 'rgba(226, 232, 240, 0.9)'
                        : isOwn 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'rgba(255, 255, 255, 0.98)',
                      color: isSystem 
                        ? '#4a5568'
                        : isOwn 
                          ? '#ffffff'
                          : '#1a202c',
                      border: isSystem 
                        ? 'none' 
                        : isOwn 
                          ? 'none' 
                          : '1px solid rgba(160, 174, 192, 0.5)',
                      wordWrap: 'break-word',
                      boxShadow: isOwn 
                        ? '0 6px 20px rgba(102, 126, 234, 0.4)'
                        : isSystem
                          ? '0 2px 8px rgba(0, 0, 0, 0.05)'
                          : '0 3px 12px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      cursor: 'default',
                      position: 'relative',
                      overflow: 'hidden',
                      fontWeight: '500',
                      lineHeight: '1.6'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = isOwn 
                        ? '0 8px 25px rgba(102, 126, 234, 0.4)' 
                        : '0 6px 20px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = isOwn 
                        ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.06)';
                    }}
                    >
                      {renderMessageContent(message)}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#a0aec0', 
                    marginTop: '4px',
                    textAlign: isOwn ? 'right' : 'left',
                    fontWeight: '400'
                  }}>
                    {formatTime(message.created_at)}
                  </div>
                </div>
              );
            })}
            
            <div style={{ height: '4px' }} />
          </>
        )}
      </div>
    </div>
  );
};

export default CompactMessageList;
