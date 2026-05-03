import { Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function Banner() {
  return (
    <div className="profile-banner fade-in-up">
      <div className="profile-banner-content">
        <div className="profile-banner-text">
          <Title level={2} className="profile-banner-title">
            个人资料设置
          </Title>
          <Text className="profile-banner-subtitle">
            管理您的个人信息和学习目标，定制专属的学习体验。完善资料后，系统将为您提供更精准的学习推荐和个性化服务。
          </Text>
        </div>
        <div className="profile-banner-decoration">
          <UserOutlined className="profile-banner-icon" />
        </div>
      </div>
    </div>
  );
}
