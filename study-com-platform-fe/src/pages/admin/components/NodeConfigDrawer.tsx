import { Drawer, Form, Input, Select, ColorPicker } from "antd";
import type { Color } from "antd/es/color-picker";
import UnlockConditionEditor from "./UnlockConditionEditor";
import ResourceEditor from "./ResourceEditor";
import { useEffect } from "react";

const nodeTypeOptions = [
  { label: "起始节点", value: "start" },
  { label: "普通节点", value: "normal" },
  { label: "里程碑", value: "milestone" },
  { label: "终点节点", value: "end" },
];

const iconOptions = [
  { label: "BookOutlined", value: "BookOutlined" },
  { label: "CodeOutlined", value: "CodeOutlined" },
  { label: "ExperimentOutlined", value: "ExperimentOutlined" },
  { label: "TrophyOutlined", value: "TrophyOutlined" },
  { label: "RocketOutlined", value: "RocketOutlined" },
  { label: "BulbOutlined", value: "BulbOutlined" },
  { label: "StarOutlined", value: "StarOutlined" },
  { label: "ThunderboltOutlined", value: "ThunderboltOutlined" },
  { label: "FireOutlined", value: "FireOutlined" },
  { label: "CrownOutlined", value: "CrownOutlined" },
];

interface NodeData {
  id?: number;
  _tempId?: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  node_type: string;
  unlock_conditions: any[] | null;
  resources: any[];
}

interface Props {
  open: boolean;
  nodeData: NodeData | null;
  onClose: () => void;
  onSave: (data: NodeData) => void;
}

export default function NodeConfigDrawer({ open, nodeData, onClose, onSave }: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (nodeData && open) {
      form.setFieldsValue({
        ...nodeData,
        color: nodeData.color,
      });
    }
  }, [nodeData, open]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const color = typeof values.color === "string" ? values.color : (values.color as Color)?.toHexString?.() || "#1890ff";
      onSave({
        ...nodeData,
        ...values,
        color,
        unlock_conditions: values.unlock_conditions?.length > 0 ? values.unlock_conditions : null,
      });
      onClose();
    } catch {
      // validation error
    }
  };

  return (
    <Drawer
      title="节点配置"
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <a onClick={handleSave} style={{ cursor: "pointer" }}>保存</a>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入节点标题" }]}>
          <Input placeholder="节点标题" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="节点描述" />
        </Form.Item>
        <Form.Item name="node_type" label="节点类型">
          <Select options={nodeTypeOptions} />
        </Form.Item>
        <Form.Item name="icon" label="图标">
          <Select options={iconOptions} />
        </Form.Item>
        <Form.Item name="color" label="颜色">
          <ColorPicker />
        </Form.Item>
        <Form.Item name="unlock_conditions" label="解锁条件">
          <UnlockConditionEditor />
        </Form.Item>
        <Form.Item name="resources" label="关联资源">
          <ResourceEditor />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
