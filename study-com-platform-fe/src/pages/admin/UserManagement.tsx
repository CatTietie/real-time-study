import { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Modal, 
  Form,
  message,
  Switch,
  Dropdown,
  Avatar,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MoreOutlined,
  UserOutlined
} from '@ant-design/icons';
import { 
  fetchUsers, 
  updateUser, 
  deleteUser, 
  batchUpdateUsers,
  createUser
} from '../../services/user-management';

const { Option } = Select;

interface User {
  id: number;
  username: string;
  nickname: string;
  role: 'admin' | 'student' | 'super_admin';
  status: number;
  points: number;
  avatar?: string;
  last_login?: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [searchParams, setSearchParams] = useState({
    page: 1,
    pageSize: 10,
    keyword: '',
    role: undefined as string | undefined,
    status: undefined as number | undefined
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [form] = Form.useForm();

  // 获取用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetchUsers(searchParams);
      setUsers(response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error('获取用户列表失败: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchParams]);

  // 处理编辑
  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('用户删除成功');
      loadUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error('删除失败: ' + errorMessage);
    }
  };

  // 处理保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await updateUser(editingUser.id, values);
        message.success('用户更新成功');
      } else {
        await createUser(values);
        message.success('用户创建成功');
      }
      setEditingUser(null);
      setCreatingUser(false);
      form.resetFields();
      loadUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error('操作失败: ' + errorMessage);
    }
  };

  // 处理状态切换
  const handleStatusChange = async (userId: number, checked: boolean) => {
    try {
      await updateUser(userId, { status: checked ? 1 : 0 });
      message.success('状态更新成功');
      loadUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error('状态更新失败: ' + errorMessage);
    }
  };

  // 批量操作
  const handleBatchUpdate = async (action: string, value: unknown) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    
    try {
      await batchUpdateUsers(selectedRowKeys, action, value);
      message.success('批量操作成功');
      setSelectedRowKeys([]);
      loadUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error('批量操作失败: ' + errorMessage);
    }
  };

  // 批量操作菜单
  const batchMenu = {
    items: [
      {
        key: 'enable',
        label: '批量启用',
        onClick: () => handleBatchUpdate('status', 1)
      },
      {
        key: 'disable',
        label: '批量禁用',
        onClick: () => handleBatchUpdate('status', 0)
      }
    ]
  };

  // 表格列定义
  const columns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      fixed: 'left',
      width: 150,
      render: (text: string, record: User) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <span>
            <div>{text}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.nickname}</div>
          </span>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'super_admin' ? 'red' : role === 'admin' ? 'blue' : 'green'}>
          {role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : '学生'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number, record: User) => (
        <Switch
          checked={status === 1}
          onChange={(checked) => handleStatusChange(record.id, checked)}
          disabled={record.role === 'super_admin'}
        />
      )
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 80
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: User) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.role !== 'super_admin' && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* 搜索和操作栏 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索用户名或昵称"
            prefix={<SearchOutlined />}
            value={searchParams.keyword}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
            style={{ width: 200 }}
          />
          <Select
            placeholder="角色筛选"
            style={{ width: 120 }}
            allowClear
            value={searchParams.role}
            onChange={(value) => setSearchParams(prev => ({ ...prev, role: value }))}
          >
            <Option value="student">学生</Option>
            <Option value="admin">管理员</Option>
            <Option value="super_admin">超级管理员</Option>
          </Select>
          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            allowClear
            value={searchParams.status}
            onChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}
          >
            <Option value={1}>启用</Option>
            <Option value={0}>禁用</Option>
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreatingUser(true)}
          >
            新建用户
          </Button>
          {selectedRowKeys.length > 0 && (
            <Dropdown menu={batchMenu}>
              <Button>
                批量操作 <MoreOutlined />
              </Button>
            </Dropdown>
          )}
        </Space>
      </div>

      {/* 用户表格 */}
      <Table
        rowKey="id"
        dataSource={users}
        columns={columns}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys as number[])
        }}
        pagination={{
          total: users.length,
          pageSize: searchParams.pageSize,
          current: searchParams.page,
          onChange: (page, pageSize) => 
            setSearchParams(prev => ({ ...prev, page, pageSize }))
        }}
        scroll={{ x: 1200 }}
      />

      {/* 编辑/创建模态框 */}
      <Modal
        title={editingUser ? "编辑用户" : "创建用户"}
        open={!!editingUser || creatingUser}
        onCancel={() => {
          setEditingUser(null);
          setCreatingUser(false);
          form.resetFields();
        }}
        onOk={handleSave}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="username" 
            label="用户名" 
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item 
              name="password" 
              label="密码" 
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item 
            name="nickname" 
            label="昵称" 
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="avatar" label="头像URL">
            <Input />
          </Form.Item>
          <Form.Item 
            name="role" 
            label="角色" 
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Option value="student">学生</Option>
              <Option value="admin">管理员</Option>
              <Option value="super_admin">超级管理员</Option>
            </Select>
          </Form.Item>
          <Form.Item name="points" label="积分">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}