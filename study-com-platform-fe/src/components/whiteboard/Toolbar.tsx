import React from 'react';
import { Button, Space, Slider, ColorPicker } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  UndoOutlined, 
  RedoOutlined,
  ClearOutlined
} from '@ant-design/icons';

interface ToolbarProps {
  currentTool: 'pen' | 'eraser';
  onToolChange: (tool: 'pen' | 'eraser') => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  onClear: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  disabled?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  currentColor,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onClear,
  onUndo,
  onRedo,
  disabled = false
}) => {
  return (
    <div style={{ 
      padding: '12px', 
      borderBottom: '1px solid #f0f0f0',
      backgroundColor: '#fafafa'
    }}>
      <Space size="middle">
        <Button 
          icon={<EditOutlined />}
          type={currentTool === 'pen' ? 'primary' : 'default'}
          onClick={() => onToolChange('pen')}
          disabled={disabled}
        >
          画笔
        </Button>
        
        <Button 
          icon={<DeleteOutlined />}
          type={currentTool === 'eraser' ? 'primary' : 'default'}
          onClick={() => onToolChange('eraser')}
          disabled={disabled}
        >
          橡皮擦
        </Button>
        
        {currentTool === 'pen' && (
          <>
            <ColorPicker 
              value={currentColor}
              onChange={(color) => onColorChange(color.toHexString())}
              disabled={disabled}
            />
            <span>颜色</span>
          </>
        )}
        
        <Slider
          min={1}
          max={20}
          value={lineWidth}
          onChange={onLineWidthChange}
          style={{ width: 100 }}
          disabled={disabled}
        />
        <span>粗细: {lineWidth}px</span>
        
        <Button 
          icon={<ClearOutlined />}
          onClick={onClear}
          disabled={disabled}
        >
          清空
        </Button>
        
        {onUndo && (
          <Button 
            icon={<UndoOutlined />}
            onClick={onUndo}
            disabled={disabled}
          >
            撤销
          </Button>
        )}
        
        {onRedo && (
          <Button 
            icon={<RedoOutlined />}
            onClick={onRedo}
            disabled={disabled}
          >
            重做
          </Button>
        )}
      </Space>
    </div>
  );
};