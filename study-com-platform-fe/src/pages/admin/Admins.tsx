import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import type { ProColumns } from "@ant-design/pro-components";
import ProTableEnhanced from "../../components/admin/ProTableEnhanced";
import PermissionGuard from "../../components/admin/PermissionGuard";
import {
  createAdmin,
  deleteAdmin,
  fetchAdmins,
  fetchRoles,
  setAdminRole,
} from "../../services/admin";

const { Title } = Typography;

interface AdminItem {
  id: number;
  username: string;
  nickname: string;
  role: "admin" | "super_admin";
  status: number;
  role_id?: number;
  role_name?: string;
}

interface RoleItem {
  id: number;
  name: string;
}

interface AdminRow extends AdminItem {
  key: number;
}

export default function Admins() {
  const [data, setData] = useState<AdminItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleOptions, setRoleOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);

  const loadData = async (keyword?: string) => {
    try {
      const res = await fetchAdmins({ keyword });
      setData(res.data || []);
    } catch (error) {
      console.error("Failed to load admins:", error);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function loadRoles() {
    const res = await fetchRoles();
    setRoleOptions(
      (res.data as RoleItem[] | undefined)?.map((role) => ({
        label: role.name,
        value: role.id,
      })) || [],
    );
  }

  const columns: ProColumns<AdminRow>[] = useMemo(
    () => [
      { title: "账号", dataIndex: "username" },
      { title: "昵称", dataIndex: "nickname" },
      {
        title: "角色",
        dataIndex: "role",
        render: (_, record) => (
          <Space>
            <Tag color={record.role === "super_admin" ? "gold" : "blue"}>
              {record.role === "super_admin" ? "超级管理员" : "管理员"}
            </Tag>
            {record.role === "admin" && record.role_name && (
              <Tag color="geekblue">{record.role_name}</Tag>
            )}
          </Space>
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
      {
        title: "操作",
        valueType: "option",
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              disabled={record.role === "super_admin"}
              onClick={async () => {
                await loadRoles();
                setCurrentAdminId(record.id);
                setRoleModalOpen(true);
              }}
            >
              分配角色
            </Button>
            <Button
              size="small"
              danger
              disabled={record.role === "super_admin"}
              onClick={async () => {
                await deleteAdmin(record.id);
                loadData();
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const tableData: AdminRow[] = useMemo(
    () => data.map((item) => ({ ...item, key: item.id })),
    [data],
  );

  return (
    <PermissionGuard required="admin.admins.manage">
      <div className="page-container">
        <Title level={3}>管理员管理</Title>
        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="搜索账号/昵称"
              allowClear
              onSearch={(value) => loadData(value)}
            />
            <Button type="primary" onClick={() => setOpen(true)}>
              新增管理员
            </Button>
          </Space>
          <ProTableEnhanced columns={columns} dataSource={tableData} />
        </Card>

        <Modal
          title="新增管理员"
          open={open}
          onCancel={() => setOpen(false)}
          onOk={() => form.submit()}
          okText="创建"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              await createAdmin(values);
              setOpen(false);
              form.resetFields();
              loadData();
            }}
          >
            <Form.Item
              label="账号"
              name="username"
              rules={[{ required: true, message: "请输入账号" }]}
            >
              <Input placeholder="管理员账号" />
            </Form.Item>
            <Form.Item label="昵称" name="nickname">
              <Input placeholder="管理员昵称" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password placeholder="管理员密码" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="分配角色"
          open={roleModalOpen}
          onCancel={() => setRoleModalOpen(false)}
          onOk={async () => {
            const values = await form.validateFields(["roleId"]);
            if (currentAdminId) {
              await setAdminRole(currentAdminId, values.roleId);
              setRoleModalOpen(false);
              form.resetFields(["roleId"]);
              loadData();
            }
          }}
          okText="确认"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="角色"
              name="roleId"
              rules={[{ required: true, message: "请选择角色" }]}
            >
              <Select options={roleOptions} placeholder="选择角色" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
