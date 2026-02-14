import { Layout, Menu, Avatar, Dropdown, Space, Typography } from "antd";
import {
  HomeOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
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
    <Layout 
      style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #E3F2FD 0%, #E8F5E9 100%)"
      }}
    >
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="light"
        style={{
          boxShadow: "4px 0 20px rgba(0,0,0,0.1)",
          position: "fixed",
          height: "100vh",
          left: 0,
          zIndex: 100,
          background: "#BBDEFB",
          borderRight: "1px solid #90CAF9",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #90CAF9",
            background: "#90CAF9",
          }}
        >
          <Text strong style={{ fontSize: 18, color: "#212121" }}>
            学习平台
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ 
            borderRight: 0,
            background: "transparent",
            color: "#212121"
          }}
          theme="light"
        />
      </Sider>
      
      <Layout style={{ marginLeft: 200 }}>
        <Header
          style={{
            padding: "0 24px",
            background: "#E3F2FD",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #BBDEFB",
          }}
        >
          <Text strong style={{ 
            fontSize: 16,
            color: "#212121",
            fontWeight: 600
          }}>
            {menuItems.find(item => item.key === location.pathname)?.label?.props?.children || "学生平台"}
          </Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space 
              style={{ 
                cursor: "pointer",
                background: "#F5F5F5",
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid #E0E0E0",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E3F2FD";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F5F5F5";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Avatar 
                icon={<UserOutlined />} 
                style={{
                  background: "#90CAF9",
                  border: "1px solid #64B5F6",
                  color: "#212121"
                }}
              />
              <Text style={{ color: "#212121", fontWeight: 500 }}>{username || "学生用户"}</Text>
            </Space>
          </Dropdown>
        </Header>
        
        <Content style={{ 
          margin: "24px 16px 24px",
          position: "relative"
        }}>
          <div
            style={{
              padding: 32,
              background: "#FFFFFF",
              borderRadius: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              minHeight: 400,
              border: "1px solid #E0E0E0",
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}