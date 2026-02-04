import { Divider, Space, Typography } from "antd";

const { Text } = Typography;

export default function CommunityFooter() {
  return (
    <div style={{ marginTop: 32 }}>
      <Divider />
      <Space
        direction="vertical"
        style={{ width: "100%", alignItems: "center" }}
      >
        <Text type="secondary">学习社区平台</Text>
        <Text type="secondary">
          © 2026 Study-Com Platform. All rights reserved.
        </Text>
      </Space>
    </div>
  );
}
