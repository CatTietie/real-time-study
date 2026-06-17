import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  Typography,
  InputNumber,
  Button,
  Spin,
  message,
  Rate,
  Tag,
  Space,
} from "antd";
import {
  HomeOutlined,
  OrderedListOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import CommunityFooter from "../../components/community/CommunityFooter";
import { fetchBanks } from "../../services/questionBankPublic";
import type { QuestionBankItem } from "../../services/questionBankPublic";

const { Title, Text } = Typography;

export default function QuestionBankMode() {
  const navigate = useNavigate();
  const { bankId } = useParams<{ bankId: string }>();
  const token = useSelector((state: any) => state.auth?.token || state.user?.token);

  const [bank, setBank] = useState<QuestionBankItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [randomCount, setRandomCount] = useState<number>(10);
  const [intelligentCount, setIntelligentCount] = useState<number>(20);

  useEffect(() => {
    if (!token) {
      message.warning("请先登录后再进行练习");
      navigate("/admin/login");
      return;
    }
    loadBankInfo();
  }, [bankId]);

  const loadBankInfo = async () => {
    setLoading(true);
    try {
      const res = await fetchBanks({ page: 1, pageSize: 1, bankId: Number(bankId) });
      if (res.success && res.data.length > 0) {
        setBank(res.data[0]);
        setRandomCount(Math.min(10, res.data[0].question_count));
      } else {
        const allRes = await fetchBanks({ page: 1, pageSize: 100 });
        if (allRes.success) {
          const found = allRes.data.find((b: QuestionBankItem) => b.id === Number(bankId));
          if (found) {
            setBank(found);
            setRandomCount(Math.min(10, found.question_count));
          } else {
            message.error("题库不存在");
          }
        }
      }
    } catch {
      message.error("获取题库信息失败");
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (mode: "sequential" | "random" | "simulation" | "intelligent", count?: number) => {
    navigate(`/community/question-bank/${bankId}/practice`, {
      state: { mode, count },
    });
  };

  const examMinutes = bank ? Math.ceil(bank.question_count * 1.5) : 0;

  const modeCards = [
    {
      key: "sequential",
      icon: <OrderedListOutlined style={{ fontSize: 48, color: "#4facfe" }} />,
      title: "顺序练习",
      desc: "按题库顺序逐题练习，适合系统学习",
      extra: bank ? `共 ${bank.question_count} 题` : "",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      action: () => startPractice("sequential"),
    },
    {
      key: "random",
      icon: <ThunderboltOutlined style={{ fontSize: 48, color: "#fa8c16" }} />,
      title: "随机抽题",
      desc: "从题库中随机抽取指定数量的题目",
      extra: "",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      action: () => startPractice("random", randomCount),
    },
    {
      key: "simulation",
      icon: <ClockCircleOutlined style={{ fontSize: 48, color: "#52c41a" }} />,
      title: "模拟考试",
      desc: "全部题目 + 倒计时，模拟真实考试环境",
      extra: bank ? `${bank.question_count} 题 · ${examMinutes} 分钟` : "",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      action: () => startPractice("simulation"),
    },
    {
      key: "intelligent",
      icon: <BulbOutlined style={{ fontSize: 48, color: "#722ed1" }} />,
      title: "智能组卷",
      desc: "基于你的薄弱知识点，智能生成个性化练习",
      extra: "",
      gradient: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
      action: () => startPractice("intelligent", intelligentCount),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "32px 0",
      }}
    >
      <Button
        icon={<HomeOutlined />}
        onClick={() => navigate("/community/question-bank")}
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          zIndex: 100,
          borderRadius: 20,
          background: "rgba(255,255,255,0.95)",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        返回题库
      </Button>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        <Spin spinning={loading}>
          {bank && (
            <>
              {/* Bank Info Header */}
              <Card
                style={{
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                  border: "none",
                  marginBottom: 32,
                  boxShadow: "0 8px 32px rgba(17,153,142,0.3)",
                }}
                styles={{ body: { padding: "32px 40px" } }}
              >
                <Title level={3} style={{ color: "#fff", margin: 0, marginBottom: 8 }}>
                  {bank.name}
                </Title>
                {bank.description && (
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 15 }}>
                    {bank.description}
                  </Text>
                )}
                <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <Space>
                    <Tag color="white" style={{ color: "#11998e" }}>
                      {bank.question_count} 题
                    </Tag>
                  </Space>
                  <Space>
                    <Text style={{ color: "rgba(255,255,255,0.9)" }}>难度</Text>
                    <Rate disabled allowHalf value={bank.difficulty} style={{ fontSize: 16 }} />
                  </Space>
                </div>
              </Card>

              {/* Mode Selection */}
              <Title level={4} style={{ color: "#fff", marginBottom: 24 }}>
                选择练习模式
              </Title>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {modeCards.map((m) => (
                  <Card
                    key={m.key}
                    hoverable
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      transition: "all 0.3s ease",
                    }}
                    styles={{ body: { padding: "24px 32px" } }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 24,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 16,
                          background: m.gradient,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {m.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                          {m.title}
                        </Title>
                        <Text type="secondary">{m.desc}</Text>
                        {m.extra && (
                          <div style={{ marginTop: 4 }}>
                            <Tag color="blue">{m.extra}</Tag>
                          </div>
                        )}
                        {m.key === "random" && (
                          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                            <Text>抽题数量：</Text>
                            <InputNumber
                              min={1}
                              max={bank.question_count}
                              value={randomCount}
                              onChange={(v) => setRandomCount(v || 1)}
                              style={{ width: 100 }}
                            />
                            <Text type="secondary">/ {bank.question_count} 题</Text>
                          </div>
                        )}
                        {m.key === "intelligent" && (
                          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                            <Text>组卷题数：</Text>
                            <InputNumber
                              min={1}
                              max={Math.min(50, bank.question_count)}
                              value={intelligentCount}
                              onChange={(v) => setIntelligentCount(v || 20)}
                              style={{ width: 100 }}
                            />
                            <Text type="secondary">/ {Math.min(50, bank.question_count)} 题</Text>
                          </div>
                        )}
                      </div>
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          m.action();
                        }}
                        style={{
                          borderRadius: 12,
                          height: 44,
                          paddingInline: 24,
                          background: m.gradient,
                          border: "none",
                        }}
                      >
                        开始
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
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
