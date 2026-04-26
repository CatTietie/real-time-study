import { Layout, Menu, Avatar, Dropdown, Space, Typography } from "antd";
import {
  HomeOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  MessageOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import type { RootState } from "../../app/store";
import "../../styles/student-layout.css";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username } = authState;

  const menuItems = [
    {
      key: "/student/dashboard",
      icon: <HomeOutlined />,
      label: <Link to="/student/dashboard">个人中心</Link>,
    },
    {
      key: "/student/study-rooms",
      icon: <UsergroupAddOutlined />,
      label: <Link to="/student/study-rooms">自习室</Link>,
    },
    {
      key: "/student/my-reservations",
      icon: <CalendarOutlined />,
      label: <Link to="/student/my-reservations">我的预约</Link>,
    },
    {
      key: "/student/learning-analytics",
      icon: <BarChartOutlined />,
      label: <Link to="/student/learning-analytics">学习统计</Link>,
    },
    {
      key: "/student/chat",
      icon: <MessageOutlined />,
      label: <Link to="/student/chat">实时聊天</Link>,
    },
    {
      key: "/student/whiteboard",
      icon: <EditOutlined />,
      label: <Link to="/student/whiteboard">协作白板</Link>,
    },
    {
      key: "/student/profile",
      icon: <SettingOutlined />,
      label: <Link to="/student/profile">个人设置</Link>,
    },
  ];

  const userMenuItems = [
    {
      key: "community",
      icon: <TeamOutlined />,
      label: "前往学生社区",
      onClick: () => navigate("/community"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => {
        dispatch(logout());
        navigate("/admin/login");
      },
    },
  ];

  return (
    <Layout className="student-layout">
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="light"
        width={260}
        className="student-layout-sider"
        style={{
          position: "fixed",
          height: "100vh",
          left: 0,
          zIndex: 100,
        }}
      >
        <div className="student-layout-logo">
          <Text strong className="student-layout-logo-text">
            学习平台
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="student-layout-menu"
          theme="light"
          inlineIndent={16}
        />
      </Sider>
      
      <Layout style={{ marginLeft: 260 }}>
        <Header className="student-layout-header">
          <Text strong className="student-layout-header-title">
            {menuItems.find(item => item.key === location.pathname)?.label?.props?.children || "学生平台"}
          </Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space className="student-layout-user-menu">
              <Avatar 
                icon={<UserOutlined />} 
                className="student-layout-avatar"
              />
              <Text className="student-layout-username">{username || "学生用户"}</Text>
            </Space>
          </Dropdown>
        </Header>
        
        <Content className="student-layout-content-wrapper">
          <div className="student-layout-content-card">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
