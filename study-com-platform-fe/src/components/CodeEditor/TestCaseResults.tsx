import { Progress, Tag, Collapse, Typography } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export interface TestCaseResult {
  index: number;
  passed: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput: string;
  stderr: string;
  hidden: boolean;
  executionTimeMs: number;
  status: string;
}

interface TestCaseResultsProps {
  results: TestCaseResult[];
  totalPassed: number;
  totalCases: number;
}

export default function TestCaseResults({
  results,
  totalPassed,
  totalCases,
}: TestCaseResultsProps) {
  const percent = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
  const allPassed = totalPassed === totalCases;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <Text strong>
            测试结果: {totalPassed}/{totalCases} 通过
          </Text>
          <Tag color={allPassed ? "success" : "error"}>
            {allPassed ? "全部通过" : "未全部通过"}
          </Tag>
        </div>
        <Progress
          percent={percent}
          status={allPassed ? "success" : "exception"}
          size="small"
        />
      </div>

      <Collapse
        size="small"
        items={results.map((r) => ({
          key: r.index,
          label: (
            <span>
              {r.hidden ? (
                <EyeInvisibleOutlined style={{ marginRight: 6 }} />
              ) : null}
              测试用例 #{r.index + 1}{" "}
              {r.passed ? (
                <Tag
                  icon={<CheckCircleOutlined />}
                  color="success"
                  style={{ marginLeft: 8 }}
                >
                  通过
                </Tag>
              ) : (
                <Tag
                  icon={<CloseCircleOutlined />}
                  color="error"
                  style={{ marginLeft: 8 }}
                >
                  未通过
                </Tag>
              )}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {r.executionTimeMs}ms
              </Text>
            </span>
          ),
          children: r.hidden ? (
            <Text type="secondary">隐藏测试用例，仅显示通过/未通过状态</Text>
          ) : (
            <div style={{ fontFamily: "monospace", fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">输入:</Text>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: 8,
                    borderRadius: 4,
                    margin: "4px 0",
                  }}
                >
                  {r.input || "(无输入)"}
                </pre>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">期望输出:</Text>
                <pre
                  style={{
                    background: "#f6ffed",
                    padding: 8,
                    borderRadius: 4,
                    margin: "4px 0",
                    borderLeft: "3px solid #52c41a",
                  }}
                >
                  {r.expectedOutput || "(空)"}
                </pre>
              </div>
              <div>
                <Text type="secondary">实际输出:</Text>
                <pre
                  style={{
                    background: r.passed ? "#f6ffed" : "#fff2f0",
                    padding: 8,
                    borderRadius: 4,
                    margin: "4px 0",
                    borderLeft: `3px solid ${r.passed ? "#52c41a" : "#ff4d4f"}`,
                  }}
                >
                  {r.actualOutput || "(空)"}
                </pre>
              </div>
              {r.stderr && (
                <div style={{ marginTop: 8 }}>
                  <Text type="danger">错误输出:</Text>
                  <pre
                    style={{
                      background: "#fff2f0",
                      padding: 8,
                      borderRadius: 4,
                      margin: "4px 0",
                      color: "#ff4d4f",
                    }}
                  >
                    {r.stderr}
                  </pre>
                </div>
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}
