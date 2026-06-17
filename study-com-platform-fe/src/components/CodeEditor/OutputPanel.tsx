import { Tabs, Tag, Spin, Alert } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  StopOutlined,
} from "@ant-design/icons";

export type ExecutionStatus =
  | "idle"
  | "running"
  | "success"
  | "error"
  | "timeout"
  | "blocked"
  | "oom";

interface OutputPanelProps {
  stdout: string;
  stderr: string;
  status: ExecutionStatus;
  executionTimeMs?: number;
  violations?: string[];
}

const statusConfig: Record<
  ExecutionStatus,
  { icon: React.ReactNode; color: string; label: string }
> = {
  idle: { icon: null, color: "default", label: "等待运行" },
  running: {
    icon: <LoadingOutlined spin />,
    color: "processing",
    label: "运行中",
  },
  success: {
    icon: <CheckCircleOutlined />,
    color: "success",
    label: "运行成功",
  },
  error: { icon: <CloseCircleOutlined />, color: "error", label: "运行错误" },
  timeout: { icon: <ClockCircleOutlined />, color: "warning", label: "执行超时" },
  blocked: { icon: <StopOutlined />, color: "error", label: "代码被拦截" },
  oom: { icon: <StopOutlined />, color: "error", label: "内存超限" },
};

export default function OutputPanel({
  stdout,
  stderr,
  status,
  executionTimeMs,
  violations,
}: OutputPanelProps) {
  const config = statusConfig[status];

  if (status === "blocked" && violations && violations.length > 0) {
    return (
      <div style={{ marginTop: 12 }}>
        <Alert
          type="error"
          message="代码安全检查未通过"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          }
          showIcon
        />
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div
        style={{
          marginTop: 12,
          padding: "24px",
          background: "#1e1e1e",
          borderRadius: 8,
          color: "#666",
          textAlign: "center",
          fontFamily: "monospace",
        }}
      >
        点击"运行"查看输出结果
      </div>
    );
  }

  const tabItems = [
    {
      key: "stdout",
      label: (
        <span>
          标准输出{" "}
          {stdout && (
            <Tag color="green" style={{ marginLeft: 4, fontSize: 11 }}>
              有输出
            </Tag>
          )}
        </span>
      ),
      children: (
        <pre
          style={{
            margin: 0,
            padding: 12,
            minHeight: 80,
            maxHeight: 300,
            overflow: "auto",
            background: "#1a1a1a",
            color: "#d4d4d4",
            fontSize: 13,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {status === "running" ? (
            stdout ? (
              <>
                {stdout}
                <span style={{ animation: "blink 1s step-end infinite", opacity: 0.7 }}>|</span>
                <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
              </>
            ) : (
              <Spin indicator={<LoadingOutlined spin />} />
            )
          ) : (
            stdout || "(无输出)"
          )}
        </pre>
      ),
    },
    {
      key: "stderr",
      label: (
        <span>
          错误输出{" "}
          {stderr && (
            <Tag color="red" style={{ marginLeft: 4, fontSize: 11 }}>
              有错误
            </Tag>
          )}
        </span>
      ),
      children: (
        <pre
          style={{
            margin: 0,
            padding: 12,
            minHeight: 80,
            maxHeight: 300,
            overflow: "auto",
            background: "#1a1a1a",
            color: "#f44747",
            fontSize: 13,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {stderr || "(无错误)"}
        </pre>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Tag icon={config.icon} color={config.color}>
          {config.label}
        </Tag>
        {executionTimeMs !== undefined && status !== "running" && (
          <Tag>{executionTimeMs}ms</Tag>
        )}
      </div>
      <div
        style={{
          background: "#1e1e1e",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Tabs
          items={tabItems}
          defaultActiveKey={stderr ? "stderr" : "stdout"}
          size="small"
          style={{ margin: 0 }}
          tabBarStyle={{
            background: "#252526",
            margin: 0,
            paddingLeft: 12,
          }}
        />
      </div>
    </div>
  );
}
