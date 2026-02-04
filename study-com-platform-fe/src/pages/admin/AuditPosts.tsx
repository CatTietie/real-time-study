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
import { useCallback, useEffect, useState } from "react";
import {
  fetchCommunityPosts,
  updateCommunityPostStatus,
} from "../../services/community";
import PermissionGuard from "../../components/admin/PermissionGuard";

const { Title, Text } = Typography;

type PostRow = {
  id: number;
  title: string;
  status: number;
  audit_reason?: string;
  createdAt?: string;
  created_at?: string;
  User?: { nickname?: string; username?: string };
};

export default function AuditPosts() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PostRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<number | "all">(0);
  const [rejecting, setRejecting] = useState<PostRow | null>(null);
  const [rejectForm] = Form.useForm();

  const loadData = useCallback(
    async (nextPage = page, nextSize = pageSize) => {
      setLoading(true);
      try {
        const res = await fetchCommunityPosts({
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
    },
    [page, pageSize, statusFilter],
  );

  useEffect(() => {
    loadData(1, pageSize);
  }, [loadData, pageSize]);

  const handleApprove = async (record: PostRow) => {
    try {
      await updateCommunityPostStatus(record.id, { status: 1 });
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
      await updateCommunityPostStatus(rejecting.id, {
        status: 2,
        reason: values.reason,
      });
      message.success("已驳回");
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
    <PermissionGuard required="community.post.review">
      <div className="page-container">
        <Title level={3}>帖子审核</Title>
        <Card>
          <Space style={{ marginBottom: 16 }} wrap>
            <Text>筛选状态：</Text>
            <Select
              value={statusFilter}
              style={{ width: 160 }}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { label: "待审核", value: 0 },
                { label: "已通过", value: 1 },
                { label: "已驳回", value: 2 },
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
              { title: "帖子ID", dataIndex: "id", width: 90 },
              { title: "帖子标题", dataIndex: "title" },
              {
                title: "帖子作者",
                render: (_, record) =>
                  record.User?.nickname || record.User?.username || "-",
              },
              {
                title: "审核状态",
                dataIndex: "status",
                render: (value) => {
                  const map = {
                    0: { text: "待审核", color: "orange" },
                    1: { text: "通过", color: "green" },
                    2: { text: "驳回", color: "red" },
                  } as const;
                  const item = map[value as 0 | 1 | 2];
                  return <Tag color={item.color}>{item.text}</Tag>;
                },
              },
              {
                title: "驳回原因",
                dataIndex: "audit_reason",
                render: (value) => value || "-",
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
                      disabled={record.status === 2}
                      onClick={() => {
                        setRejecting(record);
                        rejectForm.setFieldsValue({
                          reason: record.audit_reason,
                        });
                      }}
                    >
                      驳回
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Modal
          title="驳回原因"
          open={Boolean(rejecting)}
          onCancel={() => {
            setRejecting(null);
            rejectForm.resetFields();
          }}
          onOk={handleReject}
          okText="确认驳回"
        >
          <Form form={rejectForm} layout="vertical">
            <Form.Item
              name="reason"
              label="原因"
              rules={[{ required: true, message: "请输入驳回原因" }]}
            >
              <Input.TextArea rows={4} placeholder="请输入驳回原因" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
