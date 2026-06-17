import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Tag,
  Space,
  Spin,
  Select,
  Collapse,
  Popconfirm,
  Empty,
  Pagination,
  Badge,
  message,
} from "antd";
import {
  DeleteOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  MessageOutlined,
} from "@ant-design/icons";
import CommunityFooter from "../../components/community/CommunityFooter";
import QuestionFeedback from "../../components/community/QuestionFeedback";
import {
  fetchWrongBook,
  removeFromWrongBook,
  fetchWrongQuestionsForPractice,
  fetchBanks,
} from "../../services/questionBankPublic";
import type { WrongBookItem } from "../../services/questionBankPublic";

const { Title, Text, Paragraph } = Typography;

const typeLabels: Record<number, string> = {
  1: "单选题",
  2: "多选题",
  3: "判断题",
  4: "填空题",
  5: "主观题",
};

const typeColors: Record<number, string> = {
  1: "blue",
  2: "purple",
  3: "green",
  4: "orange",
  5: "red",
};

const difficultyLabels: Record<number, string> = {
  1: "很简单",
  2: "简单",
  3: "中等",
  4: "较难",
  5: "困难",
};

const parseOptions = (options: any): { label: string; text: string }[] | null => {
  if (!options) return null;
  if (Array.isArray(options)) return options;
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

export default function WrongBook() {
  const navigate = useNavigate();

  const [items, setItems] = useState<WrongBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [bankId, setBankId] = useState<number | undefined>();
  const [banks, setBanks] = useState<{ id: number; name: string }[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);

  useEffect(() => {
    fetchBanks().then((res) => {
      if (res.success) setBanks(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadWrongBook();
  }, [page, bankId]);

  const loadWrongBook = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (bankId) params.bankId = bankId;
      const res = await fetchWrongBook(params);
      if (res.success) {
        setItems(res.data.items);
        setTotal(res.data.pagination.total);
      }
    } catch {
      message.error("获取错题本失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const res = await removeFromWrongBook(id);
      if (res.success) {
        message.success("已移除");
        loadWrongBook();
      }
    } catch {
      message.error("移除失败");
    }
  };

  const handleStrengthPractice = async () => {
    setPracticeLoading(true);
    try {
      const params: any = {};
      if (bankId) params.bankId = bankId;
      const res = await fetchWrongQuestionsForPractice(params);
      if (res.success && res.data.questions.length > 0) {
        const targetBankId = bankId || items[0]?.question.bankId;
        navigate(`/community/question-bank/${targetBankId}/practice`, {
          state: {
            questions: res.data.questions,
            mode: "wrong-book",
            count: res.data.questionCount,
          },
        });
      } else {
        message.info("暂无错题可练习");
      }
    } catch {
      message.error("获取练习题目失败");
    } finally {
      setPracticeLoading(false);
    }
  };

  const renderQuestionDetail = (item: WrongBookItem) => {
    const { question } = item;
    const options = parseOptions(question.options);
    const correctSet = new Set(
      question.answer.toUpperCase().split(",").map((s) => s.trim()),
    );

    return (
      <div style={{ padding: "12px 0" }}>
        <Paragraph style={{ fontSize: 15, marginBottom: 12 }}>{question.content}</Paragraph>

        {options && options.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {options.map((opt) => {
              const isCorrect = correctSet.has(opt.label.toUpperCase());
              return (
                <div
                  key={opt.label}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isCorrect ? "#52c41a" : "#d9d9d9"}`,
                    background: isCorrect ? "#f6ffed" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text strong>{opt.label}.</Text>
                  <Text>{opt.text}</Text>
                  {isCorrect && <CheckCircleFilled style={{ color: "#52c41a", marginLeft: "auto" }} />}
                </div>
              );
            })}
          </div>
        )}

        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <div>
            <Text type="secondary">正确答案：</Text>
            <Text strong style={{ color: "#52c41a" }}>{question.answer}</Text>
          </div>
          {question.analysis && (
            <div style={{ background: "#fafafa", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
              <Text type="secondary">解析：</Text>
              <Text>{question.analysis}</Text>
            </div>
          )}
        </Space>

        <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>这道题质量如何？</Text>
          <QuestionFeedback questionId={item.questionId} />
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "32px 0",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/community/question-bank")}
              style={{ borderRadius: 8, background: "rgba(255,255,255,0.9)", border: "none" }}
            />
            <Title level={3} style={{ color: "#fff", margin: 0 }}>我的错题本</Title>
            {total > 0 && <Badge count={total} style={{ backgroundColor: "#f5222d" }} />}
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            loading={practiceLoading}
            onClick={handleStrengthPractice}
            disabled={total === 0}
            style={{ borderRadius: 12, height: 44, paddingInline: 24 }}
          >
            强化练习
          </Button>
        </div>

        <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: "12px 16px" } }}>
          <Space>
            <Text>筛选题库：</Text>
            <Select
              placeholder="全部题库"
              allowClear
              style={{ width: 200 }}
              value={bankId}
              onChange={(v) => { setBankId(v); setPage(1); }}
              options={banks.map((b) => ({ label: b.name, value: b.id }))}
              showSearch
              filterOption={(input, option) => (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Space>
        </Card>

        <Spin spinning={loading}>
          {items.length === 0 && !loading ? (
            <Card style={{ borderRadius: 12, textAlign: "center" }}>
              <Empty description="暂无错题记录" />
            </Card>
          ) : (
            <>
              <Collapse
                accordion
                style={{ background: "transparent", border: "none" }}
                items={items.map((item) => ({
                  key: item.id,
                  label: (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <Space>
                        <Tag color={typeColors[item.question.type]}>{typeLabels[item.question.type]}</Tag>
                        <Text ellipsis style={{ maxWidth: 400 }}>
                          {item.question.content.substring(0, 50)}
                          {item.question.content.length > 50 ? "..." : ""}
                        </Text>
                      </Space>
                      <Space>
                        <Tag color="default">{item.question.bankName}</Tag>
                        <Tag color="red">错 {item.wrongCount} 次</Tag>
                        <Tag>{difficultyLabels[item.question.difficulty] || "中等"}</Tag>
                      </Space>
                    </div>
                  ),
                  children: (
                    <div>
                      {renderQuestionDetail(item)}
                      <div style={{ marginTop: 12, textAlign: "right" }}>
                        <Space>
                          <Button
                            type="link"
                            icon={<MessageOutlined />}
                            onClick={() => {
                              sessionStorage.setItem("discuss_question", JSON.stringify({
                                questionId: item.questionId,
                                type: item.question.type,
                                content: item.question.content,
                                options: item.question.options || null,
                                correctAnswer: item.question.answer,
                                analysis: item.question.analysis || null,
                              }));
                              navigate(`/community/publish?questionId=${item.questionId}`);
                            }}
                          >
                            去讨论
                          </Button>
                          <Popconfirm title="确认从错题本移除？" onConfirm={() => handleRemove(item.id)}>
                            <Button type="link" danger icon={<DeleteOutlined />}>
                              从错题本移除
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    </div>
                  ),
                  style: {
                    marginBottom: 12,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#fff",
                    border: "none",
                  },
                }))}
              />

              {total > pageSize && (
                <div style={{ textAlign: "center", marginTop: 24 }}>
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    onChange={(p) => setPage(p)}
                    showTotal={(t) => `共 ${t} 道错题`}
                  />
                </div>
              )}
            </>
          )}
        </Spin>

        <div style={{ marginTop: 48 }}>
          <CommunityFooter />
        </div>
      </div>
    </div>
  );
}
