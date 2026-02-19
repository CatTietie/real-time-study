import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { WhiteboardState } from '../../types/whiteboard';

interface WhiteboardContextType {
  whiteboard: WhiteboardState | null;
  setWhiteboard: (whiteboard: WhiteboardState | null) => void;
  currentTool: 'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'select';
  setCurrentTool: (tool: 'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'select') => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
  // 文字工具相关
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
  // 图形工具相关
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
  setShapeType: (type: 'rectangle' | 'circle' | 'line' | 'arrow') => void;
  fillColor: string;
  setFillColor: (color: string) => void;
}

const WhiteboardContext = createContext<WhiteboardContextType | undefined>(undefined);

interface WhiteboardProviderProps {
  children: ReactNode;
}

export const WhiteboardProvider: React.FC<WhiteboardProviderProps> = ({ children }) => {
  const [whiteboard, setWhiteboard] = useState<WhiteboardState | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'select'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [shapeType, setShapeType] = useState<'rectangle' | 'circle' | 'line' | 'arrow'>('rectangle');
  const [fillColor, setFillColor] = useState('#ffffff');

  const value = {
    whiteboard,
    setWhiteboard,
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    lineWidth,
    setLineWidth,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    shapeType,
    setShapeType,
    fillColor,
    setFillColor
  };

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  );
};

export const useWhiteboard = () => {
  const context = useContext(WhiteboardContext);
  if (context === undefined) {
    throw new Error('useWhiteboard must be used within a WhiteboardProvider');
  }
  return context;
};