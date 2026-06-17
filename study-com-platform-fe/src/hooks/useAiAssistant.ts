import { useState, useEffect, useCallback, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { API_BASE } from "../services/api";
import { useAppSelector } from "../app/hooks";
import {
  getAiChatHistory,
  parseSources,
  type AiChatRecord,
  type CitationInfo,
} from "../services/aiAssistant";

export type { CitationInfo } from "../services/aiAssistant";

export interface AiMessage {
  id?: number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  citations?: CitationInfo[];
  feedback?: "helpful" | "unhelpful" | null;
}

interface UseAiAssistantProps {
  postId: number;
  enabled: boolean;
}

export const useAiAssistant = ({ postId, enabled }: UseAiAssistantProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const token = useAppSelector((state) => state.auth.token);
  const currentAnswerRef = useRef("");
  const socketRef = useRef<Socket | null>(null);
  const pendingFeedbackRef = useRef<Map<number, "helpful" | "unhelpful" | null>>(new Map());

  useEffect(() => {
    if (!enabled || !token) return;

    const newSocket = io(API_BASE.replace("/api", "") + "/ai-assistant", {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("ai:token", (data: { content: string }) => {
      currentAnswerRef.current += data.content;
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "ai") {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: currentAnswerRef.current,
          };
        }
        return updated;
      });
    });

    newSocket.on("ai:citation", (data: CitationInfo) => {
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "ai") {
          const citations = [...(lastMsg.citations || []), data];
          updated[updated.length - 1] = { ...lastMsg, citations };
        }
        return updated;
      });
    });

    newSocket.on(
      "ai:done",
      (data: { usage?: any; historyId?: number; sources?: CitationInfo[] }) => {
        setIsGenerating(false);
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === "ai") {
            updated[updated.length - 1] = {
              ...lastMsg,
              id: data.historyId ?? lastMsg.id,
              citations: data.sources && data.sources.length > 0 ? data.sources : lastMsg.citations,
            };
          }
          return updated;
        });
        currentAnswerRef.current = "";
      },
    );

    newSocket.on(
      "ai:stopped",
      (data: { answer?: string; historyId?: number; sources?: CitationInfo[] }) => {
        setIsGenerating(false);
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === "ai") {
            if (data?.answer) {
              updated[updated.length - 1] = {
                ...lastMsg,
                id: data.historyId ?? lastMsg.id,
                content: data.answer,
                citations: data.sources && data.sources.length > 0 ? data.sources : lastMsg.citations,
              };
            } else if (!lastMsg.content) {
              updated.pop();
              if (updated.length > 0 && updated[updated.length - 1]?.role === "user") {
                updated.pop();
              }
            }
          }
          return updated;
        });
        currentAnswerRef.current = "";
      },
    );

    newSocket.on("ai:error", (data: { message: string }) => {
      setIsGenerating(false);
      currentAnswerRef.current = "";
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `错误: ${data.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    newSocket.on(
      "ai:feedback:result",
      (data: { success: boolean; historyId: number; feedback: "helpful" | "unhelpful" | null }) => {
        if (data.success) {
          // Server confirmed — clear pending, ensure state matches
          pendingFeedbackRef.current.delete(data.historyId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.historyId ? { ...msg, feedback: data.feedback } : msg,
            ),
          );
        } else {
          // Server rejected — rollback to old state
          const oldFeedback = pendingFeedbackRef.current.get(data.historyId);
          pendingFeedbackRef.current.delete(data.historyId);
          if (oldFeedback !== undefined) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === data.historyId ? { ...msg, feedback: oldFeedback } : msg,
              ),
            );
          }
        }
      },
    );

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      setSocket(null);
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, token]);

  useEffect(() => {
    if (!enabled || historyLoaded) return;

    const loadHistory = async () => {
      try {
        const { records } = await getAiChatHistory(postId, 50, 0);
        const historyMessages: AiMessage[] = [];
        records.forEach((record: AiChatRecord) => {
          historyMessages.push({
            id: record.id,
            role: "user",
            content: record.question,
            timestamp: record.created_at,
          });
          historyMessages.push({
            id: record.id,
            role: "ai",
            content: record.answer,
            timestamp: record.created_at,
            citations: parseSources(record.sources_json),
            feedback: record.feedback,
          });
        });
        setMessages(historyMessages);
        setHistoryLoaded(true);
      } catch {
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [enabled, postId, historyLoaded]);

  const ask = useCallback(
    (question: string) => {
      if (!socketRef.current || !question.trim() || isGenerating) return;

      const userMsg: AiMessage = {
        role: "user",
        content: question.trim(),
        timestamp: new Date().toISOString(),
      };

      const aiPlaceholder: AiMessage = {
        role: "ai",
        content: "",
        timestamp: new Date().toISOString(),
        citations: [],
      };

      setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
      setIsGenerating(true);
      currentAnswerRef.current = "";

      socketRef.current.emit("ai:ask", { postId, question: question.trim() });
    },
    [postId, isGenerating],
  );

  const stopGenerating = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("ai:stop");
    }
  }, []);

  const submitFeedback = useCallback(
    (historyId: number, feedback: "helpful" | "unhelpful") => {
      if (!socketRef.current) return;

      // Find current feedback for this message and store as rollback value
      setMessages((prev) => {
        const target = prev.find((msg) => msg.id === historyId);
        const oldFeedback = target?.feedback ?? null;
        pendingFeedbackRef.current.set(historyId, oldFeedback);

        // Optimistic: toggle — same click cancels, different click switches
        const newFeedback = oldFeedback === feedback ? null : feedback;
        return prev.map((msg) =>
          msg.id === historyId ? { ...msg, feedback: newFeedback } : msg,
        );
      });

      socketRef.current.emit("ai:feedback", { historyId, feedback });
    },
    [],
  );

  const resetHistory = useCallback(() => {
    setHistoryLoaded(false);
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    isGenerating,
    ask,
    stopGenerating,
    submitFeedback,
    resetHistory,
  };
};
