import { Form, Input, Button } from "antd";

interface SimpleFormProps {
  onFinish: (values: Record<string, string>) => void;
}

export default function SimpleForm({ onFinish }: SimpleFormProps) {
  return (
    <Form layout="vertical" onFinish={onFinish}>
      <Form.Item
        label="标题"
        name="title"
        rules={[{ required: true, message: "请输入标题" }]}
      >
        <Input placeholder="请输入标题" />
      </Form.Item>
      <Form.Item label="内容" name="content">
        <Input.TextArea rows={4} placeholder="请输入内容" />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        提交
      </Button>
    </Form>
  );
}
