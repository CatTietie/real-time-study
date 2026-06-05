import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Space, message, Dropdown, Spin } from "antd";
import { ArrowLeftOutlined, PlusOutlined, SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getAdminPathById, saveTree } from "../../services/learningPath";
import NodeConfigDrawer from "./components/NodeConfigDrawer";

const nodeTypeColors: Record<string, string> = {
  start: "#52c41a",
  normal: "#1890ff",
  milestone: "#722ed1",
  end: "#fa8c16",
};

function SkillNode({ data, selected }: any) {
  const borderColor = selected ? "#1890ff" : (data.color || "#1890ff");
  const bgColor = data.node_type === "start" ? "#f6ffed" : data.node_type === "milestone" ? "#f9f0ff" : "#fff";

  return (
    <div
      style={{
        padding: "8px 16px",
        border: `2px solid ${borderColor}`,
        borderRadius: data.node_type === "milestone" ? 12 : 6,
        background: bgColor,
        minWidth: 120,
        textAlign: "center",
        boxShadow: selected ? "0 0 8px rgba(24,144,255,0.4)" : "0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#555" }} />
      <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>
        {data.node_type === "start" ? "起点" : data.node_type === "milestone" ? "里程碑" : data.node_type === "end" ? "终点" : ""}
      </div>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{data.title || "未命名节点"}</div>
      {data.unlock_conditions?.length > 0 && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
          {data.unlock_conditions.length} 个解锁条件
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#555" }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  skillNode: SkillNode,
};

export default function LearningPathEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pathName, setPathName] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const deletedNodeIds = useRef<number[]>([]);
  const deletedEdgeIds = useRef<number[]>([]);
  const tempIdCounter = useRef(0);

  useEffect(() => {
    loadPathData();
  }, [id]);

  const loadPathData = async () => {
    try {
      setLoading(true);
      const res = await getAdminPathById(Number(id));
      if (res.success) {
        const pathData = res.data;
        setPathName(pathData.name);

        const rfNodes: Node[] = (pathData.Nodes || []).map((n: any) => ({
          id: String(n.id),
          type: "skillNode",
          position: { x: n.position_x, y: n.position_y },
          data: {
            title: n.title,
            description: n.description,
            icon: n.icon,
            color: n.color,
            node_type: n.node_type,
            unlock_conditions: n.unlock_conditions,
            resources: n.Resources || [],
            dbId: n.id,
          },
        }));

        const rfEdges: Edge[] = (pathData.Edges || []).map((e: any) => ({
          id: String(e.id),
          source: String(e.source_node_id),
          target: String(e.target_node_id),
          animated: true,
          style: { stroke: "#999" },
          data: { dbId: e.id },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      }
    } catch {
      message.error("加载路径数据失败");
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#999" } }, eds));
  }, [setEdges]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  }, []);

  const handleNodeSave = (data: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode?.id) {
          return { ...n, data: { ...n.data, ...data } };
        }
        return n;
      })
    );
  };

  const addNode = (nodeType: string) => {
    const tempId = `temp_${++tempIdCounter.current}`;
    const newNode: Node = {
      id: tempId,
      type: "skillNode",
      position: { x: 250 + Math.random() * 200, y: 100 + nodes.length * 120 },
      data: {
        title: nodeType === "start" ? "起点" : nodeType === "milestone" ? "里程碑" : nodeType === "end" ? "终点" : "新节点",
        description: "",
        icon: "BookOutlined",
        color: nodeTypeColors[nodeType] || "#1890ff",
        node_type: nodeType,
        unlock_conditions: null,
        resources: [],
        _tempId: tempId,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelected = () => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    for (const n of selectedNodes) {
      const dbId = n.data?.dbId;
      if (dbId) deletedNodeIds.current.push(dbId as number);
    }
    for (const e of selectedEdges) {
      const dbId = (e.data as any)?.dbId;
      if (dbId) deletedEdgeIds.current.push(dbId as number);
    }

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target) && !e.selected));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const nodesPayload = nodes.map((n, idx) => ({
        id: n.data?.dbId || undefined,
        _tempId: n.data?._tempId || n.id,
        title: n.data?.title || "未命名",
        description: n.data?.description || "",
        position_x: n.position.x,
        position_y: n.position.y,
        icon: n.data?.icon || "BookOutlined",
        color: n.data?.color || "#1890ff",
        node_type: n.data?.node_type || "normal",
        unlock_conditions: n.data?.unlock_conditions || null,
        sort_order: idx,
        resources: n.data?.resources || [],
      }));

      const edgesPayload = edges.map((e) => ({
        id: (e.data as any)?.dbId || undefined,
        source_node_id: isNaN(Number(e.source)) ? e.source : Number(e.source),
        target_node_id: isNaN(Number(e.target)) ? e.target : Number(e.target),
      }));

      const res = await saveTree(Number(id), {
        nodes: nodesPayload,
        edges: edgesPayload,
        deleted_node_ids: deletedNodeIds.current,
        deleted_edge_ids: deletedEdgeIds.current,
      });

      if (res.success) {
        message.success("保存成功");
        deletedNodeIds.current = [];
        deletedEdgeIds.current = [];
        loadPathData();
      }
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const addNodeMenuItems = [
    { key: "start", label: "起始节点" },
    { key: "normal", label: "普通节点" },
    { key: "milestone", label: "里程碑节点" },
    { key: "end", label: "终点节点" },
  ];

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin/learning-paths")}>返回</Button>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{pathName}</span>
        </Space>
        <Space>
          <Dropdown menu={{ items: addNodeMenuItems, onClick: ({ key }) => addNode(key) }}>
            <Button icon={<PlusOutlined />}>添加节点</Button>
          </Dropdown>
          <Button icon={<DeleteOutlined />} onClick={deleteSelected}>删除选中</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
        </Space>
      </div>

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
        >
          <Background gap={20} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <NodeConfigDrawer
        open={drawerOpen}
        nodeData={selectedNode ? {
          id: selectedNode.data?.dbId,
          _tempId: selectedNode.data?._tempId,
          title: selectedNode.data?.title,
          description: selectedNode.data?.description,
          icon: selectedNode.data?.icon,
          color: selectedNode.data?.color,
          node_type: selectedNode.data?.node_type,
          unlock_conditions: selectedNode.data?.unlock_conditions,
          resources: selectedNode.data?.resources || [],
        } : null}
        onClose={() => setDrawerOpen(false)}
        onSave={handleNodeSave}
      />
    </div>
  );
}
