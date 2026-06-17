import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Statistic,
  Row,
  Col,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import CommunityFooter from "../../components/community/CommunityFooter";
import { fetchExerciseHistory } from "../../services/questionBankPublic";
import type { ExerciseHistoryItem } from "../../services/questionBankPublic";

const { Title, Text } = Typography;

const modeLabels: Record<string, string> = {
  sequential: "顺序练习",
  random: "随机练习",
  simulation: "模拟考试",
  intelligent: "智能组卷",
};

const modeColors: Record<string, string> = {
  sequential: "blue",
  random: "purple",
  simulation: "red",
  intelligent: "geekblue",
};

const statusLabels: Record<number, string> = {
  0: "进行中",
  1: "已完成",
  2: "已放弃",
  3: "待批改",
};

const statusColors: Record<number, string> = {
  0: "processing",
  1: "success",
  2: "default",
  3: "warning",
};

export default function ExerciseHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ExerciseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, total: 0 });

  useEffect(() => {
    loadHistory();
  }, [pagination.page]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetchExerciseHistory({ page: pagination.page, pageSize: pagination.pageSize });
      if (res.success) {
        setItems(res.data.items);
        setPagination((prev) => ({ ...prev, total: res.data.pagination.total }));
      }
    } catch {
      message.error("获取练习历史失败");
    } finally {
      setLoading(false);
    }
  };

  const completedItems = items.filter((i) => i.status === 1);
  const avgAccuracy = completedItems.length > 0
    ? Math.round(
        completedItems.reduce((sum, i) => sum + (i.totalScore > 0 ? (i.score / i.totalScore) * 100 : 0), 0) / completedItems.length
      )
    : 0;
  const pendingReviewTotal = items.reduce((sum, i) => sum + i.pendingReviewCount, 0);

  const columns = [
    {
      title: "题库",
      dataIndex: "bankName",
      ellipsis: true,
      width: 180,
    },
    {
      title: "模式",
      dataIndex: "mode",
      width: 110,
      render: (mode: string) => (
        <Tag color={modeColors[mode] || "default"}>{modeLabels[mode] || mode}</Tag>
      ),
    },
    {
      title: "得分",
      width: 100,
      render: (_: any, record: ExerciseHistoryItem) => (
        <Text strong>{record.score} / {record.totalScore}</Text>
      ),
    },
    {
      title: "正确率",
      width: 90,
      render: (_: any, record: ExerciseHistoryItem) => {
        const rate = record.totalScore > 0 ? Math.round((record.score / record.totalScore) * 100) : 0;
        return <Text style={{ color: rate >= 60 ? "#52c41a" : "#f5222d" }}>{rate}%</Text>;
      },
    },
    {
      title: "状态",
      width: 110,
      render: (_: any, record: ExerciseHistoryItem) => (
        <Space direction="vertical" size={0}>
          <Tag color={statusColors[record.status] || "default"}>
            {statusLabels[record.status] || "未知"}
          </Tag>
          {record.pendingReviewCount > 0 && (
            <Text type="warning" style={{ fontSize: 12 }}>
              {record.pendingReviewCount}题待批改
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "提交时间",
      dataIndex: "submitTime",
      width: 170,
      render: (text: string) => text ? new Date(text).toLocaleString() : "-",
    },
    {
      title: "操作",
      width: 100,
      render: (_: any, record: ExerciseHistoryItem) => (
        <Button
          type="link"
          onClick={() => navigate(`/community/question-bank/${record.bankId}/result/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px 0",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/community/question-bank")}
            style={{ color: "#fff" }}
          >
            返回题库
          </Button>
          <Title level={3} style={{ color: "#fff", margin: "8px 0 0" }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            练习记录
          </Title>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="总练习次数"
                value={pagination.total}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均正确率"
                value={avgAccuracy}
                suffix="%"
                valueStyle={{ color: avgAccuracy >= 60 ? "#52c41a" : "#f5222d" }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="待批改题目"
                value={pendingReviewTotal}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: pendingReviewTotal > 0 ? "#faad14" : "#52c41a" }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={loading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (p) => setPagination((prev) => ({ ...prev, page: p })),
            }}
          />
        </Card>

        <CommunityFooter />
      </div>
    </div>
  );
}
