import { useState, useCallback } from "react";
import { Button, Space, Typography, message } from "antd";
import {
  PlayCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import CodeEditor from "./CodeEditor";
import OutputPanel, { type ExecutionStatus } from "./OutputPanel";
import TestCaseResults, { type TestCaseResult } from "./TestCaseResults";
import { executeCode, submitCode } from "../../services/questionBankPublic";
import { useCodeExecutionSocket } from "../../hooks/useCodeExecutionSocket";

const { Text } = Typography;

interface ProgrammingQuestionOptions {
  languages: string[];
  testCases: Array<{ input: string; expectedOutput: string; hidden: boolean }>;
  templateCode: Record<string, string>;
  timeLimit?: number;
  memoryLimit?: number;
}

interface ProgrammingQuestionProps {
  questionId: number;
  options: ProgrammingQuestionOptions;
  onCodeChange?: (code: string) => void;
  savedCode?: string;
}

export default function ProgrammingQuestion({
  questionId,
  options,
  onCodeChange,
  savedCode,
}: ProgrammingQuestionProps) {
  const languages = options.languages || ["python", "javascript"];
  const [language, setLanguage] = useState<"python" | "javascript">(
    languages[0] as "python" | "javascript"
  );
  const [code, setCode] = useState(
    savedCode || options.templateCode?.[languages[0]] || ""
  );
  const [editorHeight, setEditorHeight] = useState(400);

  const streaming = useCodeExecutionSocket();

  const [submitStatus, setSubmitStatus] = useState<"idle" | "running" | "done">("idle");
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalCases, setTotalCases] = useState(0);

  const [restRunStatus, setRestRunStatus] = useState<ExecutionStatus>("idle");
  const [restStdout, setRestStdout] = useState("");
  const [restStderr, setRestStderr] = useState("");
  const [restExecutionTimeMs, setRestExecutionTimeMs] = useState<number | undefined>();
  const [restViolations, setRestViolations] = useState<string[]>([]);

  const useStreaming = streaming.isConnected;

  const runStatus = useStreaming ? streaming.status : restRunStatus;
  const stdout = useStreaming ? streaming.stdout : restStdout;
  const stderr = useStreaming ? streaming.stderr : restStderr;
  const executionTimeMs = useStreaming ? streaming.executionTimeMs : restExecutionTimeMs;
  const violations = useStreaming ? streaming.violations : restViolations;

  const handleLanguageChange = useCallback(
    (lang: "python" | "javascript") => {
      setLanguage(lang);
      const template = options.templateCode?.[lang] || "";
      setCode(template);
      onCodeChange?.(template);
    },
    [options.templateCode, onCodeChange]
  );

  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val);
      onCodeChange?.(val);
    },
    [onCodeChange]
  );

  const handleRun = useCallback(async () => {
    if (!code.trim()) {
      message.warning("请先编写代码");
      return;
    }

    setTestResults([]);
    setSubmitStatus("idle");

    if (useStreaming) {
      streaming.executeStreaming({ questionId, language, code });
    } else {
      setRestRunStatus("running");
      setRestStdout("");
      setRestStderr("");
      setRestViolations([]);

      try {
        const res = await executeCode({ questionId, language, code });
        if (res.success) {
          const data = res.data;
          setRestStdout(data.stdout || "");
          setRestStderr(data.stderr || "");
          setRestExecutionTimeMs(data.executionTimeMs);
          setRestRunStatus(data.status as ExecutionStatus);
          if (data.violations) {
            setRestViolations(data.violations);
          }
        } else {
          setRestStderr(res.message || "运行失败");
          setRestRunStatus("error");
        }
      } catch (err: any) {
        setRestStderr(err.response?.data?.message || "请求失败");
        setRestRunStatus("error");
      }
    }
  }, [code, language, questionId, useStreaming, streaming]);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) {
      message.warning("请先编写代码");
      return;
    }

    setSubmitStatus("running");
    if (useStreaming) {
      streaming.reset();
    } else {
      setRestRunStatus("idle");
    }
    setTestResults([]);

    try {
      const res = await submitCode({ questionId, language, code });
      if (res.success) {
        const data = res.data;
        if (data.status === "blocked") {
          setRestViolations(data.violations || []);
          setRestRunStatus("blocked");
          setSubmitStatus("idle");
          return;
        }
        setTestResults(data.results || []);
        setTotalPassed(data.totalPassed);
        setTotalCases(data.totalCases);
        setSubmitStatus("done");

        if (data.allPassed) {
          message.success("所有测试用例通过！");
        } else {
          message.warning(`通过 ${data.totalPassed}/${data.totalCases} 个测试用例`);
        }
      } else {
        message.error(res.message || "提交失败");
        setSubmitStatus("idle");
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || "请求失败");
      setSubmitStatus("idle");
    }
  }, [code, language, questionId, useStreaming, streaming]);

  return (
    <div style={{ marginTop: 16 }}>
      <CodeEditor
        language={language}
        onLanguageChange={handleLanguageChange}
        value={code}
        onChange={handleCodeChange}
        languages={languages}
        height={editorHeight}
        onHeightChange={setEditorHeight}
        onRun={handleRun}
        onSubmit={handleSubmit}
      />

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Space>
          <Button
            type="default"
            icon={<PlayCircleOutlined />}
            onClick={handleRun}
            loading={runStatus === "running"}
          >
            运行
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={submitStatus === "running"}
          >
            提交判题
          </Button>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Ctrl+Enter 运行 | Ctrl+Shift+Enter 提交
        </Text>
      </div>

      {(runStatus !== "idle" || violations.length > 0) && (
        <OutputPanel
          stdout={stdout}
          stderr={stderr}
          status={runStatus}
          executionTimeMs={executionTimeMs}
          violations={violations}
        />
      )}

      {submitStatus === "done" && testResults.length > 0 && (
        <TestCaseResults
          results={testResults}
          totalPassed={totalPassed}
          totalCases={totalCases}
        />
      )}
    </div>
  );
}
