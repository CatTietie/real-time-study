import { useState, useEffect } from "react";
import { Drawer, Timeline, Button, Spin, Typography, Popconfirm, Empty, message } from "antd";
import { ClockCircleOutlined, RollbackOutlined } from "@ant-design/icons";
import { listNoteVersions, getNoteVersion, restoreNoteVersion } from "../../services/collaborative-note";
import type { NoteVersion } from "../../types/collaborative-note";

const { Text, Paragraph } = Typography;

interface VersionHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  noteId: number;
}

export default function VersionHistoryDrawer({ visible, onClose, noteId }: VersionHistoryDrawerProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<NoteVersion | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (visible) {
      loadVersions();
    } else {
      setPreviewVersion(null);
    }
  }, [visible, noteId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const result = await listNoteVersions(noteId);
      setVersions(result.list);
    } catch {
      message.error("加载版本历史失败");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (version: NoteVersion) => {
    try {
      setPreviewLoading(true);
      const detail = await getNoteVersion(noteId, version.id);
      setPreviewVersion(detail);
    } catch {
      message.error("加载版本内容失败");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRestore = async (versionId: number) => {
    try {
      setRestoring(true);
      await restoreNoteVersion(noteId, versionId);
      message.success("版本恢复成功");
      onClose();
    } catch {
      message.error("版本恢复失败");
    } finally {
      setRestoring(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} 天前`;
    return date.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Drawer
      title="版本历史"
      placement="right"
      width={520}
      open={visible}
      onClose={onClose}
      styles={{ body: { padding: "16px 24px" } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : versions.length === 0 ? (
        <Empty description="暂无版本记录" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Timeline
            items={versions.map((v) => ({
              dot: <ClockCircleOutlined />,
              children: (
                <div
                  key={v.id}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: previewVersion?.id === v.id ? "1px solid #1677ff" : "1px solid #f0f0f0",
                    background: previewVersion?.id === v.id ? "#f0f5ff" : "#fafafa",
                    transition: "all 0.2s",
                  }}
                  onClick={() => handlePreview(v)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong>版本 {v.version_number}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatTime(v.created_at)}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {v.User?.nickname || v.User?.username || "系统"}
                  </Text>
                </div>
              ),
            }))}
          />

          {previewVersion && (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text strong>版本 {previewVersion.version_number} 预览</Text>
                <Popconfirm
                  title="确认恢复到此版本？"
                  description="恢复操作会替换当前内容，但会生成新版本记录。"
                  onConfirm={() => handleRestore(previewVersion.id)}
                  okText="确认恢复"
                  cancelText="取消"
                >
                  <Button
                    type="primary"
                    icon={<RollbackOutlined />}
                    size="small"
                    loading={restoring}
                  >
                    恢复此版本
                  </Button>
                </Popconfirm>
              </div>
              {previewLoading ? (
                <Spin />
              ) : (
                <div
                  className="version-preview-content"
                  style={{
                    border: "1px solid #e8e8e8",
                    borderRadius: 6,
                    padding: 16,
                    maxHeight: 400,
                    overflow: "auto",
                    background: "#fff",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                  dangerouslySetInnerHTML={{ __html: previewVersion.content_html || "<p>空内容</p>" }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
