import {
  Avatar,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import {
  createRole,
  deleteRole,
  fetchPermissions,
  fetchRolePermissions,
  fetchRoleUsers,
  fetchRoles,
  setRolePermissions,
  updateRole,
} from "../../services/admin";

const { Title } = Typography;
const { Panel } = Collapse;

type RoleRow = {
  id: number;
  key: number;
  name: string;
  code: string;
  status: number;
  description?: string;
  userCount: number;
};

type Permission = {
  id: number;
  name: string;
  code: string;
  module?: string;
  description?: string;
};

type RoleUser = {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  role: string;
  status: number;
};

export default function RBACRoles() {
  const { role } = useAppSelector((state) => state.auth);
  const isSuperAdmin = role === "super_admin";
  const [data, setData] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);

  // Permission modal
  const [permOpen, setPermOpen] = useState(false);
  const [permForm] = Form.useForm();
  const [currentRoleId, setCurrentRoleId] = useState<number | null>(null);

  // Expanded role users
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);
  const [roleUsers, setRoleUsers] = useState<Record<number, RoleUser[]>>({});
  const [usersLoading, setUsersLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRoles();
      const list = (res.data || []).map(
        (item: RoleRow) => ({ ...item, key: item.id }),
      );
      setData(list);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载角色失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const loadPermissions = async () => {
    try {
      const res = await fetchPermissions();
      setPermissions(res.data || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载权限失败");
    }
  };

  const permissionOptions = (() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of permissions) {
      const module = p.module || "其他";
      if (!groups[module]) groups[module] = [];
      groups[module].push(p);
    }
    return Object.entries(groups).map(([module, perms]) => ({
      label: module,
      options: perms.map((p) => ({
        label: p.description ? `${p.name} - ${p.description}` : p.name,
        value: p.id,
      })),
    }));
  })();

  const loadRoleUsers = async (roleId: number) => {
    setUsersLoading(true);
    try {
      const res = await fetchRoleUsers(roleId);
      setRoleUsers((prev) => ({ ...prev, [roleId]: res.data || [] }));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载用户失败");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreate = async (values: {
    name: string;
    description?: string;
    permissionIds?: number[];
  }) => {
    try {
      await createRole(values);
      message.success("创建成功");
      setCreateOpen(false);
      createForm.resetFields();
      void loadRoles();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "创建失败");
    }
  };

  const handleEdit = async (values: {
    name: string;
    description?: string;
  }) => {
    if (!editingRole) return;
    try {
      await updateRole(editingRole.id, values);
      message.success("更新成功");
      setEditOpen(false);
      editForm.resetFields();
      setEditingRole(null);
      void loadRoles();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    }
  };

  const handleDelete = async (roleId: number) => {
    try {
      await deleteRole(roleId);
      message.success("删除成功");
      void loadRoles();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleToggleStatus = async (record: RoleRow) => {
    try {
      await updateRole(record.id, { status: record.status ? 0 : 1 });
      message.success(record.status ? "已禁用" : "已启用");
      void loadRoles();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const columns = [
    {
      title: "角色名称",
      dataIndex: "name",
      width: 160,
    },
    {
      title: "角色标识",
      dataIndex: "code",
      width: 120,
    },
    {
      title: "描述",
      dataIndex: "description",
      ellipsis: true,
      render: (val: string) => val || "-",
    },
    {
      title: "用户数",
      dataIndex: "userCount",
      width: 90,
      render: (val: number) => (
        <Tag icon={<TeamOutlined />} color="blue">
          {val}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (value: number, record: RoleRow) =>
        isSuperAdmin ? (
          <Switch
            checked={!!value}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={() => handleToggleStatus(record)}
          />
        ) : (
          <Tag color={value ? "green" : "red"}>{value ? "启用" : "禁用"}</Tag>
        ),
    },
    {
      title: "操作",
      width: 240,
      render: (_: unknown, record: RoleRow) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled={!isSuperAdmin}
            onClick={() => {
              setEditingRole(record);
              editForm.setFieldsValue({
                name: record.name,
                description: record.description,
              });
              setEditOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            disabled={!isSuperAdmin}
            onClick={async () => {
              await loadPermissions();
              setCurrentRoleId(record.id);
              try {
                const res = await fetchRolePermissions(record.id);
                permForm.setFieldsValue({
                  permissionIds: res.data?.permissionIds || [],
                });
              } catch {
                permForm.setFieldsValue({ permissionIds: [] });
              }
              setPermOpen(true);
            }}
          >
            分配权限
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除角色「${record.name}」吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!isSuperAdmin}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!isSuperAdmin}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: RoleRow) => {
    const users = roleUsers[record.id];
    if (usersLoading && expandedRoleId === record.id && !users) {
      return <div style={{ padding: 12 }}>加载中...</div>;
    }
    if (!users || users.length === 0) {
      return <div style={{ padding: 12, color: "#999" }}>暂无用户</div>;
    }

    return (
      <Collapse ghost>
        <Panel
          header={`该角色下共有 ${users.length} 个用户`}
          key="users"
        >
          <Table
            size="small"
            pagination={false}
            dataSource={users.map((u) => ({ ...u, key: u.id }))}
            columns={[
              {
                title: "头像",
                dataIndex: "avatar",
                width: 60,
                render: (url: string) => (
                  <Avatar src={url} icon={<UserOutlined />} size="small" />
                ),
              },
              { title: "用户名", dataIndex: "username", width: 140 },
              { title: "昵称", dataIndex: "nickname", width: 140 },
              {
                title: "用户类型",
                dataIndex: "role",
                width: 110,
                render: (val: string) => {
                  const map: Record<string, { label: string; color: string }> = {
                    super_admin: { label: "超级管理员", color: "red" },
                    admin: { label: "管理员", color: "orange" },
                    student: { label: "学生", color: "blue" },
                  };
                  const info = map[val] || { label: val, color: "default" };
                  return <Tag color={info.color}>{info.label}</Tag>;
                },
              },
              {
                title: "状态",
                dataIndex: "status",
                width: 80,
                render: (val: number) => (
                  <Tag color={val ? "green" : "red"}>
                    {val ? "正常" : "禁用"}
                  </Tag>
                ),
              },
            ]}
          />
        </Panel>
      </Collapse>
    );
  };

  return (
    <div className="page-container">
      <Title level={3}>角色管理</Title>
      <Card>
        {isSuperAdmin && (
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={async () => {
                await loadPermissions();
                setCreateOpen(true);
              }}
            >
              新增角色
            </Button>
          </Space>
        )}
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          expandable={{
            expandedRowRender,
            onExpand: (expanded, record) => {
              if (expanded) {
                setExpandedRoleId(record.id);
                void loadRoleUsers(record.id);
              }
            },
          }}
        />
      </Card>

      {/* 新增角色 */}
      <Modal
        title="新增角色"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        okText="创建"
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
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
              options={permissionOptions}
              placeholder="选择权限"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑角色 */}
      <Modal
        title="编辑角色"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          editForm.resetFields();
          setEditingRole(null);
        }}
        onOk={() => editForm.submit()}
        okText="保存"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
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
        </Form>
      </Modal>

      {/* 分配权限 */}
      <Modal
        title="分配权限"
        open={permOpen}
        onCancel={() => {
          setPermOpen(false);
          permForm.resetFields();
        }}
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
      >
        <Form form={permForm} layout="vertical">
          <Form.Item
            label="权限点"
            name="permissionIds"
            rules={[{ required: true, message: "请选择权限" }]}
          >
            <Select
              mode="multiple"
              options={permissionOptions}
              placeholder="选择权限"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
