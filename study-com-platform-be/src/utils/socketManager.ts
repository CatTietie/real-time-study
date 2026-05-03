import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const setSocketIo = (io: Server) => {
  ioInstance = io;
};

export const getSocketIo = (): Server | null => {
  return ioInstance;
};

export const broadcastToRoom = (roomId: number, event: string, data: any) => {
  if (ioInstance) {
    ioInstance.to(`chat_${roomId}`).emit(event, data);
    console.log(`[SocketManager] Broadcast to room ${roomId}, event: ${event}`);
  } else {
    console.log('[SocketManager] ioInstance is null, cannot broadcast');
  }
};
