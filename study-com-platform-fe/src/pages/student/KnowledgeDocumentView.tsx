import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Button, Spin, Typography, Space, Tag, Avatar, Tooltip,
  Drawer, List, message, Popconfirm, Image, Upload,
} from "antd";
import {
  ArrowLeftOutlined, DownloadOutlined, HistoryOutlined,
  LockOutlined, UploadOutlined, SendOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "../../app/hooks";
import {
  getDocument, downloadDocument, listAnnotations, createAnnotation,
  resolveAnnotation, deleteAnnotation, listVersions, restoreVersion,
  uploadNewVersion, getMyDocumentPermission,
} from "../../services/knowledgeLibrary";
import { useDocumentAnnotations } from "../../hooks/useDocumentAnnotations";
import PdfViewer from "../../components/knowledge/PdfViewer";
import DocxViewer from "../../components/knowledge/DocxViewer";
import PptxViewer from "../../components/knowledge/PptxViewer";
import AnnotationPanel from "../../components/knowledge/AnnotationPanel";
import DocumentPermissionModal from "../../components/knowledge/DocumentPermissionModal";
import type {
  KnowledgeDocument, DocumentAnnotation, DocumentVersion,
  CreateAnnotationPayload, DocumentPermissionLevel,
} from "../../types/knowledge-library";

const { Title, Text } = Typography;

const PERMISSION_RANK: Record<DocumentPermissionLevel, number> = {
  view: 1,
  comment: 2,
  edit: 3,
  manage: 4,
};

const hasPermission = (level: DocumentPermissionLevel | null, min: DocumentPermissionLevel) => {
  if (!level) return false;
  return PERMISSION_RANK[level] >= PERMISSION_RANK[min];
};

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
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [myPermission, setMyPermission] = useState<DocumentPermissionLevel | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(true);

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
    } catch (err: any) {
      if (err?.response?.status === 403) {
        message.error("您没有权限查看此文档");
        navigate("/student/knowledge-library");
        return;
      }
      message.error("加载文档失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPermission = async () => {
    setPermissionLoading(true);
    try {
      const res = await getMyDocumentPermission(docId);
      if (res.data.success) {
        setMyPermission(res.data.data.permission_level);
      }
    } catch {
      setMyPermission(null);
    } finally {
      setPermissionLoading(false);
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
      fetchMyPermission();
      fetchAnnotations();
    }
  }, [docId]);

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
      message.error("添加批注失败");
    }
  };

  const handleResolveAnnotation = async (annotationId: number) => {
    try {
      await resolveAnnotation(docId, annotationId);
      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotationId ? { ...a, status: "resolved" } : a))
      );
    } catch {
      message.error("操作失败");
    }
  };

  const handleDeleteAnnotation = async (annotationId: number) => {
    try {
      await deleteAnnotation(docId, annotationId);
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    } catch {
      message.error("删除失败");
    }
  };

  const handleDownload = async () => {
    try {
      const res = await downloadDocument(docId);
      if (res.data.success) {
        window.open(res.data.data.url, "_blank");
      }
    } catch {
      message.error("下载失败");
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
      message.success("版本已恢复");
      fetchDocument();
      handleOpenVersions();
    } catch {
      message.error("恢复失败");
    }
  };

  const handleUploadNewVersion = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("change_summary", `上传新版本: ${file.name}`);
    try {
      const res = await uploadNewVersion(docId, formData);
      if (res.data.success) {
        message.success("新版本上传成功");
        fetchDocument();
      }
    } catch {
      message.error("上传失败");
    }
  };

  if (loading || permissionLoading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 100 }}><Spin size="large" /></div>;
  }

  if (!document) {
    return <div style={{ textAlign: "center", padding: 100 }}>文档不存在</div>;
  }

  const canComment = hasPermission(myPermission, "comment");
  const canEdit = hasPermission(myPermission, "edit");
  const canManage = hasPermission(myPermission, "manage");

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
        return <PptxViewer url={url} onPageChange={setCurrentPage} />;
      default:
        return (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Text type="secondary">该文件类型暂不支持预览。</Text>
            <br /><br />
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载文件
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
            {canEdit && (
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUploadNewVersion(file);
                  return false;
                }}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
              >
                <Button icon={<UploadOutlined />}>上传新版本</Button>
              </Upload>
            )}
            <Button icon={<HistoryOutlined />} onClick={handleOpenVersions}>
              v{document.current_version}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              下载
            </Button>
            {canManage && (
              <Button icon={<LockOutlined />} onClick={() => setPermissionModalOpen(true)}>
                权限
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Main content: Preview + Annotations */}
      <div style={{ flex: 1, display: "flex", gap: 12, minHeight: 0 }}>
        {/* Preview area */}
        <Card
          size="small"
          style={{ flex: 1, overflow: "auto" }}
          styles={{ body: { padding: 0 } }}
        >
          {renderPreview()}
        </Card>

        {/* Annotation sidebar */}
        <Card
          size="small"
          style={{ width: 320, flexShrink: 0 }}
          styles={{ body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" } }}
        >
          <AnnotationPanel
            annotations={annotations}
            currentUserId={auth.userId ? Number(auth.userId) : undefined}
            isAdmin={auth.role === "admin" || auth.role === "super_admin"}
            canComment={canComment}
            onAdd={handleAddAnnotation}
            onResolve={handleResolveAnnotation}
            onDelete={handleDeleteAnnotation}
            currentPage={currentPage}
          />
        </Card>
      </div>

      {/* Version history drawer */}
      <Drawer
        title="版本历史"
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
        width={400}
      >
        <Spin spinning={versionsLoading}>
          <List
            dataSource={versions}
            renderItem={(ver) => (
              <List.Item
                actions={
                  canEdit
                    ? [
                        <Popconfirm
                          key="restore"
                          title="确定恢复到此版本？"
                          onConfirm={() => handleRestoreVersion(ver.id)}
                        >
                          <Button size="small" type="link">恢复</Button>
                        </Popconfirm>,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar src={ver.Creator?.avatar}>
                      {(ver.Creator?.nickname || ver.Creator?.username)?.[0]}
                    </Avatar>
                  }
                  title={`v${ver.version_number} - ${ver.change_summary || "无描述"}`}
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

      {/* Permission management modal */}
      <DocumentPermissionModal
        documentId={docId}
        open={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
      />
    </div>
  );
};

export default KnowledgeDocumentView;
