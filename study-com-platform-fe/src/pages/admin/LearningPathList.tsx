import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Space, Input, Select, Tag, Modal, Form, message, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import { getAdminPaths, createPath, deletePath, updatePathStatus } from "../../services/learningPath";

const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: "草稿", color: "default" },
  1: { label: "已发布", color: "green" },
  2: { label: "已归档", color: "orange" },
};

export default function LearningPathList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminPaths({ page, pageSize: pagination.pageSize, keyword, status: statusFilter });
      if (res.success) {
        setData(res.data);
        setPagination(res.pagination);
      }
    } catch {
      message.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const res = await createPath(values);
      if (res.success) {
        message.success("创建成功");
        setModalOpen(false);
        form.resetFields();
        loadData();
      }
    } catch {
      // validation failed
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deletePath(id);
      if (res.success) {
        message.success("删除成功");
        loadData(pagination.page);
      }
    } catch {
      message.error("删除失败");
    }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await updatePathStatus(id, status);
      if (res.success) {
        message.success("状态更新成功");
        loadData(pagination.page);
      }
    } catch {
      message.error("操作失败");
    }
  };

  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (s: number) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label}</Tag>,
    },
    { title: "节点数", dataIndex: "node_count", key: "node_count", width: 80 },
    {
      title: "创建人",
      dataIndex: "Creator",
      key: "creator",
      render: (c: any) => c?.nickname || c?.username || "-",
    },
    { title: "创建时间", dataIndex: "created_at", key: "created_at", width: 180 },
    {
      title: "操作",
      key: "actions",
      width: 280,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/admin/learning-paths/${record.id}/editor`)}>
            编辑
          </Button>
          {record.status === 0 && (
            <Button type="link" onClick={() => handleStatusChange(record.id, 1)}>发布</Button>
          )}
          {record.status === 1 && (
            <Button type="link" onClick={() => handleStatusChange(record.id, 2)}>归档</Button>
          )}
          {record.status === 2 && (
            <Button type="link" onClick={() => handleStatusChange(record.id, 1)}>重新发布</Button>
          )}
          <Popconfirm title="确定删除此路径？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Space>
          <Input
            placeholder="搜索路径名称"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => loadData(1)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={statusFilter || undefined}
            onChange={(v) => { setStatusFilter(v || ""); }}
            options={[
              { label: "草稿", value: "0" },
              { label: "已发布", value: "1" },
              { label: "已归档", value: "2" },
            ]}
          />
          <Button onClick={() => loadData(1)}>搜索</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建路径
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page) => loadData(page),
        }}
      />

      <Modal
        title="新建学习路径"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="路径名称" rules={[{ required: true, message: "请输入路径名称" }]}>
            <Input placeholder="如：Python 入门之路" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="简要描述该学习路径" />
          </Form.Item>
          <Form.Item name="cover_image" label="封面图片 URL">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
