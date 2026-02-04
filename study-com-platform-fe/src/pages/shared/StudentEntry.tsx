import { Button, Card, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Text } = Typography;

export default function StudentEntry() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} align="center">
          <Title level={3}>学生入口</Title>
          <Text type="secondary">已登录学生账号</Text>
          <Button type="primary" onClick={() => navigate("/community")}>
            进入社区
          </Button>
        </Space>
      </Card>
      <CommunityFooter />
    </div>
  );
}
