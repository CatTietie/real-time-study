import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Button, Spin, Typography, Space, Tag, Avatar, Tooltip,
  Drawer, List, message, Descriptions, Popconfirm, Image,
} from "antd";
import {
  ArrowLeftOutlined, DownloadOutlined, HistoryOutlined,
  EyeOutlined, UserOutlined, CloudDownloadOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "../../app/hooks";
import {
  getDocument, downloadDocument, listAnnotations, createAnnotation,
  resolveAnnotation, deleteAnnotation, listVersions, restoreVersion,
} from "../../services/knowledgeLibrary";
import { useDocumentAnnotations } from "../../hooks/useDocumentAnnotations";
import PdfViewer from "../../components/knowledge/PdfViewer";
import DocxViewer from "../../components/knowledge/DocxViewer";
import AnnotationPanel from "../../components/knowledge/AnnotationPanel";
import type { KnowledgeDocument, DocumentAnnotation, DocumentVersion, CreateAnnotationPayload } from "../../types/knowledge-library";

const { Title, Text } = Typography;

const KnowledgeDocumentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const docId = Number(id);

  const [document, setDocument] = useState<KnowledgeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const {
    viewers,
    newAnnotation,
    resolvedId,
    deletedId,
    clearNewAnnotation,
    clearResolvedId,
    clearDeletedId,
  } = useDocumentAnnotations(docId);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const res = await getDocument(docId);
      if (res.data.success) {
        setDocument(res.data.data);
      }
    } catch {
      message.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnotations = async () => {
    try {
      const res = await listAnnotations(docId);
      if (res.data.success) {
        setAnnotations(res.data.data);
      }
    } catch {}
  };

  useEffect(() => {
    if (docId) {
      fetchDocument();
      fetchAnnotations();
    }
  }, [docId]);

  // Handle real-time annotation updates
  useEffect(() => {
    if (newAnnotation) {
      setAnnotations((prev) => {
        if (newAnnotation.parent_id) {
          return prev.map((a) =>
            a.id === newAnnotation.parent_id
              ? { ...a, Replies: [...(a.Replies || []), newAnnotation] }
              : a
          );
        }
        if (prev.some((a) => a.id === newAnnotation.id)) return prev;
        return [...prev, newAnnotation];
      });
      clearNewAnnotation();
    }
  }, [newAnnotation]);

  useEffect(() => {
    if (resolvedId) {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === resolvedId ? { ...a, status: "resolved" } : a))
      );
      clearResolvedId();
    }
  }, [resolvedId]);

  useEffect(() => {
    if (deletedId) {
      setAnnotations((prev) => prev.filter((a) => a.id !== deletedId));
      clearDeletedId();
    }
  }, [deletedId]);

  const handleAddAnnotation = async (payload: CreateAnnotationPayload) => {
    try {
      const res = await createAnnotation(docId, payload);
      if (res.data.success) {
        if (!payload.parent_id) {
          setAnnotations((prev) => [...prev, res.data.data]);
        }
      }
    } catch {
      message.error("Failed to create annotation");
    }
  };

  const handleResolveAnnotation = async (annotationId: number) => {
    try {
      await resolveAnnotation(docId, annotationId);
      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotationId ? { ...a, status: "resolved" } : a))
      );
    } catch {
      message.error("Operation failed");
    }
  };

  const handleDeleteAnnotation = async (annotationId: number) => {
    try {
      await deleteAnnotation(docId, annotationId);
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    } catch {
      message.error("Delete failed");
    }
  };

  const handleDownload = async () => {
    try {
      const res = await downloadDocument(docId);
      if (res.data.success) {
        window.open(res.data.data.url, "_blank");
      }
    } catch {
      message.error("Download failed");
    }
  };

  const handleOpenVersions = async () => {
    setVersionDrawerOpen(true);
    setVersionsLoading(true);
    try {
      const res = await listVersions(docId);
      if (res.data.success) {
        setVersions(res.data.data);
      }
    } catch {} finally {
      setVersionsLoading(false);
    }
  };

  const handleRestoreVersion = async (vid: number) => {
    try {
      await restoreVersion(docId, vid);
      message.success("Version restored");
      fetchDocument();
      handleOpenVersions();
    } catch {
      message.error("Restore failed");
    }
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 100 }}><Spin size="large" /></div>;
  }

  if (!document) {
    return <div style={{ textAlign: "center", padding: 100 }}>Document not found</div>;
  }

  const renderPreview = () => {
    const url = document.original_url;
    switch (document.file_type) {
      case "pdf":
        return <PdfViewer url={url} onPageChange={setCurrentPage} />;
      case "word":
        return <DocxViewer url={url} />;
      case "image":
        return (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Image src={url} style={{ maxWidth: "100%", maxHeight: "70vh" }} />
          </div>
        );
      case "ppt":
        return (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Text type="secondary">PPT preview is not supported. Please download to view.</Text>
            <br /><br />
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              Download File
            </Button>
          </div>
        );
      default:
        return (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Text type="secondary">Preview not available for this file type.</Text>
            <br /><br />
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              Download File
            </Button>
          </div>
        );
    }
  };

  return (
    <div style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/student/knowledge-library")} />
            <Title level={5} style={{ margin: 0 }}>{document.title}</Title>
            <Tag>{document.file_type.toUpperCase()}</Tag>
            {document.Category && <Tag color="blue">{document.Category.name}</Tag>}
          </Space>
          <Space>
            {viewers.length > 0 && (
              <Avatar.Group maxCount={5} size="small">
                {viewers.map((v) => (
                  <Tooltip key={v.userId} title={v.nickname || v.username}>
                    <Avatar size="small" src={v.avatar}>{(v.nickname || v.username)?.[0]}</Avatar>
                  </Tooltip>
                ))}
              </Avatar.Group>
            )}
            <Button icon={<HistoryOutlined />} onClick={handleOpenVersions}>
              v{document.current_version}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              Download
            </Button>
          </Space>
        </div>
      </Card>

      {/* Main content: Preview + Annotations */}
      <div style={{ flex: 1, display: "flex", gap: 12, minHeight: 0 }}>
        {/* Preview area */}
        <Card
          size="small"
          style={{ flex: 1, overflow: "auto" }}
          bodyStyle={{ padding: 0 }}
        >
          {renderPreview()}
        </Card>

        {/* Annotation sidebar */}
        <Card
          size="small"
          style={{ width: 320, flexShrink: 0 }}
          bodyStyle={{ padding: 0, height: "100%", display: "flex", flexDirection: "column" }}
        >
          <AnnotationPanel
            annotations={annotations}
            currentUserId={auth.userId ? Number(auth.userId) : undefined}
            isAdmin={auth.role === "admin" || auth.role === "super_admin"}
            onAdd={handleAddAnnotation}
            onResolve={handleResolveAnnotation}
            onDelete={handleDeleteAnnotation}
            currentPage={currentPage}
          />
        </Card>
      </div>

      {/* Version history drawer */}
      <Drawer
        title="Version History"
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
        width={400}
      >
        <Spin spinning={versionsLoading}>
          <List
            dataSource={versions}
            renderItem={(ver) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="restore"
                    title="Restore this version?"
                    onConfirm={() => handleRestoreVersion(ver.id)}
                  >
                    <Button size="small" type="link">Restore</Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar src={ver.Creator?.avatar}>
                      {(ver.Creator?.nickname || ver.Creator?.username)?.[0]}
                    </Avatar>
                  }
                  title={`v${ver.version_number} - ${ver.change_summary || "No description"}`}
                  description={
                    <span>
                      {ver.Creator?.nickname || ver.Creator?.username} |{" "}
                      {new Date(ver.created_at).toLocaleString()}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Spin>
      </Drawer>
    </div>
  );
};

export default KnowledgeDocumentView;
