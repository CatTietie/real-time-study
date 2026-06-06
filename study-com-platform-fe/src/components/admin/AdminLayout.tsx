import React from "react";
import { Layout, Menu, Button, Dropdown, Space, Typography, theme } from "antd";
import {
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
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
  BookOutlined,
  FormOutlined,
  ApartmentOutlined,
  DashboardOutlined,
  ReadOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { logout } from "../../features/auth/authSlice";
import { toggleSider } from "../../features/ui/uiSlice";
// 暂时移除全局样式文件避免冲突

// 动态注入强制样式 - 仅针对管理端
const injectStyles = () => {
  // 先移除已存在的样式
  const existingStyle = document.getElementById('admin-menu-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = 'admin-menu-styles';
  style.innerHTML = `
    /* 管理端菜单专用样式 - 精确 targeting */
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-item,
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-submenu-title {
      background: transparent !important;
      color: rgba(0, 0, 0, 0.85) !important;
      margin: 4px 8px !important;
      border-radius: 6px !important;
      transition: all 0.3s ease !important;
      font-size: 15px !important;
      line-height: 42px !important;
      font-weight: 500 !important;
      padding: 0 20px !important;
      height: 44px !important;
      /* 正常样式 */
      border: none !important;
    }
    
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-item:hover,
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-submenu-title:hover {
      background: rgba(0, 0, 0, 0.1) !important;
      color: rgba(0, 0, 0, 1) !important;
      font-weight: 600 !important;
      /* 悬停样式 */
      border: none !important;
    }
    
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-item-selected,
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-submenu-selected {
      background: #1890ff !important;
      color: #ffffff !important;
      font-weight: 600 !important;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4) !important;
      /* 选中样式 */
      border: none !important;
    }
    
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-item a,
    .ant-layout-sider .ant-menu.ant-menu-dark .ant-menu-submenu-title a {
      color: inherit !important;
    }
    
    /* 确保只影响管理端的子菜单 */
    .ant-layout-sider .ant-menu-submenu-popup.ant-menu-dark .ant-menu-item {
      background: transparent !important;
      color: rgba(0, 0, 0, 0.85) !important;
      margin: 4px 8px !important;
      border-radius: 6px !important;
      transition: all 0.3s ease !important;
      font-size: 14px !important;
      line-height: 40px !important;
      padding: 0 16px !important;
      height: 40px !important;
      font-weight: 450 !important;
      /* 子菜单样式 */
      border: none !important;
    }
    
    .ant-layout-sider .ant-menu-submenu-popup.ant-menu-dark .ant-menu-item:hover {
      background: rgba(0, 0, 0, 0.1) !important;
      color: rgba(0, 0, 0, 1) !important;
      /* 子菜单悬停 */
      border: none !important;
    }
    
    .ant-layout-sider .ant-menu-submenu-popup.ant-menu-dark .ant-menu-item-selected {
      background: #1890ff !important;
      color: #ffffff !important;
      font-weight: 500 !important;
      /* 子菜单选中 */
      border: none !important;
    }
  `;
  document.head.appendChild(style);
};

const { Header, Sider, Content } = Layout;

const baseMenuItems = (role: string | null) => [
  {
    key: "/admin/dashboard",
    icon: <BarChartOutlined />,
    label: <Link to="/admin/dashboard">数据看板</Link>,
  },
  {
    key: "/admin/realtime",
    icon: <DashboardOutlined />,
    label: <Link to="/admin/realtime">实时监控</Link>,
  },
  {
    key: "/admin/users",
    icon: <UserOutlined />,
    label: <Link to="/admin/users">用户管理</Link>,
  },
  {
    key: "/admin/user-management",
    icon: <TeamOutlined />,
    label: <Link to="/admin/user-management">用户管理</Link>,
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
        key: "/admin/audit/content",
        icon: <AuditOutlined />,
        label: <Link to="/admin/audit/content">内容审核</Link>,
      },
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
      {
        key: "/admin/audit/config",
        icon: <SettingOutlined />,
        label: <Link to="/admin/audit/config">审核策略</Link>,
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
  {
    key: "/admin/question-bank",
    icon: <BookOutlined />,
    label: <Link to="/admin/question-bank">题库管理</Link>,
  },
  {
    key: "/admin/question-feedback",
    icon: <WarningOutlined />,
    label: <Link to="/admin/question-feedback">题目反馈</Link>,
  },
  {
    key: "/admin/exercise-review",
    icon: <FormOutlined />,
    label: <Link to="/admin/exercise-review">主观题批改</Link>,
  },
  {
    key: "/admin/learning-paths",
    icon: <ApartmentOutlined />,
    label: <Link to="/admin/learning-paths">技能树管理</Link>,
  },
  {
    key: "knowledge",
    icon: <ReadOutlined />,
    label: "知识文库",
    children: [
      {
        key: "/admin/knowledge/categories",
        label: <Link to="/admin/knowledge/categories">分类管理</Link>,
      },
      {
        key: "/admin/knowledge/documents",
        label: <Link to="/admin/knowledge/documents">文档管理</Link>,
      },
    ],
  },
  {
    key: "mall",
    icon: <ShopOutlined />,
    label: "积分商城",
    children: [
      {
        key: "/admin/mall/products",
        label: <Link to="/admin/mall/products">商品管理</Link>,
      },
      {
        key: "/admin/mall/orders",
        label: <Link to="/admin/mall/orders">订单管理</Link>,
      },
      {
        key: "/admin/mall/banners",
        label: <Link to="/admin/mall/banners">轮播管理</Link>,
      },
    ],
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { token: themeToken } = theme.useToken();
  const { siderCollapsed } = useAppSelector((state: RootState) => state.ui);
  const { username, role } = useAppSelector((state: RootState) => state.auth);
  
  // 组件挂载时注入样式
  React.useEffect(() => {
    injectStyles();
    
    // 返回清理函数
    return () => {
      const existingStyle = document.getElementById('admin-menu-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

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
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={siderCollapsed}
        style={{
          background: '#1f1f1f',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        <div
          style={{
            height: 64,
            lineHeight: "64px",
            textAlign: "center",
            color: "#fff",
            fontWeight: 600,
            letterSpacing: 1,
            fontSize: siderCollapsed ? '12px' : '16px',
            background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
            margin: '8px',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
        >
          {siderCollapsed ? '管理' : '管理端菜单'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          style={{
            background: '#1f1f1f',
            borderRight: 0
          }}
          className="admin-menu-target"
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
