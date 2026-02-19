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
    <div style={{ display: 'flex', gap: '8px' }}>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={handleKeyPress}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="输入消息... (Enter发送，Shift+Enter换行)"
        autoSize={{ minRows: 2, maxRows: 4 }}
        disabled={disabled}
        style={{ flex: 1 }}
      />
      <Button 
        type="primary" 
        icon={<SendOutlined />}
        onClick={onSend}
        disabled={disabled || !value.trim()}
        style={{ height: 'auto' }}
      >
        发送
      </Button>
    </div>
  );
};