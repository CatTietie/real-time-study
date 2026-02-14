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
import {
  LockOutlined,
  UserOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from "@ant-design/icons";

const { Text } = Typography;

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
    <div 
      className="login-page"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* 背景装饰元素 */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(125, 211, 252, 0.1) 0%, transparent 50%),
                         radial-gradient(circle at 75% 75%, rgba(56, 189, 248, 0.1) 0%, transparent 50%)`,
        backgroundSize: "60px 60px",
        opacity: 0.3
      }} />
      
      {/* 自习室剪影装饰 */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "120px",
        background: `linear-gradient(transparent 0%, 
          rgba(219, 234, 254, 0.8) 70%, 
          rgba(191, 219, 254, 0.6) 100%)`,
        maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0,60 Q150,30 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z' fill='%23000'/%3E%3C/svg%3E")`,
        maskRepeat: "repeat-x",
        maskPosition: "bottom",
        opacity: 0.4
      }} />
      
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
          zIndex: 10
        }}
      >
        {/* 品牌标识区域 */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            marginBottom: "12px",
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 800,
            fontSize: "24px",
            lineHeight: 1.3
          }}>
            实时协同自习室与学习社区
          </div>
          <Text 
            type="secondary" 
            style={{ 
              fontSize: "14px",
              color: "#64748b",
              fontWeight: 500
            }}
          >
            找到同频伙伴，开启高效学习之旅
          </Text>
        </div>
        
        {/* 身份选择器 */}
        <div style={{ marginBottom: "28px" }}>
          <Segmented
            options={[
              { 
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                    </svg>
                    管理员
                  </span>
                ), 
                value: "admin" 
              },
              { 
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-1-9h2v4h-2V8z"/>
                    </svg>
                    学生
                  </span>
                ), 
                value: "student" 
              },
            ]}
            value={role}
            onChange={(value) => setRole(value as "admin" | "student")}
            block
            style={{
              borderRadius: "12px",
              backgroundColor: "#f1f5f9",
              padding: "4px",
              border: "1px solid #e2e8f0"
            }}
          />
        </div>
        
        {/* 登录表单 */}
        <Form 
          layout="vertical" 
          onFinish={onFinish}
          style={{ marginTop: "8px" }}
        >
          <Form.Item
            label={
              <span style={{ 
                fontWeight: 600, 
                color: "#334155",
                fontSize: "14px"
              }}>
                <UserOutlined style={{ marginRight: "8px", color: "#0ea5e9" }} />
                账号
              </span>
            }
            name="username"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input
              placeholder={role === "admin" ? "请输入管理员账号" : "请输入学号/账号"}
              size="large"
              style={{
                borderRadius: "12px",
                borderColor: "#cbd5e1",
                background: "#f8fafc",
                transition: "all 0.3s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#0ea5e9";
                e.target.style.boxShadow = "0 0 0 2px rgba(14, 165, 233, 0.2)";
                e.target.style.background = "white";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#cbd5e1";
                e.target.style.boxShadow = "none";
                e.target.style.background = "#f8fafc";
              }}
            />
          </Form.Item>
          
          <Form.Item
            label={
              <span style={{ 
                fontWeight: 600, 
                color: "#334155",
                fontSize: "14px"
              }}>
                <LockOutlined style={{ marginRight: "8px", color: "#10b981" }} />
                密码
              </span>
            }
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password 
              placeholder="请输入密码"
              size="large"
              style={{
                borderRadius: "12px",
                borderColor: "#cbd5e1",
                background: "#f8fafc",
                transition: "all 0.3s ease"
              }}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                input.style.borderColor = "#10b981";
                input.style.boxShadow = "0 0 0 2px rgba(16, 185, 129, 0.2)";
                input.style.background = "white";
              }}
              onBlur={(e) => {
                const input = e.target as HTMLInputElement;
                input.style.borderColor = "#cbd5e1";
                input.style.boxShadow = "none";
                input.style.background = "#f8fafc";
              }}
            />
          </Form.Item>
          
          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            loading={loading}
            size="large"
            style={{
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              border: "none",
              fontWeight: 600,
              fontSize: "16px",
              marginTop: "8px",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.background = "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)";
            }}
          >
            {loading ? "正在登录…" : "立即登录"}
          </Button>
        </Form>
        
        {/* 注册引导 */}
        <div style={{ 
          marginTop: "24px", 
          textAlign: "center",
          paddingTop: "20px",
          borderTop: "1px solid #e2e8f0"
        }}>
          <Space size="small">
            <Text type="secondary" style={{ fontSize: "14px" }}>
              还没有账号？
            </Text>
            <Link 
              to="/register"
              style={{
                color: "#0ea5e9",
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.2s ease",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = "underline";
                e.currentTarget.style.color = "#0284c7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = "none";
                e.currentTarget.style.color = "#0ea5e9";
              }}
            >
              立即注册
            </Link>
          </Space>
          <div style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#64748b",
            background: "#f1f5f9",
            padding: "8px 16px",
            borderRadius: "20px",
            display: "inline-block"
          }}>
            🎁 新用户注册享专属学习礼包
          </div>
        </div>
      </Card>
      
      {/* 响应式样式 */}
      <style>
        {`
          @media (max-width: 480px) {
            .login-page {
              padding: 12px !important;
            }
            
            .login-card {
              padding: 24px 20px !important;
              margin: 0 16px !important;
            }
          }
          
          @media (max-width: 360px) {
            .login-card {
              padding: 20px 16px !important;
            }
          }
        `}
      </style>
    </div>
  );
}
