import { useEffect, useState } from "react";
import { List, Button, Empty, Spin, message, Popconfirm } from "antd";
import { DeleteOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { getRoomRecordings, deleteRecording } from "../../services/videoStudyRoom";
import { RecordingPlayer } from "./RecordingPlayer";
import type { RoomRecording } from "../../types/video-study-room";

interface RecordingsListProps {
  roomId: number;
  currentUserId: number;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs > 0 ? secs + "秒" : ""}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const RecordingsList = ({ roomId, currentUserId }: RecordingsListProps) => {
  const [recordings, setRecordings] = useState<RoomRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await getRoomRecordings(roomId);
      if (res.success) {
        setRecordings(res.data);
      }
    } catch {
      message.error("加载录制列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [roomId]);

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteRecording(id);
      if (res.success) {
        message.success("删除成功");
        setRecordings((prev) => prev.filter((r) => r.id !== id));
        if (playingId === id) setPlayingId(null);
      }
    } catch {
      message.error("删除失败");
    }
  };

  if (loading) {
    return <Spin className="w-full flex justify-center py-8" />;
  }

  if (recordings.length === 0) {
    return <Empty description="暂无录制回放" />;
  }

  return (
    <div className="space-y-4">
      {playingId && (
        <div className="mb-4">
          <RecordingPlayer
            url={recordings.find((r) => r.id === playingId)!.file_url}
            title={recordings.find((r) => r.id === playingId)?.title}
          />
          <Button
            size="small"
            className="mt-2"
            onClick={() => setPlayingId(null)}
          >
            关闭播放器
          </Button>
        </div>
      )}

      <List
        dataSource={recordings}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => setPlayingId(item.id)}
              >
                播放
              </Button>,
              item.recorder_user_id === currentUserId && (
                <Popconfirm
                  title="确认删除此录制？"
                  onConfirm={() => handleDelete(item.id)}
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              title={item.title}
              description={
                <div className="text-xs text-gray-500 space-x-3">
                  <span>录制者: {item.Recorder?.nickname || item.Recorder?.username || "未知"}</span>
                  <span>时长: {formatDuration(item.duration)}</span>
                  <span>大小: {formatFileSize(item.file_size)}</span>
                  <span>{new Date(item.created_at).toLocaleString("zh-CN")}</span>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};
