import React, { useState } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false
}) => {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // 如果正在输入中文，不触发发送
    if (isComposing) return;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: '12px',
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.8)',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      transition: 'all 0.3s ease'
    }}>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={handleKeyPress}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="输入消息... (Enter发送，Shift+Enter换行)"
        autoSize={{ minRows: 2, maxRows: 4 }}
        disabled={disabled}
        style={{ 
          flex: 1,
          borderRadius: '12px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.6',
          resize: 'none',
          transition: 'all 0.3s ease',
          outline: 'none'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#667eea';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <Button 
        type="primary" 
        icon={<SendOutlined />}
        onClick={onSend}
        disabled={disabled || !value.trim()}
        style={{ 
          height: 'auto',
          borderRadius: '12px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: '500',
          background: disabled || !value.trim() 
            ? '#cbd5e0' 
            : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          boxShadow: disabled || !value.trim() 
            ? 'none' 
            : '0 4px 15px rgba(102, 126, 234, 0.3)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (!disabled && value.trim()) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = disabled || !value.trim() 
            ? 'none' 
            : '0 4px 15px rgba(102, 126, 234, 0.3)';
        }}
      >
        发送
      </Button>
    </div>
  );
};