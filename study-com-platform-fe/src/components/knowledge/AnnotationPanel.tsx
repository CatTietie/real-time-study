import React, { useState } from "react";
import { List, Avatar, Button, Input, Tag, Space, Popconfirm, Typography } from "antd";
import { SendOutlined, CheckOutlined, DeleteOutlined } from "@ant-design/icons";
import type { DocumentAnnotation, CreateAnnotationPayload } from "../../types/knowledge-library";

const { TextArea } = Input;
const { Text } = Typography;

interface AnnotationPanelProps {
  annotations: DocumentAnnotation[];
  currentUserId?: number;
  isAdmin?: boolean;
  canComment?: boolean;
  onAdd: (payload: CreateAnnotationPayload) => void;
  onResolve: (annotationId: number) => void;
  onDelete: (annotationId: number) => void;
  currentPage: number;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  currentUserId,
  isAdmin,
  canComment = true,
  onAdd,
  onResolve,
  onDelete,
  currentPage,
}) => {
  const [newContent, setNewContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleAdd = () => {
    if (!newContent.trim()) return;
    onAdd({
      content: newContent.trim(),
      page_number: currentPage,
      position_x: 50,
      position_y: 50,
    });
    setNewContent("");
  };

  const handleReply = (parentId: number) => {
    if (!replyContent.trim()) return;
    onAdd({
      content: replyContent.trim(),
      page_number: currentPage,
      position_x: 50,
      position_y: 50,
      parent_id: parentId,
    });
    setReplyContent("");
    setReplyTo(null);
  };

  const pageAnnotations = annotations.filter((a) => a.page_number === currentPage);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>
        Page {currentPage} Annotations ({pageAnnotations.length})
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "8px 12px" }}>
        <List
          dataSource={pageAnnotations}
          locale={{ emptyText: "No annotations on this page" }}
          renderItem={(item) => (
            <List.Item style={{ padding: "8px 0", alignItems: "flex-start" }}>
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Avatar size={24} src={item.Author?.avatar}>
                    {(item.Author?.nickname || item.Author?.username)?.[0]}
                  </Avatar>
                  <Text strong style={{ fontSize: 13 }}>
                    {item.Author?.nickname || item.Author?.username}
                  </Text>
                  {item.status === "resolved" && <Tag color="green" style={{ fontSize: 11 }}>Resolved</Tag>}
                </div>
                {item.quoted_text && (
                  <div style={{ background: "#fffbe6", borderLeft: "3px solid #fadb14", padding: "4px 8px", margin: "4px 0", fontSize: 12 }}>
                    {item.quoted_text}
                  </div>
                )}
                <Text style={{ fontSize: 13 }}>{item.content}</Text>

                <Space style={{ marginTop: 4 }}>
                  {item.status === "active" && canComment && (
                    <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => onResolve(item.id)}>
                      Resolve
                    </Button>
                  )}
                  {(item.user_id === currentUserId || isAdmin) && (
                    <Popconfirm title="Delete?" onConfirm={() => onDelete(item.id)}>
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                  {canComment && (
                    <Button type="link" size="small" onClick={() => setReplyTo(replyTo === item.id ? null : item.id)}>
                      Reply
                    </Button>
                  )}
                </Space>

                {item.Replies && item.Replies.length > 0 && (
                  <div style={{ marginLeft: 24, marginTop: 8 }}>
                    {item.Replies.map((reply) => (
                      <div key={reply.id} style={{ marginBottom: 6 }}>
                        <Text strong style={{ fontSize: 12 }}>
                          {reply.Author?.nickname || reply.Author?.username}:
                        </Text>{" "}
                        <Text style={{ fontSize: 12 }}>{reply.content}</Text>
                      </div>
                    ))}
                  </div>
                )}

                {replyTo === item.id && (
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <Input
                      size="small"
                      placeholder="Reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onPressEnter={() => handleReply(item.id)}
                    />
                    <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handleReply(item.id)} />
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
      </div>

      {canComment && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <TextArea
              rows={2}
              placeholder="Add an annotation..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleAdd} style={{ alignSelf: "flex-end" }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationPanel;
