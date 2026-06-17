import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Progress, Space, Spin, message, Card } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getPathTree, getNodeResources, enrollInPath } from "../../services/learningPath";
import StudentSkillNode from "./components/StudentSkillNode";
import NodeResourceDrawer from "./components/NodeResourceDrawer";

const nodeTypes: NodeTypes = {
  studentNode: StudentSkillNode,
};

export default function SkillTreeView() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pathData, setPathData] = useState<any>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNodeTitle, setSelectedNodeTitle] = useState("");
  const [selectedResources, setSelectedResources] = useState<any[]>([]);

  useEffect(() => {
    loadTree();
  }, [pathId]);

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await getPathTree(Number(pathId));
      if (res.success) {
        const data = res.data;
        setPathData(data);

        const rfNodes: Node[] = data.nodes.map((n: any) => ({
          id: String(n.id),
          type: "studentNode",
          position: { x: n.position_x, y: n.position_y },
          draggable: false,
          data: {
            title: n.title,
            icon: n.icon,
            color: n.color,
            node_type: n.node_type,
            is_unlocked: n.is_unlocked,
            unlock_conditions: n.unlock_conditions,
            condition_progress: n.condition_progress,
            prerequisites_met: n.prerequisites_met,
            prerequisites: n.prerequisites,
            onClick: () => handleNodeClick(n),
          },
        }));

        const rfEdges: Edge[] = data.edges.map((e: any) => {
          const sourceNode = data.nodes.find((n: any) => n.id === e.source_node_id);
          const targetNode = data.nodes.find((n: any) => n.id === e.target_node_id);
          const bothUnlocked = sourceNode?.is_unlocked && targetNode?.is_unlocked;

          return {
            id: String(e.id),
            source: String(e.source_node_id),
            target: String(e.target_node_id),
            animated: bothUnlocked,
            style: {
              stroke: bothUnlocked ? "#52c41a" : "#d9d9d9",
              strokeDasharray: bothUnlocked ? undefined : "5 5",
            },
          };
        });

        setNodes(rfNodes);
        setEdges(rfEdges);
      }
    } catch {
      message.error("加载技能树失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (node: any) => {
    if (!node.is_unlocked) return;
    try {
      const res = await getNodeResources(node.id);
      if (res.success) {
        setSelectedNodeTitle(node.title);
        setSelectedResources(res.data);
        setDrawerOpen(true);
      }
    } catch {
      message.error("获取资源失败");
    }
  };

  const handleEnroll = async () => {
    try {
      const res = await enrollInPath(Number(pathId));
      if (res.success) {
        message.success("加入成功");
        loadTree();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "操作失败");
    }
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/student/skill-tree")}>返回</Button>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{pathData?.path?.name}</span>
        </Space>
        <Space>
          {pathData?.enrollment ? (
            <Space>
              <span style={{ color: "#666" }}>完成度：</span>
              <Progress
                percent={pathData.enrollment.progress_percent}
                size="small"
                style={{ width: 150 }}
              />
            </Space>
          ) : (
            <Button type="primary" onClick={handleEnroll}>加入学习</Button>
          )}
        </Space>
      </div>

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          panOnDrag
          zoomOnScroll
        >
          <Background gap={20} color="#f0f0f0" />
          <Controls showInteractive={false} />
          <MiniMap />
        </ReactFlow>
      </div>

      <NodeResourceDrawer
        open={drawerOpen}
        nodeTitle={selectedNodeTitle}
        resources={selectedResources}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
