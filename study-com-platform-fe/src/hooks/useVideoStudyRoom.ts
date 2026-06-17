import { useState, useEffect, useCallback, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { API_BASE } from "../services/api";
import type { VideoParticipant, PomodoroState, ScreenShareState } from "../types/video-study-room";

interface UseVideoStudyRoomProps {
  roomId: number;
  userId: number;
  username: string;
  nickname?: string;
  avatar?: string;
}

interface PeerState {
  connection: RTCPeerConnection;
  remoteStream: MediaStream;
  iceCandidateQueue: RTCIceCandidateInit[];
  remoteDescriptionSet: boolean;
  makingOffer: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: 320, height: 240, frameRate: 15 },
  audio: true,
};

export const useVideoStudyRoom = ({
  roomId,
  userId,
  username,
  nickname,
  avatar,
}: UseVideoStudyRoomProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>({
    status: "idle",
    currentRound: 1,
    totalRounds: 4,
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    remainingSeconds: 25 * 60,
  });
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenShareState, setScreenShareState] = useState<ScreenShareState | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isCleanedUpRef = useRef(false);

  /**
   * Flush queued ICE candidates after remote description is set.
   */
  const flushIceCandidateQueue = useCallback(async (peerSocketId: string) => {
    const peer = peersRef.current.get(peerSocketId);
    if (!peer || !peer.remoteDescriptionSet) return;

    while (peer.iceCandidateQueue.length > 0) {
      const candidate = peer.iceCandidateQueue.shift()!;
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Failed to add queued ICE candidate:", err);
      }
    }
  }, []);

  /**
   * Fully close and remove a peer connection, stopping remote tracks.
   */
  const destroyPeer = useCallback((peerSocketId: string) => {
    const peer = peersRef.current.get(peerSocketId);
    if (!peer) return;

    // Stop all remote tracks
    peer.remoteStream.getTracks().forEach((t) => t.stop());
    // Close the connection
    peer.connection.close();
    peersRef.current.delete(peerSocketId);

    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerSocketId);
      return next;
    });
  }, []);

  /**
   * Create a new RTCPeerConnection for a remote peer.
   * If isInitiator=true, this side creates the offer.
   */
  const createPeerConnection = useCallback(
    (remoteSocketId: string, isInitiator: boolean) => {
      // If we already have a connection to this peer, destroy it first
      if (peersRef.current.has(remoteSocketId)) {
        destroyPeer(remoteSocketId);
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      const remoteStream = new MediaStream();

      const peerState: PeerState = {
        connection: pc,
        remoteStream,
        iceCandidateQueue: [],
        remoteDescriptionSet: false,
        makingOffer: false,
      };

      peersRef.current.set(remoteSocketId, peerState);

      // Add local tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(remoteSocketId, remoteStream);
          return next;
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("video_room:ice_candidate", {
            targetSocketId: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle renegotiation (triggered when tracks are added/removed after connection)
      pc.onnegotiationneeded = async () => {
        if (peerState.makingOffer) return;
        try {
          peerState.makingOffer = true;
          const offer = await pc.createOffer();
          if (pc.signalingState !== "stable") return;
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("video_room:offer", {
            targetSocketId: remoteSocketId,
            offer: pc.localDescription,
          });
        } catch (err) {
          console.error("Negotiation failed:", err);
        } finally {
          peerState.makingOffer = false;
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          destroyPeer(remoteSocketId);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.restartIce();
        }
      };

      if (isInitiator) {
        (async () => {
          try {
            peerState.makingOffer = true;
            const offer = await pc.createOffer();
            if (pc.signalingState !== "stable") return;
            await pc.setLocalDescription(offer);
            socketRef.current?.emit("video_room:offer", {
              targetSocketId: remoteSocketId,
              offer: pc.localDescription,
            });
          } catch (err) {
            console.error("Failed to create offer:", err);
          } finally {
            peerState.makingOffer = false;
          }
        })();
      }

      return pc;
    },
    [destroyPeer]
  );

  useEffect(() => {
    isCleanedUpRef.current = false;

    const newSocket = io(API_BASE.replace("/api", ""), {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      if (isCleanedUpRef.current) return;
      setIsConnected(true);
      newSocket.emit("video_room:join", {
        roomId,
        userId,
        username,
        nickname,
        avatar,
      });
    });

    newSocket.on("video_room:joined", (data: {
      participants: VideoParticipant[];
      existingPeers?: VideoParticipant[];
      pomodoroState: PomodoroState;
      ownerId: number;
      screenShareState: ScreenShareState | null;
    }) => {
      if (isCleanedUpRef.current) return;
      setParticipants(data.participants);
      setPomodoroState(data.pomodoroState);
      setOwnerId(data.ownerId);
      if (data.screenShareState) {
        setScreenShareState(data.screenShareState);
      }

      // Create peer connections to all existing peers (we are the initiator)
      const peers = data.existingPeers || data.participants.filter((p) => p.socketId !== newSocket.id);
      peers.forEach((p) => {
        if (p.socketId !== newSocket.id) {
          createPeerConnection(p.socketId, true);
        }
      });
    });

    newSocket.on("video_room:participant_joined", (participant: VideoParticipant) => {
      if (isCleanedUpRef.current) return;
      setParticipants((prev) => [
        ...prev.filter((p) => p.socketId !== participant.socketId),
        participant,
      ]);
      // New participant joined — they will send us an offer, so we wait (isInitiator=false)
      // But prepare the peer connection to receive it
      createPeerConnection(participant.socketId, false);
    });

    newSocket.on("video_room:participant_left", (data: { socketId: string }) => {
      if (isCleanedUpRef.current) return;
      setParticipants((prev) => prev.filter((p) => p.socketId !== data.socketId));
      destroyPeer(data.socketId);
    });

    newSocket.on("video_room:participants_list", (list: VideoParticipant[]) => {
      if (isCleanedUpRef.current) return;
      setParticipants(list);

      // Reconcile: close peer connections for sockets no longer in the list
      const activeSocketIds = new Set(list.map((p) => p.socketId));
      for (const peerSocketId of peersRef.current.keys()) {
        if (!activeSocketIds.has(peerSocketId) && peerSocketId !== newSocket.id) {
          destroyPeer(peerSocketId);
        }
      }
    });

    newSocket.on("video_room:participant_media_changed", (data: {
      socketId: string;
      isCameraOn: boolean;
      isMicOn: boolean;
    }) => {
      if (isCleanedUpRef.current) return;
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === data.socketId
            ? { ...p, isCameraOn: data.isCameraOn, isMicOn: data.isMicOn }
            : p
        )
      );
    });

    // --- WebRTC Signaling Handlers ---

    newSocket.on("video_room:offer", async (data: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      if (isCleanedUpRef.current) return;
      try {
        let peerState = peersRef.current.get(data.fromSocketId);
        if (!peerState) {
          createPeerConnection(data.fromSocketId, false);
          peerState = peersRef.current.get(data.fromSocketId);
        }
        if (!peerState) return;

        const pc = peerState.connection;

        // Handle glare (both sides creating offers simultaneously)
        const isGlare =
          data.offer.type === "offer" &&
          (peerState.makingOffer || pc.signalingState !== "stable");

        if (isGlare) {
          // As the non-polite peer, ignore the incoming offer
          // The polite side should rollback — for simplicity we'll just ignore
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        peerState.remoteDescriptionSet = true;
        await flushIceCandidateQueue(data.fromSocketId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        newSocket.emit("video_room:answer", {
          targetSocketId: data.fromSocketId,
          answer: pc.localDescription,
        });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    newSocket.on("video_room:answer", async (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      if (isCleanedUpRef.current) return;
      try {
        const peerState = peersRef.current.get(data.fromSocketId);
        if (!peerState) return;

        await peerState.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
        peerState.remoteDescriptionSet = true;
        await flushIceCandidateQueue(data.fromSocketId);
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    });

    newSocket.on("video_room:ice_candidate", async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      if (isCleanedUpRef.current) return;
      try {
        const peerState = peersRef.current.get(data.fromSocketId);
        if (!peerState) return;

        if (peerState.remoteDescriptionSet) {
          await peerState.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          // Buffer until remote description is set
          peerState.iceCandidateQueue.push(data.candidate);
        }
      } catch (err) {
        console.warn("Error adding ICE candidate:", err);
      }
    });

    // --- Pomodoro ---

    newSocket.on("video_room:pomodoro_sync", (state: PomodoroState) => {
      if (isCleanedUpRef.current) return;
      setPomodoroState(state);
    });

    newSocket.on("video_room:pomodoro_phase_change", (_data: { phase: string; message: string }) => {
      // Handled by page component via pomodoroState updates from sync
    });

    // --- Screen Share Events ---

    newSocket.on("video_room:screen_share_started", (data: {
      sharerSocketId: string;
      sharerUserId: number;
      sharerUsername: string;
    }) => {
      if (isCleanedUpRef.current) return;
      setScreenShareState({
        sharerSocketId: data.sharerSocketId,
        sharerUserId: data.sharerUserId,
        sharerUsername: data.sharerUsername,
        whiteboardOverlay: false,
        isRecording: false,
      });
    });

    newSocket.on("video_room:screen_share_stopped", () => {
      if (isCleanedUpRef.current) return;
      setScreenShareState(null);
      setIsScreenSharing(false);
    });

    newSocket.on("video_room:screen_share_denied", (data: { message: string }) => {
      if (isCleanedUpRef.current) return;
      setError(data.message);
    });

    newSocket.on("video_room:whiteboard_overlay_changed", (data: { enabled: boolean }) => {
      if (isCleanedUpRef.current) return;
      setScreenShareState((prev) => prev ? { ...prev, whiteboardOverlay: data.enabled } : null);
    });

    newSocket.on("video_room:recording_started", () => {
      if (isCleanedUpRef.current) return;
      setScreenShareState((prev) => prev ? { ...prev, isRecording: true } : null);
    });

    newSocket.on("video_room:recording_stopped", () => {
      if (isCleanedUpRef.current) return;
      setScreenShareState((prev) => prev ? { ...prev, isRecording: false } : null);
    });

    newSocket.on("video_room:error", (data: { message: string }) => {
      if (isCleanedUpRef.current) return;
      setError(data.message);
    });

    newSocket.on("disconnect", () => {
      if (isCleanedUpRef.current) return;
      setIsConnected(false);
    });

    newSocket.on("reconnect", () => {
      if (isCleanedUpRef.current) return;
      // Re-join on reconnect
      newSocket.emit("video_room:join", {
        roomId,
        userId,
        username,
        nickname,
        avatar,
      });
    });

    return () => {
      isCleanedUpRef.current = true;
      newSocket.emit("video_room:leave");
      newSocket.removeAllListeners();
      newSocket.close();
      // Destroy all peer connections
      peersRef.current.forEach((_peer, socketId) => {
        destroyPeer(socketId);
      });
      peersRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomId, userId, username, nickname, avatar, createPeerConnection, destroyPeer, flushIceCandidateQueue]);

  const toggleCamera = useCallback(async () => {
    if (!isCameraOn) {
      try {
        let stream = localStreamRef.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
          localStreamRef.current = stream;
          setLocalStream(stream);
          // Mute audio by default since user hasn't toggled mic
          stream.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });

          // Add tracks to all existing peer connections (triggers renegotiation via onnegotiationneeded)
          peersRef.current.forEach((peer) => {
            stream!.getTracks().forEach((track) => {
              const senders = peer.connection.getSenders();
              const existingSender = senders.find((s) => s.track?.kind === track.kind);
              if (existingSender) {
                existingSender.replaceTrack(track);
              } else {
                peer.connection.addTrack(track, stream!);
              }
            });
          });
        } else {
          stream.getVideoTracks().forEach((t) => { t.enabled = true; });
        }
        setIsCameraOn(true);
        socketRef.current?.emit("video_room:toggle_media", { isCameraOn: true, isMicOn });
      } catch (err) {
        console.error("Failed to access camera:", err);
        setError("无法访问摄像头");
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = false; });
      }
      setIsCameraOn(false);
      socketRef.current?.emit("video_room:toggle_media", { isCameraOn: false, isMicOn });
    }
  }, [isCameraOn, isMicOn]);

  const toggleMic = useCallback(async () => {
    if (!isMicOn) {
      try {
        let stream = localStreamRef.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
          localStreamRef.current = stream;
          setLocalStream(stream);
          // Disable video by default since user hasn't toggled camera
          stream.getVideoTracks().forEach((t) => { t.enabled = isCameraOn; });

          peersRef.current.forEach((peer) => {
            stream!.getTracks().forEach((track) => {
              const senders = peer.connection.getSenders();
              const existingSender = senders.find((s) => s.track?.kind === track.kind);
              if (existingSender) {
                existingSender.replaceTrack(track);
              } else {
                peer.connection.addTrack(track, stream!);
              }
            });
          });
        } else {
          stream.getAudioTracks().forEach((t) => { t.enabled = true; });
        }
        setIsMicOn(true);
        socketRef.current?.emit("video_room:toggle_media", { isCameraOn, isMicOn: true });
      } catch (err) {
        console.error("Failed to access microphone:", err);
        setError("无法访问麦克风");
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
      }
      setIsMicOn(false);
      socketRef.current?.emit("video_room:toggle_media", { isCameraOn, isMicOn: false });
    }
  }, [isMicOn, isCameraOn]);

  const leaveRoom = useCallback(() => {
    isCleanedUpRef.current = true;
    socketRef.current?.emit("video_room:leave");
    socketRef.current?.removeAllListeners();
    socketRef.current?.close();
    peersRef.current.forEach((_peer, socketId) => {
      destroyPeer(socketId);
    });
    peersRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
    setIsConnected(false);
    setRemoteStreams(new Map());
    setParticipants([]);
    setScreenShareState(null);
    setIsScreenSharing(false);
  }, [destroyPeer]);

  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: true,
      });

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      const videoTrack = displayStream.getVideoTracks()[0];

      // Replace video track on all peer connections
      peersRef.current.forEach((peer) => {
        const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Listen for browser "Stop sharing" button
      videoTrack.addEventListener("ended", () => {
        stopScreenShare();
      });

      socketRef.current?.emit("video_room:screen_share_start");
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Screen share failed:", err);
        setError("屏幕共享启动失败");
      }
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }

    // Restore camera track on all peer connections
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    peersRef.current.forEach((peer) => {
      const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        sender.replaceTrack(cameraTrack || null);
      }
    });

    setIsScreenSharing(false);
    socketRef.current?.emit("video_room:screen_share_stop");
  }, []);

  const toggleWhiteboardOverlay = useCallback((enabled: boolean) => {
    socketRef.current?.emit("video_room:whiteboard_overlay_toggle", { enabled });
  }, []);

  const replaceScreenTrackWithComposited = useCallback((compositedTrack: MediaStreamTrack) => {
    peersRef.current.forEach((peer) => {
      const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        sender.replaceTrack(compositedTrack);
      }
    });
  }, []);

  const startPomodoro = useCallback(() => {
    socketRef.current?.emit("video_room:pomodoro_start", { roomId });
  }, [roomId]);

  const pausePomodoro = useCallback(() => {
    socketRef.current?.emit("video_room:pomodoro_pause", { roomId });
  }, [roomId]);

  const resetPomodoro = useCallback(() => {
    socketRef.current?.emit("video_room:pomodoro_reset", { roomId });
  }, [roomId]);

  const updatePomodoroConfig = useCallback(
    (focusDuration: number, breakDuration: number, rounds: number) => {
      socketRef.current?.emit("video_room:pomodoro_config", {
        roomId,
        focusDuration,
        breakDuration,
        rounds,
      });
    },
    [roomId]
  );

  return {
    socket,
    isConnected,
    participants,
    localStream,
    remoteStreams,
    isCameraOn,
    isMicOn,
    pomodoroState,
    ownerId,
    error,
    screenShareState,
    isScreenSharing,
    screenStream,
    toggleCamera,
    toggleMic,
    leaveRoom,
    startScreenShare,
    stopScreenShare,
    toggleWhiteboardOverlay,
    replaceScreenTrackWithComposited,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    updatePomodoroConfig,
  };
};
