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
  fetchCommunityReports,
  handleCommunityReport,
} from "../../services/community";
import PermissionGuard from "../../components/admin/PermissionGuard";

const { Title, Text } = Typography;

type ReportRow = {
  id: number;
  target_type: "post" | "comment";
  target_id: number;
  reason: string;
  status: number;
  handle_result?: string;
  createdAt?: string;
  created_at?: string;
  User?: { nickname?: string; username?: string };
  handler?: { nickname?: string; username?: string };
  target?: {
    title?: string;
    content?: string;
    status?: number;
  } | null;
};

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<number | "all">(0);
  const [handling, setHandling] = useState<ReportRow | null>(null);
  const [handleForm] = Form.useForm();

  const loadData = async (nextPage = page, nextSize = pageSize) => {
    setLoading(true);
    try {
      const res = await fetchCommunityReports({
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

  const handleSubmit = async () => {
    if (!handling) return;
    try {
      const values = await handleForm.validateFields();
      await handleCommunityReport(handling.id, {
        handleResult: values.handleResult,
        action: values.action,
      });
      message.success("处理完成");
      setHandling(null);
      handleForm.resetFields();
      loadData();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  return (
    <PermissionGuard required="community.report.handle">
      <div className="page-container">
        <Title level={3}>举报处理</Title>
        <Card>
          <Space style={{ marginBottom: 16 }} wrap>
            <Text>筛选状态：</Text>
            <Select
              value={statusFilter}
              style={{ width: 160 }}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { label: "待处理", value: 0 },
                { label: "已处理", value: 1 },
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
              {
                title: "举报对象",
                render: (_, record) => {
                  if (record.target_type === "post") {
                    return `帖子：${record.target?.title || record.target_id}`;
                  }
                  return `评论：${record.target?.content || record.target_id}`;
                },
              },
              {
                title: "举报人",
                render: (_, record) =>
                  record.User?.nickname || record.User?.username || "-",
              },
              { title: "原因", dataIndex: "reason" },
              {
                title: "状态",
                dataIndex: "status",
                render: (value) => (
                  <Tag color={value ? "green" : "orange"}>
                    {value ? "已处理" : "待处理"}
                  </Tag>
                ),
              },
              {
                title: "处理人",
                render: (_, record) =>
                  record.handler?.nickname || record.handler?.username || "-",
              },
              {
                title: "创建时间",
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
                      onClick={() => {
                        setHandling(record);
                        handleForm.setFieldsValue({
                          handleResult: record.handle_result,
                          action:
                            record.target_type === "post"
                              ? record.target?.status === 2
                                ? "reject"
                                : "approve"
                              : undefined,
                        });
                      }}
                    >
                      处理
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Modal
          title="处理举报"
          open={Boolean(handling)}
          onCancel={() => {
            setHandling(null);
            handleForm.resetFields();
          }}
          onOk={handleSubmit}
          okText="确认处理"
        >
          <Form form={handleForm} layout="vertical">
            {handling?.target_type === "post" ? (
              <Form.Item
                name="action"
                label="处理方式"
                rules={[{ required: true, message: "请选择处理方式" }]}
              >
                <Select
                  options={[
                    { label: "通过", value: "approve" },
                    { label: "驳回", value: "reject" },
                  ]}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              name="handleResult"
              label="处理结论"
              rules={[{ required: true, message: "请输入处理结论" }]}
            >
              <Input.TextArea rows={4} placeholder="请输入处理结论" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
