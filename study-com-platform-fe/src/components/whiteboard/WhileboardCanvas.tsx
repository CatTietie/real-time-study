import React, { useRef, useEffect, useState } from 'react';
import { useWhiteboardSocket } from '../../hooks/useWhiteboardSocket';
import type { DrawAction, EraseAction } from '../../types/whiteboard';

interface WhiteboardCanvasProps {
  whiteboardId: number;
  userId: number;
  username: string;
  width?: number;
  height?: number;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  whiteboardId,
  userId,
  username,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);

  const { actions, sendAction } = useWhiteboardSocket({
    whiteboardId,
    userId,
    username
  });

  // 绘制函数
  const drawOnCanvas = (action: DrawAction | EraseAction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (action.type === 'draw') {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (action.type === 'erase') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    if (action.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      
      ctx.stroke();
    }
  };

  // 处理鼠标事件
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

    const action: DrawAction | EraseAction = 
      currentTool === 'pen' 
        ? {
            type: 'draw',
            points: [{ x, y }],
            color: currentColor,
            lineWidth: lineWidth,
            userId,
            username
          }
        : {
            type: 'erase',
            points: [{ x, y }],
            lineWidth: lineWidth,
            userId,
            username
          };

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

  // 清空白板
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendAction({ type: 'clear' });
  };

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
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={() => setCurrentTool('pen')} 
          style={{ 
            backgroundColor: currentTool === 'pen' ? '#1890ff' : '#f0f0f0',
            marginRight: '10px' 
          }}
        >
          画笔
        </button>
        <button 
          onClick={() => setCurrentTool('eraser')} 
          style={{ 
            backgroundColor: currentTool === 'eraser' ? '#1890ff' : '#f0f0f0',
            marginRight: '10px' 
          }}
        >
          橡皮擦
        </button>
        <input 
          type="color" 
          value={currentColor} 
          onChange={(e) => setCurrentColor(e.target.value)}
          disabled={currentTool === 'eraser'}
        />
        <input 
          type="range" 
          min="1" 
          max="20" 
          value={lineWidth} 
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
        />
        <button onClick={clearCanvas}>清空</button>
      </div>
    </div>
  );
};