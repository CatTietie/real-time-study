import { useState, useEffect, useCallback, useRef } from "react";
import type { PomodoroState } from "../types/video-study-room";

interface UsePomodoroDisplayProps {
  pomodoroState: PomodoroState;
}

/**
 * Drift-free Pomodoro display hook.
 *
 * Instead of decrementing a counter every ~1000ms (which drifts),
 * we record the server's (remainingSeconds, timestamp) on each sync,
 * then compute the displayed value as:
 *   display = serverRemaining - elapsed_since_sync
 *
 * The RAF/interval only triggers re-renders; the math is always
 * anchored to the last server message.
 */
export const usePomodoroDisplay = ({ pomodoroState }: UsePomodoroDisplayProps) => {
  // Anchor: server remaining seconds + local timestamp when received
  const anchorRef = useRef<{ remaining: number; receivedAt: number }>({
    remaining: pomodoroState.remainingSeconds,
    receivedAt: Date.now(),
  });

  const [displaySeconds, setDisplaySeconds] = useState(pomodoroState.remainingSeconds);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Update anchor every time we receive a new sync from the server
  useEffect(() => {
    anchorRef.current = {
      remaining: pomodoroState.remainingSeconds,
      receivedAt: Date.now(),
    };
    // Immediately reflect the new value (avoids 1-frame lag)
    setDisplaySeconds(pomodoroState.remainingSeconds);
  }, [pomodoroState.remainingSeconds, pomodoroState.status, pomodoroState.currentRound]);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const isRunning = pomodoroState.status === "focus" || pomodoroState.status === "break";
    if (!isRunning) return;

    const tick = () => {
      const now = Date.now();
      // Only update state at ~1 Hz to avoid excessive re-renders
      if (now - lastTickRef.current >= 900) {
        lastTickRef.current = now;
        const { remaining, receivedAt } = anchorRef.current;
        const elapsedSec = (now - receivedAt) / 1000;
        const computed = Math.max(0, Math.round(remaining - elapsedSec));
        setDisplaySeconds(computed);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [pomodoroState.status]);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const totalDuration =
    pomodoroState.status === "break"
      ? pomodoroState.breakDuration
      : pomodoroState.focusDuration;

  const progressPercent =
    totalDuration > 0 ? ((totalDuration - displaySeconds) / totalDuration) * 100 : 0;

  const phaseLabel =
    pomodoroState.status === "focus"
      ? "专注中"
      : pomodoroState.status === "break"
      ? "休息中"
      : pomodoroState.status === "paused"
      ? "已暂停"
      : "待开始";

  return {
    formattedTime: formatTime(displaySeconds),
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    phaseLabel,
    currentRound: pomodoroState.currentRound,
    totalRounds: pomodoroState.totalRounds,
    status: pomodoroState.status,
    displaySeconds,
  };
};
