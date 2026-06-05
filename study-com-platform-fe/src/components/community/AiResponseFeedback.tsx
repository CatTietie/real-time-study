import { Button, Space } from "antd";
import { LikeOutlined, LikeFilled, DislikeOutlined, DislikeFilled } from "@ant-design/icons";

interface Props {
  historyId: number;
  currentFeedback: "helpful" | "unhelpful" | null;
  onFeedback: (historyId: number, feedback: "helpful" | "unhelpful") => void;
}

export default function AiResponseFeedback({ historyId, currentFeedback, onFeedback }: Props) {
  return (
    <Space size={4}>
      <Button
        type="text"
        size="small"
        icon={currentFeedback === "helpful" ? <LikeFilled /> : <LikeOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onFeedback(historyId, "helpful");
        }}
        style={{
          color: currentFeedback === "helpful" ? "#1890ff" : "#999",
          fontSize: 12,
          padding: "0 4px",
        }}
      >
        有用
      </Button>
      <Button
        type="text"
        size="small"
        icon={currentFeedback === "unhelpful" ? <DislikeFilled /> : <DislikeOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onFeedback(historyId, "unhelpful");
        }}
        style={{
          color: currentFeedback === "unhelpful" ? "#f5222d" : "#999",
          fontSize: 12,
          padding: "0 4px",
        }}
      >
        无用
      </Button>
    </Space>
  );
}
