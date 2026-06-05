import { Server, Socket } from "socket.io";
import User from "../models/user.model";

const CURSOR_COLORS = [
  "#f44336", "#e91e63", "#9c27b0", "#3f51b5",
  "#2196f3", "#00bcd4", "#4caf50", "#ff9800",
  "#ff5722", "#795548",
];

function getUserColor(userId: number): string {
  return CURSOR_COLORS[userId % CURSOR_COLORS.length];
}

interface NoteCollaborator {
  userId: number;
  username: string;
  nickname: string;
  avatar: string | null;
  color: string;
  isOnline: boolean;
}

// noteId -> Map<socketId, collaborator>
const noteClients = new Map<number, Map<string, NoteCollaborator>>();

export const initCollaborativeNoteSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("join_note_room", async (data: {
      noteId: number;
      userId: number;
      username: string;
      nickname?: string;
      avatar?: string | null;
    }) => {
      try {
        const { noteId, userId, username } = data;
        let nickname = data.nickname || username;
        let avatar = data.avatar || null;

        // Fetch latest user info if nickname/avatar not provided
        if (!data.nickname) {
          const user = await User.findByPk(userId, {
            attributes: ["nickname", "avatar"],
          });
          if (user) {
            nickname = user.getDataValue("nickname") || username;
            avatar = user.getDataValue("avatar") || null;
          }
        }

        socket.join(`note_${noteId}`);

        if (!noteClients.has(noteId)) {
          noteClients.set(noteId, new Map());
        }

        const clients = noteClients.get(noteId)!;
        const collaborator: NoteCollaborator = {
          userId,
          username,
          nickname,
          avatar,
          color: getUserColor(userId),
          isOnline: true,
        };
        clients.set(socket.id, collaborator);

        // Broadcast the new user to others
        socket.to(`note_${noteId}`).emit("user_joined_note", collaborator);

        // Send full collaborator list to the joining user
        const collaborators = Array.from(clients.values());
        socket.emit("note_collaborators_update", collaborators);
      } catch (error) {
        console.error("[NoteSocket] join_note_room error:", error);
        socket.emit("error", { message: "加入笔记协作失败" });
      }
    });

    socket.on("leave_note_room", (data: { noteId: number }) => {
      const { noteId } = data;
      removeFromNote(socket, noteId);
    });

    socket.on("disconnect", () => {
      noteClients.forEach((_clients, noteId) => {
        removeFromNote(socket, noteId);
      });
    });
  });
};

function removeFromNote(socket: Socket, noteId: number) {
  const clients = noteClients.get(noteId);
  if (!clients || !clients.has(socket.id)) return;

  const collaborator = clients.get(socket.id)!;
  clients.delete(socket.id);

  socket.to(`note_${noteId}`).emit("user_left_note", {
    userId: collaborator.userId,
    username: collaborator.username,
    nickname: collaborator.nickname,
    avatar: collaborator.avatar,
    color: collaborator.color,
    isOnline: false,
  });

  if (clients.size === 0) {
    noteClients.delete(noteId);
  }

  socket.leave(`note_${noteId}`);
}
