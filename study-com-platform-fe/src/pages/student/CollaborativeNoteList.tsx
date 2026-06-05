import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Row,
  Col,
  Typography,
  Empty,
  Spin,
  message,
  Modal,
  Input,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {
  listCollaborativeNotes,
  createCollaborativeNote,
  deleteCollaborativeNote,
} from "../../services/collaborative-note";
import type { CollaborativeNote } from "../../types/collaborative-note";

const { Text, Paragraph } = Typography;

export default function CollaborativeNoteList() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<CollaborativeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await listCollaborativeNotes(1, 50);
      setNotes(data.list);
    } catch {
      message.error("加载笔记列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const note = await createCollaborativeNote({ title: newTitle || "未命名文档" });
      setCreateModalOpen(false);
      setNewTitle("");
      navigate(`/student/collaborative-notes/${note.id}`);
    } catch {
      message.error("创建笔记失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCollaborativeNote(id);
      message.success("已归档");
      loadNotes();
    } catch {
      message.error("操作失败");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          协作笔记
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          新建笔记
        </Button>
      </div>

      {notes.length === 0 ? (
        <Empty description="暂无笔记，点击上方按钮创建" />
      ) : (
        <Row gutter={[16, 16]}>
          {notes.map((note) => (
            <Col key={note.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                onClick={() => navigate(`/student/collaborative-notes/${note.id}`)}
                style={{ height: "100%" }}
                actions={[
                  <Popconfirm
                    key="delete"
                    title="确定归档此笔记？"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDelete(note.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <DeleteOutlined
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#ff4d4f" }}
                    />
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 24, color: "#1890ff" }} />}
                  title={
                    <Text ellipsis style={{ maxWidth: 150 }}>
                      {note.title}
                    </Text>
                  }
                  description={
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <ClockCircleOutlined style={{ fontSize: 12 }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(note.updated_at)}
                      </Text>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="新建协作笔记"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false);
          setNewTitle("");
        }}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入笔记标题"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onPressEnter={handleCreate}
          autoFocus
        />
      </Modal>
    </div>
  );
}
