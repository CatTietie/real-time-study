import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "../app/hooks";
import type { DocumentAnnotation, DocumentViewer } from "../types/knowledge-library";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";
const SOCKET_URL = API_BASE.replace("/api", "");

export function useDocumentAnnotations(documentId: number | null) {
  const [viewers, setViewers] = useState<DocumentViewer[]>([]);
  const [newAnnotation, setNewAnnotation] = useState<DocumentAnnotation | null>(null);
  const [resolvedId, setResolvedId] = useState<number | null>(null);
  const [deletedId, setDeletedId] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const auth = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!documentId || !auth.userId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_document_room", {
        documentId,
        userId: auth.userId,
        username: auth.username,
        nickname: auth.nickname || auth.username,
        avatar: auth.avatar || "",
      });
    });

    socket.on("document_viewers_update", (data: { documentId: number; viewers: DocumentViewer[] }) => {
      if (data.documentId === documentId) {
        setViewers(data.viewers);
      }
    });

    socket.on("annotation_added", (annotation: DocumentAnnotation) => {
      setNewAnnotation(annotation);
    });

    socket.on("annotation_resolved", (data: { annotationId: number }) => {
      setResolvedId(data.annotationId);
    });

    socket.on("annotation_deleted", (data: { annotationId: number }) => {
      setDeletedId(data.annotationId);
    });

    return () => {
      socket.emit("leave_document_room", { documentId, userId: auth.userId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, auth.userId]);

  const clearNewAnnotation = useCallback(() => setNewAnnotation(null), []);
  const clearResolvedId = useCallback(() => setResolvedId(null), []);
  const clearDeletedId = useCallback(() => setDeletedId(null), []);

  return {
    viewers,
    newAnnotation,
    resolvedId,
    deletedId,
    clearNewAnnotation,
    clearResolvedId,
    clearDeletedId,
  };
}
