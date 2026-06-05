import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { listNoteComments } from "../services/collaborative-note";
import type { NoteComment } from "../types/collaborative-note";
import { useAppSelector } from "../app/hooks";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:8081";

interface UseNoteCommentsOptions {
  noteId: number;
  enabled?: boolean;
}

export function useNoteComments({ noteId, enabled = true }: UseNoteCommentsOptions) {
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const auth = useAppSelector((state) => state.auth);

  const loadComments = useCallback(async () => {
    if (!noteId) return;
    try {
      const data = await listNoteComments(noteId, "active");
      setComments(data);
    } catch {
      // silently fail
    }
  }, [noteId]);

  useEffect(() => {
    if (!enabled || !noteId) return;
    loadComments();
  }, [enabled, noteId, loadComments]);

  useEffect(() => {
    if (!enabled || !noteId || !auth.token) return;

    const s = io(SOCKET_URL, { transports: ["websocket"] });
    setSocket(s);

    s.on("connect", () => {
      s.emit("join_note_room", {
        noteId,
        userId: auth.userId,
        username: auth.username,
        nickname: auth.nickname,
        avatar: auth.avatar,
      });
    });

    s.on("note_comment_added", (comment: NoteComment) => {
      setComments((prev) => {
        if (comment.parent_id) {
          return prev.map((c) => {
            if (c.id === comment.parent_id) {
              return { ...c, Replies: [...(c.Replies || []), comment] };
            }
            return c;
          });
        }
        return [comment, ...prev];
      });
    });

    s.on("note_comment_resolved", ({ commentId }: { commentId: number }) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });

    s.on("note_comment_deleted", ({ commentId }: { commentId: number }) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });

    return () => {
      s.emit("leave_note_room", { noteId });
      s.disconnect();
    };
  }, [enabled, noteId, auth.token]);

  return { comments, loadComments };
}
