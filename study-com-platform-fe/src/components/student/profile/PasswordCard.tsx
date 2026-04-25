import { Card, Form, Input, Typography, Space, Progress } from "antd";
import { LockOutlined, SafetyOutlined, WarningOutlined } from "@ant-design/icons";
import { useState, useMemo, useEffect } from "react";
import { getPasswordStrength } from "../../../utils/password";
import type { PasswordStrength } from "../../../utils/password";

const { Text } = Typography;

interface PasswordCardProps {
  onPasswordStrengthChange?: (isValid: boolean) => void;
}

export default function PasswordCard({ onPasswordStrengthChange }: PasswordCardProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const passwordStrength: PasswordStrength = useMemo(
    () => getPasswordStrength(newPassword), 
    [newPassword]
  );

  useEffect(() => {
    onPasswordStrengthChange?.(passwordStrength.isValid || newPassword.length === 0);
  }, [passwordStrength.isValid, newPassword.length, onPasswordStrengthChange]);

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    onPasswordStrengthChange?.(passwordStrength.isValid || value.length === 0);
  };

  return (
    <Card
      title={
        <Space>
          <LockOutlined style={{ color: "#faad14" }} />
          <span>密码安全</span>
        </Space>
      }
      className="profile-card fade-in-up"
      style={{ height: "100%" }}
    >
      <Form.Item
        label={
          <span>
            <LockOutlined style={{ marginRight: 8, color: "#faad14" }} />
            当前密码
          </span>
        }
        name="currentPassword"
        className="profile-form"
      >
        <Input.Password
          placeholder="请输入当前密码"
          size="large"
          className="profile-form"
        />
      </Form.Item>

      <Form.Item
        label={
          <span>
            <LockOutlined style={{ marginRight: 8, color: "#52c41a" }} />
            新密码
          </span>
        }
        name="newPassword"
        rules={[
          { min: 8, message: "密码至少8位" },
          { max: 32, message: "密码最多32位" },
          {
            validator(_, value) {
              if (!value) {
                return Promise.resolve();
              }
              const strength = getPasswordStrength(value);
              if (!strength.isValid) {
                const unmetRequirements = strength.requirements.filter(r => !r.met);
                const unmetTexts = unmetRequirements.map(r => r.text).join("、");
                return Promise.reject(new Error(`密码强度不足，请满足以下要求：${unmetTexts}`));
              }
              return Promise.resolve();
            },
          },
        ]}
        className="profile-form"
      >
        <Input.Password
          placeholder="请输入新密码（需满足至少3项密码要求）"
          size="large"
          className="profile-form"
          value={newPassword}
          onChange={handleNewPasswordChange}
          onFocus={() => setShowPasswordStrength(true)}
        />
      </Form.Item>

      {showPasswordStrength && newPassword.length > 0 && (
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

      <Form.Item
        label={
          <span>
            <LockOutlined style={{ marginRight: 8, color: "#52c41a" }} />
            确认新密码
          </span>
        }
        name="confirmPassword"
        dependencies={['newPassword']}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newPassword') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致'));
            },
          }),
        ]}
        className="profile-form"
      >
        <Input.Password
          placeholder="请再次输入新密码"
          size="large"
          className="profile-form"
        />
      </Form.Item>

      <div className="password-tip-box">
        <Text type="warning">
          <strong>💡 提示：</strong>如不修改密码，请留空当前密码和新密码字段。建议使用包含大小写字母、数字和特殊字符的强密码。
        </Text>
      </div>
    </Card>
  );
}
