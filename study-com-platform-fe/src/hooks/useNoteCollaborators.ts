import { useState, useEffect, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { API_BASE } from "../services/api";
import type { NoteCollaborator } from "../types/collaborative-note";
import { useAppSelector } from "../app/hooks";

interface UseNoteCollaboratorsProps {
  noteId: number;
}

export function useNoteCollaborators({ noteId }: UseNoteCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const auth = useAppSelector((state) => state.auth);
  const { userId, username, nickname, avatar } = auth;

  useEffect(() => {
    if (!noteId || !userId || !username) return;

    const newSocket = io(API_BASE.replace("/api", ""), {
      transports: ["websocket"],
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("join_note_room", {
        noteId,
        userId,
        username,
        nickname: nickname || username,
        avatar,
      });
    });

    newSocket.on("note_collaborators_update", (list: NoteCollaborator[]) => {
      setCollaborators(list);
    });

    newSocket.on("user_joined_note", (user: NoteCollaborator) => {
      setCollaborators((prev) => {
        const exists = prev.find((c) => c.userId === user.userId);
        if (exists) {
          return prev.map((c) =>
            c.userId === user.userId ? { ...c, isOnline: true } : c
          );
        }
        return [...prev, { ...user, isOnline: true }];
      });
    });

    newSocket.on("user_left_note", (user: NoteCollaborator) => {
      setCollaborators((prev) =>
        prev.map((c) =>
          c.userId === user.userId ? { ...c, isOnline: false } : c
        )
      );
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.emit("leave_note_room", { noteId });
      newSocket.close();
    };
  }, [noteId, userId, username, nickname, avatar]);

  return { collaborators, isConnected, socket };
}
