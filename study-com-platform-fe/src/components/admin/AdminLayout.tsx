import { Layout, Menu, Button, Dropdown, Space, Typography, theme } from "antd";
import {
  BarChartOutlined,
  UserOutlined,
  FileSearchOutlined,
  MessageOutlined,
  WarningOutlined,
  SafetyOutlined,
  StarOutlined,
  AuditOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { logout } from "../../features/auth/authSlice";
import { toggleSider } from "../../features/ui/uiSlice";

const { Header, Sider, Content } = Layout;

const baseMenuItems = (role: string | null) => [
  {
    key: "/admin/dashboard",
    icon: <BarChartOutlined />,
    label: <Link to="/admin/dashboard">数据看板</Link>,
  },
  {
    key: "/admin/users",
    icon: <UserOutlined />,
    label: <Link to="/admin/users">用户管理</Link>,
  },
  {
    key: "rbac",
    icon: <SettingOutlined />,
    label: "权限管理",
    children: [
      {
        key: "/admin/rbac/roles",
        label: <Link to="/admin/rbac/roles">角色管理</Link>,
      },
      {
        key: "/admin/rbac/permissions",
        label: <Link to="/admin/rbac/permissions">权限点</Link>,
      },
    ],
  },
  {
    key: "/admin/admins",
    icon: <UserOutlined />,
    label: <Link to="/admin/admins">管理员管理</Link>,
    hidden: role !== "super_admin",
  },

  {
    key: "community-manage",
    icon: <AppstoreOutlined />,
    label: "社区内容管理",
    children: [
      {
        key: "/admin/community/posts",
        label: <Link to="/admin/community/posts">帖子管理</Link>,
      },
      {
        key: "/admin/community/comments",
        label: <Link to="/admin/community/comments">评论管理</Link>,
      },
      {
        key: "/admin/community/stats",
        label: <Link to="/admin/community/stats">社区统计</Link>,
      },
    ],
  },
  {
    key: "community-audit",
    icon: <FileSearchOutlined />,
    label: "社区内容审核",
    children: [
      {
        key: "/admin/audit/posts",
        icon: <AuditOutlined />,
        label: <Link to="/admin/audit/posts">帖子审核</Link>,
      },
      {
        key: "/admin/audit/comments",
        icon: <MessageOutlined />,
        label: <Link to="/admin/audit/comments">评论审核</Link>,
      },
      {
        key: "/admin/audit/reports",
        icon: <WarningOutlined />,
        label: <Link to="/admin/audit/reports">举报处理</Link>,
      },
    ],
  },
  {
    key: "/admin/points/rules",
    icon: <StarOutlined />,
    label: <Link to="/admin/points/rules">社区积分规则</Link>,
  },
  {
    key: "/admin/sensitive-words",
    icon: <SafetyOutlined />,
    label: <Link to="/admin/sensitive-words">敏感词库</Link>,
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { token: themeToken } = theme.useToken();
  const { siderCollapsed } = useAppSelector((state: RootState) => state.ui);
  const { username, role } = useAppSelector((state: RootState) => state.auth);

  const menuItems = baseMenuItems(role);

  const selectedKeys = [
    location.pathname.startsWith("/admin/audit")
      ? location.pathname
      : location.pathname,
  ];

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "退出登录",
        onClick: () => dispatch(logout()),
      },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider trigger={null} collapsible collapsed={siderCollapsed}>
        <div
          style={{
            height: 64,
            lineHeight: "64px",
            textAlign: "center",
            color: "#fff",
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          管理端菜单
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 16px",
            background: themeToken.colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            type="text"
            icon={
              siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
            }
            onClick={() => dispatch(toggleSider())}
          />
          <Typography.Text style={{ fontSize: 16, fontWeight: 600 }}>
            实时协同自习室与学习社区平台管理端
          </Typography.Text>
          <Space>
            <Button type="primary">
              <Link to="/community">社区入口</Link>
            </Button>
            <Typography.Text>{username || "管理员"}</Typography.Text>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Button type="text" icon={<UserOutlined />} />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: "16px" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
