import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  InputNumber,
  Input,
  message,
  Typography,
  Tooltip,
  Statistic,
  Row,
  Col,
  Progress,
} from "antd";
import { CheckOutlined, EditOutlined, FastForwardOutlined } from "@ant-design/icons";
import {
  fetchExerciseReviews,
  fetchExerciseReviewStats,
  gradeExerciseAnswer,
  batchGradeExerciseAnswers,
  fetchBanks,
} from "../../services/questionBank";
import type { ReviewItem, ReviewStatsData } from "../../services/questionBank";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const COMMENT_TEMPLATES = [
  "回答正确，表述清晰。",
  "基本正确，但缺少关键点。",
  "答案不够完整，建议补充。",
  "答案偏题，请重新审视题目要求。",
  "逻辑清晰，论述有条理。",
  "有一定理解，但核心概念把握不准。",
  "未作答或答案无效。",
];

export default function ExerciseReview() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState<ReviewStatsData>({ pendingCount: 0, reviewedTodayCount: 0 });
  const [banks, setBanks] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState<{ bankId?: number; status: number }>({ status: 1 });
  const [selectedRows, setSelectedRows] = useState<ReviewItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<ReviewItem | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeComment, setGradeComment] = useState("");
  const [grading, setGrading] = useState(false);

  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchScore, setBatchScore] = useState<number>(0);
  const [batchComment, setBatchComment] = useState("");

  useEffect(() => {
    loadBanks();
    loadStats();
  }, []);

  useEffect(() => {
    loadData();
  }, [pagination.page, filters]);

  const loadBanks = async () => {
    try {
      const res = await fetchBanks();
      if (res.success) {
        setBanks(res.data.map((b: any) => ({ id: b.id, name: b.name })));
      }
    } catch {}
  };

  const loadStats = async () => {
    try {
      const res = await fetchExerciseReviewStats();
      if (res.success) setStats(res.data);
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchExerciseReviews({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...filters,
      });
      if (res.success) {
        setData(res.data.items);
        setPagination((prev) => ({ ...prev, total: res.data.pagination.total }));
      }
    } catch {
      message.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const openGradeModal = (record: ReviewItem) => {
    setGradeTarget(record);
    setGradeScore(record.reviewScore ?? 0);
    setGradeComment(record.reviewComment ?? "");
    setGradeModalVisible(true);
  };

  const handleGrade = async () => {
    if (!gradeTarget) return;
    setGrading(true);
    try {
      const res = await gradeExerciseAnswer(gradeTarget.detailId, {
        score: gradeScore,
        comment: gradeComment || undefined,
      });
      if (res.success) {
        message.success("批改成功");
        setGradeModalVisible(false);
        loadData();
        loadStats();
      } else {
        message.error(res.message || "批改失败");
      }
    } catch {
      message.error("批改失败");
    } finally {
      setGrading(false);
    }
  };

  const handleGradeAndNext = async () => {
    if (!gradeTarget) return;
    setGrading(true);
    try {
      const res = await gradeExerciseAnswer(gradeTarget.detailId, {
        score: gradeScore,
        comment: gradeComment || undefined,
      });
      if (res.success) {
        message.success("批改成功");
        const currentIndex = data.findIndex((d) => d.detailId === gradeTarget.detailId);
        const nextItem = data.find(
          (d, i) => i > currentIndex && d.reviewStatus === 1 && d.detailId !== gradeTarget.detailId
        );
        if (nextItem) {
          setGradeTarget(nextItem);
          setGradeScore(0);
          setGradeComment("");
        } else {
          setGradeModalVisible(false);
          message.info("当前页已全部批改完成");
        }
        loadData();
        loadStats();
      } else {
        message.error(res.message || "批改失败");
      }
    } catch {
      message.error("批改失败");
    } finally {
      setGrading(false);
    }
  };

  const handleBatchGrade = async () => {
    if (selectedRows.length === 0) return;
    setGrading(true);
    try {
      const items = selectedRows.map((row) => ({
        detailId: row.detailId,
        score: Math.min(batchScore, row.maxScore),
        comment: batchComment || undefined,
      }));
      const res = await batchGradeExerciseAnswers(items);
      if (res.success) {
        message.success(res.message || "批量批改成功");
        setBatchModalVisible(false);
        setSelectedRows([]);
        setSelectedRowKeys([]);
        loadData();
        loadStats();
      } else {
        message.error(res.message || "批量批改失败");
      }
    } catch {
      message.error("批量批改失败");
    } finally {
      setGrading(false);
    }
  };

  const totalForProgress = stats.pendingCount + stats.reviewedTodayCount;
  const progressPercent = totalForProgress > 0 ? Math.round((stats.reviewedTodayCount / totalForProgress) * 100) : 0;

  const columns = [
    {
      title: "学生",
      dataIndex: "studentName",
      width: 100,
    },
    {
      title: "题目内容",
      dataIndex: "questionContent",
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 180 }}>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: "学生答案",
      dataIndex: "userAnswer",
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 180 }}>{text || "（未作答）"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "参考答案",
      dataIndex: "referenceAnswer",
      ellipsis: true,
      width: 180,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 160 }}>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: "分值",
      dataIndex: "maxScore",
      width: 70,
      align: "center" as const,
    },
    {
      title: "题库",
      dataIndex: "bankName",
      width: 120,
      ellipsis: true,
    },
    {
      title: "提交时间",
      dataIndex: "submittedAt",
      width: 160,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: "状态",
      dataIndex: "reviewStatus",
      width: 90,
      render: (status: number, record: ReviewItem) =>
        status === 2 ? (
          <Tag color="success">已批改 {record.reviewScore}分</Tag>
        ) : (
          <Tag color="warning">待批改</Tag>
        ),
    },
    {
      title: "操作",
      width: 100,
      render: (_: any, record: ReviewItem) => (
        <Button
          type="link"
          icon={record.reviewStatus === 2 ? <EditOutlined /> : <CheckOutlined />}
          onClick={() => openGradeModal(record)}
        >
          {record.reviewStatus === 2 ? "修改" : "批改"}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="待批改" value={stats.pendingCount} valueStyle={{ color: "#faad14" }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="今日已批改" value={stats.reviewedTodayCount} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">批改进度</Text>
            </div>
            <Progress
              percent={progressPercent}
              status="active"
              format={() => `${stats.reviewedTodayCount} / ${totalForProgress}`}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="主观题批改"
        extra={
          <Space>
            <Select
              placeholder="筛选题库"
              allowClear
              style={{ width: 160 }}
              onChange={(v) => {
                setFilters((f) => ({ ...f, bankId: v }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={banks.map((b) => ({ label: b.name, value: b.id }))}
            />
            <Select
              value={filters.status}
              style={{ width: 120 }}
              onChange={(v) => {
                setFilters((f) => ({ ...f, status: v }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              options={[
                { label: "待批改", value: 1 },
                { label: "已批改", value: 2 },
              ]}
            />
            {selectedRows.length > 0 && filters.status === 1 && (
              <Button type="primary" onClick={() => setBatchModalVisible(true)}>
                批量批改 ({selectedRows.length})
              </Button>
            )}
          </Space>
        }
      >
        <Table
          rowKey="detailId"
          columns={columns}
          dataSource={data}
          loading={loading}
          rowSelection={
            filters.status === 1
              ? {
                  selectedRowKeys,
                  onChange: (keys, rows) => {
                    setSelectedRowKeys(keys as number[]);
                    setSelectedRows(rows);
                  },
                }
              : undefined
          }
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (p) => setPagination((prev) => ({ ...prev, page: p })),
          }}
          expandable={{
            expandedRowRender: (record: ReviewItem) => (
              <div style={{ padding: "8px 0" }}>
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text strong>完整题目：</Text>{record.questionContent}
                </Paragraph>
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text strong>学生答案：</Text>{record.userAnswer || "（未作答）"}
                </Paragraph>
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text strong>参考答案：</Text>{record.referenceAnswer}
                </Paragraph>
                {record.analysis && (
                  <Paragraph style={{ marginBottom: 0 }}>
                    <Text strong>解析：</Text>{record.analysis}
                  </Paragraph>
                )}
                {record.reviewComment && (
                  <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                    <Text strong>教师评语：</Text>{record.reviewComment}
                  </Paragraph>
                )}
              </div>
            ),
          }}
        />
      </Card>

      {/* 单条批改 Modal */}
      <Modal
        title="批改主观题"
        open={gradeModalVisible}
        onCancel={() => setGradeModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setGradeModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="next"
            icon={<FastForwardOutlined />}
            onClick={handleGradeAndNext}
            loading={grading}
          >
            批改并下一题
          </Button>,
          <Button key="submit" type="primary" onClick={handleGrade} loading={grading}>
            确认批改
          </Button>,
        ]}
      >
        {gradeTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Text type="secondary">题目：</Text>
              <Paragraph style={{ marginTop: 4 }}>{gradeTarget.questionContent}</Paragraph>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Card
                  size="small"
                  title={<Text type="secondary">学生答案</Text>}
                  style={{ background: "#fafafa" }}
                >
                  <Paragraph style={{ marginBottom: 0, minHeight: 60, whiteSpace: "pre-wrap" }}>
                    {gradeTarget.userAnswer || "（未作答）"}
                  </Paragraph>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  title={<Text type="secondary">参考答案</Text>}
                  style={{ background: "#f6ffed" }}
                >
                  <Paragraph style={{ marginBottom: 0, minHeight: 60, whiteSpace: "pre-wrap" }}>
                    {gradeTarget.referenceAnswer}
                  </Paragraph>
                </Card>
              </Col>
            </Row>

            {gradeTarget.analysis && (
              <div>
                <Text type="secondary">解析：</Text>
                <Paragraph style={{ marginTop: 4, color: "#666" }}>{gradeTarget.analysis}</Paragraph>
              </div>
            )}

            <div>
              <Text strong>评分（0 ~ {gradeTarget.maxScore} 分）：</Text>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <Space>
                  <Button size="small" onClick={() => setGradeScore(gradeTarget.maxScore)}>
                    满分
                  </Button>
                  <Button size="small" onClick={() => setGradeScore(Math.round(gradeTarget.maxScore / 2))}>
                    半分
                  </Button>
                  <Button size="small" onClick={() => setGradeScore(0)}>
                    0分
                  </Button>
                </Space>
                <InputNumber
                  min={0}
                  max={gradeTarget.maxScore}
                  value={gradeScore}
                  onChange={(v) => setGradeScore(v ?? 0)}
                  style={{ width: 100 }}
                />
                <Text type="secondary">/ {gradeTarget.maxScore} 分</Text>
              </div>
            </div>

            <div>
              <Text strong>评语（选填）：</Text>
              <Select
                placeholder="选择常用评语"
                allowClear
                style={{ width: "100%", marginTop: 8, marginBottom: 8 }}
                onChange={(v) => { if (v) setGradeComment(v); }}
                options={COMMENT_TEMPLATES.map((t) => ({ label: t, value: t }))}
              />
              <TextArea
                rows={3}
                value={gradeComment}
                onChange={(e) => setGradeComment(e.target.value)}
                placeholder="请输入评语..."
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 批量批改 Modal */}
      <Modal
        title={`批量批改 (${selectedRows.length} 条)`}
        open={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        onOk={handleBatchGrade}
        confirmLoading={grading}
        okText="确认批量批改"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Text type="secondary">
            将为选中的 {selectedRows.length} 条答案统一评分。若分数超过某题目的最大分值，将自动取其最大值。
          </Text>
          <div>
            <Text strong>统一评分：</Text>
            <InputNumber
              min={0}
              value={batchScore}
              onChange={(v) => setBatchScore(v ?? 0)}
              style={{ width: 120, marginLeft: 8 }}
            />
          </div>
          <div>
            <Text strong>统一评语（选填）：</Text>
            <Select
              placeholder="选择常用评语"
              allowClear
              style={{ width: "100%", marginTop: 8, marginBottom: 8 }}
              onChange={(v) => { if (v) setBatchComment(v); }}
              options={COMMENT_TEMPLATES.map((t) => ({ label: t, value: t }))}
            />
            <TextArea
              rows={3}
              value={batchComment}
              onChange={(e) => setBatchComment(e.target.value)}
              placeholder="请输入统一评语..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
