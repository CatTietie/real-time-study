import React from 'react';
import { Button, Space, Slider, ColorPicker, Select, Input, Popover } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  UndoOutlined, 
  RedoOutlined,
  ClearOutlined,
  FontColorsOutlined,
  BorderOutlined,
  PictureOutlined,
  SelectOutlined
} from '@ant-design/icons';

interface ToolbarProps {
  currentTool: 'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'select';
  onToolChange: (tool: 'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'select') => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  onClear: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  disabled?: boolean;
  // 文字工具相关
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  fontFamily?: string;
  onFontFamilyChange?: (family: string) => void;
  // 图形工具相关
  shapeType?: 'rectangle' | 'circle' | 'line' | 'arrow';
  onShapeTypeChange?: (type: 'rectangle' | 'circle' | 'line' | 'arrow') => void;
  fillColor?: string;
  onFillColorChange?: (color: string) => void;
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
  disabled = false,
  fontSize = 16,
  onFontSizeChange,
  fontFamily = 'Arial',
  onFontFamilyChange,
  shapeType = 'rectangle',
  onShapeTypeChange,
  fillColor = '#ffffff',
  onFillColorChange
}) => {
  return (
    <div style={{ 
      padding: '12px', 
      borderBottom: '1px solid #f0f0f0',
      backgroundColor: '#fafafa'
    }}>
      <Space size="middle" wrap>
        {/* 基础工具 */}
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
        
        <Button 
          icon={<FontColorsOutlined />}
          type={currentTool === 'text' ? 'primary' : 'default'}
          onClick={() => onToolChange('text')}
          disabled={disabled}
        >
          文字
        </Button>
        
        <Button 
          icon={<BorderOutlined />}
          type={currentTool === 'shape' ? 'primary' : 'default'}
          onClick={() => onToolChange('shape')}
          disabled={disabled}
        >
          图形
        </Button>
        
        <Button 
          icon={<PictureOutlined />}
          type={currentTool === 'image' ? 'primary' : 'default'}
          onClick={() => onToolChange('image')}
          disabled={disabled}
        >
          图片
        </Button>
        
        <Button 
          icon={<SelectOutlined />}
          type={currentTool === 'select' ? 'primary' : 'default'}
          onClick={() => onToolChange('select')}
          disabled={disabled}
        >
          选择
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