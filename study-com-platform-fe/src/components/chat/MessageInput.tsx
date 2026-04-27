import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Popover, Upload, message, Tooltip, Badge } from 'antd';
import { 
  SendOutlined, 
  SmileOutlined, 
  PictureOutlined, 
  PaperClipOutlined,
  CloseOutlined,
  LoadingOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { uploadChatFile } from '../../services/chat';

const { TextArea } = Input;

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  fileName: string;
  fileSize: number;
  uploading?: boolean;
  uploadError?: string;
}

// 常用表情列表
const EMOJI_GROUPS = [
  {
    title: '表情',
    emojis: [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
      '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
      '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤',
      '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴',
      '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥',
      '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱',
      '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
      '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻',
      '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌',
      '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯',
      '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '🗨️', '🗯️',
      '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
      '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐',
      '🤲', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
      '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫀', '🫁',
    ]
  }
];

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendImage?: (fileUrl: string, fileName: string, fileSize: number) => void;
  onSendFile?: (fileUrl: string, fileName: string, fileSize: number) => void;
  onSendImages?: (images: PendingImage[]) => void;
  disabled?: boolean;
  inputRef?: React.MutableRefObject<HTMLTextAreaElement | null>;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  onSendImage,
  onSendFile,
  onSendImages,
  disabled = false,
  inputRef
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    if (inputRef && internalTextareaRef.current) {
      inputRef.current = internalTextareaRef.current;
    }
  }, [inputRef]);

  const addPendingImage = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('仅支持粘贴图片格式');
      return;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB');
      return;
    }

    const existingIds = pendingImagesRef.current.map(img => img.fileName + img.fileSize);
    const isDuplicate = existingIds.some(id => id === file.name + file.size);
    
    if (isDuplicate) {
      message.warning('该图片已添加');
      return;
    }

    if (pendingImagesRef.current.length >= 9) {
      message.warning('最多只能添加9张图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      const newImage: PendingImage = {
        id: generateId(),
        file,
        previewUrl,
        fileName: file.name,
        fileSize: file.size
      };
      setPendingImages(prev => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
  }, []);

  const removePendingImage = useCallback((id: string) => {
    setPendingImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img && img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          addPendingImage(file);
        }
      }
    }
  }, [addPendingImage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (isComposing) return;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || pendingImages.length > 0) && !disabled) {
        handleSendClick();
      }
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleSendClick = useCallback(async () => {
    if (disabled) return;

    const imagesToSend = [...pendingImages];
    
    setPendingImages([]);
    
    if (imagesToSend.length > 0 && onSendImages) {
      onSendImages(imagesToSend);
    }
    
    if (value.trim()) {
      onSend();
    }
  }, [disabled, pendingImages, value, onSendImages, onSend]);

  const insertEmoji = (emoji: string) => {
    if (internalTextareaRef.current) {
      const start = internalTextareaRef.current.selectionStart || 0;
      const end = internalTextareaRef.current.selectionEnd || 0;
      const newValue = value.substring(0, start) + emoji + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if (internalTextareaRef.current) {
          const newPos = start + emoji.length;
          internalTextareaRef.current.selectionStart = newPos;
          internalTextareaRef.current.selectionEnd = newPos;
          internalTextareaRef.current.focus();
        }
      }, 0);
    } else {
      onChange(value + emoji);
    }
    setEmojiPickerVisible(false);
  };

  const handleImageUpload: UploadProps['beforeUpload'] = async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('仅支持图片格式');
      return Upload.LIST_IGNORE;
    }

    addPendingImage(file);

    return Upload.LIST_IGNORE;
  };

  const handleFileUpload: UploadProps['beforeUpload'] = async (file) => {
    const isLt50M = file.size / 1024 / 1024 < 50;
    if (!isLt50M) {
      message.error('文件大小不能超过 50MB');
      return Upload.LIST_IGNORE;
    }

    try {
      setFileUploading(true);
      const result = await uploadChatFile(file);
      
      if (onSendFile) {
        onSendFile(result.file_url, result.file_name, result.file_size);
      }
      
      message.success('文件上传成功');
    } catch (error) {
      message.error('文件上传失败，请重试');
      console.error('文件上传错误:', error);
    } finally {
      setFileUploading(false);
    }

    return Upload.LIST_IGNORE;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canSend = value.trim() || pendingImages.length > 0;

  const emojiPickerContent = (
    <div 
      className="emoji-picker"
      style={{
        maxWidth: '320px',
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px'
      }}
    >
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(8, 1fr)', 
        gap: '4px' 
      }}>
        {EMOJI_GROUPS[0].emojis.map((emoji, index) => (
          <span
            key={index}
            onClick={() => insertEmoji(emoji)}
            style={{
              fontSize: '20px',
              padding: '6px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              lineHeight: '1'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: '8px',
      padding: '16px',
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
      borderRadius: '16px',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      transition: 'all 0.3s ease'
    }}>
      
      {pendingImages.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '12px 16px',
          marginBottom: '4px',
          background: 'rgba(248, 250, 252, 0.9)',
          borderRadius: '12px',
          border: '1px solid rgba(226, 232, 240, 0.6)',
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(102, 126, 234, 0.3) transparent'
        }}>
          <span style={{
            fontSize: '12px',
            color: '#64748b',
            fontWeight: '500',
            flexShrink: 0,
            padding: '4px 0',
            marginRight: '4px'
          }}>
            待发送图片 ({pendingImages.length}/9):
          </span>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            {pendingImages.map((img, index) => (
              <div
                key={img.id}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'all 0.3s ease'
                }}
              >
                <Badge
                  count={
                    <Button
                      icon={<CloseOutlined />}
                      size="small"
                      shape="circle"
                      danger
                      style={{
                        width: '20px',
                        height: '20px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                        border: '2px solid #fff'
                      }}
                      onClick={() => removePendingImage(img.id)}
                    />
                  }
                  offset={[6, -6]}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '2px solid rgba(226, 232, 240, 0.8)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.25)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.fileName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                </Badge>
                <div style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  textAlign: 'center',
                  marginTop: '4px',
                  maxWidth: '64px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {formatFileSize(img.fileSize)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '0 4px'
      }}>
        <Popover
          content={emojiPickerContent}
          title={
            <div style={{ 
              fontWeight: '600', 
              fontSize: '14px',
              color: '#334155',
              padding: '4px 0'
            }}>
              选择表情
            </div>
          }
          trigger="click"
          open={emojiPickerVisible}
          onOpenChange={setEmojiPickerVisible}
          placement="topLeft"
          arrow={{ pointAtCenter: true }}
          styles={{
            body: {
              padding: '8px',
              borderRadius: '12px'
            }
          }}
        >
          <Tooltip title="表情">
            <Button
              type="text"
              icon={<SmileOutlined />}
              disabled={disabled}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: emojiPickerVisible ? '#667eea' : '#64748b',
                background: emojiPickerVisible ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.color = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                if (!emojiPickerVisible && !disabled) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            />
          </Tooltip>
        </Popover>

        <Upload
          beforeUpload={handleImageUpload}
          accept="image/*"
          multiple={false}
          showUploadList={false}
        >
          <Tooltip title="上传图片">
            <Button
              type="text"
              icon={imageUploading ? <LoadingOutlined /> : <PictureOutlined />}
              disabled={disabled || imageUploading || pendingImages.length >= 9}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: imageUploading ? '#667eea' : '#64748b',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!disabled && !imageUploading && pendingImages.length < 9) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.color = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !imageUploading) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            />
          </Tooltip>
        </Upload>

        <Upload
          beforeUpload={handleFileUpload}
          multiple={false}
          showUploadList={false}
        >
          <Tooltip title="上传文件">
            <Button
              type="text"
              icon={fileUploading ? <LoadingOutlined /> : <PaperClipOutlined />}
              disabled={disabled || fileUploading}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: fileUploading ? '#667eea' : '#64748b',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!disabled && !fileUploading) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.color = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !fileUploading) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            />
          </Tooltip>
        </Upload>

        <div style={{ flex: 1 }} />

        <span style={{ 
          fontSize: '12px', 
          color: '#94a3b8',
          fontWeight: '400'
        }}>
          Enter 发送，Shift+Enter 换行，Ctrl+V 粘贴图片
        </span>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        <TextArea
          ref={handleTextareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPressEnter={handleKeyPress}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          placeholder="输入消息... (支持表情、图片、文件，可直接粘贴图片)"
          autoSize={{ minRows: 1, maxRows: 6 }}
          disabled={disabled}
          style={{ 
            flex: 1,
            borderRadius: '12px',
            border: '2px solid #e2e8f0',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px 16px',
            fontSize: '15px',
            lineHeight: '1.6',
            resize: 'none',
            transition: 'all 0.3s ease',
            outline: 'none',
            boxShadow: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.15)';
            e.currentTarget.style.background = '#ffffff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
          }}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />}
          onClick={handleSendClick}
          disabled={disabled || !canSend}
          style={{ 
            height: 'auto',
            minHeight: '44px',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            background: disabled || !canSend 
              ? '#cbd5e0' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            boxShadow: disabled || !canSend 
              ? 'none' 
              : '0 4px 15px rgba(102, 126, 234, 0.35)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (!disabled && canSend) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.45)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = disabled || !canSend 
              ? 'none' 
              : '0 4px 15px rgba(102, 126, 234, 0.35)';
          }}
        >
          发送
          {pendingImages.length > 0 && (
            <span style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
              marginLeft: '4px'
            }}>
              {pendingImages.length} 张图片
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
