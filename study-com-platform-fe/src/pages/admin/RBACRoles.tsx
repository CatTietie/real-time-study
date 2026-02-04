import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import {
  createRole,
  fetchPermissions,
  fetchRoles,
  setRolePermissions,
} from "../../services/admin";

const { Title } = Typography;

type RoleRow = {
  id: number;
  key: number;
  name: string;
  code: string;
  status: number;
  description?: string;
};

type Permission = {
  id: number;
  name: string;
  code: string;
  description?: string;
};

type CreateRoleValues = {
  name: string;
  description?: string;
  permissionIds?: number[];
};

export default function RBACRoles() {
  const { role } = useAppSelector((state) => state.auth);
  const isSuperAdmin = role === "super_admin";
  const [data, setData] = useState<RoleRow[]>([]);
  const [open, setOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [currentRoleId, setCurrentRoleId] = useState<number | null>(null);
  const [createForm] = Form.useForm();
  const [permForm] = Form.useForm();

  const loadRoles = async () => {
    try {
      const res = await fetchRoles();
      const list = (res.data || []).map(
        (item: { id: number; name: string; code: string; status: number }) => ({
          ...item,
          key: item.id,
        }),
      );
      setData(list);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载角色失败");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoles();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const loadPermissions = async () => {
    try {
      const res = await fetchPermissions();
      setPermissions(res.data || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载权限失败");
    }
  };

  const columns = [
    { title: "角色名称", dataIndex: "name" },
    { title: "角色标识", dataIndex: "code" },
    {
      title: "状态",
      dataIndex: "status",
      render: (value: number) => (
        <Tag color={value ? "green" : "red"}>{value ? "启用" : "禁用"}</Tag>
      ),
    },
    {
      title: "操作",
      render: (_: unknown, record: RoleRow) => (
        <Space>
          <Button
            size="small"
            disabled={!isSuperAdmin}
            onClick={async () => {
              await loadPermissions();
              setCurrentRoleId(record.id);
              setPermOpen(true);
            }}
          >
            分配权限
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Title level={3}>角色管理</Title>
      <Card>
        {isSuperAdmin ? (
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              onClick={async () => {
                await loadPermissions();
                setOpen(true);
              }}
            >
              新增角色
            </Button>
          </Space>
        ) : null}
        <Table dataSource={data} columns={columns} />
      </Card>

      <Modal
        title="新增角色"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => createForm.submit()}
        okText="创建"
        okButtonProps={{ disabled: !isSuperAdmin }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={async (values: CreateRoleValues) => {
            try {
              await createRole(values);
              message.success("创建成功");
              setOpen(false);
              createForm.resetFields();
              loadRoles();
            } catch (err) {
              message.error(err instanceof Error ? err.message : "创建失败");
            }
          }}
        >
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: "请输入角色名称" }]}
          >
            <Input placeholder="角色名称" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input placeholder="角色描述" />
          </Form.Item>
          <Form.Item
            label="权限点"
            name="permissionIds"
            rules={[{ required: true, message: "请选择权限" }]}
          >
            <Select
              mode="multiple"
              options={permissions.map((p) => ({
                label: p.description ? `${p.name} - ${p.description}` : p.name,
                value: p.id,
              }))}
              placeholder="选择权限"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="分配权限"
        open={permOpen}
        onCancel={() => setPermOpen(false)}
        onOk={async () => {
          try {
            const values = await permForm.validateFields();
            if (currentRoleId) {
              await setRolePermissions(
                currentRoleId,
                values.permissionIds || [],
              );
              message.success("保存成功");
              setPermOpen(false);
              permForm.resetFields();
            }
          } catch (err) {
            message.error(err instanceof Error ? err.message : "保存失败");
          }
        }}
        okText="保存"
        okButtonProps={{ disabled: !isSuperAdmin }}
      >
        <Form form={permForm} layout="vertical">
          <Form.Item
            label="权限点"
            name="permissionIds"
            rules={[{ required: true, message: "请选择权限" }]}
          >
            <Select
              mode="multiple"
              options={permissions.map((p) => ({
                label: p.description ? `${p.name} - ${p.description}` : p.name,
                value: p.id,
              }))}
              placeholder="选择权限"
              disabled={!isSuperAdmin}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
