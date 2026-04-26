import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
  message,
  Progress,
} from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { registerStudent } from "../../services/auth";
import {
  LockOutlined,
  UserOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SafetyOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  isValid: boolean;
  requirements: {
    met: boolean;
    text: string;
  }[];
}

const getPasswordStrength = (password: string): PasswordStrength => {
  const requirements = [
    { met: password.length >= 8, text: "至少8个字符" },
    { met: /[A-Z]/.test(password), text: "包含大写字母" },
    { met: /[a-z]/.test(password), text: "包含小写字母" },
    { met: /[0-9]/.test(password), text: "包含数字" },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: "包含特殊字符" },
  ];

  const metCount = requirements.filter(r => r.met).length;
  
  let score = 0;
  let label = "弱";
  let color = "#ff4d4f";

  if (metCount >= 5) {
    score = 100;
    label = "非常强";
    color = "#52c41a";
  } else if (metCount >= 4) {
    score = 80;
    label = "强";
    color = "#73d13d";
  } else if (metCount >= 3) {
    score = 60;
    label = "中等";
    color = "#faad14";
  } else if (metCount >= 2) {
    score = 40;
    label = "弱";
    color = "#fa8c16";
  } else {
    score = 20;
    label = "非常弱";
    color = "#ff4d4f";
  }

  const isValid = metCount >= 3;

  return { score, label, color, isValid, requirements };
};

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const onFinish = async (values: {
    username: string;
    password: string;
    nickname?: string;
  }) => {
    if (!passwordStrength.isValid) {
      const unmetRequirements = passwordStrength.requirements.filter(r => !r.met);
      const unmetTexts = unmetRequirements.map(r => r.text).join("、");
      message.error(`密码强度不足，请满足以下要求：${unmetTexts}`);
      return;
    }

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
      <Card 
        className="login-card"
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)",
          backdropFilter: "blur(10px)",
          background: "rgba(255, 255, 255, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          padding: "40px 32px",
          position: "relative",
          margin: "40px auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Title level={3} style={{ marginBottom: "8px" }}>学生注册</Title>
          <Text type="secondary" style={{ fontSize: "14px" }}>管理员账号需由系统创建</Text>
        </div>
        
        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item
            label={
              <span style={{ fontWeight: 600, color: "#334155", fontSize: "14px" }}>
                <UserOutlined style={{ marginRight: "8px", color: "#0ea5e9" }} />
                账号
              </span>
            }
            name="username"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input 
              placeholder="学号或手机号" 
              size="large"
              style={{
                borderRadius: "12px",
                borderColor: "#cbd5e1",
                background: "#f8fafc",
              }}
            />
          </Form.Item>
          
          <Form.Item
            label={
              <span style={{ fontWeight: 600, color: "#334155", fontSize: "14px" }}>
                昵称
              </span>
            }
            name="nickname"
          >
            <Input 
              placeholder="昵称（可选）" 
              size="large"
              style={{
                borderRadius: "12px",
                borderColor: "#cbd5e1",
                background: "#f8fafc",
              }}
            />
          </Form.Item>
          
          <Form.Item
            label={
              <span style={{ fontWeight: 600, color: "#334155", fontSize: "14px" }}>
                <LockOutlined style={{ marginRight: "8px", color: "#10b981" }} />
                密码
              </span>
            }
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password 
              placeholder="设置密码（需满足至少3项密码要求）"
              size="large"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordStrength(true)}
              style={{
                borderRadius: "12px",
                borderColor: "#cbd5e1",
                background: "#f8fafc",
              }}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
          
          {showPasswordStrength && password.length > 0 && (
            <div style={{ 
              marginBottom: "20px",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: `1px solid ${passwordStrength.isValid ? "#d1fae5" : "#fee2e2"}`
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                marginBottom: "8px"
              }}>
                <Space size="small">
                  <SafetyOutlined style={{ color: passwordStrength.color }} />
                  <Text style={{ fontWeight: 600, color: "#334155" }}>密码强度</Text>
                </Space>
                <Space size="small">
                  <Text style={{ fontWeight: 600, color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </Text>
                  {!passwordStrength.isValid && (
                    <Text type="danger" style={{ fontSize: "12px" }}>（强度不足）</Text>
                  )}
                </Space>
              </div>
              <Progress 
                percent={passwordStrength.score} 
                strokeColor={passwordStrength.color}
                showInfo={false}
                size="small"
                style={{ marginBottom: "12px" }}
              />
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "6px"
              }}>
                {passwordStrength.requirements.map((req, index) => (
                  <div 
                    key={`req-${index}-${req.met ? 'met' : 'unmet'}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: req.met ? "#52c41a" : "#94a3b8"
                    }}
                  >
                    <span style={{ fontSize: "12px" }}>
                      {req.met ? (
                        <SafetyOutlined />
                      ) : (
                        <WarningOutlined />
                      )}
                    </span>
                    <span>{req.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ 
                marginTop: "12px", 
                paddingTop: "12px", 
                borderTop: "1px solid #e2e8f0",
                fontSize: "12px",
                color: "#64748b"
              }}>
                <SafetyOutlined style={{ marginRight: "4px" }} />
                提示：密码需要满足以上至少 3 项要求
              </div>
            </div>
          )}
          
          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            loading={loading}
            disabled={!passwordStrength.isValid && password.length > 0}
            size="large"
            style={{
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              border: "none",
              fontWeight: 600,
              fontSize: "16px",
              marginTop: "8px",
            }}
          >
            注册
          </Button>
          
          <Space style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
            <Text type="secondary" style={{ fontSize: "14px" }}>已有账号？</Text>
            <Link 
              to="/admin/login"
              style={{
                color: "#0ea5e9",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              返回登录
            </Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
