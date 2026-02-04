import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerStudent } from "../../services/auth";

const { Title, Text } = Typography;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    username: string;
    password: string;
    nickname?: string;
  }) => {
    try {
      setLoading(true);
      const result = await registerStudent(values);
      if (!result.success) {
        message.error(result.message || "注册失败");
        return;
      }
      message.success("注册成功，请登录");
      navigate("/admin/login", { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "注册失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <Title level={3}>学生注册</Title>
        <Text type="secondary">管理员账号需由系统创建</Text>
        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input placeholder="学号或手机号" />
          </Form.Item>
          <Form.Item label="昵称" name="nickname">
            <Input placeholder="昵称（可选）" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="设置密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            注册
          </Button>
          <Space style={{ marginTop: 12 }}>
            <Text type="secondary">已有账号？</Text>
            <Link to="/admin/login">返回登录</Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
