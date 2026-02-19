export interface WhiteboardState {
  id: number;
  room_id: number;
  name: string;
  type: string;
  width: number;
  height: number;
  background_color: string;
}

export interface DrawAction {
  type: 'draw';
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  userId: number;
  username: string;
}

export interface EraseAction {
  type: 'erase';
  points: { x: number; y: number }[];
  lineWidth: number;
  userId: number;
  username: string;
}

export interface TextAction {
  type: 'text';
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  userId: number;
  username: string;
}

export interface ShapeAction {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  lineWidth: number;
  userId: number;
  username: string;
}

export interface ImageAction {
  type: 'image';
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  userId: number;
  username: string;
}

export type WhiteboardAction = 
  | DrawAction 
  | EraseAction 
  | TextAction 
  | ShapeAction 
  | ImageAction 
  | {
      type: 'clear' | 'undo' | 'redo';
      userId: number;
      username: string;
    };

// 明确导出所有类型
export type { WhiteboardState, DrawAction, EraseAction, WhiteboardAction };