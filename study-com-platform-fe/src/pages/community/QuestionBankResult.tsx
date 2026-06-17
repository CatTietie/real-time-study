import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Tag,
  Space,
  Spin,
  Collapse,
  message,
  Alert,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  TrophyOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  BookOutlined,
  DownloadOutlined,
  MessageOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import * as echarts from "echarts";
import io from "socket.io-client";
import CommunityFooter from "../../components/community/CommunityFooter";
import QuestionFeedback from "../../components/community/QuestionFeedback";
import { fetchExerciseResult, fetchTagAnalysis } from "../../services/questionBankPublic";
import { downloadWrongQuestionsPdf } from "../../utils/exportWrongQuestionsPdf";
import { API_BASE } from "../../services/api";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import type { ExerciseResultData, ExerciseResultDetail, TagAnalysisItem } from "../../services/questionBankPublic";

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

const modeLabels: Record<string, string> = {
  sequential: "顺序练习",
  random: "随机抽题",
  simulation: "模拟考试",
  intelligent: "智能组卷",
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

export default function QuestionBankResult() {
  const navigate = useNavigate();
  const { bankId, recordId } = useParams<{ bankId: string; recordId: string }>();
  const location = useLocation();
  const authState = useAppSelector((state: RootState) => state.auth);
  const pointsState = location.state as {
    communityPointsEarned?: number;
    bonusPointsEarned?: number;
  } | null;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ExerciseResultData | null>(null);
  const [tagData, setTagData] = useState<TagAnalysisItem[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    loadResult();
  }, [recordId]);

  // Socket.IO: listen for review completion and auto-refresh
  useEffect(() => {
    const token = authState.token;
    const userId = authState.userId;
    if (!token || !userId) return;

    const apiBaseUrl = API_BASE.replace("/api", "");
    const socket = io(apiBaseUrl, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });

    socket.on("connect", () => {
      socket.emit("join_global", { userId, username: authState.username });
    });

    socket.on("notification", (data: { type: string; data: any }) => {
      if (data.type === "exercise_review" && data.data) {
        const recId = data.data.recordId;
        if (String(recId) === String(recordId)) {
          message.success("教师已完成批改，正在刷新结果...");
          loadResult();
        }
      }
    });

    return () => {
      socket.close();
    };
  }, [authState.token, authState.userId, recordId]);

  const loadResult = async () => {
    setLoading(true);
    try {
      const res = await fetchExerciseResult(Number(recordId));
      if (res.success) {
        setResult(res.data);
      } else {
        message.error(res.message || "获取结果失败");
      }
    } catch {
      message.error("获取练习结果失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!recordId) return;
    fetchTagAnalysis(Number(recordId))
      .then((res) => {
        if (res.success && res.data.tags.length > 0) {
          setTagData(res.data.tags);
        }
      })
      .catch(() => {});
  }, [recordId]);

  useEffect(() => {
    if (!chartRef.current || tagData.length === 0) return;

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    if (tagData.length >= 3 && tagData.length <= 8) {
      chart.setOption({
        tooltip: { trigger: "item" },
        radar: {
          indicator: tagData.map((t) => ({ name: t.tag, max: 100 })),
          shape: "circle",
          splitArea: { areaStyle: { color: ["rgba(102,126,234,0.05)", "rgba(102,126,234,0.1)"] } },
        },
        series: [
          {
            type: "radar",
            data: [
              {
                value: tagData.map((t) => t.accuracy),
                name: "正确率",
                areaStyle: { color: "rgba(102,126,234,0.3)" },
                lineStyle: { color: "#667eea" },
                itemStyle: { color: "#667eea" },
              },
            ],
          },
        ],
      });
    } else {
      const sortedTags = [...tagData].sort((a, b) => a.accuracy - b.accuracy);
      chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: "3%", right: "8%", bottom: "3%", containLabel: true },
        xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
        yAxis: { type: "category", data: sortedTags.map((t) => t.tag) },
        series: [
          {
            type: "bar",
            data: sortedTags.map((t) => ({
              value: t.accuracy,
              itemStyle: {
                color: t.accuracy >= 80 ? "#52c41a" : t.accuracy >= 50 ? "#faad14" : "#f5222d",
              },
            })),
            label: { show: true, position: "right", formatter: "{c}%" },
          },
        ],
      });
    }

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [tagData]);

  const getTimeDuration = () => {
    if (!result) return "";
    const start = new Date(result.record.startTime).getTime();
    const end = new Date(result.record.submitTime).getTime();
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m} 分 ${s} 秒`;
  };

  const correctCount = result?.details.filter((d) => d.isCorrect === 1).length || 0;
  const totalCount = result?.details.length || 0;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const pendingReviewCount = result?.details.filter((d) => d.type === 5 && d.reviewStatus !== 2).length || 0;
  const hasPendingReview = result?.record.status === 3 || pendingReviewCount > 0;
  const wrongDetails = result?.details.filter((d) => d.isCorrect === 0) || [];

  const handleDownloadPdf = async () => {
    if (!result || wrongDetails.length === 0) return;
    setPdfLoading(true);
    try {
      await downloadWrongQuestionsPdf(wrongDetails, result.record);
      message.success("错题PDF下载成功");
    } catch {
      message.error("PDF生成失败，请重试");
    } finally {
      setPdfLoading(false);
    }
  };

  const renderOptionHighlight = (detail: ExerciseResultDetail) => {
    const options = parseOptions(detail.options);
    if (!options || options.length === 0) return null;

    const correctSet = new Set(
      detail.correctAnswer
        .toUpperCase()
        .split(",")
        .map((s) => s.trim()),
    );
    const userSet = new Set(
      (detail.userAnswer || "")
        .toUpperCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt) => {
          const isCorrectOption = correctSet.has(opt.label.toUpperCase());
          const isUserSelected = userSet.has(opt.label.toUpperCase());
          let bg = "transparent";
          let borderColor = "#d9d9d9";

          if (isCorrectOption && isUserSelected) {
            bg = "#f6ffed";
            borderColor = "#52c41a";
          } else if (isCorrectOption) {
            bg = "#f6ffed";
            borderColor = "#52c41a";
          } else if (isUserSelected) {
            bg = "#fff1f0";
            borderColor = "#f5222d";
          }

          return (
            <div
              key={opt.label}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: bg,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text strong>{opt.label}.</Text>
              <Text>{opt.text}</Text>
              {isCorrectOption && (
                <CheckCircleFilled style={{ color: "#52c41a", marginLeft: "auto" }} />
              )}
              {isUserSelected && !isCorrectOption && (
                <CloseCircleFilled style={{ color: "#f5222d", marginLeft: "auto" }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTrueFalseHighlight = (detail: ExerciseResultDetail) => {
    const correct = detail.correctAnswer.toLowerCase();
    const user = (detail.userAnswer || "").toLowerCase();
    const options = [
      { value: "true", label: "正确" },
      { value: "false", label: "错误" },
    ];

    return (
      <div style={{ display: "flex", gap: 16 }}>
        {options.map((opt) => {
          const isCorrectOption = correct === opt.value;
          const isUserSelected = user === opt.value;
          let bg = "transparent";
          let borderColor = "#d9d9d9";

          if (isCorrectOption && isUserSelected) {
            bg = "#f6ffed";
            borderColor = "#52c41a";
          } else if (isCorrectOption) {
            bg = "#f6ffed";
            borderColor = "#52c41a";
          } else if (isUserSelected) {
            bg = "#fff1f0";
            borderColor = "#f5222d";
          }

          return (
            <div
              key={opt.value}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: bg,
              }}
            >
              <Text>{opt.label}</Text>
              {isCorrectOption && <CheckCircleFilled style={{ color: "#52c41a", marginLeft: 8 }} />}
              {isUserSelected && !isCorrectOption && (
                <CloseCircleFilled style={{ color: "#f5222d", marginLeft: 8 }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFillOrSubjective = (detail: ExerciseResultDetail) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <Text type="secondary">你的答案：</Text>
          <Text
            style={{ color: detail.isCorrect ? "#52c41a" : "#f5222d" }}
          >
            {detail.userAnswer || "（未作答）"}
          </Text>
        </div>
        <div>
          <Text type="secondary">参考答案：</Text>
          <Text strong style={{ color: "#52c41a" }}>
            {detail.correctAnswer}
          </Text>
        </div>
        {detail.type === 5 && detail.reviewStatus === 2 && (
          <div
            style={{
              marginTop: 8,
              padding: 12,
              background: "#f6ffed",
              borderRadius: 8,
              border: "1px solid #b7eb8f",
            }}
          >
            <div>
              <Text type="secondary">教师评分：</Text>
              <Text strong style={{ color: "#1890ff" }}>
                {detail.reviewScore} / {detail.score} 分
              </Text>
            </div>
            {detail.reviewComment && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">教师评语：</Text>
                <Text>{detail.reviewComment}</Text>
              </div>
            )}
            {detail.reviewedAt && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  批改时间：{new Date(detail.reviewedAt).toLocaleString()}
                  {detail.reviewerName && ` · 批改人：${detail.reviewerName}`}
                </Text>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDetail = (detail: ExerciseResultDetail, index: number) => (
    <Card
      key={detail.questionId}
      style={{
        borderRadius: 12,
        marginBottom: 16,
        borderLeft: `4px solid ${detail.isCorrect ? "#52c41a" : detail.type === 5 ? "#faad14" : "#f5222d"}`,
      }}
      styles={{ body: { padding: "20px 24px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <Space>
          <Tag color={typeColors[detail.type]}>{typeLabels[detail.type]}</Tag>
          <Text strong>第 {index + 1} 题</Text>
          {detail.isCorrect === 1 ? (
            <Tag color="success" icon={<CheckCircleFilled />}>
              正确
            </Tag>
          ) : detail.type === 5 && detail.reviewStatus === 2 ? (
            <Tag color="processing">已批改 {detail.reviewScore}/{detail.score}分</Tag>
          ) : detail.type === 5 ? (
            <Tag color="warning">待批改</Tag>
          ) : (
            <Tag color="error" icon={<CloseCircleFilled />}>
              错误
            </Tag>
          )}
        </Space>
        <Text type="secondary">
          {detail.type === 5 && detail.reviewStatus === 2
            ? `${detail.reviewScore} / ${detail.score} 分`
            : `${detail.earnedPoints} / ${detail.score} 分`}
        </Text>
      </div>

      <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>{detail.content}</Paragraph>

      {(detail.type === 1 || detail.type === 2) && renderOptionHighlight(detail)}
      {detail.type === 3 && renderTrueFalseHighlight(detail)}
      {(detail.type === 4 || detail.type === 5) && renderFillOrSubjective(detail)}

      {detail.analysis && (
        <Collapse
          ghost
          items={[
            {
              key: "analysis",
              label: <Text type="secondary">查看解析</Text>,
              children: (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#fafafa",
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                >
                  <Paragraph style={{ margin: 0 }}>{detail.analysis}</Paragraph>
                </div>
              ),
            },
          ]}
          style={{ marginTop: 12 }}
        />
      )}

      {detail.isCorrect === 0 && detail.type !== 5 && (
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <Button
            type="link"
            icon={<MessageOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              sessionStorage.setItem("discuss_question", JSON.stringify({
                questionId: detail.questionId,
                type: detail.type,
                content: detail.content,
                options: detail.options || null,
                correctAnswer: detail.correctAnswer,
                analysis: detail.analysis || null,
              }));
              navigate(`/community/publish?questionId=${detail.questionId}`);
            }}
          >
            去讨论
          </Button>
        </div>
      )}

      <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>这道题对你有帮助吗？</Text>
        <QuestionFeedback questionId={detail.questionId} />
      </div>
    </Card>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "32px 0",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        <Spin spinning={loading}>
          {result && (
            <>
              {/* Score Summary */}
              <Card
                style={{
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                  border: "none",
                  marginBottom: 24,
                  boxShadow: "0 8px 32px rgba(17,153,142,0.3)",
                  textAlign: "center",
                }}
                styles={{ body: { padding: "40px" } }}
              >
                <TrophyOutlined style={{ fontSize: 56, color: "#fff", marginBottom: 16 }} />
                <Title level={2} style={{ color: "#fff", margin: 0, marginBottom: 8 }}>
                  {result.record.score} / {result.record.totalScore} 分
                </Title>
                <Space size="large" wrap style={{ justifyContent: "center" }}>
                  <Tag
                    color="white"
                    style={{ color: "#11998e", fontSize: 14, padding: "4px 12px" }}
                  >
                    答对 {correctCount} / {totalCount} 题
                  </Tag>
                  <Tag
                    color="white"
                    style={{ color: "#11998e", fontSize: 14, padding: "4px 12px" }}
                  >
                    正确率 {accuracy}%
                  </Tag>
                  <Tag
                    color="white"
                    style={{ color: "#11998e", fontSize: 14, padding: "4px 12px" }}
                  >
                    用时 {getTimeDuration()}
                  </Tag>
                  <Tag
                    color="white"
                    style={{ color: "#11998e", fontSize: 14, padding: "4px 12px" }}
                  >
                    {modeLabels[result.record.mode] || result.record.mode}
                  </Tag>
                </Space>
                {((pointsState?.communityPointsEarned ?? 0) > 0 || (pointsState?.bonusPointsEarned ?? 0) > 0) && (
                  <div style={{ marginTop: 16 }}>
                    <Tag
                      color="gold"
                      style={{ fontSize: 15, padding: "6px 16px", fontWeight: 600 }}
                    >
                      +{(pointsState?.communityPointsEarned ?? 0) + (pointsState?.bonusPointsEarned ?? 0)} 社区积分
                    </Tag>
                    {(pointsState?.bonusPointsEarned ?? 0) > 0 && (
                      <Tag
                        color="cyan"
                        style={{ fontSize: 12, padding: "2px 8px", marginLeft: 8 }}
                      >
                        含完成奖励 +10
                      </Tag>
                    )}
                  </div>
                )}
              </Card>

              {hasPendingReview && (
                <Alert
                  message={
                    <Space>
                      <ClockCircleOutlined />
                      <span>
                        本次练习包含 {pendingReviewCount} 道主观题尚未批改，批改完成后将自动更新分数和积分。
                      </span>
                    </Space>
                  }
                  type="warning"
                  showIcon={false}
                  style={{ marginBottom: 24, borderRadius: 12 }}
                />
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  marginBottom: 32,
                }}
              >
                <Button
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(`/community/question-bank/${bankId}/mode`)}
                  style={{
                    borderRadius: 12,
                    height: 44,
                    paddingInline: 24,
                    background: "rgba(255,255,255,0.95)",
                    border: "none",
                  }}
                >
                  返回题库
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={() => navigate(`/community/question-bank/${bankId}/mode`)}
                  style={{
                    borderRadius: 12,
                    height: 44,
                    paddingInline: 24,
                  }}
                >
                  再来一次
                </Button>
                <Button
                  size="large"
                  icon={<BookOutlined />}
                  onClick={() => navigate("/community/wrong-book")}
                  style={{
                    borderRadius: 12,
                    height: 44,
                    paddingInline: 24,
                    background: "rgba(255,255,255,0.95)",
                    border: "none",
                  }}
                >
                  错题本
                </Button>
                <Button
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadPdf}
                  loading={pdfLoading}
                  disabled={wrongDetails.length === 0}
                  style={{
                    borderRadius: 12,
                    height: 44,
                    paddingInline: 24,
                    background: "rgba(255,255,255,0.95)",
                    border: "none",
                  }}
                >
                  下载错题PDF
                </Button>
              </div>

              {/* Tag Accuracy Chart */}
              {tagData.length > 0 && (
                <Card
                  style={{
                    borderRadius: 16,
                    marginBottom: 24,
                  }}
                  styles={{ body: { padding: "24px" } }}
                >
                  <Title level={5} style={{ marginBottom: 16 }}>知识点正确率分析</Title>
                  <div ref={chartRef} style={{ width: "100%", height: tagData.length >= 3 && tagData.length <= 8 ? 320 : Math.max(200, tagData.length * 40) }} />
                </Card>
              )}

              {/* Per-Question Detail */}
              <Title level={4} style={{ color: "#fff", marginBottom: 16 }}>
                答题详情
              </Title>
              {result.details.map((d, i) => renderDetail(d, i))}
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
