import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import {
  fetchCommunityPosts,
  updateCommunityPostStatus,
  batchAuditPosts,
  fetchAuditStats,
} from "../../services/community";
import PermissionGuard from "../../components/admin/PermissionGuard";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

type PostRow = {
  id: number;
  title: string;
  content: string;
  category: string;
  status: number;
  audit_reason?: string;
  audit_at?: string;
  created_at?: string;
  createdAt?: string;
  User?: { id?: number; nickname?: string; username?: string };
};

type AuditStats = {
  totalPending: number;
  totalAudited: number;
  todayAudited: number;
  passRate: number;
  avgAuditDurationMinutes: number;
  todayStats: { approved: number; rejected: number; pending: number };
};

const PRESET_REASONS = [
  "违反社区规范",
  "包含敏感内容",
  "广告/垃圾内容",
  "内容不实",
  "与分类不符",
  "其他",
];

const CATEGORY_OPTIONS = [
  { label: "全部分类", value: "" },
  { label: "学习心得", value: "学习心得" },
  { label: "问题求助", value: "问题求助" },
  { label: "经验分享", value: "经验分享" },
  { label: "聊天交友", value: "聊天交友" },
];

export default function ContentAudit() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PostRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<number | "all">(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 统计
  const [stats, setStats] = useState<AuditStats | null>(null);

  // 预览弹窗
  const [previewPost, setPreviewPost] = useState<PostRow | null>(null);

  // 驳回弹窗
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<"single" | "batch">("single");
  const [rejectSingleId, setRejectSingleId] = useState<number | null>(null);
  const [rejectForm] = Form.useForm();

  // 敏感词列表（用于高亮）
  const [sensitiveWords, setSensitiveWords] = useState<string[]>([]);

  const loadData = useCallback(
    async (nextPage = page, nextSize = pageSize) => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          page: nextPage,
          pageSize: nextSize,
        };
        if (statusFilter !== "all") params.status = statusFilter;
        if (categoryFilter) params.category = categoryFilter;
        if (keyword) params.keyword = keyword;
        if (dateRange) {
          params.startDate = dateRange[0];
          params.endDate = dateRange[1];
        }

        const res = await fetchCommunityPosts(params);
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
    [page, pageSize, statusFilter, categoryFilter, keyword, dateRange],
  );

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchAuditStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch {
      // 静默处理
    }
  }, []);

  const loadSensitiveWords = useCallback(async () => {
    try {
      const { default: api } = await import("../../services/api");
      const res = await api.get("/admin/sensitive-words", {
        params: { page: 1, pageSize: 500 },
      });
      const words = (res.data?.data || [])
        .filter((w: any) => w.status === 1)
        .map((w: any) => w.word);
      setSensitiveWords(words);
    } catch {
      // 静默处理
    }
  }, []);

  useEffect(() => {
    loadData(1, pageSize);
  }, [statusFilter, categoryFilter, keyword, dateRange]);

  useEffect(() => {
    loadStats();
    loadSensitiveWords();
  }, []);

  const highlightSensitiveWords = (text: string) => {
    if (!text || sensitiveWords.length === 0) return text;
    let result = text;
    for (const word of sensitiveWords) {
      const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      result = result.replace(regex, `<mark style="background:#fff3cd;padding:0 2px;border-radius:2px">$1</mark>`);
    }
    return result;
  };

  const handleApprove = async (id: number) => {
    try {
      await updateCommunityPostStatus(id, { status: 1 });
      message.success("已通过审核");
      loadData();
      loadStats();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const openRejectModal = (target: "single" | "batch", singleId?: number) => {
    setRejectTarget(target);
    setRejectSingleId(singleId || null);
    rejectForm.resetFields();
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    try {
      const values = await rejectForm.validateFields();
      const reason =
        values.presetReason === "其他"
          ? values.customReason
          : values.presetReason;

      if (rejectTarget === "single" && rejectSingleId) {
        await updateCommunityPostStatus(rejectSingleId, { status: 2, reason });
        message.success("已驳回");
      } else if (rejectTarget === "batch") {
        const res = await batchAuditPosts({
          ids: selectedRowKeys,
          status: 2,
          reason,
        });
        message.success(res.message || "批量驳回完成");
        setSelectedRowKeys([]);
      }

      setRejectModalOpen(false);
      rejectForm.resetFields();
      loadData();
      loadStats();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  const handleBatchApprove = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请先选择帖子");
      return;
    }
    Modal.confirm({
      title: "确认批量通过",
      content: `确定要通过选中的 ${selectedRowKeys.length} 篇帖子吗？`,
      onOk: async () => {
        try {
          const res = await batchAuditPosts({
            ids: selectedRowKeys,
            status: 1,
          });
          message.success(res.message || "批量通过完成");
          setSelectedRowKeys([]);
          loadData();
          loadStats();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "批量操作失败");
        }
      },
    });
  };

  const handleBatchReject = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请先选择帖子");
      return;
    }
    openRejectModal("batch");
  };

  const columns: ColumnsType<PostRow> = [
    { title: "ID", dataIndex: "id", width: 70 },
    {
      title: "标题",
      dataIndex: "title",
      ellipsis: true,
      render: (text) => (
        <span
          dangerouslySetInnerHTML={{ __html: highlightSensitiveWords(text || "") }}
        />
      ),
    },
    {
      title: "作者",
      width: 120,
      render: (_, record) =>
        record.User?.nickname || record.User?.username || "-",
    },
    {
      title: "分类",
      dataIndex: "category",
      width: 100,
      render: (val) => val ? <Tag>{val}</Tag> : "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (value) => {
        const map: Record<number, { text: string; color: string }> = {
          0: { text: "待审核", color: "orange" },
          1: { text: "通过", color: "green" },
          2: { text: "驳回", color: "red" },
        };
        const item = map[value] || { text: "未知", color: "default" };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: "发布时间",
      width: 160,
      render: (_, record) => {
        const time = record.created_at || record.createdAt;
        return time ? new Date(time).toLocaleString("zh-CN") : "-";
      },
    },
    {
      title: "操作",
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setPreviewPost(record)}
          >
            预览
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={record.status === 1}
            onClick={() => handleApprove(record.id)}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            disabled={record.status === 2}
            onClick={() => openRejectModal("single", record.id)}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  const presetReasonValue = Form.useWatch("presetReason", rejectForm);

  return (
    <PermissionGuard required="community.post.review">
      <div className="page-container">
        <Title level={3}>内容审核</Title>

        {/* 统计卡片 */}
        {stats && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="待审核"
                  value={stats.totalPending}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: "#fa8c16" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日已审"
                  value={stats.todayAudited}
                  prefix={<BarChartOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="通过率"
                  value={stats.passRate}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="平均审核时长"
                  value={stats.avgAuditDurationMinutes}
                  suffix="分钟"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: "#722ed1" }}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Card>
          {/* 筛选栏 */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              value={statusFilter}
              style={{ width: 120 }}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: "待审核", value: 0 },
                { label: "已通过", value: 1 },
                { label: "已驳回", value: 2 },
                { label: "全部", value: "all" },
              ]}
            />
            <Select
              value={categoryFilter}
              style={{ width: 120 }}
              onChange={(val) => setCategoryFilter(val)}
              options={CATEGORY_OPTIONS}
            />
            <RangePicker
              onChange={(_, dateStrings) => {
                if (dateStrings[0] && dateStrings[1]) {
                  setDateRange([dateStrings[0], dateStrings[1]]);
                } else {
                  setDateRange(null);
                }
              }}
            />
            <Input.Search
              placeholder="搜索标题/内容"
              allowClear
              style={{ width: 200 }}
              onSearch={(val) => setKeyword(val)}
            />
            <Button onClick={() => { loadData(1, pageSize); loadStats(); }}>
              刷新
            </Button>
          </Space>

          {/* 批量操作栏 */}
          {selectedRowKeys.length > 0 && (
            <Space style={{ marginBottom: 16 }}>
              <Text>
                已选中 <strong>{selectedRowKeys.length}</strong> 项
              </Text>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleBatchApprove}
              >
                批量通过
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleBatchReject}
              >
                批量驳回
              </Button>
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </Space>
          )}

          {/* 表格 */}
          <Table
            rowKey="id"
            loading={loading}
            dataSource={data}
            columns={columns}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as number[]),
            }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (nextPage, nextSize) => loadData(nextPage, nextSize),
            }}
          />
        </Card>

        {/* 预览弹窗 */}
        <Modal
          title="帖子预览"
          open={Boolean(previewPost)}
          onCancel={() => setPreviewPost(null)}
          footer={
            previewPost?.status === 0 ? (
              <Space>
                <Button onClick={() => setPreviewPost(null)}>关闭</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    handleApprove(previewPost.id);
                    setPreviewPost(null);
                  }}
                >
                  通过
                </Button>
                <Button
                  danger
                  onClick={() => {
                    openRejectModal("single", previewPost.id);
                    setPreviewPost(null);
                  }}
                >
                  驳回
                </Button>
              </Space>
            ) : (
              <Button onClick={() => setPreviewPost(null)}>关闭</Button>
            )
          }
          width={720}
        >
          {previewPost && (
            <div>
              <Title level={4}>{previewPost.title}</Title>
              <Space style={{ marginBottom: 12 }}>
                <Tag>{previewPost.category}</Tag>
                <Text type="secondary">
                  作者：{previewPost.User?.nickname || previewPost.User?.username || "-"}
                </Text>
                <Text type="secondary">
                  发布于：{new Date(previewPost.created_at || previewPost.createdAt || "").toLocaleString("zh-CN")}
                </Text>
              </Space>
              {previewPost.audit_reason && (
                <Paragraph type="warning" style={{ marginBottom: 12 }}>
                  审核备注：{previewPost.audit_reason}
                </Paragraph>
              )}
              <div
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 16,
                  maxHeight: 400,
                  overflow: "auto",
                }}
                dangerouslySetInnerHTML={{
                  __html: highlightSensitiveWords(previewPost.content || ""),
                }}
              />
            </div>
          )}
        </Modal>

        {/* 驳回弹窗 */}
        <Modal
          title={rejectTarget === "batch" ? `批量驳回（${selectedRowKeys.length}篇）` : "驳回帖子"}
          open={rejectModalOpen}
          onCancel={() => {
            setRejectModalOpen(false);
            rejectForm.resetFields();
          }}
          onOk={handleRejectSubmit}
          okText="确认驳回"
          okButtonProps={{ danger: true }}
        >
          <Form form={rejectForm} layout="vertical">
            <Form.Item
              name="presetReason"
              label="驳回原因"
              rules={[{ required: true, message: "请选择驳回原因" }]}
            >
              <Select
                placeholder="请选择驳回原因"
                options={PRESET_REASONS.map((r) => ({ label: r, value: r }))}
              />
            </Form.Item>
            {presetReasonValue === "其他" && (
              <Form.Item
                name="customReason"
                label="自定义原因"
                rules={[{ required: true, message: "请输入驳回原因" }]}
              >
                <Input.TextArea rows={3} placeholder="请输入具体驳回原因" />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
