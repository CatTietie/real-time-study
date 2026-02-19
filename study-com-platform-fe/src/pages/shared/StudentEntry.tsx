import { Card, Typography, Row, Col } from "antd";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";
import "./StudentEntry.less";

const { Title, Text } = Typography;

export default function StudentEntry() {
  console.log('=== StudentEntry 组件执行 ===');
  const navigate = useNavigate();
  const { username } = useAppSelector((state: RootState) => state.auth);
  console.log('StudentEntry 用户名:', username);

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
      onClick: () => {
        console.log('=== 点击个人中心按钮 ===');
        console.log('准备跳转到: /student/dashboard');
        navigate("/student/dashboard");
      },
      color: "#52c41a"
    },
    {
      title: "自习室",
      description: "进入虚拟自习环境",
      icon: "📚",
      onClick: () => navigate("/student/study-rooms"),
      color: "#faad14"
    },
    {
      title: "实时聊天",
      description: "与其他同学实时交流讨论",
      icon: "💬",
      onClick: () => navigate("/student/chat"),
      color: "#1890ff"
    },
    {
      title: "协作白板",
      description: "多人协作绘图和头脑风暴",
      icon: "✏️",
      onClick: () => navigate("/student/whiteboard"),
      color: "#52c41a"
    }
  ];

  return (
    <div className="student-entry-page">
      <div className="content-wrapper">
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
          <div className="cards-container">
            <Row gutter={[24, 24]} justify="center">
              {quickActions.map((action, index) => (
                <Col 
                  xs={24} 
                  sm={12} 
                  md={8} 
                  lg={4} 
                  xl={4}
                  key={index}
                >
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
        </div>
      </div>

      <CommunityFooter />
    </div>
  );
}