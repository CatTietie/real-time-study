import { Card, Typography, Row, Col, Statistic } from "antd";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";
import "./StudentEntry.less";

const { Title, Text } = Typography;

export default function StudentEntry() {
  const navigate = useNavigate();
  const { username } = useAppSelector((state: RootState) => state.auth);

  const quickActions = [
    {
      title: "学习社区",
      description: "参与讨论，分享学习心得",
      icon: "👥",
      onClick: () => navigate("/community"),
      color: "#e34d2c"
    },
    {
      title: "个人中心",
      description: "查看个人信息和学习记录",
      icon: "👤",
      onClick: () => navigate("/student/dashboard"),
      color: "#52c41a"
    },
    {
      title: "自习室",
      description: "进入虚拟自习环境",
      icon: "📚",
      onClick: () => navigate("/student/study-room"),
      color: "#faad14"
    },
    {
      title: "学习统计",
      description: "查看学习数据分析",
      icon: "📊",
      onClick: () => navigate("/student/analytics"),
      color: "#722ed1"
    }
  ];

  return (
    <div className="student-entry-page">
      {/* 顶部欢迎区域 */}
      <div className="welcome-section">
        <div className="welcome-content">
          <Title level={2} className="welcome-title">
            欢迎回来，{username || "同学"}！
          </Title>
          <Text type="secondary" className="welcome-subtitle">
            在这里开启你的学习之旅
          </Text>
        </div>
      </div>

      {/* 快捷功能卡片 */}
      <div className="quick-actions-section">
        <Title level={4} className="section-title">快捷入口</Title>
        <Row gutter={[24, 24]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} md={12} lg={6} key={index}>
              <Card 
                hoverable
                className="action-card"
                onClick={action.onClick}
                style={{ 
                  borderColor: action.color,
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                <div className="action-content">
                  <div 
                    className="action-icon" 
                    style={{ backgroundColor: action.color }}
                  >
                    <span className="icon-text">{action.icon}</span>
                  </div>
                  <Title level={5} className="action-title">
                    {action.title}
                  </Title>
                  <Text type="secondary" className="action-description">
                    {action.description}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 学习统计数据预览 */}
      <div className="stats-preview-section">
        <Card>
          <Title level={4} className="section-title">学习概况</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="社区积分" value={1280} suffix="分" />
            </Col>
            <Col span={6}>
              <Statistic title="发帖数量" value={24} suffix="篇" />
            </Col>
            <Col span={6}>
              <Statistic title="学习时长" value={45} suffix="小时" />
            </Col>
            <Col span={6}>
              <Statistic title="连续打卡" value={7} suffix="天" />
            </Col>
          </Row>
        </Card>
      </div>

      <CommunityFooter />
    </div>
  );
}