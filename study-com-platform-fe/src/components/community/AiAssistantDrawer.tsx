import { useState, useRef, useEffect } from "react";
import {
  Drawer,
  Button,
  Input,
  Space,
  Typography,
  Tooltip,
  message,
} from "antd";
import {
  RobotOutlined,
  SendOutlined,
  CopyOutlined,
  PauseCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAiAssistant, type AiMessage } from "../../hooks/useAiAssistant";
import CitationText from "./CitationText";
import AiResponseFeedback from "./AiResponseFeedback";

const { Text } = Typography;
const { TextArea } = Input;

interface AiAssistantDrawerProps {
  postId: number;
  open: boolean;
  onClose: () => void;
}

const MessageBubble = ({
  msg,
  isGenerating,
  onFeedback,
}: {
  msg: AiMessage;
  isGenerating: boolean;
  onFeedback: (historyId: number, feedback: "helpful" | "unhelpful") => void;
}) => {
  const isUser = msg.role === "user";

  const handleCopy = () => {
    const textContent = msg.content.replace(/\[\[cite:\d+\]\]/g, "");
    navigator.clipboard.writeText(textContent).then(() => {
      message.success("已复制到剪贴板");
    });
  };

  const hasCitations = !isUser && Array.isArray(msg.citations) && msg.citations.length > 0;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          display: "flex",
          flexDirection: "column",
          alignItems: isUser ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          {!isUser && <RobotOutlined style={{ color: "#1890ff" }} />}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isUser ? "我" : "AI 助手"}
          </Text>
          {isUser && <UserOutlined style={{ color: "#52c41a" }} />}
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: isUser ? "#1890ff" : "#f5f5f5",
            color: isUser ? "#fff" : "#333",
            lineHeight: 1.6,
          }}
        >
          {msg.content ? (
            hasCitations ? (
              <CitationText content={msg.content} citations={msg.citations!} />
            ) : (
              <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {msg.content}
              </span>
            )
          ) : (
            isGenerating ? "思考中..." : ""
          )}
        </div>

        {/* 引用来源脚注 */}
        {!isGenerating && hasCitations && (
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginTop: 4,
              paddingLeft: 4,
            }}
          >
            <span>参考来源：</span>
            {msg.citations!.filter((c) => c && c.id && c.type).map((c) => {
              const href =
                c.type === "post"
                  ? `/community/post/${c.id}`
                  : `/student/notes/${c.id}`;
              return (
                <Tooltip key={c.index} title={c.title || "未知来源"}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: 4, color: "#1890ff", fontSize: 11 }}
                  >
                    [{c.index}]
                  </a>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* 操作按钮：复制 + 反馈 */}
        {!isUser && msg.content && !isGenerating && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            {msg.content.endsWith("...") && (
              <Text type="warning" style={{ fontSize: 11 }}>
                [已停止生成]
              </Text>
            )}
            <Tooltip title="复制全文">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopy}
                style={{ color: "#999", fontSize: 12 }}
              >
                复制
              </Button>
            </Tooltip>
            {msg.id && (
              <AiResponseFeedback
                historyId={msg.id}
                currentFeedback={msg.feedback || null}
                onFeedback={onFeedback}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AiAssistantDrawer = ({ postId, open, onClose }: AiAssistantDrawerProps) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isGenerating, isConnected, ask, stopGenerating, submitFeedback } =
    useAiAssistant({ postId, enabled: open });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isGenerating) return;
    ask(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined style={{ color: "#1890ff" }} />
          <span>AI 学习助手</span>
          {isConnected && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#52c41a",
                display: "inline-block",
              }}
            />
          )}
        </Space>
      }
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          padding: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        },
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          minHeight: 0,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              paddingTop: 60,
            }}
          >
            <RobotOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
            <p style={{ marginTop: 16 }}>
              你好！我是 AI 学习助手，可以帮你理解这篇帖子的内容。
            </p>
            <p style={{ fontSize: 12, color: "#bbb" }}>
              试试问我："这篇帖子讲了什么？"
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            msg={msg}
            isGenerating={
              isGenerating && idx === messages.length - 1 && msg.role === "ai"
            }
            onFeedback={submitFeedback}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          borderTop: "1px solid #f0f0f0",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isGenerating}
            style={{ flex: 1 }}
          />
          {isGenerating ? (
            <Button
              type="default"
              danger
              icon={<PauseCircleOutlined />}
              onClick={stopGenerating}
            >
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputValue.trim() || !isConnected}
            />
          )}
        </div>
        {!isConnected && (
          <Text type="warning" style={{ fontSize: 12, marginTop: 4 }}>
            连接中...
          </Text>
        )}
      </div>
    </Drawer>
  );
};

export default AiAssistantDrawer;
