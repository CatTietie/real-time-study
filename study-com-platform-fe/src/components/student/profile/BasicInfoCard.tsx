import { Card, Form, Input, Avatar, Upload, Button, Typography, Space } from "antd";
import { CameraOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface BasicInfoCardProps {
  avatarUrl: string;
  username: string;
  nickname: string;
  onAvatarUpload: (info: unknown) => void;
}

export default function BasicInfoCard({ 
  avatarUrl, 
  username, 
  nickname,
  onAvatarUpload 
}: BasicInfoCardProps) {
  return (
    <Card 
      title={
        <Space>
          <UserOutlined style={{ color: "#667eea" }} />
          <span>基本信息</span>
        </Space>
      }
      className="profile-card fade-in-up"
      style={{ height: "100%" }}
    >
      <div className="avatar-section">
        <div className="avatar-wrapper">
          <Avatar
            src={avatarUrl}
            icon={<UserOutlined />}
            className="avatar-main"
          />
          <Upload
            showUploadList={false}
            beforeUpload={() => false}
            onChange={onAvatarUpload}
            accept="image/*"
          >
            <Button
              type="primary"
              shape="circle"
              icon={<CameraOutlined />}
              className="avatar-upload-btn"
            />
          </Upload>
        </div>
        <Text className="avatar-hint">点击相机图标上传新头像</Text>
      </div>

      <Form.Item
        label={
          <span>
            <UserOutlined style={{ marginRight: 8, color: "#667eea" }} />
            昵称
          </span>
        }
        name="nickname"
        initialValue={nickname}
        rules={[
          { required: true, message: "请输入昵称" },
          { min: 2, max: 20, message: "昵称长度为2-20个字符" }
        ]}
        className="profile-form"
      >
        <Input
          placeholder="请输入您的昵称"
          size="large"
          className="profile-form"
        />
      </Form.Item>

      <Form.Item
        label={
          <span>
            <UserOutlined style={{ marginRight: 8, color: "#1890ff" }} />
            用户名
          </span>
        }
      >
        <Input
          value={username}
          disabled
          size="large"
          className="profile-form"
        />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
          用户名不可修改
        </Text>
      </Form.Item>
    </Card>
  );
}
