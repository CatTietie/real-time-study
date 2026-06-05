export interface VideoStudyRoom {
  id: number;
  name: string;
  description?: string;
  type: "video";
  owner_id: number;
  max_participants: number;
  capacity: number;
  current_occupancy: number;
  pomodoro_focus_duration: number;
  pomodoro_break_duration: number;
  pomodoro_rounds: number;
  status: "active" | "closed";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  online_count?: number;
  Owner?: {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
  };
}

export interface VideoParticipant {
  socketId: string;
  userId: number;
  username: string;
  nickname?: string;
  avatar?: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  joinedAt: string;
}

export interface PomodoroState {
  status: "idle" | "focus" | "break" | "paused";
  currentRound: number;
  totalRounds: number;
  focusDuration: number;
  breakDuration: number;
  remainingSeconds: number;
}

export interface ScreenShareState {
  sharerSocketId: string;
  sharerUserId: number;
  sharerUsername: string;
  whiteboardOverlay: boolean;
  isRecording: boolean;
}

export interface RoomRecording {
  id: number;
  room_id: number;
  recorder_user_id: number;
  title: string;
  file_url: string;
  file_size: number;
  duration: number;
  thumbnail_url: string | null;
  mime_type: string;
  status: "uploading" | "ready" | "failed";
  created_at: string;
  updated_at: string;
  Recorder?: {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
  };
}

export interface CreateVideoRoomParams {
  name: string;
  description?: string;
  max_participants?: number;
  pomodoro_focus_duration?: number;
  pomodoro_break_duration?: number;
  pomodoro_rounds?: number;
}

export interface PomodoroConfigParams {
  pomodoro_focus_duration?: number;
  pomodoro_break_duration?: number;
  pomodoro_rounds?: number;
}
