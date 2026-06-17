import { useState, useEffect } from "react";
import { Button, Space, message } from "antd";
import {
  LikeOutlined,
  LikeFilled,
  DislikeOutlined,
  DislikeFilled,
} from "@ant-design/icons";
import {
  submitQuestionFeedback,
  fetchQuestionFeedback,
} from "../../services/questionBankPublic";
import type { FeedbackType } from "../../services/questionBankPublic";

interface Props {
  questionId: number;
}

export default function QuestionFeedback({ questionId }: Props) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchQuestionFeedback(questionId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setFeedbackType(res.data.feedbackType);
        setLikeCount(res.data.likeCount);
        setDislikeCount(res.data.dislikeCount);
      }
    });
    return () => { cancelled = true; };
  }, [questionId]);

  const handleFeedback = async (type: FeedbackType) => {
    if (loading) return;
    setLoading(true);

    const prevType = feedbackType;
    const prevLike = likeCount;
    const prevDislike = dislikeCount;

    if (feedbackType === type) {
      setFeedbackType(null);
      if (type === "like") setLikeCount((c) => c - 1);
      else setDislikeCount((c) => c - 1);
    } else {
      if (feedbackType) {
        if (feedbackType === "like") setLikeCount((c) => c - 1);
        else setDislikeCount((c) => c - 1);
      }
      setFeedbackType(type);
      if (type === "like") setLikeCount((c) => c + 1);
      else setDislikeCount((c) => c + 1);
    }

    try {
      const res = await submitQuestionFeedback(questionId, type);
      if (res.success) {
        setFeedbackType(res.data.feedbackType);
        setLikeCount(res.data.likeCount);
        setDislikeCount(res.data.dislikeCount);
      } else {
        setFeedbackType(prevType);
        setLikeCount(prevLike);
        setDislikeCount(prevDislike);
        message.error(res.message || "操作失败");
      }
    } catch {
      setFeedbackType(prevType);
      setLikeCount(prevLike);
      setDislikeCount(prevDislike);
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space size={12}>
      <Button
        type="text"
        size="small"
        icon={feedbackType === "like" ? <LikeFilled /> : <LikeOutlined />}
        onClick={(e) => { e.stopPropagation(); handleFeedback("like"); }}
        style={{ color: feedbackType === "like" ? "#1677ff" : undefined }}
      >
        {likeCount > 0 ? likeCount : "有帮助"}
      </Button>
      <Button
        type="text"
        size="small"
        icon={feedbackType === "dislike" ? <DislikeFilled /> : <DislikeOutlined />}
        onClick={(e) => { e.stopPropagation(); handleFeedback("dislike"); }}
        style={{ color: feedbackType === "dislike" ? "#f5222d" : undefined }}
      >
        {dislikeCount > 0 ? dislikeCount : "有问题"}
      </Button>
    </Space>
  );
}
