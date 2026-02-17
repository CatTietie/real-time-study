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
  console.log('=== StudentLayout 组件执行 ===');
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username } = authState;
  console.log('StudentLayout authState:', authState);

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
      key: "/student/learning-analytics",
      icon: <BarChartOutlined />,
      label: <Link to="/student/learning-analytics">学习统计</Link>,
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
        width={180}
        style={{
          boxShadow: "2px 0 12px rgba(0,0,0,0.08)",
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
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #90CAF9",
            background: "#90CAF9",
          }}
        >
          <Text strong style={{ fontSize: 16, color: "#212121" }}>
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
          inlineIndent={16}
        />
      </Sider>
      
      <Layout style={{ marginLeft: 180 }}>
        <Header
          style={{
            padding: "0 20px",
            background: "#E3F2FD",
            boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #BBDEFB",
            height: 56,
          }}
        >
          <Text strong style={{ 
            fontSize: 14,
            color: "#212121",
            fontWeight: 500
          }}>
            {menuItems.find(item => item.key === location.pathname)?.label?.props?.children || "学生平台"}
          </Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space 
              style={{ 
                cursor: "pointer",
                background: "#F5F5F5",
                padding: "6px 12px",
                borderRadius: 16,
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
          margin: "20px 12px 20px",
          position: "relative"
        }}>
          <div
            style={{
              padding: 24,
              background: "#FFFFFF",
              borderRadius: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              minHeight: 300,
              border: "1px solid #EEEEEE",
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}