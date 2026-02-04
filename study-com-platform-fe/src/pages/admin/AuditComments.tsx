import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  fetchCommunityComments,
  updateCommunityCommentStatus,
} from "../../services/community";
import PermissionGuard from "../../components/admin/PermissionGuard";

const { Title, Text } = Typography;

type CommentRow = {
  id: number;
  content: string;
  status: number;
  createdAt?: string;
  created_at?: string;
  User?: { nickname?: string; username?: string };
  Post?: { title?: string };
};

export default function AuditComments() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CommentRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<number | "all">(0);
  const [rejecting, setRejecting] = useState<CommentRow | null>(null);
  const [rejectForm] = Form.useForm();

  const loadData = async (nextPage = page, nextSize = pageSize) => {
    setLoading(true);
    try {
      const res = await fetchCommunityComments({
        page: nextPage,
        pageSize: nextSize,
        status: statusFilter === "all" ? undefined : statusFilter,
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
  }, [statusFilter]);

  const handleApprove = async (record: CommentRow) => {
    try {
      await updateCommunityCommentStatus(record.id, { status: 1 });
      message.success("已通过审核");
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    try {
      const values = await rejectForm.validateFields();
      await updateCommunityCommentStatus(rejecting.id, {
        status: 0,
        reason: values.reason,
      });
      message.success("已隐藏");
      setRejecting(null);
      rejectForm.resetFields();
      loadData();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  return (
    <PermissionGuard required="community.comment.review">
      <div className="page-container">
        <Title level={3}>评论审核</Title>
        <Card>
          <Space style={{ marginBottom: 16 }} wrap>
            <Text>筛选状态：</Text>
            <Select
              value={statusFilter}
              style={{ width: 160 }}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { label: "待处理", value: 0 },
                { label: "显示", value: 1 },
                { label: "全部", value: "all" },
              ]}
            />
            <Button onClick={() => loadData(1, pageSize)}>刷新</Button>
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
              { title: "评论ID", dataIndex: "id", width: 90 },
              { title: "评论内容", dataIndex: "content" },
              {
                title: "评论作者",
                render: (_, record) =>
                  record.User?.nickname || record.User?.username || "-",
              },
              {
                title: "所属帖子",
                render: (_, record) => record.Post?.title || "-",
              },
              {
                title: "审核状态",
                dataIndex: "status",
                render: (value) => (
                  <Tag color={value ? "green" : "orange"}>
                    {value ? "显示" : "待处理"}
                  </Tag>
                ),
              },
              {
                title: "发布时间",
                render: (_, record) =>
                  record.createdAt || record.created_at
                    ? new Date(
                        (record.createdAt || record.created_at) as string,
                      ).toLocaleString()
                    : "-",
              },
              {
                title: "操作",
                render: (_, record) => (
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      disabled={record.status === 1}
                      onClick={() => handleApprove(record)}
                    >
                      通过
                    </Button>
                    <Button
                      size="small"
                      danger
                      disabled={record.status === 0}
                      onClick={() => setRejecting(record)}
                    >
                      隐藏
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Modal
          title="隐藏原因"
          open={Boolean(rejecting)}
          onCancel={() => {
            setRejecting(null);
            rejectForm.resetFields();
          }}
          onOk={handleReject}
          okText="确认隐藏"
        >
          <Form form={rejectForm} layout="vertical">
            <Form.Item
              name="reason"
              label="原因"
              rules={[{ required: true, message: "请输入隐藏原因" }]}
            >
              <Input.TextArea rows={4} placeholder="请输入原因" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
