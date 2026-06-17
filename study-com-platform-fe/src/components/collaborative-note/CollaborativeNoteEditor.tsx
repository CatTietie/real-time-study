import { useEffect, useMemo, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Button, Tooltip, Space, Tag, Dropdown, Modal, Input } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  UndoOutlined,
  RedoOutlined,
  CodeOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";
import type { Editor } from "@tiptap/react";
import CommentMark from "./extensions/CommentMark";
import { createNoteComment, listNoteComments } from "../../services/collaborative-note";
import "./CollaborativeNoteEditor.css";

const { TextArea } = Input;

interface CollaborativeNoteEditorProps {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  isSynced: boolean;
  userColor: string;
  userName: string;
  noteId: number;
  onEditorReady?: (editor: Editor) => void;
}

export default function CollaborativeNoteEditor({
  ydoc,
  provider,
  isConnected,
  isSynced,
  userColor,
  userName,
  noteId,
  onEditorReady,
}: CollaborativeNoteEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);

  const extensions = useMemo(() => {
    if (!ydoc || !provider) return null;

    return [
      StarterKit.configure({
        history: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: "开始协作编辑..." }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: userName,
          color: userColor,
        },
      }),
      CommentMark,
    ];
  }, [ydoc, provider, userName, userColor]);

  const editor = useEditor(
    {
      extensions: extensions || [],
      editable: !!extensions,
    },
    [extensions]
  );

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Load existing comments and apply marks on sync
  useEffect(() => {
    if (!editor || !isSynced || !noteId) return;
    const timer = setTimeout(async () => {
      try {
        const comments = await listNoteComments(noteId, "active");
        comments.forEach((comment) => {
          // Apply comment highlight marks — use stored position data
          // For simplicity, we rely on marks being synced via Yjs collaboration
          // Marks applied by the comment creator propagate to other users automatically
        });
      } catch {
        // silently fail
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editor, isSynced, noteId]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) return; // no text selected

      e.preventDefault();
      setSelectedText(editor.state.doc.textBetween(from, to));
      setSelectionRange({ from, to });
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [editor]
  );

  const handleAddComment = () => {
    setContextMenu(null);
    setCommentModalVisible(true);
  };

  const handleCommentSubmit = async () => {
    if (!editor || !ydoc || !commentText.trim() || !selectionRange) return;

    try {
      const ytext = ydoc.getXmlFragment("default");
      const posStart = JSON.stringify(Y.createRelativePositionFromTypeIndex(ytext, selectionRange.from));
      const posEnd = JSON.stringify(Y.createRelativePositionFromTypeIndex(ytext, selectionRange.to));

      const comment = await createNoteComment(noteId, {
        content: commentText.trim(),
        position_start: posStart,
        position_end: posEnd,
        quoted_text: selectedText.slice(0, 500),
      });

      // Apply comment highlight mark to the selected range
      editor
        .chain()
        .focus()
        .setTextSelection(selectionRange)
        .setCommentMark(String(comment.id))
        .run();

      setCommentText("");
      setCommentModalVisible(false);
      setSelectionRange(null);
      setSelectedText("");
    } catch {
      // error handled by the API service
    }
  };

  if (!ydoc || !provider || !editor) {
    return (
      <div className="collab-editor-loading">
        <Tag color="processing">正在连接协作服务...</Tag>
      </div>
    );
  }

  return (
    <div className="collab-editor-wrapper" onContextMenu={handleContextMenu}>
      <div className="collab-editor-toolbar">
        <Space size={2} wrap>
          <Tooltip title="加粗">
            <Button
              type={editor.isActive("bold") ? "primary" : "text"}
              size="small"
              icon={<BoldOutlined />}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
          </Tooltip>
          <Tooltip title="斜体">
            <Button
              type={editor.isActive("italic") ? "primary" : "text"}
              size="small"
              icon={<ItalicOutlined />}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
          </Tooltip>
          <Tooltip title="下划线">
            <Button
              type={editor.isActive("underline") ? "primary" : "text"}
              size="small"
              icon={<UnderlineOutlined />}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
          </Tooltip>
          <Tooltip title="删除线">
            <Button
              type={editor.isActive("strike") ? "primary" : "text"}
              size="small"
              icon={<StrikethroughOutlined />}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />
          </Tooltip>

          <div className="toolbar-divider" />

          <Tooltip title="标题 1">
            <Button
              type={editor.isActive("heading", { level: 1 }) ? "primary" : "text"}
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              H1
            </Button>
          </Tooltip>
          <Tooltip title="标题 2">
            <Button
              type={editor.isActive("heading", { level: 2 }) ? "primary" : "text"}
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </Button>
          </Tooltip>
          <Tooltip title="标题 3">
            <Button
              type={editor.isActive("heading", { level: 3 }) ? "primary" : "text"}
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </Button>
          </Tooltip>

          <div className="toolbar-divider" />

          <Tooltip title="无序列表">
            <Button
              type={editor.isActive("bulletList") ? "primary" : "text"}
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
          </Tooltip>
          <Tooltip title="有序列表">
            <Button
              type={editor.isActive("orderedList") ? "primary" : "text"}
              size="small"
              icon={<OrderedListOutlined />}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
          </Tooltip>
          <Tooltip title="代码块">
            <Button
              type={editor.isActive("codeBlock") ? "primary" : "text"}
              size="small"
              icon={<CodeOutlined />}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            />
          </Tooltip>

          <div className="toolbar-divider" />

          <Tooltip title="撤销">
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              onClick={() => editor.chain().focus().undo().run()}
            />
          </Tooltip>
          <Tooltip title="重做">
            <Button
              type="text"
              size="small"
              icon={<RedoOutlined />}
              onClick={() => editor.chain().focus().redo().run()}
            />
          </Tooltip>
        </Space>

        <div className="toolbar-status">
          <Tag color={isConnected ? "success" : "error"}>
            {isConnected ? "已连接" : "离线"}
          </Tag>
          {isConnected && !isSynced && (
            <Tag color="processing">同步中...</Tag>
          )}
        </div>
      </div>

      <EditorContent editor={editor} className="collab-editor-content" />

      {/* Context menu for adding comments */}
      {contextMenu && (
        <div
          className="comment-context-menu"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1050,
            background: "#fff",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "4px 0",
          }}
        >
          <div
            className="comment-context-menu-item"
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
            onClick={handleAddComment}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <CommentOutlined />
            添加评论
          </div>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1049 }}
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Comment input modal */}
      <Modal
        title="添加评论"
        open={commentModalVisible}
        onOk={handleCommentSubmit}
        onCancel={() => {
          setCommentModalVisible(false);
          setCommentText("");
        }}
        okText="提交"
        cancelText="取消"
        width={400}
      >
        {selectedText && (
          <div
            style={{
              background: "#fffbe6",
              borderLeft: "3px solid #faad14",
              padding: "8px 12px",
              marginBottom: 12,
              fontSize: 13,
              color: "#666",
              borderRadius: 2,
              maxHeight: 60,
              overflow: "hidden",
            }}
          >
            "{selectedText.slice(0, 100)}{selectedText.length > 100 ? "..." : ""}"
          </div>
        )}
        <TextArea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="输入你的评论..."
          autoSize={{ minRows: 2, maxRows: 5 }}
          autoFocus
        />
      </Modal>
    </div>
  );
}
