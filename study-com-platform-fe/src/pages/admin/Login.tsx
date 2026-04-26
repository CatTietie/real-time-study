import {
  Button,
  Card,
  Form,
  Input,
  Segmented,
  Space,
  Typography,
  message,
  Progress,
} from "antd";
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { loginSuccess } from "../../features/auth/authSlice";
import { adminLogin, studentLogin } from "../../services/auth";
import {
  LockOutlined,
  UserOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SafetyOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import loginBg from "../../assets/image.png";

const { Text } = Typography;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
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

  return { score, label, color, requirements };
};

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"admin" | "student">("admin");
  const [password, setPassword] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockEndTime, setLockEndTime] = useState<Date | null>(null);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedAttempts;
  const isOverLimit = failedAttempts >= MAX_LOGIN_ATTEMPTS;

  const onFinish = async (values: { username: string; password: string }) => {
    if (isLocked) {
      const now = new Date();
      if (lockEndTime && now < lockEndTime) {
        const remainingMinutes = Math.ceil((lockEndTime.getTime() - now.getTime()) / 60000);
        message.error(`账号已被临时锁定，请 ${remainingMinutes} 分钟后重试`);
        return;
      } else {
        setIsLocked(false);
        setLockEndTime(null);
        setFailedAttempts(0);
      }
    }

    if (isOverLimit && !isLocked) {
      setIsLocked(true);
      const endTime = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
      setLockEndTime(endTime);
      message.error(`登录失败次数过多，账号已被临时锁定 ${LOCK_DURATION_MINUTES} 分钟`);
      return;
    }

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
          avatar: result.data.avatar,
        }),
      );
      setFailedAttempts(0);
      setIsLocked(false);
      setLockEndTime(null);
      message.success("登录成功");
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/student/entry", { replace: true });
      }
    } catch (error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      const msg = error instanceof Error ? error.message : "登录失败";
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setIsLocked(true);
        const endTime = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
        setLockEndTime(endTime);
        message.error(`登录失败次数过多，账号已被临时锁定 ${LOCK_DURATION_MINUTES} 分钟`);
      } else {
        const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
        message.error(`${msg}（剩余尝试次数：${remaining} 次）`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="login-page"
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* 背景遮罩层，确保文字清晰可读 */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 64, 175, 0.5) 50%, rgba(14, 165, 233, 0.4) 100%)",
        zIndex: 1
      }} />
      
      {/* 背景装饰元素 */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(125, 211, 252, 0.15) 0%, transparent 50%),
                         radial-gradient(circle at 75% 75%, rgba(56, 189, 248, 0.15) 0%, transparent 50%)`,
        backgroundSize: "60px 60px",
        opacity: 0.4,
        zIndex: 2
      }} />
      
      {/* 自习室剪影装饰 */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "120px",
        background: `linear-gradient(transparent 0%, 
          rgba(15, 23, 42, 0.6) 70%, 
          rgba(15, 23, 42, 0.8) 100%)`,
        maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0,60 Q150,30 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z' fill='%23000'/%3E%3C/svg%3E")`,
        maskRepeat: "repeat-x",
        maskPosition: "bottom",
        opacity: 0.5,
        zIndex: 2
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordStrength(true)}
              style={{
                borderRadius: "12px",
                borderColor: "#cbd5e1",
                background: "#f8fafc",
                transition: "all 0.3s ease"
              }}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              onFocusCapture={(e) => {
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
          
          {/* 密码强度指示器 */}
          {showPasswordStrength && password.length > 0 && (
            <div style={{ 
              marginBottom: "20px",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0"
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
                <Text style={{ 
                  fontWeight: 600, 
                  color: passwordStrength.color 
                }}>
                  {passwordStrength.label}
                </Text>
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
            </div>
          )}
          
          {/* 登录失败次数警告 */}
          {failedAttempts > 0 && !isLocked && (
            <div style={{ 
              marginBottom: "16px",
              padding: "10px 14px",
              background: "#fffbeb",
              borderRadius: "8px",
              border: "1px solid #fde68a",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <WarningOutlined style={{ color: "#f59e0b", fontSize: "16px" }} />
              <Text style={{ fontSize: "13px", color: "#92400e" }}>
                已尝试 {failedAttempts} 次，剩余 {remainingAttempts} 次机会
              </Text>
            </div>
          )}
          
          {/* 账号锁定警告 */}
          {isLocked && lockEndTime && (
            <div style={{ 
              marginBottom: "16px",
              padding: "12px 16px",
              background: "#fef2f2",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <WarningOutlined style={{ color: "#ef4444", fontSize: "18px" }} />
              <div>
                <Text style={{ fontSize: "13px", color: "#991b1b", fontWeight: 600, display: "block" }}>
                  账号已被临时锁定
                </Text>
                <Text style={{ fontSize: "12px", color: "#dc2626" }}>
                  请 {Math.ceil((lockEndTime.getTime() - Date.now()) / 60000)} 分钟后重试
                </Text>
              </div>
            </div>
          )}
          
          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            loading={loading}
            disabled={isLocked}
            size="large"
            style={{
              height: "48px",
              borderRadius: "12px",
              background: isLocked 
                ? "#94a3b8" 
                : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              border: "none",
              fontWeight: 600,
              fontSize: "16px",
              marginTop: "8px",
              transition: "all 0.3s ease",
              cursor: isLocked ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => {
              if (!isLocked) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.background = "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)";
              }
            }}
          >
            {isLocked ? "账号已锁定" : loading ? "正在登录…" : "立即登录"}
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
