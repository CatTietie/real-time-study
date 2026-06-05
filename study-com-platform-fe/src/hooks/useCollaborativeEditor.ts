import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useAppSelector } from "../app/hooks";
import { API_BASE } from "../services/api";

const CURSOR_COLORS = [
  "#f44336", "#e91e63", "#9c27b0", "#3f51b5",
  "#2196f3", "#00bcd4", "#4caf50", "#ff9800",
  "#ff5722", "#795548",
];

function getUserColor(userId: number): string {
  return CURSOR_COLORS[userId % CURSOR_COLORS.length];
}

export function useCollaborativeEditor(noteId: number) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const auth = useAppSelector((state) => state.auth);
  const { token, userId, nickname, username } = auth;

  useEffect(() => {
    if (!noteId || !token || !userId) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Build WebSocket URL — replace http with ws, remove /api suffix
    const wsBase = API_BASE.replace("/api", "").replace("http://", "ws://").replace("https://", "wss://");
    const wsUrl = `${wsBase}/yjs`;

    const provider = new WebsocketProvider(wsUrl, `note_${noteId}`, ydoc, {
      params: { token, room: `note_${noteId}` },
    });
    providerRef.current = provider;

    // Set awareness local state
    const color = getUserColor(userId);
    provider.awareness.setLocalStateField("user", {
      name: nickname || username || "匿名用户",
      color,
      userId,
    });

    provider.on("status", (event: { status: string }) => {
      setIsConnected(event.status === "connected");
    });

    provider.on("sync", (synced: boolean) => {
      setIsSynced(synced);
    });

    return () => {
      provider.disconnect();
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      setIsConnected(false);
      setIsSynced(false);
    };
  }, [noteId, token, userId, nickname, username]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    isConnected,
    isSynced,
    userColor: userId ? getUserColor(userId) : "#999",
  };
}
