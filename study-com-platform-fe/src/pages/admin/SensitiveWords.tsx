import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  createSensitiveWord,
  deleteSensitiveWord,
  fetchSensitiveWords,
  updateSensitiveWord,
  updateSensitiveWordStatus,
} from "../../services/sensitiveWords";
import PermissionGuard from "../../components/admin/PermissionGuard";

const { Title } = Typography;

type SensitiveWordRow = {
  id: number;
  word: string;
  category?: string;
  level: number;
  status: number;
  createdAt?: string;
  created_at?: string;
};

export default function SensitiveWords() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SensitiveWordRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<SensitiveWordRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async (nextPage = page, nextSize = pageSize) => {
    setLoading(true);
    try {
      const res = await fetchSensitiveWords({
        page: nextPage,
        pageSize: nextSize,
        keyword: keyword || undefined,
      });
      setData(res.data || []);
      setTotal(res.pagination?.total || 0);
      setPage(nextPage);
      setPageSize(nextSize);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, pageSize);
  }, [keyword]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, level: 1 });
    setModalOpen(true);
  };

  const openEdit = (record: SensitiveWordRow) => {
    setEditing(record);
    form.setFieldsValue({
      word: record.word,
      category: record.category,
      level: record.level,
      status: record.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await updateSensitiveWord(editing.id, values);
        message.success("更新成功");
      } else {
        await createSensitiveWord(values);
        message.success("新增成功");
      }
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  const handleDelete = async (record: SensitiveWordRow) => {
    Modal.confirm({
      title: "确认删除该词条？",
      content: "删除后不可恢复",
      okText: "删除",
      cancelText: "取消",
      async onOk() {
        try {
          await deleteSensitiveWord(record.id);
          message.success("删除成功");
          loadData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const handleToggleStatus = async (record: SensitiveWordRow) => {
    try {
      const nextStatus = record.status ? 0 : 1;
      await updateSensitiveWordStatus(record.id, nextStatus);
      message.success("状态已更新");
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    }
  };

  return (
    <PermissionGuard required="community.sensitiveword.manage">
      <div className="page-container">
        <Title level={3}>敏感词库</Title>
        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="搜索敏感词"
              allowClear
              onSearch={(value) => setKeyword(value.trim())}
            />
            <Button type="primary" onClick={openCreate}>
              新增
            </Button>
          </Space>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={data}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (nextPage, nextSize) => loadData(nextPage, nextSize),
            }}
            columns={[
              { title: "词条", dataIndex: "word" },
              { title: "分类", dataIndex: "category" },
              {
                title: "等级",
                dataIndex: "level",
                render: (value) => {
                  const map = {
                    1: "拦截",
                    2: "提示",
                    3: "复审",
                  } as const;
                  return <Tag>{map[value as 1 | 2 | 3]}</Tag>;
                },
              },
              {
                title: "状态",
                dataIndex: "status",
                render: (_, record) => (
                  <Switch
                    checked={record.status === 1}
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                    onChange={() => handleToggleStatus(record)}
                  />
                ),
              },
              {
                title: "操作",
                render: (_, record) => (
                  <Space>
                    <Button size="small" onClick={() => openEdit(record)}>
                      编辑
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => handleDelete(record)}
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Modal
          title={editing ? "编辑敏感词" : "新增敏感词"}
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          onOk={handleSubmit}
          okText={editing ? "保存" : "创建"}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="word"
              label="词条"
              rules={[{ required: true, message: "请输入敏感词" }]}
            >
              <Input placeholder="请输入敏感词" />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Input placeholder="如：政治、暴力、色情" />
            </Form.Item>
            <Form.Item name="level" label="等级">
              <Select
                options={[
                  { label: "拦截", value: 1 },
                  { label: "提示", value: 2 },
                  { label: "复审", value: 3 },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select
                options={[
                  { label: "启用", value: 1 },
                  { label: "禁用", value: 0 },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
