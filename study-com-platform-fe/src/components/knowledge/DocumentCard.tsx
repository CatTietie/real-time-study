import React from "react";
import { Card, Tag, Typography, Avatar, Tooltip } from "antd";
import {
  FilePdfOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileOutlined,
  EyeOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { KnowledgeDocument } from "../../types/knowledge-library";

const { Text, Paragraph } = Typography;

const fileTypeIcons: Record<string, React.ReactNode> = {
  pdf: <FilePdfOutlined style={{ fontSize: 32, color: "#ff4d4f" }} />,
  word: <FileWordOutlined style={{ fontSize: 32, color: "#1677ff" }} />,
  ppt: <FilePptOutlined style={{ fontSize: 32, color: "#fa8c16" }} />,
  image: <FileImageOutlined style={{ fontSize: 32, color: "#52c41a" }} />,
  other: <FileOutlined style={{ fontSize: 32, color: "#8c8c8c" }} />,
};

const fileTypeColors: Record<string, string> = {
  pdf: "red",
  word: "blue",
  ppt: "orange",
  image: "green",
  other: "default",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface DocumentCardProps {
  document: KnowledgeDocument;
  onClick?: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick }) => {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ height: "100%" }}
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          {fileTypeIcons[document.file_type] || fileTypeIcons.other}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Paragraph
            ellipsis={{ rows: 1 }}
            style={{ marginBottom: 4, fontWeight: 500 }}
          >
            {document.title}
          </Paragraph>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Tag color={fileTypeColors[document.file_type]}>
              {document.file_type.toUpperCase()}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatFileSize(document.file_size)}
            </Text>
            {document.Category && (
              <Tag>{document.Category.name}</Tag>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {document.Uploader && (
                <Tooltip title={document.Uploader.nickname || document.Uploader.username}>
                  <Avatar size={20} src={document.Uploader.avatar}>
                    {(document.Uploader.nickname || document.Uploader.username)?.[0]}
                  </Avatar>
                </Tooltip>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {document.Uploader?.nickname || document.Uploader?.username}
              </Text>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EyeOutlined /> {document.view_count}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <DownloadOutlined /> {document.download_count}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DocumentCard;
