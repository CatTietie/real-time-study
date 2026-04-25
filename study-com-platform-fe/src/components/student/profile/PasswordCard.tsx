import { Card, Form, Input, Typography, Space } from "antd";
import { LockOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function PasswordCard() {
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
          { min: 6, message: "密码至少6位" },
          { max: 32, message: "密码最多32位" }
        ]}
        className="profile-form"
      >
        <Input.Password
          placeholder="请输入新密码"
          size="large"
          className="profile-form"
        />
      </Form.Item>

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
