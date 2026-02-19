import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { WhiteboardState } from '../../types/whiteboard';

interface WhiteboardContextType {
  whiteboard: WhiteboardState | null;
  setWhiteboard: (whiteboard: WhiteboardState | null) => void;
  currentTool: 'pen' | 'eraser';
  setCurrentTool: (tool: 'pen' | 'eraser') => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
}

const WhiteboardContext = createContext<WhiteboardContextType | undefined>(undefined);

interface WhiteboardProviderProps {
  children: ReactNode;
}

export const WhiteboardProvider: React.FC<WhiteboardProviderProps> = ({ children }) => {
  const [whiteboard, setWhiteboard] = useState<WhiteboardState | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);

  const value = {
    whiteboard,
    setWhiteboard,
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    lineWidth,
    setLineWidth
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