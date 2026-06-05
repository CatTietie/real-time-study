import React from "react";
import { Card, Col, Row } from "antd";
import {
  UserAddOutlined,
  FileAddOutlined,
  TeamOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";

interface KpiCardsProps {
  data: {
    newUsersToday: number;
    newUsersTodayChange: number;
    newPostsToday: number;
    newPostsTodayChange: number;
    activeUsersToday: number;
    activeUsersTodayChange: number;
    totalViewsToday: number;
    totalViewsTodayChange: number;
  } | null;
  darkMode?: boolean;
}

const cards = [
  { key: "newUsersToday", changeKey: "newUsersTodayChange", title: "今日新增用户", icon: <UserAddOutlined />, color: "#1890ff" },
  { key: "newPostsToday", changeKey: "newPostsTodayChange", title: "今日新增帖子", icon: <FileAddOutlined />, color: "#52c41a" },
  { key: "activeUsersToday", changeKey: "activeUsersTodayChange", title: "今日活跃用户", icon: <TeamOutlined />, color: "#faad14" },
  { key: "totalViewsToday", changeKey: "totalViewsTodayChange", title: "今日浏览量", icon: <EyeOutlined />, color: "#722ed1" },
] as const;

const KpiCards: React.FC<KpiCardsProps> = ({ data, darkMode }) => {
  const cardBg = darkMode ? "#1a1f36" : "#fff";
  const cardBorder = darkMode ? "1px solid #2a2f45" : undefined;
  const titleColor = darkMode ? "#aaa" : "#8c8c8c";
  const valueColor = darkMode ? "#fff" : undefined;

  return (
    <Row gutter={16}>
      {cards.map((item) => {
        const value = data ? (data as any)[item.key] : 0;
        const change = data ? (data as any)[item.changeKey] : 0;
        const isUp = change >= 0;

        return (
          <Col span={6} key={item.key}>
            <Card
              style={{ borderRadius: 8, background: cardBg, border: cardBorder }}
              styles={{ body: { padding: "20px 24px" } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: titleColor, fontSize: 14, marginBottom: 8 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: valueColor }}>{value}</div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: isUp ? "#52c41a" : "#ff4d4f" }}>
                      {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      {" "}{Math.abs(change)}%
                    </span>
                    <span style={{ color: titleColor, marginLeft: 8 }}>较昨日</span>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: `${item.color}${darkMode ? "30" : "15"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default KpiCards;
