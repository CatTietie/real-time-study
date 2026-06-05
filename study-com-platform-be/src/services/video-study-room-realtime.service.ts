import { Server, Socket } from "socket.io";
import StudyRoom from "../models/study-room.model";

interface VideoRoomParticipant {
  userId: number;
  username: string;
  nickname?: string;
  avatar?: string;
  socketId: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  joinedAt: Date;
}

interface PomodoroState {
  status: "idle" | "focus" | "break" | "paused";
  currentRound: number;
  totalRounds: number;
  focusDuration: number;
  breakDuration: number;
  remainingSeconds: number;
  pausedRemaining: number;
}

interface ScreenShareState {
  sharerSocketId: string;
  sharerUserId: number;
  sharerUsername: string;
  whiteboardOverlay: boolean;
  isRecording: boolean;
}

// roomId -> (socketId -> participant)
const videoRoomParticipants = new Map<number, Map<string, VideoRoomParticipant>>();
const pomodoroStates = new Map<number, PomodoroState>();
const timerIntervals = new Map<number, NodeJS.Timeout>();
// socketId -> roomId (quick reverse lookup)
const socketToRoom = new Map<string, number>();
// Track which sockets have already been cleaned up to prevent double-leave
const leavingSocketIds = new Set<string>();
// roomId -> screen share state
const screenShareStates = new Map<number, ScreenShareState>();

export const getVideoRoomParticipants = (roomId: number): VideoRoomParticipant[] => {
  const participants = videoRoomParticipants.get(roomId);
  if (!participants) return [];
  return Array.from(participants.values());
};

const getDefaultPomodoroState = (room: any): PomodoroState => ({
  status: "idle",
  currentRound: 1,
  totalRounds: room.pomodoro_rounds || 4,
  focusDuration: (room.pomodoro_focus_duration || 25) * 60,
  breakDuration: (room.pomodoro_break_duration || 5) * 60,
  remainingSeconds: (room.pomodoro_focus_duration || 25) * 60,
  pausedRemaining: 0,
});

const broadcastParticipants = (io: Server, roomId: number) => {
  const participants = getVideoRoomParticipants(roomId);
  io.to(`video_room_${roomId}`).emit("video_room:participants_list", participants);
};

const broadcastPomodoroState = (io: Server, roomId: number) => {
  const state = pomodoroStates.get(roomId);
  if (state) {
    io.to(`video_room_${roomId}`).emit("video_room:pomodoro_sync", state);
  }
};

const startTimerInterval = (io: Server, roomId: number) => {
  if (timerIntervals.has(roomId)) {
    clearInterval(timerIntervals.get(roomId)!);
  }

  let tickCount = 0;

  const interval = setInterval(() => {
    const state = pomodoroStates.get(roomId);
    if (!state || state.status === "idle" || state.status === "paused") {
      return;
    }

    state.remainingSeconds--;
    tickCount++;

    if (state.remainingSeconds <= 0) {
      if (state.status === "focus") {
        state.status = "break";
        state.remainingSeconds = state.breakDuration;
        io.to(`video_room_${roomId}`).emit("video_room:pomodoro_phase_change", {
          phase: "break",
          message: "专注时间结束，休息一下吧！",
        });
      } else if (state.status === "break") {
        if (state.currentRound >= state.totalRounds) {
          state.status = "idle";
          state.currentRound = 1;
          state.remainingSeconds = state.focusDuration;
          clearInterval(interval);
          timerIntervals.delete(roomId);
          io.to(`video_room_${roomId}`).emit("video_room:pomodoro_phase_change", {
            phase: "completed",
            message: "所有轮次已完成，太棒了！",
          });
        } else {
          state.currentRound++;
          state.status = "focus";
          state.remainingSeconds = state.focusDuration;
          io.to(`video_room_${roomId}`).emit("video_room:pomodoro_phase_change", {
            phase: "focus",
            message: `第 ${state.currentRound} 轮专注开始！`,
          });
        }
      }
      broadcastPomodoroState(io, roomId);
      tickCount = 0;
    } else if (tickCount >= 5) {
      broadcastPomodoroState(io, roomId);
      tickCount = 0;
    }
  }, 1000);

  timerIntervals.set(roomId, interval);
};

const cleanupRoom = (_io: Server, roomId: number) => {
  const participants = videoRoomParticipants.get(roomId);
  if (!participants || participants.size === 0) {
    videoRoomParticipants.delete(roomId);
    pomodoroStates.delete(roomId);
    screenShareStates.delete(roomId);
    if (timerIntervals.has(roomId)) {
      clearInterval(timerIntervals.get(roomId)!);
      timerIntervals.delete(roomId);
    }
  }
};

