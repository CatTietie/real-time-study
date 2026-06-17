import { useState, useEffect } from "react";
import { Drawer, List, Avatar, Button, Input, Typography, Popconfirm, Empty, message, Tag } from "antd";
import { CheckOutlined, DeleteOutlined, SendOutlined } from "@ant-design/icons";
import { listNoteComments, createNoteComment, resolveNoteComment, deleteNoteComment } from "../../services/collaborative-note";
import type { NoteComment } from "../../types/collaborative-note";
import type { Editor } from "@tiptap/react";
import type * as Y from "yjs";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface CommentDrawerProps {
  visible: boolean;
  onClose: () => void;
  noteId: number;
  ydoc: Y.Doc | null;
  editor: Editor | null;
}

export default function CommentDrawer({ visible, onClose, noteId, ydoc, editor }: CommentDrawerProps) {
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvedComments, setResolvedComments] = useState<NoteComment[]>([]);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, noteId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await listNoteComments(noteId, "active");
      setComments(data);
    } catch {
      message.error("加载评论失败");
    } finally {
      setLoading(false);
    }
  };

  const loadResolvedComments = async () => {
    try {
      const data = await listNoteComments(noteId, "resolved");
      setResolvedComments(data);
      setShowResolved(true);
    } catch {
      message.error("加载已解决评论失败");
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyContent.trim()) return;
    try {
      setSubmitting(true);
      const parent = comments.find((c) => c.id === parentId);
      await createNoteComment(noteId, {
        content: replyContent.trim(),
        position_start: parent?.position_start || "{}",
        position_end: parent?.position_end || "{}",
        parent_id: parentId,
      });
      setReplyContent("");
      setReplyingTo(null);
      await loadComments();
    } catch {
      message.error("回复失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: number) => {
    try {
      await resolveNoteComment(noteId, commentId);
      if (editor) {
        editor.commands.unsetCommentMark(String(commentId));
      }
      await loadComments();
      message.success("评论已解决");
    } catch {
      message.error("操作失败");
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await deleteNoteComment(noteId, commentId);
      if (editor) {
        editor.commands.unsetCommentMark(String(commentId));
      }
      await loadComments();
    } catch {
      message.error("删除失败");
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
    return date.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Drawer
      title="行级评论"
      placement="right"
      width={380}
      open={visible}
      onClose={onClose}
      styles={{ body: { padding: "12px 16px" } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Empty description="加载中..." />
        </div>
      ) : comments.length === 0 ? (
        <Empty description="暂无评论，选中文字右键可添加评论" />
      ) : (
        <List
          dataSource={comments}
          renderItem={(comment) => (
            <List.Item
              key={comment.id}
              style={{ display: "block", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Avatar size={28} style={{ backgroundColor: "#1677ff", flexShrink: 0 }}>
                  {(comment.User?.nickname || comment.User?.username || "?")[0]}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {comment.User?.nickname || comment.User?.username}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTime(comment.created_at)}
                    </Text>
                  </div>
                  {comment.quoted_text && (
                    <div
                      style={{
                        background: "#fffbe6",
                        borderLeft: "3px solid #faad14",
                        padding: "4px 8px",
                        margin: "4px 0",
                        fontSize: 12,
                        color: "#666",
                        borderRadius: 2,
                      }}
                    >
                      {comment.quoted_text}
                    </div>
                  )}
                  <Paragraph style={{ margin: "4px 0 8px", fontSize: 13 }}>
                    {comment.content}
                  </Paragraph>

                  {/* Replies */}
                  {comment.Replies && comment.Replies.length > 0 && (
                    <div style={{ marginLeft: 8, borderLeft: "2px solid #f0f0f0", paddingLeft: 10 }}>
                      {comment.Replies.map((reply) => (
                        <div key={reply.id} style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 12 }}>
                            {reply.User?.nickname || reply.User?.username}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            {formatTime(reply.created_at)}
                          </Text>
                          <div style={{ fontSize: 13, marginTop: 2 }}>{reply.content}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, fontSize: 12 }}
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      回复
                    </Button>
                    <Popconfirm title="标记为已解决？" onConfirm={() => handleResolve(comment.id)}>
                      <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} icon={<CheckOutlined />}>
                        解决
                      </Button>
                    </Popconfirm>
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(comment.id)}>
                      <Button type="link" size="small" danger style={{ padding: 0, fontSize: 12 }} icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </div>

                  {/* Reply input */}
                  {replyingTo === comment.id && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <TextArea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="输入回复..."
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        style={{ fontSize: 13 }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        icon={<SendOutlined />}
                        loading={submitting}
                        onClick={() => handleReply(comment.id)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}

      {!showResolved && comments.length > 0 && (
        <Button type="link" onClick={loadResolvedComments} style={{ marginTop: 8 }}>
          查看已解决的评论
        </Button>
      )}

      {showResolved && resolvedComments.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            已解决 ({resolvedComments.length})
          </Text>
          {resolvedComments.map((c) => (
            <div key={c.id} style={{ padding: "6px 0", opacity: 0.6 }}>
              <Text style={{ fontSize: 12 }}>
                <Tag color="green" style={{ fontSize: 10 }}>已解决</Tag>
                {c.User?.nickname}: {c.content}
              </Text>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
