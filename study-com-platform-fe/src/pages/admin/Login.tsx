import {
  Button,
  Card,
  Form,
  Input,
  Segmented,
  Space,
  Typography,
  message,
} from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { loginSuccess } from "../../features/auth/authSlice";
import { adminLogin, studentLogin } from "../../services/auth";

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"admin" | "student">("admin");

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      const result =
        role === "admin"
          ? await adminLogin(values)
          : await studentLogin(values);
      if (!result.success || !result.data) {
        message.error(result.message || "登录失败");
        return;
      }
      dispatch(
        loginSuccess({
          token: result.data.token,
          role: result.data.role,
          username: result.data.username,
          userId: result.data.id,
          nickname: result.data.nickname,
        }),
      );
      message.success("登录成功");
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/student/entry", { replace: true });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "登录失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <Title level={3}>实时协同自习室与学习社区平台</Title>
        <Text type="secondary">请选择身份后登录</Text>
        <div style={{ marginTop: 16 }}>
          <Segmented
            options={[
              { label: "管理员", value: "admin" },
              { label: "学生", value: "student" },
            ]}
            value={role}
            onChange={(value) => setRole(value as "admin" | "student")}
            block
          />
        </div>
        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input
              placeholder={role === "admin" ? "管理员账号" : "学号/账号"}
            />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
          <Space style={{ marginTop: 12 }}>
            <Text type="secondary">没有账号？</Text>
            <Link to="/register">立即注册</Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