/**
 * Evict stale socket entries for the same userId in a room.
 * Handles the case where a user refreshes their page — the old socket
 * may not have fired `disconnect` yet, leaving a ghost entry.
 */
const evictStaleEntries = (roomId: number, userId: number, currentSocketId: string) => {
  const participants = videoRoomParticipants.get(roomId);
  if (!participants) return;

  for (const [socketId, p] of participants) {
    if (p.userId === userId && socketId !== currentSocketId) {
      participants.delete(socketId);
      socketToRoom.delete(socketId);
    }
  }
};

/**
 * Validate that the target socket is in the same room as the sender.
 * Prevents cross-room signal relay.
 */
const isSameRoom = (senderSocketId: string, targetSocketId: string): boolean => {
  const senderRoom = socketToRoom.get(senderSocketId);
  const targetRoom = socketToRoom.get(targetSocketId);
  return senderRoom !== undefined && senderRoom === targetRoom;
};

const getParticipantUserId = (socketId: string): number | null => {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const participants = videoRoomParticipants.get(roomId);
  if (!participants) return null;
  const participant = participants.get(socketId);
  return participant?.userId ?? null;
};

const handleLeave = (io: Server, socket: Socket) => {
  // Guard against double-leave (disconnect + explicit leave racing)
  if (leavingSocketIds.has(socket.id)) return;
  leavingSocketIds.add(socket.id);
  // Clean up the guard after a short delay to avoid memory leak
  setTimeout(() => leavingSocketIds.delete(socket.id), 5000);

  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;

  const participants = videoRoomParticipants.get(roomId);
  if (!participants) return;

  const participant = participants.get(socket.id);
  if (!participant) {
    // Already removed, just clean the reverse map
    socketToRoom.delete(socket.id);
    return;
  }

  // Remove from state
  participants.delete(socket.id);
  socketToRoom.delete(socket.id);
  socket.leave(`video_room_${roomId}`);

  // If the leaving user was the screen sharer, clear screen share state
  const screenShare = screenShareStates.get(roomId);
  if (screenShare && screenShare.sharerSocketId === socket.id) {
    screenShareStates.delete(roomId);
    io.to(`video_room_${roomId}`).emit("video_room:screen_share_stopped", {
      sharerSocketId: socket.id,
    });
  }

  // Notify remaining peers to tear down their connection to this socket
  io.to(`video_room_${roomId}`).emit("video_room:participant_left", {
    socketId: socket.id,
    userId: participant.userId,
    username: participant.username,
  });

  broadcastParticipants(io, roomId);
  cleanupRoom(io, roomId);
};

