import React, { useState, useEffect, useRef } from 'react';
import { Spin, Button, Input, Space, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, DownOutlined } from "@ant-design/icons";
import type { ChatMessage } from '../../types/chat';
import { getChatHistory, searchChatMessages } from '../../services/chat';


interface EnhancedMessageListProps {
  roomId: number;
  currentUserId?: number;
}

const EnhancedMessageList: React.FC<EnhancedMessageListProps> = ({ 
  roomId, 
  currentUserId
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // 初始加载历史消息
  useEffect(() => {
    if (roomId > 0) {
      loadInitialMessages();
    }
  }, [roomId]);

  // 当有新消息时，滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialMessages = async () => {
    setLoading(true);
    try {
      const result = await getChatHistory(roomId, 1, 30);
      setMessages(result.messages);
      setHasMore(result.pagination.hasNext);
      setCurrentPage(1);
      setSearchKeyword('');
      setIsSearching(false);
    } catch (error) {
      console.error('加载初始消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loading || !hasMore || isSearching) return;
    
    setLoading(true);
    try {
      const result = await getChatHistory(
        roomId, 
        currentPage + 1, 
        30, 
        messages[0]?.id
      );
      
      if (result.messages.length > 0) {
        setMessages(prev => [...result.messages, ...prev]);
        setHasMore(result.pagination.hasNext);
        setCurrentPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('加载更多消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      loadInitialMessages();
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchChatMessages(roomId, keyword, 1, 30);
      setMessages(result.messages);
      setHasMore(false); // 搜索结果不分页
    } catch (error) {
      console.error('搜索消息失败:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = (keyword: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(keyword);
    }, 500);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString();
  };

  const isSystemMessage = (message: ChatMessage) => {
    return message.message_type === 'system' || message.user_id === 0;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '未知大小';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 获取文件图标
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

  // 渲染消息内容
  const renderMessageContent = (message: ChatMessage) => {
    const isOwn = message.user_id === currentUserId;
    
    // 图片消息
    if (message.message_type === 'image') {
      return (
        <div style={{
          display: 'inline-block',
          maxWidth: '300px',
          borderRadius: '12px',
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative'
        }}>
          <img 
            src={message.file_url || message.content}
            alt={message.file_name || '图片'}
            style={{
              maxWidth: '100%',
              maxHeight: '250px',
              borderRadius: '12px',
              display: 'block',
              objectFit: 'cover'
            }}
            onClick={() => {
              window.open(message.file_url || message.content, '_blank');
            }}
          />
          {message.file_name && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
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
    
    // 文件消息
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
              : '#f5f5f5',
            borderRadius: '12px',
            textDecoration: 'none',
            color: isOwn ? '#fff' : '#333',
            border: isOwn 
              ? 'none' 
              : '1px solid #e8e8e8',
            transition: 'all 0.3s ease',
            minWidth: '200px'
          }}
          onMouseEnter={(e) => {
            if (!isOwn) {
              e.currentTarget.style.background = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOwn) {
              e.currentTarget.style.background = '#f5f5f5';
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
    
    // 文本消息（默认）
    return <span>{message.content}</span>;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 搜索区域 */}
      <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="搜索聊天记录..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => {
              const value = e.target.value;
              setSearchKeyword(value);
              debouncedSearch(value);
            }}
            allowClear
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadInitialMessages}
            disabled={loading}
          />
        </Space.Compact>
      </div>

      {/* 消息列表 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 加载更多按钮 */}
        {hasMore && !isSearching && (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <Button 
              onClick={loadMoreMessages}
              loading={loading}
              size="small"
              icon={<DownOutlined />}
            >
              加载更多
            </Button>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1 
          }}>
            <Spin tip="加载消息中..." />
          </div>
        ) : messages.length === 0 ? (
          <Empty 
            description={isSearching ? "未找到相关消息" : "暂无聊天记录"}
            style={{ margin: 'auto' }}
          />
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id} 
                style={{ 
                  marginBottom: '16px',
                  textAlign: isSystemMessage(message) ? 'center' : 
                           message.user_id === currentUserId ? 'right' : 'left'
                }}
              >
                {!isSystemMessage(message) && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '4px',
                    textAlign: message.user_id === currentUserId ? 'right' : 'left'
                  }}>
                    {message.username}
                  </div>
                )}
                
                {/* 消息内容 */}
                {message.message_type === 'image' || message.message_type === 'file' ? (
                  // 图片/文件消息：不使用气泡背景
                  <div style={{
                    display: 'inline-block',
                    maxWidth: '80%',
                    transition: 'all 0.3s ease'
                  }}>
                    {renderMessageContent(message)}
                  </div>
                ) : (
                  // 文本/系统消息：使用气泡背景
                  <div style={{ 
                    display: 'inline-block',
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: isSystemMessage(message) ? '#f0f0f0' : 
                                   message.user_id === currentUserId ? '#1890ff' : '#fff',
                    color: isSystemMessage(message) ? '#666' : 
                          message.user_id === currentUserId ? '#fff' : '#333',
                    border: isSystemMessage(message) ? 'none' : '1px solid #d9d9d9',
                    wordWrap: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {renderMessageContent(message)}
                  </div>
                )}
                
                <div style={{ 
                  fontSize: '11px', 
                  color: '#999', 
                  marginTop: '4px',
                  textAlign: message.user_id === currentUserId ? 'right' : 'left'
                }}>
                  {formatTime(message.created_at)}
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessageList;