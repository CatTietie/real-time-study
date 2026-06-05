import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Avatar,
  Progress,
  Space,
  Tag,
  Tooltip,
  notification,
  Spin,
  message,
  Drawer,
  InputNumber,
  Select,
  Form,
} from "antd";
import {
  VideoCameraOutlined,
  VideoCameraAddOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  LogoutOutlined,
  UserOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  TeamOutlined,
  DesktopOutlined,
  StopOutlined,
  VideoCameraFilled,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "../../app/hooks";
import { useVideoStudyRoom } from "../../hooks/useVideoStudyRoom";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { usePomodoroDisplay } from "../../hooks/usePomodoroDisplay";
import { getVideoStudyRoomDetail, uploadRecording } from "../../services/videoStudyRoom";
import { ScreenShareWhiteboard } from "../../components/video-study-room/ScreenShareWhiteboard";
import { RecordingsList } from "../../components/video-study-room/RecordingsList";
import type { VideoStudyRoom } from "../../types/video-study-room";

const VideoStudyRoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId, username, nickname, avatar } = useAppSelector((state) => state.auth);
  const [roomInfo, setRoomInfo] = useState<VideoStudyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [recordingsDrawerOpen, setRecordingsDrawerOpen] = useState(false);
  const [whiteboardEnabled, setWhiteboardEnabled] = useState(false);
  const [configForm] = Form.useForm();
  const prevPhaseRef = useRef<string>("");
  const compositedStreamRef = useRef<MediaStream | null>(null);

  const roomId = Number(id);

  const {
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
  } = useVideoStudyRoom({
    roomId,
    userId: userId || 0,
    username: username || "",
    nickname: nickname || undefined,
    avatar: avatar || undefined,
  });

  const { formattedTime, progressPercent, phaseLabel, currentRound, totalRounds, status } =
    usePomodoroDisplay({ pomodoroState });

  const { isRecording, recordingDuration, startRecording, stopRecording } = useScreenRecorder({
    onRecordingComplete: async (blob, duration) => {
      try {
        message.loading({ content: "正在上传录制文件...", key: "upload-recording", duration: 0 });
        await uploadRecording(roomId, blob, undefined, duration);
        message.success({ content: "录制文件上传成功", key: "upload-recording" });
        socket?.emit("video_room:recording_stop");
      } catch {
        message.error({ content: "录制文件上传失败", key: "upload-recording" });
      }
    },
  });

  const isOwner = ownerId === userId;
  const isSomeoneSharing = !!screenShareState;
  const isLocalUserSharing = isScreenSharing;
  const canShare = !isSomeoneSharing || isLocalUserSharing;

  const handleStartRecording = () => {
    // Use composited stream (screen + whiteboard) if available, otherwise raw screen stream
    const streamToRecord = compositedStreamRef.current || screenStream;
    if (streamToRecord) {
      startRecording(streamToRecord);
      socket?.emit("video_room:recording_start");
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleCompositedStreamReady = useCallback((stream: MediaStream) => {
    compositedStreamRef.current = stream;
    // Replace WebRTC tracks with the composited stream's video track
    const compositedVideoTrack = stream.getVideoTracks()[0];
    if (compositedVideoTrack) {
      replaceScreenTrackWithComposited(compositedVideoTrack);
    }
  }, [replaceScreenTrackWithComposited]);

  const handleWhiteboardToggle = useCallback((enabled: boolean) => {
    setWhiteboardEnabled(enabled);
    toggleWhiteboardOverlay(enabled);
  }, [toggleWhiteboardOverlay]);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await getVideoStudyRoomDetail(roomId);
        if (res.success) {
          setRoomInfo(res.data);
        }
      } catch (err: any) {
        message.error("房间不存在或已关闭");
        navigate("/student/video-study-rooms");
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, navigate]);

  useEffect(() => {
    if (
      prevPhaseRef.current &&
      pomodoroState.status !== prevPhaseRef.current
    ) {
      if (pomodoroState.status === "break") {
        notification.info({
          message: "休息时间到！",
          description: "专注时间结束，起来活动一下吧",
          duration: 10,
        });
      } else if (pomodoroState.status === "focus" && prevPhaseRef.current === "break") {
        notification.info({
          message: "继续专注！",
          description: `第 ${pomodoroState.currentRound} 轮专注开始`,
          duration: 5,
        });
      } else if (pomodoroState.status === "idle" && prevPhaseRef.current !== "idle") {
        notification.success({
          message: "所有轮次已完成！",
          description: "太棒了，好好休息一下吧",
          duration: 10,
        });
      }
    }
    prevPhaseRef.current = pomodoroState.status;
  }, [pomodoroState.status, pomodoroState.currentRound]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  // Reset whiteboard and composited stream when screen sharing stops
  useEffect(() => {
    if (!isScreenSharing) {
      setWhiteboardEnabled(false);
      compositedStreamRef.current = null;
    }
  }, [isScreenSharing]);

  const handleLeave = () => {
    leaveRoom();
    navigate("/student/video-study-rooms");
  };

  const handleConfigSave = () => {
    const values = configForm.getFieldsValue();
    updatePomodoroConfig(values.focusDuration, values.breakDuration, values.rounds);
    setConfigDrawerOpen(false);
    message.success("番茄钟配置已更新");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Pomodoro Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <VideoCameraOutlined className="text-xl text-blue-400" />
          <span className="font-semibold text-lg truncate max-w-[200px]">
            {roomInfo?.name}
          </span>
          <Tag color={isConnected ? "green" : "red"}>
            {isConnected ? "已连接" : "连接中..."}
          </Tag>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Tag
              color={
                status === "focus"
                  ? "orange"
                  : status === "break"
                  ? "green"
                  : status === "paused"
                  ? "yellow"
                  : "default"
              }
            >
              {phaseLabel}
            </Tag>
            <span className="text-2xl font-mono font-bold tracking-wider">
              {formattedTime}
            </span>
            <span className="text-gray-400 text-sm">
              轮次 {currentRound}/{totalRounds}
            </span>
          </div>
          <Progress
            percent={progressPercent}
            showInfo={false}
            strokeColor={status === "break" ? "#52c41a" : "#1890ff"}
            trailColor="#374151"
            size="small"
            className="w-32 m-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <TeamOutlined className="text-gray-400" />
          <span className="text-gray-300">
            {participants.length}/{roomInfo?.max_participants || 9}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid / Spotlight Layout */}
        <div className="flex-1 p-4">
          {isSomeoneSharing ? (
            // Spotlight layout: large screen share + small participant strip
            <div className="h-full flex flex-col gap-3">
              <div className="flex-1 relative bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                {isLocalUserSharing && screenStream ? (
                  // Local sharer: mount compositor that produces composited stream (screen + whiteboard)
                  <ScreenShareWhiteboard
                    screenStream={screenStream}
                    whiteboardEnabled={whiteboardEnabled}
                    onCompositedStreamReady={handleCompositedStreamReady}
                    onToggle={handleWhiteboardToggle}
                  />
                ) : (
                  // Remote viewer: just show the incoming stream (already composited by sharer)
                  <VideoCell
                    stream={remoteStreams.get(screenShareState!.sharerSocketId) || null}
                    username={`${screenShareState!.sharerUsername} 的屏幕`}
                    isCameraOn={true}
                    isMicOn={true}
                    isScreenShare
                  />
                )}
                {screenShareState?.isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 px-2 py-1 rounded text-xs z-30">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    录制中
                  </div>
                )}
              </div>
              {/* Participant strip: local user camera + other participants (excluding sharer's screen) */}
              <div className="flex gap-2 h-28 overflow-x-auto">
                {/* Local user camera feed (always visible in strip) */}
                <div className="w-40 flex-shrink-0">
                  <VideoCell
                    stream={localStream}
                    username={nickname || username || "我"}
                    isCameraOn={isCameraOn}
                    isMicOn={isMicOn}
                    isLocal
                    avatar={avatar}
                  />
                </div>
                {/* Other participants, excluding the sharer (sharer is shown in spotlight above) */}
                {participants
                  .filter((p) => p.userId !== userId && p.socketId !== screenShareState?.sharerSocketId)
                  .map((p) => (
                    <div key={p.socketId} className="w-40 flex-shrink-0">
                      <VideoCell
                        stream={remoteStreams.get(p.socketId) || null}
                        username={p.nickname || p.username}
                        isCameraOn={p.isCameraOn}
                        isMicOn={p.isMicOn}
                        avatar={p.avatar}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            // Grid layout (normal mode)
            <div
              className="grid gap-3 h-full"
              style={{
                gridTemplateColumns: `repeat(${
                  participants.length <= 1 ? 1 : participants.length <= 4 ? 2 : 3
                }, 1fr)`,
                gridTemplateRows: `repeat(${
                  participants.length <= 2 ? 1 : participants.length <= 6 ? 2 : 3
                }, 1fr)`,
              }}
            >
              {/* Local Video */}
              <VideoCell
                stream={localStream}
                username={nickname || username || "我"}
                isCameraOn={isCameraOn}
                isMicOn={isMicOn}
                isLocal
                avatar={avatar}
              />

              {/* Remote Videos */}
              {participants
                .filter((p) => p.userId !== userId)
                .map((p) => (
                  <VideoCell
                    key={p.socketId}
                    stream={remoteStreams.get(p.socketId) || null}
                    username={p.nickname || p.username}
                    isCameraOn={p.isCameraOn}
                    isMicOn={p.isMicOn}
                    avatar={p.avatar}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Sidebar - Owner Controls */}
        {isOwner && (
          <div className="w-64 bg-gray-800 border-l border-gray-700 p-4 flex flex-col gap-4">
            <h4 className="text-gray-300 text-sm font-semibold m-0">番茄钟控制</h4>
            <Space direction="vertical" className="w-full">
              {status === "idle" || status === "paused" ? (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  block
                  onClick={startPomodoro}
                >
                  {status === "paused" ? "继续" : "开始专注"}
                </Button>
              ) : (
                <Button
                  icon={<PauseCircleOutlined />}
                  block
                  onClick={pausePomodoro}
                >
                  暂停
                </Button>
              )}
              <Button icon={<ReloadOutlined />} block onClick={resetPomodoro}>
                重置
              </Button>
              <Button
                icon={<SettingOutlined />}
                block
                onClick={() => {
                  configForm.setFieldsValue({
                    focusDuration: roomInfo?.pomodoro_focus_duration || 25,
                    breakDuration: roomInfo?.pomodoro_break_duration || 5,
                    rounds: roomInfo?.pomodoro_rounds || 4,
                  });
                  setConfigDrawerOpen(true);
                }}
              >
                配置
              </Button>
            </Space>

            <div className="mt-4">
              <h4 className="text-gray-300 text-sm font-semibold mb-2">
                参与者 ({participants.length})
              </h4>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.socketId}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <Avatar size="small" src={p.avatar} icon={<UserOutlined />} />
                    <span className="truncate flex-1">
                      {p.nickname || p.username}
                      {p.userId === ownerId && (
                        <Tag color="gold" className="ml-1 text-xs" style={{ fontSize: 10 }}>
                          房主
                        </Tag>
                      )}
                    </span>
                    <Space size={2}>
                      {p.isCameraOn ? (
                        <VideoCameraOutlined className="text-green-400" />
                      ) : (
                        <VideoCameraOutlined className="text-gray-600" />
                      )}
                      {p.isMicOn ? (
                        <AudioOutlined className="text-green-400" />
                      ) : (
                        <AudioMutedOutlined className="text-gray-600" />
                      )}
                    </Space>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-center gap-4 py-4 bg-gray-800 border-t border-gray-700">
        <Tooltip title={isCameraOn ? "关闭摄像头" : "开启摄像头"}>
          <Button
            shape="circle"
            size="large"
            icon={isCameraOn ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
            type={isCameraOn ? "primary" : "default"}
            onClick={toggleCamera}
          />
        </Tooltip>
        <Tooltip title={isMicOn ? "关闭麦克风" : "开启麦克风"}>
          <Button
            shape="circle"
            size="large"
            icon={isMicOn ? <AudioOutlined /> : <AudioMutedOutlined />}
            type={isMicOn ? "primary" : "default"}
            onClick={toggleMic}
          />
        </Tooltip>
        <Tooltip title={isLocalUserSharing ? "停止共享" : canShare ? "共享屏幕" : "其他人正在共享"}>
          <Button
            shape="circle"
            size="large"
            icon={isLocalUserSharing ? <StopOutlined /> : <DesktopOutlined />}
            type={isLocalUserSharing ? "primary" : "default"}
            style={isLocalUserSharing ? { background: "#52c41a", borderColor: "#52c41a" } : undefined}
            disabled={!canShare && !isLocalUserSharing}
            onClick={isLocalUserSharing ? stopScreenShare : startScreenShare}
          />
        </Tooltip>
        {isLocalUserSharing && (
          <Tooltip title={isRecording ? `停止录制 (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, "0")})` : "开始录制"}>
            <Button
              shape="circle"
              size="large"
              icon={<VideoCameraFilled />}
              type={isRecording ? "primary" : "default"}
              danger={isRecording}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            />
          </Tooltip>
        )}
        <Tooltip title="录制回放">
          <Button
            shape="circle"
            size="large"
            icon={<UnorderedListOutlined />}
            onClick={() => setRecordingsDrawerOpen(true)}
          />
        </Tooltip>
        <Tooltip title="离开房间">
          <Button
            shape="circle"
            size="large"
            icon={<LogoutOutlined />}
            danger
            onClick={handleLeave}
          />
        </Tooltip>
      </div>

      {/* Config Drawer */}
      <Drawer
        title="番茄钟配置"
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        extra={
          <Button type="primary" onClick={handleConfigSave}>
            保存
          </Button>
        }
      >
        <Form form={configForm} layout="vertical">
          <Form.Item name="focusDuration" label="专注时长(分钟)">
            <Select>
              <Select.Option value={15}>15分钟</Select.Option>
              <Select.Option value={25}>25分钟</Select.Option>
              <Select.Option value={45}>45分钟</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="breakDuration" label="休息时长(分钟)">
            <Select>
              <Select.Option value={5}>5分钟</Select.Option>
              <Select.Option value={10}>10分钟</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="rounds" label="轮数">
            <InputNumber min={1} max={8} className="w-full" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Recordings Drawer */}
      <Drawer
        title="录制回放"
        open={recordingsDrawerOpen}
        onClose={() => setRecordingsDrawerOpen(false)}
        width={480}
      >
        <RecordingsList roomId={roomId} currentUserId={userId || 0} />
      </Drawer>
    </div>
  );
};

interface VideoCellProps {
  stream: MediaStream | null;
  username: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isLocal?: boolean;
  isScreenShare?: boolean;
  avatar?: string | null;
}

const VideoCell = ({ stream, username, isCameraOn, isMicOn, isLocal, isScreenShare, avatar }: VideoCellProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center h-full w-full">
      {(isCameraOn || isScreenShare) && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full ${isScreenShare ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Avatar size={64} src={avatar} icon={<UserOutlined />} />
          <span className="text-gray-300 text-sm">{username}</span>
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        <Tag
          className="text-xs"
          style={{ margin: 0, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff" }}
        >
          {username}
          {isLocal && " (我)"}
        </Tag>
        {!isMicOn && <AudioMutedOutlined className="text-red-400 text-xs" />}
      </div>
    </div>
  );
};

export default VideoStudyRoomPage;
