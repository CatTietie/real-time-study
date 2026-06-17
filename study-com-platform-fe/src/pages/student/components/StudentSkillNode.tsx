import { Handle, Position } from "@xyflow/react";
import { LockOutlined, CheckCircleFilled } from "@ant-design/icons";
import { Tooltip } from "antd";

const conditionLabels: Record<string, string> = {
  check_in_count: "签到天数",
  points: "积分",
  exercise_count: "练习题数",
  correct_rate: "正确率",
  study_duration: "学习时长(分钟)",
  login_streak: "连续登录天数",
};

interface ConditionProgress {
  type: string;
  operator: string;
  required: number;
  current: number;
  met: boolean;
}

interface PrerequisiteStatus {
  node_id: number;
  title: string;
  is_unlocked: boolean;
}

interface Props {
  data: {
    title: string;
    icon: string;
    color: string;
    node_type: string;
    is_unlocked: boolean;
    unlock_conditions: any[] | null;
    condition_progress: ConditionProgress[];
    prerequisites_met: boolean;
    prerequisites: PrerequisiteStatus[];
    onClick?: () => void;
  };
}

export default function StudentSkillNode({ data }: Props) {
  const { title, color, node_type, is_unlocked, condition_progress, prerequisites_met, prerequisites, onClick } = data;

  const hasBlockers = !is_unlocked && (condition_progress.length > 0 || prerequisites.length > 0);

  const tooltipContent = hasBlockers ? (
    <div>
      {prerequisites.length > 0 && (
        <>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>前置节点：</div>
          {prerequisites.map((p) => (
            <div key={p.node_id} style={{ color: p.is_unlocked ? "#52c41a" : "#ff4d4f" }}>
              {p.is_unlocked ? "✓" : "✗"} {p.title}
            </div>
          ))}
        </>
      )}
      {condition_progress.length > 0 && (
        <>
          <div style={{ fontWeight: 500, marginBottom: 4, marginTop: prerequisites.length > 0 ? 8 : 0 }}>解锁条件：</div>
          {condition_progress.map((cp, idx) => (
            <div key={idx} style={{ color: cp.met ? "#52c41a" : "#ff4d4f" }}>
              {cp.met ? "✓" : "✗"} {conditionLabels[cp.type] || cp.type} {cp.operator} {cp.required}
              <span style={{ marginLeft: 8, opacity: 0.8 }}>({cp.current}/{cp.required})</span>
            </div>
          ))}
        </>
      )}
    </div>
  ) : null;

  const nodeContent = (
    <div
      onClick={is_unlocked ? onClick : undefined}
      style={{
        padding: "10px 18px",
        border: `2px solid ${is_unlocked ? color : "#d9d9d9"}`,
        borderRadius: node_type === "milestone" ? 16 : 8,
        background: is_unlocked ? "#fff" : "#f5f5f5",
        minWidth: 130,
        textAlign: "center",
        cursor: is_unlocked ? "pointer" : "not-allowed",
        opacity: is_unlocked ? 1 : 0.65,
        boxShadow: is_unlocked ? `0 2px 8px ${color}33` : "none",
        transition: "all 0.3s",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: is_unlocked ? color : "#d9d9d9" }} />

      {!is_unlocked && (
        <LockOutlined style={{ position: "absolute", top: 6, right: 6, color: "#999", fontSize: 12 }} />
      )}
      {is_unlocked && node_type !== "start" && (
        <CheckCircleFilled style={{ position: "absolute", top: 6, right: 6, color: "#52c41a", fontSize: 12 }} />
      )}

      {node_type === "start" && <div style={{ fontSize: 11, color: "#52c41a", marginBottom: 2 }}>起点</div>}
      {node_type === "milestone" && <div style={{ fontSize: 11, color: "#722ed1", marginBottom: 2 }}>里程碑</div>}
      {node_type === "end" && <div style={{ fontSize: 11, color: "#fa8c16", marginBottom: 2 }}>终点</div>}

      <div style={{
        fontWeight: 500,
        fontSize: 13,
        color: is_unlocked ? "#333" : "#999",
      }}>
        {title}
      </div>

      {!is_unlocked && (prerequisites.length > 0 || condition_progress.length > 0) && (
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          {!prerequisites_met
            ? `${prerequisites.filter((p) => p.is_unlocked).length}/${prerequisites.length} 前置已完成`
            : `${condition_progress.filter((c) => c.met).length}/${condition_progress.length} 条件已满足`
          }
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: is_unlocked ? color : "#d9d9d9" }} />
    </div>
  );

  if (tooltipContent) {
    return <Tooltip title={tooltipContent} placement="right">{nodeContent}</Tooltip>;
  }

  return nodeContent;
}