export const initVideoStudyRoomSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("video_room:join", async (data: {
      roomId: number;
      userId: number;
      username: string;
      nickname?: string;
      avatar?: string;
    }) => {
      try {
        const { roomId, userId, username, nickname, avatar } = data;

        if (!roomId || !userId || !username) {
          socket.emit("video_room:error", { message: "参数不完整" });
          return;
        }

        const room = await StudyRoom.findOne({
          where: { id: roomId, type: "video", is_active: true },
        });
        if (!room) {
          socket.emit("video_room:error", { message: "房间不存在或已关闭" });
          return;
        }

        if (!videoRoomParticipants.has(roomId)) {
          videoRoomParticipants.set(roomId, new Map());
        }
        const participants = videoRoomParticipants.get(roomId)!;

        // Evict stale entries for same user (handles page refresh / reconnect)
        evictStaleEntries(roomId, userId, socket.id);

        // Check capacity after eviction
        if (participants.size >= room.max_participants) {
          socket.emit("video_room:error", { message: "房间已满" });
          return;
        }

        const participant: VideoRoomParticipant = {
          userId,
          username,
          nickname,
          avatar,
          socketId: socket.id,
          isCameraOn: false,
          isMicOn: false,
          joinedAt: new Date(),
        };

        participants.set(socket.id, participant);
        socketToRoom.set(socket.id, roomId);
        socket.join(`video_room_${roomId}`);

        if (!pomodoroStates.has(roomId)) {
          pomodoroStates.set(roomId, getDefaultPomodoroState(room));
        }

        // Send current room state to the joining user
        // Includes the list of existing peers they need to connect to
        const existingPeers = getVideoRoomParticipants(roomId).filter(
          (p) => p.socketId !== socket.id
        );

        socket.emit("video_room:joined", {
          participant,
          participants: getVideoRoomParticipants(roomId),
          existingPeers,
          pomodoroState: pomodoroStates.get(roomId),
          ownerId: room.owner_id,
          screenShareState: screenShareStates.get(roomId) || null,
        });

        // Notify existing peers about the new participant
        socket.to(`video_room_${roomId}`).emit("video_room:participant_joined", {
          ...participant,
          // Include this so existing peers know which socketId to target for signaling
          socketId: socket.id,
        });

        broadcastParticipants(io, roomId);
      } catch (error) {
        console.error("video_room:join error:", error);
        socket.emit("video_room:error", { message: "加入房间失败" });
      }
    });

    socket.on("video_room:leave", () => {
      handleLeave(io, socket);
    });

    // --- WebRTC Signaling Relay ---
    // All relay events validate that sender and target are in the same room.
    // Messages are sent via io.to(targetSocketId).emit() for precise unicast.

    socket.on("video_room:offer", (data: { targetSocketId: string; offer: any }) => {
      if (!data.targetSocketId || !data.offer) return;
      if (!isSameRoom(socket.id, data.targetSocketId)) return;

      io.to(data.targetSocketId).emit("video_room:offer", {
        fromSocketId: socket.id,
        offer: data.offer,
      });
    });

    socket.on("video_room:answer", (data: { targetSocketId: string; answer: any }) => {
      if (!data.targetSocketId || !data.answer) return;
      if (!isSameRoom(socket.id, data.targetSocketId)) return;

      io.to(data.targetSocketId).emit("video_room:answer", {
        fromSocketId: socket.id,
        answer: data.answer,
      });
    });

    socket.on("video_room:ice_candidate", (data: { targetSocketId: string; candidate: any }) => {
      if (!data.targetSocketId || !data.candidate) return;
      if (!isSameRoom(socket.id, data.targetSocketId)) return;

      io.to(data.targetSocketId).emit("video_room:ice_candidate", {
        fromSocketId: socket.id,
        candidate: data.candidate,
      });
    });

    socket.on("video_room:toggle_media", (data: { isCameraOn: boolean; isMicOn: boolean }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const participants = videoRoomParticipants.get(roomId);
      if (!participants) return;

      const participant = participants.get(socket.id);
      if (!participant) return;

      participant.isCameraOn = data.isCameraOn;
      participant.isMicOn = data.isMicOn;

      socket.to(`video_room_${roomId}`).emit("video_room:participant_media_changed", {
        socketId: socket.id,
        userId: participant.userId,
        isCameraOn: data.isCameraOn,
        isMicOn: data.isMicOn,
      });
    });

    // --- Screen Share Controls ---

    socket.on("video_room:screen_share_start", () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const existing = screenShareStates.get(roomId);
      if (existing && existing.sharerSocketId !== socket.id) {
        socket.emit("video_room:screen_share_denied", {
          message: "当前已有人在共享屏幕",
        });
        return;
      }

      const participants = videoRoomParticipants.get(roomId);
      const participant = participants?.get(socket.id);
      if (!participant) return;

      const state: ScreenShareState = {
        sharerSocketId: socket.id,
        sharerUserId: participant.userId,
        sharerUsername: participant.username,
        whiteboardOverlay: false,
        isRecording: false,
      };
      screenShareStates.set(roomId, state);

      io.to(`video_room_${roomId}`).emit("video_room:screen_share_started", {
        sharerSocketId: socket.id,
        sharerUserId: participant.userId,
        sharerUsername: participant.username,
      });
    });

    socket.on("video_room:screen_share_stop", () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const existing = screenShareStates.get(roomId);
      if (!existing || existing.sharerSocketId !== socket.id) return;

      screenShareStates.delete(roomId);
      io.to(`video_room_${roomId}`).emit("video_room:screen_share_stopped", {
        sharerSocketId: socket.id,
      });
    });

    socket.on("video_room:whiteboard_overlay_toggle", (data: { enabled: boolean }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const existing = screenShareStates.get(roomId);
      if (!existing || existing.sharerSocketId !== socket.id) return;

      existing.whiteboardOverlay = data.enabled;
      io.to(`video_room_${roomId}`).emit("video_room:whiteboard_overlay_changed", {
        enabled: data.enabled,
        sharerSocketId: socket.id,
      });
    });

    socket.on("video_room:recording_start", () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const existing = screenShareStates.get(roomId);
      if (!existing || existing.sharerSocketId !== socket.id) return;

      existing.isRecording = true;
      io.to(`video_room_${roomId}`).emit("video_room:recording_started", {
        recorderSocketId: socket.id,
      });
    });

    socket.on("video_room:recording_stop", () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const existing = screenShareStates.get(roomId);
      if (!existing || existing.sharerSocketId !== socket.id) return;

      existing.isRecording = false;
      io.to(`video_room_${roomId}`).emit("video_room:recording_stopped", {
        recorderSocketId: socket.id,
      });
    });

    // --- Pomodoro Controls (owner-only) ---

    socket.on("video_room:pomodoro_start", async (data: { roomId: number }) => {
      const { roomId } = data;
      if (!roomId) return;

      const room = await StudyRoom.findByPk(roomId);
      if (!room || room.owner_id !== getParticipantUserId(socket.id)) {
        socket.emit("video_room:error", { message: "仅房主可操作番茄钟" });
        return;
      }

      let state = pomodoroStates.get(roomId);
      if (!state) {
        state = getDefaultPomodoroState(room);
        pomodoroStates.set(roomId, state);
      }

      if (state.status === "paused") {
        // Resume from paused position
        state.status = state.pausedRemaining > state.breakDuration ? "focus" : "focus";
        state.remainingSeconds = state.pausedRemaining || state.focusDuration;
      } else if (state.status === "idle") {
        // Fresh start
        state.status = "focus";
        state.remainingSeconds = state.focusDuration;
        state.currentRound = 1;
      } else {
        // Already running, ignore
        return;
      }
      state.pausedRemaining = 0;

      startTimerInterval(io, roomId);
      broadcastPomodoroState(io, roomId);
    });

    socket.on("video_room:pomodoro_pause", async (data: { roomId: number }) => {
      const { roomId } = data;
      if (!roomId) return;

      const room = await StudyRoom.findByPk(roomId);
      if (!room || room.owner_id !== getParticipantUserId(socket.id)) {
        socket.emit("video_room:error", { message: "仅房主可操作番茄钟" });
        return;
      }

      const state = pomodoroStates.get(roomId);
      if (!state || state.status === "idle" || state.status === "paused") return;

      state.pausedRemaining = state.remainingSeconds;
      state.status = "paused";

      if (timerIntervals.has(roomId)) {
        clearInterval(timerIntervals.get(roomId)!);
        timerIntervals.delete(roomId);
      }

      broadcastPomodoroState(io, roomId);
    });

    socket.on("video_room:pomodoro_reset", async (data: { roomId: number }) => {
      const { roomId } = data;
      if (!roomId) return;

      const room = await StudyRoom.findByPk(roomId);
      if (!room || room.owner_id !== getParticipantUserId(socket.id)) {
        socket.emit("video_room:error", { message: "仅房主可操作番茄钟" });
        return;
      }

      if (timerIntervals.has(roomId)) {
        clearInterval(timerIntervals.get(roomId)!);
        timerIntervals.delete(roomId);
      }

      pomodoroStates.set(roomId, getDefaultPomodoroState(room));
      broadcastPomodoroState(io, roomId);
    });

    socket.on("video_room:pomodoro_config", async (data: {
      roomId: number;
      focusDuration: number;
      breakDuration: number;
      rounds: number;
    }) => {
      const { roomId, focusDuration, breakDuration, rounds } = data;
      if (!roomId || !focusDuration || !breakDuration || !rounds) return;

      const room = await StudyRoom.findByPk(roomId);
      if (!room || room.owner_id !== getParticipantUserId(socket.id)) {
        socket.emit("video_room:error", { message: "仅房主可操作番茄钟" });
        return;
      }

      await room.update({
        pomodoro_focus_duration: focusDuration,
        pomodoro_break_duration: breakDuration,
        pomodoro_rounds: rounds,
      });

      if (timerIntervals.has(roomId)) {
        clearInterval(timerIntervals.get(roomId)!);
        timerIntervals.delete(roomId);
      }

      const newState: PomodoroState = {
        status: "idle",
        currentRound: 1,
        totalRounds: rounds,
        focusDuration: focusDuration * 60,
        breakDuration: breakDuration * 60,
        remainingSeconds: focusDuration * 60,
        pausedRemaining: 0,
      };
      pomodoroStates.set(roomId, newState);
      broadcastPomodoroState(io, roomId);
    });

    socket.on("disconnect", () => {
      handleLeave(io, socket);
    });
  });
};
