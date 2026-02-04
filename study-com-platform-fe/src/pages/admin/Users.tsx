import { Button, Card, Input, Space, Tag, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import ProTableEnhanced from "../../components/admin/ProTableEnhanced";
import PermissionGuard from "../../components/admin/PermissionGuard";

const { Title } = Typography;

type UserRow = {
  key: number;
  username: string;
  nickname: string;
  role: "student" | "admin" | "super_admin";
  status: number;
  points: number;
};

export default function Users() {
  const columns: ProColumns<UserRow>[] = [
    { title: "账号", dataIndex: "username" },
    { title: "昵称", dataIndex: "nickname" },
    {
      title: "角色",
      dataIndex: "role",
      render: (_, record) => (
        <Tag color={record.role === "admin" ? "blue" : "green"}>
          {record.role}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (_, record) => (
        <Tag color={record.status ? "green" : "red"}>
          {record.status ? "启用" : "封禁"}
        </Tag>
      ),
    },
    { title: "积分", dataIndex: "points" },
    {
      title: "操作",
      valueType: "option",
      render: () => (
        <Space>
          <Button size="small">查看</Button>
          <Button size="small" danger>
            封禁
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PermissionGuard required="admin.users.manage">
      <div className="page-container">
        <Title level={3}>用户管理</Title>
        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Input.Search placeholder="搜索账号/昵称" allowClear />
            <Button type="primary">搜索</Button>
          </Space>
          <ProTableEnhanced columns={columns} dataSource={[]} />
        </Card>
      </div>
    </PermissionGuard>
  );
}
