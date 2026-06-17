import { Form, InputNumber, Select, Button, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const conditionTypeOptions = [
  { label: "签到天数", value: "check_in_count" },
  { label: "积分", value: "points" },
  { label: "练习题数", value: "exercise_count" },
  { label: "正确率(%)", value: "correct_rate" },
  { label: "学习时长(分钟)", value: "study_duration" },
  { label: "连续登录天数", value: "login_streak" },
];

const operatorOptions = [
  { label: ">=", value: ">=" },
  { label: ">", value: ">" },
  { label: "=", value: "=" },
];

interface Props {
  value?: any[];
  onChange?: (value: any[]) => void;
}

export default function UnlockConditionEditor({ value = [], onChange }: Props) {
  const conditions = value || [];

  const handleAdd = () => {
    onChange?.([...conditions, { type: "points", operator: ">=", value: 0 }]);
  };

  const handleRemove = (index: number) => {
    const next = [...conditions];
    next.splice(index, 1);
    onChange?.(next);
  };

  const handleChange = (index: number, field: string, val: any) => {
    const next = [...conditions];
    next[index] = { ...next[index], [field]: val };
    onChange?.(next);
  };

  return (
    <div>
      {conditions.map((cond, idx) => (
        <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="center">
          <Select
            style={{ width: 140 }}
            value={cond.type}
            options={conditionTypeOptions}
            onChange={(v) => handleChange(idx, "type", v)}
          />
          <Select
            style={{ width: 70 }}
            value={cond.operator}
            options={operatorOptions}
            onChange={(v) => handleChange(idx, "operator", v)}
          />
          <InputNumber
            style={{ width: 100 }}
            value={cond.value}
            min={0}
            onChange={(v) => handleChange(idx, "value", v)}
          />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(idx)} />
        </Space>
      ))}
      <Button type="dashed" onClick={handleAdd} icon={<PlusOutlined />} style={{ width: "100%" }}>
        添加条件
      </Button>
    </div>
  );
}
