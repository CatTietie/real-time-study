import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Radio,
  Checkbox,
  Input,
  Space,
  Tag,
  Spin,
  Modal,
  Progress,
  message,
  Affix,
} from "antd";
import {
  ClockCircleOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import {
  fetchQuestionsForPractice,
  submitExercise,
  generateIntelligentPaper,
} from "../../services/questionBankPublic";
import { ProgrammingQuestion } from "../../components/CodeEditor";
import type {
  QuestionForPractice,
  PracticeQuestionsData,
} from "../../services/questionBankPublic";

const { Title, Text } = Typography;
const { TextArea } = Input;

const typeLabels: Record<number, string> = {
  1: "单选题",
  2: "多选题",
  3: "判断题",
  4: "填空题",
  5: "主观题",
  6: "编程题",
};

const typeColors: Record<number, string> = {
  1: "blue",
  2: "purple",
  3: "green",
  4: "orange",
  5: "red",
  6: "cyan",
};

export default function QuestionBankExam() {
  const navigate = useNavigate();
  const { bankId } = useParams<{ bankId: string }>();
  const location = useLocation();
  const state = location.state as { mode?: string; count?: number; questions?: QuestionForPractice[]; } | null;

  const [questions, setQuestions] = useState<QuestionForPractice[]>([]);
  const [bankName, setBankName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime] = useState(() => new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  const mode = state?.mode || "sequential";
  const count = state?.count;

  useEffect(() => {
    if (state?.questions && state.questions.length > 0) {
      setQuestions(state.questions);
      setBankName("错题强化练习");
      setLoading(false);
      return;
    }
    if (!state?.mode) {
      navigate(`/community/question-bank/${bankId}/mode`, { replace: true });
      return;
    }
    loadQuestions();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      if (mode === "intelligent") {
        const res = await generateIntelligentPaper({
          bankId: Number(bankId),
          questionCount: count || 20,
        });
        if (res.success) {
          setQuestions(res.data.questions);
          setBankName(res.data.bankName);
        } else {
          message.error(res.message || "智能组卷失败");
        }
      } else {
        const res = await fetchQuestionsForPractice(Number(bankId), mode, count);
        if (res.success) {
          const data: PracticeQuestionsData = res.data;
          setQuestions(data.questions);
          setBankName(data.bankName);

          if (mode === "simulation") {
            const totalSeconds = Math.ceil(data.questions.length * 1.5) * 60;
            setTimeLeft(totalSeconds);
            startTimer(totalSeconds);
          }
        } else {
          message.error(res.message || "获取题目失败");
        }
      }
    } catch {
      message.error("获取题目失败");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (seconds: number) => {
    let remaining = seconds;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          message.warning("考试时间到，自动提交");
          handleSubmit(true);
        }
      }
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const updateAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const answeredCount = Object.values(answers).filter((v) => v && v.trim() !== "").length;

  const handleSubmit = useCallback(
    async (force = false) => {
      if (!force) {
        const unanswered = questions.length - answeredCount;
        if (unanswered > 0) {
          Modal.confirm({
            title: "确认提交",
            icon: <ExclamationCircleOutlined />,
            content: `还有 ${unanswered} 题未作答，未答题目将计为空白。确定提交吗？`,
            okText: "确定提交",
            cancelText: "继续答题",
            onOk: () => doSubmit(),
          });
          return;
        }
        Modal.confirm({
          title: "确认提交",
          icon: <ExclamationCircleOutlined />,
          content: "确定要提交所有答案吗？",
          okText: "确定提交",
          cancelText: "继续答题",
          onOk: () => doSubmit(),
        });
        return;
      }
      await doSubmit();
    },
    [questions, answers, answeredCount],
  );

  const doSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const answerItems = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || "",
      }));

      const res = await submitExercise({
        bankId: Number(bankId),
        mode: (mode === "wrong-book" ? "sequential" : mode) as "sequential" | "random" | "simulation" | "intelligent",
        startTime,
        answers: answerItems,
        ...(mode === "wrong-book" ? { source: "wrong-book" as const } : {}),
      });

      if (res.success) {
        message.success("提交成功！");
        navigate(`/community/question-bank/${bankId}/result/${res.data.recordId}`, {
          replace: true,
          state: {
            communityPointsEarned: res.data.communityPointsEarned,
            bonusPointsEarned: res.data.bonusPointsEarned,
          },
        });
      } else {
        message.error(res.message || "提交失败");
      }
    } catch {
      message.error("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
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

  const renderQuestion = (question: QuestionForPractice, index: number) => {
    const userAnswer = answers[question.id] || "";
    const options = parseOptions(question.options);

    return (
      <Card
        key={question.id}
        style={{
          borderRadius: 16,
          marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
        styles={{ body: { padding: "24px 28px" } }}
      >
        <div style={{ marginBottom: 16 }}>
          <Space size={8}>
            <Tag
              color={typeColors[question.type] || "default"}
              style={{ fontSize: 13 }}
            >
              {typeLabels[question.type] || "未知"}
            </Tag>
            <Text strong style={{ fontSize: 15 }}>
              第 {index + 1} 题
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              ({question.score || 1} 分)
            </Text>
          </Space>
        </div>

        {mode === "intelligent" && question.reason && (
          <div
            style={{
              marginBottom: 14,
              padding: "6px 12px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)",
              border: "1px solid #d6e4ff",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <BulbOutlined style={{ color: "#1890ff", fontSize: 14 }} />
            <Text style={{ fontSize: 13, color: "#595959" }}>
              {question.reason}
            </Text>
          </div>
        )}

        <div style={{ marginBottom: 16, fontSize: 15, lineHeight: 1.8 }}>
          {question.content}
        </div>

        {question.resource_url && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={question.resource_url}
              alt="题目资源"
              style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8 }}
            />
          </div>
        )}

        {/* Type 1: Single Choice */}
        {question.type === 1 && options && (
          <Radio.Group
            value={userAnswer}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {options.map((opt) => (
              <Radio key={opt.label} value={opt.label} style={{ fontSize: 14 }}>
                <Text strong>{opt.label}.</Text> {opt.text}
              </Radio>
            ))}
          </Radio.Group>
        )}

        {/* Type 2: Multiple Choice */}
        {question.type === 2 && options && (
          <Checkbox.Group
            value={userAnswer ? userAnswer.split(",") : []}
            onChange={(checkedValues) =>
              updateAnswer(question.id, (checkedValues as string[]).sort().join(","))
            }
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {options.map((opt) => (
              <Checkbox key={opt.label} value={opt.label} style={{ fontSize: 14 }}>
                <Text strong>{opt.label}.</Text> {opt.text}
              </Checkbox>
            ))}
          </Checkbox.Group>
        )}

        {/* Type 3: True/False */}
        {question.type === 3 && (
          <Radio.Group
            value={userAnswer}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            style={{ display: "flex", gap: 24 }}
          >
            <Radio value="true" style={{ fontSize: 14 }}>
              正确
            </Radio>
            <Radio value="false" style={{ fontSize: 14 }}>
              错误
            </Radio>
          </Radio.Group>
        )}

        {/* Type 4: Fill in Blank */}
        {question.type === 4 && (
          <Input
            value={userAnswer}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="请输入答案"
            size="large"
            style={{ maxWidth: 500 }}
          />
        )}

        {/* Type 5: Subjective */}
        {question.type === 5 && (
          <TextArea
            value={userAnswer}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="请输入你的答案"
            rows={4}
            style={{ maxWidth: 600 }}
          />
        )}

        {/* Type 6: Programming */}
        {question.type === 6 && (
          <ProgrammingQuestion
            questionId={question.id}
            options={
              typeof question.options === "string"
                ? JSON.parse(question.options)
                : question.options || { languages: ["python", "javascript"], testCases: [], templateCode: {} }
            }
            savedCode={userAnswer}
            onCodeChange={(code) => updateAnswer(question.id, code)}
          />
        )}
      </Card>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        paddingBottom: 100,
      }}
    >
      {/* Sticky Header */}
      <Affix offsetTop={0}>
        <div
          style={{
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 100,
          }}
        >
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={() => {
                Modal.confirm({
                  title: "确认离开",
                  content: "离开后答题进度将不会保存，确定要离开吗？",
                  okText: "确定离开",
                  cancelText: "继续答题",
                  onOk: () => navigate(`/community/question-bank/${bankId}/mode`),
                });
              }}
            />
            <Title level={5} style={{ margin: 0 }}>
              {bankName}
            </Title>
            <Tag color="blue">
              {mode === "sequential" ? "顺序练习" : mode === "random" ? "随机抽题" : mode === "intelligent" ? "智能组卷" : "模拟考试"}
            </Tag>
          </Space>

          <Space size="large">
            <div>
              <Text type="secondary">进度：</Text>
              <Text strong>
                {answeredCount} / {questions.length}
              </Text>
              <Progress
                percent={questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0}
                size="small"
                style={{ width: 100, marginLeft: 8, display: "inline-flex" }}
                showInfo={false}
              />
            </div>

            {mode === "simulation" && timeLeft !== null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 8,
                  background: timeLeft <= 60 ? "#fff1f0" : timeLeft <= 300 ? "#fffbe6" : "#f6ffed",
                  border: `1px solid ${timeLeft <= 60 ? "#ffa39e" : timeLeft <= 300 ? "#ffe58f" : "#b7eb8f"}`,
                }}
              >
                <ClockCircleOutlined
                  style={{ color: timeLeft <= 60 ? "#f5222d" : timeLeft <= 300 ? "#faad14" : "#52c41a" }}
                />
                <Text
                  strong
                  style={{ color: timeLeft <= 60 ? "#f5222d" : timeLeft <= 300 ? "#faad14" : "#52c41a", fontSize: 16 }}
                >
                  {formatTime(timeLeft)}
                </Text>
              </div>
            )}

            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleSubmit(false)}
              loading={submitting}
              size="large"
              style={{ borderRadius: 8 }}
            >
              提交答卷
            </Button>
          </Space>
        </div>
      </Affix>

      {/* Questions */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 0" }}>
        <Spin spinning={loading}>
          {questions.map((q, i) => renderQuestion(q, i))}
        </Spin>
      </div>
    </div>
  );
}
