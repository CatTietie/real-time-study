import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, Typography, Input, Button, message, Spin } from "antd";
import { ArrowLeftOutlined, HistoryOutlined, CommentOutlined } from "@ant-design/icons";
import CollaborativeNoteEditor from "../../components/collaborative-note/CollaborativeNoteEditor";
import CollaboratorSidebar from "../../components/collaborative-note/CollaboratorSidebar";
import VersionHistoryDrawer from "../../components/collaborative-note/VersionHistoryDrawer";
import CommentDrawer from "../../components/collaborative-note/CommentDrawer";
import { useCollaborativeEditor } from "../../hooks/useCollaborativeEditor";
import { useNoteCollaborators } from "../../hooks/useNoteCollaborators";
import { getCollaborativeNote, updateCollaborativeNote } from "../../services/collaborative-note";
import { useAppSelector } from "../../app/hooks";
import type { CollaborativeNote } from "../../types/collaborative-note";
import type { Editor } from "@tiptap/react";

const { Sider, Content } = Layout;

export default function CollaborativeNotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const noteId = Number(id);

  const [note, setNote] = useState<CollaborativeNote | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [commentDrawerVisible, setCommentDrawerVisible] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const auth = useAppSelector((state) => state.auth);
  const userName = auth.nickname || auth.username || "匿名用户";

  const { ydoc, provider, isConnected, isSynced, userColor } = useCollaborativeEditor(noteId);
  const { collaborators } = useNoteCollaborators({ noteId });

  useEffect(() => {
    if (!noteId) return;
    loadNote();
  }, [noteId]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const data = await getCollaborativeNote(noteId);
      setNote(data);
      setTitle(data.title);
    } catch (err) {
      message.error("加载笔记失败");
      navigate("/student/collaborative-notes");
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    if (note) {
      try {
        await updateCollaborativeNote(note.id, { title: newTitle });
      } catch {
        // silently fail title update
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <Layout style={{ height: "calc(100vh - 64px)", background: "#fff" }}>
      <Sider
        width={100}
        style={{
          background: "#fafafa",
          borderRight: "1px solid #f0f0f0",
          overflow: "auto",
        }}
      >
        <CollaboratorSidebar collaborators={collaborators} />
      </Sider>
      <Content style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/student/collaborative-notes")}
          />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => handleTitleChange(e.target.value)}
            onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
            variant="borderless"
            style={{ fontSize: 18, fontWeight: 600, flex: 1 }}
            placeholder="未命名文档"
          />
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setVersionDrawerVisible(true)}
          >
            版本历史
          </Button>
          <Button
            icon={<CommentOutlined />}
            onClick={() => setCommentDrawerVisible(true)}
          >
            评论
          </Button>
        </div>
        <div style={{ flex: 1, overflow: "hidden", padding: 16 }}>
          <CollaborativeNoteEditor
            ydoc={ydoc}
            provider={provider}
            isConnected={isConnected}
            isSynced={isSynced}
            userColor={userColor}
            userName={userName}
            noteId={noteId}
            onEditorReady={setEditorInstance}
          />
        </div>
      </Content>
      <VersionHistoryDrawer
        visible={versionDrawerVisible}
        onClose={() => setVersionDrawerVisible(false)}
        noteId={noteId}
      />
      <CommentDrawer
        visible={commentDrawerVisible}
        onClose={() => setCommentDrawerVisible(false)}
        noteId={noteId}
        ydoc={ydoc}
        editor={editorInstance}
      />
    </Layout>
  );
}
