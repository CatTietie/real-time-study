import { Layout, Menu, Avatar, Dropdown, Space, Typography } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import type { RootState } from "../../app/store";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { username } = useAppSelector((state: RootState) => state.auth);

  const menuItems = [
    {
      key: "/student/dashboard",
      icon: <HomeOutlined />,
      label: <Link to="/student/dashboard">个人中心</Link>,
    },
    {
      key: "/community",
      icon: <TeamOutlined />,
      label: <Link to="/community">学习社区</Link>,
    },
    {
      key: "/student/study-room",
      icon: <BookOutlined />,
      label: <Link to="/student/study-room">自习室</Link>,
    },
    {
      key: "/student/analytics",
      icon: <BarChartOutlined />,
      label: <Link to="/student/analytics">学习统计</Link>,
    },
    {
      key: "/student/settings",
      icon: <SettingOutlined />,
      label: <Link to="/student/settings">个人设置</Link>,
    },
  ];

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人资料",
      onClick: () => navigate("/student/profile"),
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
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="light"
        style={{
          boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
          position: "fixed",
          height: "100vh",
          left: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ fontSize: 18, color: "#1890ff" }}>
            学习平台
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <Layout style={{ marginLeft: 200 }}>
        <Header
          style={{
            padding: "0 24px",
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text strong style={{ fontSize: 16 }}>
            {menuItems.find(item => item.key === location.pathname)?.label?.props?.children || "学生平台"}
          </Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{username || "学生用户"}</Text>
            </Space>
          </Dropdown>
        </Header>
        
        <Content style={{ margin: "24px 16px 0" }}>
          <div
            style={{
              padding: 24,
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              minHeight: 360,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}