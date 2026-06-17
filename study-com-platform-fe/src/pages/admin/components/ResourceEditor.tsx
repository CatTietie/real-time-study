import { Form, Input, Select, Button, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const resourceTypeOptions = [
  { label: "题库", value: "question_bank" },
  { label: "帖子", value: "post" },
  { label: "外部链接", value: "external_link" },
];

interface Resource {
  id?: number;
  resource_type: string;
  resource_id?: number;
  title: string;
  url?: string;
  sort_order: number;
}

interface Props {
  value?: Resource[];
  onChange?: (value: Resource[]) => void;
}

export default function ResourceEditor({ value = [], onChange }: Props) {
  const resources = value || [];

  const handleAdd = () => {
    onChange?.([...resources, { resource_type: "external_link", title: "", url: "", sort_order: resources.length }]);
  };

  const handleRemove = (index: number) => {
    const next = [...resources];
    next.splice(index, 1);
    onChange?.(next);
  };

  const handleChange = (index: number, field: string, val: any) => {
    const next = [...resources];
    next[index] = { ...next[index], [field]: val };
    onChange?.(next);
  };

  return (
    <div>
      {resources.map((res, idx) => (
        <Space key={idx} direction="vertical" style={{ display: "flex", marginBottom: 12, padding: 8, border: "1px solid #f0f0f0", borderRadius: 4 }}>
          <Space style={{ width: "100%" }}>
            <Select
              style={{ width: 120 }}
              value={res.resource_type}
              options={resourceTypeOptions}
              onChange={(v) => handleChange(idx, "resource_type", v)}
            />
            <Input
              style={{ flex: 1 }}
              placeholder="资源标题"
              value={res.title}
              onChange={(e) => handleChange(idx, "title", e.target.value)}
            />
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(idx)} />
          </Space>
          {res.resource_type === "external_link" && (
            <Input
              placeholder="链接 URL"
              value={res.url}
              onChange={(e) => handleChange(idx, "url", e.target.value)}
            />
          )}
          {res.resource_type !== "external_link" && (
            <Input
              placeholder="资源 ID"
              value={res.resource_id?.toString() || ""}
              onChange={(e) => handleChange(idx, "resource_id", Number(e.target.value) || undefined)}
            />
          )}
        </Space>
      ))}
      <Button type="dashed" onClick={handleAdd} icon={<PlusOutlined />} style={{ width: "100%" }}>
        添加资源
      </Button>
    </div>
  );
}
