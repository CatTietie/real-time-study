import { useState, useEffect, useCallback } from "react";
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, message, Popconfirm, Typography, Image } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fetchAdminMallBanners, createMallBanner, updateMallBanner, deleteMallBanner } from "../../services/mallAdmin";

const { Title } = Typography;

export default function MallBanners() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminMallBanners();
      setData(res.data || []);
    } catch {
      message.error("加载轮播列表失败");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        await updateMallBanner(editingItem.id, values);
        message.success("更新成功");
      } else {
        await createMallBanner(values);
        message.success("创建成功");
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      if (err.message) message.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMallBanner(id);
      message.success("删除成功");
      loadData();
    } catch (err: any) {
      message.error(err.message || "删除失败");
    }
  };

  const handleToggleStatus = async (record: any, checked: boolean) => {
    try {
      await updateMallBanner(record.id, { status: checked ? 1 : 0 });
      message.success("状态更新成功");
      loadData();
    } catch {
      message.error("操作失败");
    }
  };

  const columns = [
    {
      title: "图片",
      dataIndex: "image",
      width: 200,
      render: (url: string) => url ? <Image src={url} height={60} style={{ objectFit: "cover", borderRadius: 4 }} /> : "-",
    },
    { title: "标题", dataIndex: "title", width: 150 },
    {
      title: "链接类型",
      dataIndex: "link_type",
      width: 100,
      render: (type: string) => {
        const map: Record<string, string> = { product: "商品", external: "外链", none: "无" };
        return map[type] || type;
      },
    },
    { title: "链接值", dataIndex: "link_value", width: 150, ellipsis: true },
    { title: "排序", dataIndex: "sort_order", width: 80 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: number, record: any) => (
        <Switch checked={status === 1} onChange={(checked) => handleToggleStatus(record, checked)} checkedChildren="显示" unCheckedChildren="隐藏" />
      ),
    },
    {
      title: "操作",
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>轮播管理</Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增轮播</Button>
        </Space>
        <Table rowKey="id" loading={loading} dataSource={data} columns={columns} pagination={false} />
      </Card>

      <Modal title={editingItem ? "编辑轮播" : "新增轮播"} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input placeholder="轮播标题" />
          </Form.Item>
          <Form.Item name="image" label="图片链接" rules={[{ required: true, message: "请输入图片URL" }]}>
            <Input placeholder="图片URL" />
          </Form.Item>
          <Form.Item name="link_type" label="链接类型" initialValue="none">
            <Select options={[
              { label: "无链接", value: "none" },
              { label: "商品", value: "product" },
              { label: "外部链接", value: "external" },
            ]} />
          </Form.Item>
          <Form.Item name="link_value" label="链接值">
            <Input placeholder="商品ID或外部URL" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
