import { Server, Socket } from "socket.io";

interface DocumentViewer {
  userId: number;
  username: string;
  nickname: string;
  avatar: string;
  socketId: string;
}

const documentViewers = new Map<number, Map<number, DocumentViewer>>();

export const initKnowledgeAnnotationSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("join_document_room", (data: {
      documentId: number;
      userId: number;
      username: string;
      nickname: string;
      avatar: string;
    }) => {
      const { documentId, userId, username, nickname, avatar } = data;
      const roomName = `document_${documentId}`;
      socket.join(roomName);

      if (!documentViewers.has(documentId)) {
        documentViewers.set(documentId, new Map());
      }
      documentViewers.get(documentId)!.set(userId, {
        userId,
        username,
        nickname,
        avatar,
        socketId: socket.id,
      });

      io.to(roomName).emit("document_viewers_update", {
        documentId,
        viewers: Array.from(documentViewers.get(documentId)!.values()),
      });
    });

    socket.on("leave_document_room", (data: { documentId: number; userId: number }) => {
      const { documentId, userId } = data;
      const roomName = `document_${documentId}`;
      socket.leave(roomName);

      if (documentViewers.has(documentId)) {
        documentViewers.get(documentId)!.delete(userId);
        if (documentViewers.get(documentId)!.size === 0) {
          documentViewers.delete(documentId);
        } else {
          io.to(roomName).emit("document_viewers_update", {
            documentId,
            viewers: Array.from(documentViewers.get(documentId)!.values()),
          });
        }
      }
    });

    socket.on("disconnect", () => {
      for (const [documentId, viewers] of documentViewers.entries()) {
        for (const [userId, viewer] of viewers.entries()) {
          if (viewer.socketId === socket.id) {
            viewers.delete(userId);
            const roomName = `document_${documentId}`;
            if (viewers.size === 0) {
              documentViewers.delete(documentId);
            } else {
              io.to(roomName).emit("document_viewers_update", {
                documentId,
                viewers: Array.from(viewers.values()),
              });
            }
            break;
          }
        }
      }
    });
  });
};

export const broadcastAnnotationEvent = (
  io: Server,
  documentId: number,
  event: string,
  data: any
) => {
  io.to(`document_${documentId}`).emit(event, data);
};
