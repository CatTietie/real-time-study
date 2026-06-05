import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Select,
  Space,
  Popconfirm,
  Typography,
  message,
} from "antd";
import { StopOutlined, EditOutlined } from "@ant-design/icons";
import { fetchQuestionFeedbackStats, fetchBanks, updateQuestion } from "../../services/questionBank";

const { Text } = Typography;

const typeLabels: Record<number, string> = {
  1: "单选",
  2: "多选",
  3: "判断",
  4: "填空",
  5: "主观",
};

const typeColors: Record<number, string> = {
  1: "blue",
  2: "purple",
  3: "green",
  4: "orange",
  5: "red",
};

export default function QuestionFeedbackStats() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [bankId, setBankId] = useState<number | undefined>();
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    loadData();
  }, [pagination.page, bankId]);

  const loadBanks = async () => {
    try {
      const res = await fetchBanks();
      if (res.success) {
        setBanks(res.data || []);
      }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchQuestionFeedbackStats({
        page: pagination.page,
        pageSize: pagination.pageSize,
        bankId,
      });
      if (res.success) {
        setData(res.data);
        setPagination((prev) => ({ ...prev, total: res.pagination?.total || 0 }));
      }
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (id: number) => {
    try {
      const res = await updateQuestion(id, { status: 0 });
      if (res.success) {
        message.success("已禁用该题目");
        loadData();
      }
    } catch {
      message.error("操作失败");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 70,
    },
    {
      title: "题型",
      dataIndex: "type",
      width: 80,
      render: (type: number) => <Tag color={typeColors[type]}>{typeLabels[type]}</Tag>,
    },
    {
      title: "题目内容",
      dataIndex: "content",
      ellipsis: true,
      render: (text: string) => <Text style={{ maxWidth: 300 }} ellipsis={{ tooltip: text }}>{text}</Text>,
    },
    {
      title: "所属题库",
      dataIndex: "QuestionBank",
      width: 150,
      render: (bank: any) => bank?.name || "-",
    },
    {
      title: "点赞",
      dataIndex: "like_count",
      width: 80,
      render: (count: number) => <Tag color="green">{count}</Tag>,
    },
    {
      title: "点踩",
      dataIndex: "dislike_count",
      width: 80,
      render: (count: number) => <Tag color="red">{count}</Tag>,
    },
    {
      title: "踩率",
      key: "dislike_rate",
      width: 100,
      render: (_: any, record: any) => {
        const total = record.like_count + record.dislike_count;
        if (total === 0) return "-";
        const rate = ((record.dislike_count / total) * 100).toFixed(1);
        return <Text type={Number(rate) > 50 ? "danger" : "warning"}>{rate}%</Text>;
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      render: (status: number) =>
        status === 1 ? <Tag color="success">启用</Tag> : <Tag color="default">已禁用</Tag>,
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          {record.status === 1 && (
            <Popconfirm
              title="确认禁用该题目？"
              description="禁用后学生将不会抽到该题"
              onConfirm={() => handleDisable(record.id)}
            >
              <Button type="link" danger size="small" icon={<StopOutlined />}>
                禁用
              </Button>
            </Popconfirm>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => window.open(`/admin/question-bank`, "_self")}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="题目反馈统计"
        extra={
          <Select
            allowClear
            placeholder="按题库筛选"
            style={{ width: 200 }}
            value={bankId}
            onChange={(val) => { setBankId(val); setPagination((p) => ({ ...p, page: 1 })); }}
            options={banks.map((b: any) => ({ label: b.name, value: b.id }))}
          />
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => setPagination((p) => ({ ...p, page })),
            showTotal: (total) => `共 ${total} 道被踩题目`,
          }}
        />
      </Card>
    </div>
  );
}
