import React, { useState, useEffect } from "react";
import { Card, Radio, Checkbox, Button, Tag, Space, message, Result } from "antd";
import {
  FireOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { fetchDailyQuestion, submitDailyQuestion } from "../../services/communityPublic";

interface DailyQuestionData {
  available: boolean;
  date?: string;
  question?: {
    id: number;
    type: number;
    content: string;
    options?: { label: string; text: string }[];
    difficulty: number;
  };
  answered?: boolean;
  streak?: number;
  userAnswer?: string;
  isCorrect?: boolean;
  correctAnswer?: string;
  analysis?: string;
  pointsEarned?: number;
  message?: string;
}

export default function DailyQuestionCard({ onStreakChange }: { onStreakChange?: (streak: number) => void }) {
  const [data, setData] = useState<DailyQuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [submitResult, setSubmitResult] = useState<any>(null);

  useEffect(() => {
    loadDailyQuestion();
  }, []);

  const loadDailyQuestion = async () => {
    setLoading(true);
    try {
      const res = await fetchDailyQuestion();
      if (res.success) {
        setData(res.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) {
      message.warning("请先选择答案");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitDailyQuestion(selectedAnswer);
      if (res.success) {
        setSubmitResult(res.data);
        setData((prev) =>
          prev
            ? {
                ...prev,
                answered: true,
                userAnswer: selectedAnswer,
                isCorrect: res.data.isCorrect,
                correctAnswer: res.data.correctAnswer,
                analysis: res.data.analysis,
                pointsEarned: res.data.pointsEarned,
                streak: res.data.streak,
              }
            : prev,
        );
        if (res.data.isCorrect) {
          message.success(`回答正确！+${res.data.pointsEarned} 积分`);
        } else {
          message.info("回答错误，继续加油！");
        }
        if (res.data.milestone) {
          message.success(
            `恭喜达成连续 ${res.data.milestone.days} 天打卡！额外获得 ${res.data.milestone.bonusPoints} 积分`,
          );
        }
        if (onStreakChange) onStreakChange(res.data.streak);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card loading style={{ marginBottom: 16 }} />
    );
  }

  if (!data || !data.available) {
    return null;
  }

  const { question, answered, streak } = data;
  if (!question) return null;

  const renderOptions = () => {
    let options: { label: string; text: string }[] = [];
    if (Array.isArray(question.options)) {
      options = question.options;
    } else if (typeof question.options === "string") {
      try { options = JSON.parse(question.options); } catch { options = []; }
    }

    if (question.type === 3) {
      return (
        <Radio.Group
          value={selectedAnswer}
          onChange={(e) => setSelectedAnswer(e.target.value)}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <Radio value="A">A. 正确</Radio>
          <Radio value="B">B. 错误</Radio>
        </Radio.Group>
      );
    }

    if (question.type === 2) {
      const selected = selectedAnswer ? selectedAnswer.split(",") : [];
      return (
        <Checkbox.Group
          value={selected}
          onChange={(vals) => setSelectedAnswer((vals as string[]).sort().join(","))}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {options.map((opt) => (
            <Checkbox key={opt.label} value={opt.label}>
              {opt.label}. {opt.text}
            </Checkbox>
          ))}
        </Checkbox.Group>
      );
    }

    return (
      <Radio.Group
        value={selectedAnswer}
        onChange={(e) => setSelectedAnswer(e.target.value)}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        {options.map((opt) => (
          <Radio key={opt.label} value={opt.label}>
            {opt.label}. {opt.text}
          </Radio>
        ))}
      </Radio.Group>
    );
  };

  const renderResult = () => {
    const isCorrect = submitResult?.isCorrect ?? data.isCorrect;
    const correctAnswer = submitResult?.correctAnswer ?? data.correctAnswer;
    const analysis = submitResult?.analysis ?? data.analysis;
    const pointsEarned = submitResult?.pointsEarned ?? data.pointsEarned;

    return (
      <div>
        <Result
          icon={isCorrect ? <CheckCircleOutlined style={{ color: "#52c41a" }} /> : <CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
          title={isCorrect ? "回答正确！" : "回答错误"}
          subTitle={
            <Space direction="vertical" size={4}>
              <span>正确答案：{correctAnswer}</span>
              {pointsEarned > 0 && <span style={{ color: "#52c41a" }}>+{pointsEarned} 积分</span>}
            </Space>
          }
          style={{ padding: "12px 0" }}
        />
        {analysis && (
          <div style={{ background: "#f6f6f6", padding: 12, borderRadius: 6, marginTop: 8 }}>
            <strong>解析：</strong>{analysis}
          </div>
        )}
      </div>
    );
  };

  const difficultyLabels: Record<number, string> = {
    1: "简单", 2: "简单", 3: "中等", 4: "较难", 5: "困难",
  };
  const typeLabels: Record<number, string> = { 1: "单选", 2: "多选", 3: "判断" };

  return (
    <Card
      style={{
        marginBottom: 16,
        border: "2px solid transparent",
        borderImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%) 1",
      }}
      title={
        <Space>
          <FireOutlined style={{ color: "#fa8c16" }} />
          <span style={{ fontWeight: 600 }}>每日一题</span>
          <Tag color="orange" icon={<TrophyOutlined />}>
            已连续 {streak || 0} 天
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <Tag color="blue">{typeLabels[question.type] || "未知"}</Tag>
          <Tag>{difficultyLabels[question.difficulty] || "中等"}</Tag>
        </Space>
      }
    >
      <div style={{ marginBottom: 16, fontSize: 15, lineHeight: 1.6 }}>
        {question.content}
      </div>

      {answered ? (
        renderResult()
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>{renderOptions()}</div>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!selectedAnswer}
            block
          >
            提交答案
          </Button>
        </>
      )}
    </Card>
  );
}
