import { Typography, Button } from "antd";
import { SaveOutlined, RollbackOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface CTABannerProps {
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function CTABanner({ loading, onSave, onCancel }: CTABannerProps) {
  return (
    <div className="cta-section fade-in-up">
      <div className="cta-banner">
        <div className="cta-content">
          <Title level={4} className="cta-title">
            确认保存您的设置
          </Title>
          <Text className="cta-subtitle">
            保存后，您的个人资料和学习目标将立即生效，系统将为您提供更精准的个性化服务
          </Text>
        </div>
        <div className="cta-buttons">
          <Button
            type="default"
            onClick={onCancel}
            icon={<RollbackOutlined />}
            className="cta-btn-default"
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={onSave}
            loading={loading}
            icon={<SaveOutlined />}
            className="cta-btn-primary"
          >
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
