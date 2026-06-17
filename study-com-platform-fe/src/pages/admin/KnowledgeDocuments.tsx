import React, { useState, useEffect } from "react";
import {
  Card, Table, Button, Space, Tag, Select, Input, Modal,
  message, Popconfirm, TreeSelect, Typography, Avatar, Tooltip,
} from "antd";
import {
  CheckOutlined, CloseOutlined, DeleteOutlined,
  SwapOutlined, SearchOutlined,
} from "@ant-design/icons";
import { adminListDocuments, adminAuditDocument, adminBatchMove, adminBatchDelete, adminGetStats } from "../../services/knowledgeAdmin";
import { adminListCategories } from "../../services/knowledgeAdmin";
import type { KnowledgeDocument, KnowledgeCategory, KnowledgeStats } from "../../types/knowledge-library";

const { Option } = Select;
const { Text } = Typography;

const statusColors: Record<string, string> = {
  pending_review: "orange",
  approved: "green",
  rejected: "red",
  archived: "default",
};

const statusLabels: Record<string, string> = {
  pending_review: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

const KnowledgeDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("pending_review");
  const [keyword, setKeyword] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<number | null>(null);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (keyword) params.keyword = keyword;

      const res = await adminListDocuments(params);
      if (res.data.success) {
        setDocuments(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch {
      message.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await adminListCategories();
      if (res.data.success) setCategories(res.data.data);
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await adminGetStats();
      if (res.data.success) setStats(res.data.data);
    } catch {}
  };

  useEffect(() => { fetchCategories(); fetchStats(); }, []);
  useEffect(() => { fetchDocuments(); }, [page, pageSize, statusFilter]);

  const handleAudit = async (id: number, status: "approved" | "rejected") => {
    try {
      await adminAuditDocument(id, { status });
      message.success(status === "approved" ? "Approved" : "Rejected");
      fetchDocuments();
      fetchStats();
    } catch {
      message.error("Operation failed");
    }
  };

  const handleBatchMove = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await adminBatchMove({ document_ids: selectedRowKeys, category_id: moveTarget });
      message.success("Moved");
      setMoveModalOpen(false);
      setSelectedRowKeys([]);
      fetchDocuments();
    } catch {
      message.error("Move failed");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await adminBatchDelete({ document_ids: selectedRowKeys });
      message.success("Archived");
      setSelectedRowKeys([]);
      fetchDocuments();
      fetchStats();
    } catch {
      message.error("Delete failed");
    }
  };

  const buildTreeSelectData = (cats: KnowledgeCategory[]): any[] => {
    return cats.map((cat) => ({
      value: cat.id,
      title: cat.name,
      children: cat.children ? buildTreeSelectData(cat.children) : [],
    }));
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (text: string, record: KnowledgeDocument) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag>{record.file_type.toUpperCase()}</Tag>
        </Space>
      ),
    },
    {
      title: "Uploader",
      key: "uploader",
      width: 140,
      render: (_: any, record: KnowledgeDocument) => (
        <Space>
          <Avatar size="small" src={record.Uploader?.avatar}>
            {(record.Uploader?.nickname || record.Uploader?.username)?.[0]}
          </Avatar>
          <Text>{record.Uploader?.nickname || record.Uploader?.username}</Text>
        </Space>
      ),
    },
    {
      title: "Category",
      key: "category",
      width: 120,
      render: (_: any, record: KnowledgeDocument) =>
        record.Category ? <Tag>{record.Category.name}</Tag> : <Tag color="orange">Pending</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: "Upload Time",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      render: (_: any, record: KnowledgeDocument) => (
        <Space>
          {record.status === "pending_review" && (
            <>
              <Tooltip title="Approve">
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleAudit(record.id, "approved")} />
              </Tooltip>
              <Tooltip title="Reject">
                <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleAudit(record.id, "rejected")} />
              </Tooltip>
            </>
          )}
          {record.status !== "pending_review" && (
            <Tag color={statusColors[record.status]}>{statusLabels[record.status]}</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">Total</Text><br /><Text strong style={{ fontSize: 24 }}>{stats.totalDocuments}</Text></Card>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">Pending Review</Text><br /><Text strong style={{ fontSize: 24, color: "#fa8c16" }}>{stats.pendingReview}</Text></Card>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">Approved</Text><br /><Text strong style={{ fontSize: 24, color: "#52c41a" }}>{stats.approved}</Text></Card>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">Categories</Text><br /><Text strong style={{ fontSize: 24 }}>{stats.totalCategories}</Text></Card>
        </div>
      )}

      <Card
        title="Document Management"
        extra={
          <Space>
            <Input.Search
              placeholder="Search..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={fetchDocuments}
              style={{ width: 200 }}
            />
            <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} style={{ width: 130 }}>
              <Option value="">All Status</Option>
              <Option value="pending_review">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="archived">Archived</Option>
            </Select>
          </Space>
        }
      >
        {selectedRowKeys.length > 0 && (
          <Space style={{ marginBottom: 12 }}>
            <Text>Selected {selectedRowKeys.length} items:</Text>
            <Button icon={<SwapOutlined />} onClick={() => setMoveModalOpen(true)}>Move</Button>
            <Popconfirm title="Archive selected?" onConfirm={handleBatchDelete}>
              <Button danger icon={<DeleteOutlined />}>Archive</Button>
            </Popconfirm>
          </Space>
        )}

        <Table
          loading={loading}
          dataSource={documents}
          columns={columns}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as number[]),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps || 20); },
            showTotal: (t) => `Total ${t}`,
          }}
        />
      </Card>

      <Modal
        title="Move Documents"
        open={moveModalOpen}
        onCancel={() => setMoveModalOpen(false)}
        onOk={handleBatchMove}
      >
        <TreeSelect
          style={{ width: "100%" }}
          placeholder="Select target category"
          allowClear
          treeData={buildTreeSelectData(categories)}
          treeDefaultExpandAll
          value={moveTarget}
          onChange={setMoveTarget}
        />
      </Modal>
    </div>
  );
};

export default KnowledgeDocuments;
