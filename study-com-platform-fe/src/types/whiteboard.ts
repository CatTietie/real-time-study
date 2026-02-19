export interface WhiteboardState {
  id: number;
  roomId: number;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
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

export type WhiteboardAction = DrawAction | EraseAction | {
  type: 'clear' | 'undo' | 'redo';
  userId: number;
  username: string;
};

// 明确导出所有类型
export type { WhiteboardState, DrawAction, EraseAction, WhiteboardAction };