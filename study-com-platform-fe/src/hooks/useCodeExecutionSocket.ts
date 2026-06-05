import { useState, useEffect, useCallback, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { API_BASE } from "../services/api";
import { useAppSelector } from "../app/hooks";
import type { ExecutionStatus } from "../components/CodeEditor/OutputPanel";

interface UseCodeExecutionSocketReturn {
  isConnected: boolean;
  executeStreaming: (payload: { questionId: number; language: string; code: string }) => void;
  stdout: string;
  stderr: string;
  status: ExecutionStatus;
  executionTimeMs?: number;
  violations: string[];
  reset: () => void;
}

export function useCodeExecutionSocket(): UseCodeExecutionSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>();
  const [violations, setViolations] = useState<string[]>([]);

  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE.replace("/api", "") + "/code-execution", {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("code:stdout", ({ data }: { data: string }) => {
      setStdout((prev) => prev + data);
    });

    socket.on("code:stderr", ({ data }: { data: string }) => {
      setStderr((prev) => prev + data);
    });

    socket.on("code:done", (result: { status: string; executionTimeMs?: number; violations?: string[] }) => {
      setStatus(result.status as ExecutionStatus);
      if (result.executionTimeMs !== undefined) {
        setExecutionTimeMs(result.executionTimeMs);
      }
      if (result.violations) {
        setViolations(result.violations);
      }
    });

    socket.on("code:error", ({ message }: { message: string }) => {
      setStderr((prev) => prev + message);
      setStatus("error");
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [token]);

  const reset = useCallback(() => {
    setStdout("");
    setStderr("");
    setStatus("idle");
    setExecutionTimeMs(undefined);
    setViolations([]);
  }, []);

  const executeStreaming = useCallback(
    (payload: { questionId: number; language: string; code: string }) => {
      setStdout("");
      setStderr("");
      setStatus("running");
      setExecutionTimeMs(undefined);
      setViolations([]);
      socketRef.current?.emit("execute_code", payload);
    },
    []
  );

  return { isConnected, executeStreaming, stdout, stderr, status, executionTimeMs, violations, reset };
}
