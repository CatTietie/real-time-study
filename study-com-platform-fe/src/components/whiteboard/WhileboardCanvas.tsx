import React, { useRef, useEffect, useState } from 'react';
import { useWhiteboardSocket } from '../../hooks/useWhiteboardSocket';
import type { DrawAction, EraseAction, TextAction, ShapeAction } from '../../types/whiteboard';

interface WhiteboardCanvasProps {
  whiteboardId: number;
  userId: number;
  username: string;
  roomId?: number;
  width?: number;
  height?: number;
  // 工具状态由父组件传入
  currentTool: 'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'select';
  currentColor: string;
  lineWidth: number;
  fontSize: number;
  fontFamily: string;
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
  fillColor: string;
  onClear: () => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  whiteboardId,
  userId,
  username,
  roomId,
  width = 800,
  height = 600,
  currentTool,
  currentColor,
  lineWidth,
  fontSize,
  fontFamily,
  shapeType,
  fillColor,
  onClear
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { actions, sendAction } = useWhiteboardSocket({
    whiteboardId,
    userId,
    username,
    roomId
  });

  // 绘制函数
  const drawOnCanvas = (action: DrawAction | EraseAction | TextAction | ShapeAction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (action.type === 'draw') {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (action.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        
        ctx.stroke();
      }
    } else if (action.type === 'erase') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (action.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        
        ctx.stroke();
      }
    } else if (action.type === 'text') {
      ctx.font = `${action.fontSize}px ${action.fontFamily}`;
      ctx.fillStyle = action.color;
      ctx.fillText(action.text, action.x, action.y);
    } else if (action.type === 'shape') {
      ctx.strokeStyle = action.strokeColor;
      ctx.fillStyle = action.fillColor;
      ctx.lineWidth = action.lineWidth;
      
      ctx.beginPath();
      switch (action.shapeType) {
        case 'rectangle':
          ctx.rect(action.x, action.y, action.width, action.height);
          break;
        case 'circle':
          ctx.arc(action.x + action.width/2, action.y + action.height/2, Math.min(action.width, action.height)/2, 0, 2 * Math.PI);
          break;
        case 'line':
          ctx.moveTo(action.x, action.y);
          ctx.lineTo(action.x + action.width, action.y + action.height);
          break;
        case 'arrow':
          // 绘制箭头线
          ctx.moveTo(action.x, action.y);
          ctx.lineTo(action.x + action.width, action.y + action.height);
          
          // 绘制箭头头部
          {
            const angle = Math.atan2(action.height, action.width);
            const headLength = 15;
            ctx.moveTo(action.x + action.width, action.y + action.height);
            ctx.lineTo(
              action.x + action.width - headLength * Math.cos(angle - Math.PI/6),
              action.y + action.height - headLength * Math.sin(angle - Math.PI/6)
            );
            ctx.moveTo(action.x + action.width, action.y + action.height);
            ctx.lineTo(
              action.x + action.width - headLength * Math.cos(angle + Math.PI/6),
              action.y + action.height - headLength * Math.sin(angle + Math.PI/6)
            );
          }
          break;
      }
      ctx.stroke();
      
      if (action.fillColor !== 'transparent' && action.shapeType !== 'line' && action.shapeType !== 'arrow') {
        ctx.fill();
      }
    }
  };

  // 处理鼠标事件
  const startDrawing = () => {
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let action: DrawAction | EraseAction | TextAction | ShapeAction;
    
    switch (currentTool) {
      case 'pen':
        action = {
          type: 'draw',
          points: [{ x, y }],
          color: currentColor,
          lineWidth: lineWidth,
          userId,
          username
        };
        break;
      case 'eraser':
        action = {
          type: 'erase',
          points: [{ x, y }],
          lineWidth: lineWidth,
          userId,
          username
        };
        break;
      case 'text':
        {
          const text = prompt('请输入文字:');
          if (text) {
            action = {
              type: 'text',
              x,
              y,
              text,
              fontSize,
              fontFamily,
              color: currentColor,
              userId,
              username
            };
          } else {
            return;
          }
        }
        break;
      case 'shape':
        {
          const width = 100;
          const height = 60;
          action = {
            type: 'shape',
            x,
            y,
            width,
            height,
            shapeType,
            strokeColor: currentColor,
            fillColor,
            lineWidth: lineWidth,
            userId,
            username
          };
        }
        break;
      default:
        return;
    }

    drawOnCanvas(action);
    sendAction(action);
  };

  // 应用接收到的动作
  useEffect(() => {
    actions.forEach(action => {
      if (action.userId !== userId) {
        drawOnCanvas(action);
      }
    });
  }, [actions, userId]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onMouseMove={draw}
        style={{
          border: '1px solid #ccc',
          cursor: currentTool === 'pen' ? 'crosshair' : 'pointer',
          backgroundColor: '#FFFFFF'
        }}
      />
    </div>
  );
};