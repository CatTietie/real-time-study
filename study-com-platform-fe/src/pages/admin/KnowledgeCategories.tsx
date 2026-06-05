import React, { useState, useEffect } from "react";
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, message, Popconfirm, Tag, TreeSelect,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { adminListCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory } from "../../services/knowledgeAdmin";
import type { KnowledgeCategory } from "../../types/knowledge-library";

const KnowledgeCategories: React.FC = () => {
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeCategory | null>(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await adminListCategories();
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch {
      message.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const flattenCategories = (cats: KnowledgeCategory[], level = 0): any[] => {
    const result: any[] = [];
    for (const cat of cats) {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  const buildTreeSelectData = (cats: KnowledgeCategory[]): any[] => {
    return cats.map((cat) => ({
      value: cat.id,
      title: cat.name,
      children: cat.children ? buildTreeSelectData(cat.children) : [],
    }));
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await adminUpdateCategory(editing.id, values);
        message.success("Updated");
      } else {
        await adminCreateCategory(values);
        message.success("Created");
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchCategories();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminDeleteCategory(id);
      message.success("Deleted");
      fetchCategories();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const openEdit = (record: KnowledgeCategory) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      parent_id: record.parent_id,
      description: record.description,
      sort_order: record.sort_order,
      status: record.status,
    });
    setModalOpen(true);
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Sort", dataIndex: "sort_order", key: "sort_order", width: 80 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 80,
      render: (v: number) => <Tag color={v === 1 ? "green" : "red"}>{v === 1 ? "On" : "Off"}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      width: 150,
      render: (_: any, record: KnowledgeCategory) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this category?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Knowledge Library - Category Management"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          New Category
        </Button>
      }
    >
      <Table
        loading={loading}
        dataSource={categories}
        columns={columns}
        rowKey="id"
        pagination={false}
        expandable={{
          childrenColumnName: "children",
        }}
      />

      <Modal
        title={editing ? "Edit Category" : "New Category"}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Category name" />
          </Form.Item>
          <Form.Item name="parent_id" label="Parent Category">
            <TreeSelect
              allowClear
              placeholder="Top-level"
              treeData={buildTreeSelectData(categories)}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort Order" initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Status">
              <Select>
                <Select.Option value={1}>Enabled</Select.Option>
                <Select.Option value={0}>Disabled</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default KnowledgeCategories;
