import { useState, useEffect, useCallback } from "react";
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Tag, message, Popconfirm, DatePicker, Typography, Image, Upload } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, LoadingOutlined } from "@ant-design/icons";
import { fetchAdminMallProducts, createMallProduct, updateMallProduct, deleteMallProduct, toggleMallProductStatus, uploadMallImage } from "../../services/mallAdmin";
import type { UploadFile } from "antd/es/upload/interface";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const typeOptions = [
  { label: "虚拟装扮", value: "virtual_decoration" },
  { label: "功能特权", value: "virtual_privilege" },
  { label: "实物商品", value: "physical" },
];

const subTypeOptions = [
  { label: "头像框", value: "avatar_frame" },
  { label: "名片背景", value: "profile_background" },
  { label: "自习室皮肤", value: "study_room_skin" },
];

export default function MallProducts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();
  const [filterType, setFilterType] = useState<string>();
  const [filterStatus, setFilterStatus] = useState<string>();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminMallProducts({ page, pageSize, type: filterType, status: filterStatus });
      setData(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {
      message.error("加载商品列表失败");
    }
    setLoading(false);
  }, [page, pageSize, filterType, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setImageUrl("");
    setModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      exchange_time: undefined,
    });
    setImageUrl(record.image || "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (values.exchange_time) {
        values.exchange_start_time = values.exchange_time[0]?.toISOString();
        values.exchange_end_time = values.exchange_time[1]?.toISOString();
      }
      delete values.exchange_time;
      values.image = imageUrl;

      if (editingItem) {
        await updateMallProduct(editingItem.id, values);
        message.success("更新成功");
      } else {
        await createMallProduct(values);
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
      await deleteMallProduct(id);
      message.success("删除成功");
      loadData();
    } catch (err: any) {
      message.error(err.message || "删除失败");
    }
  };

  const handleToggleStatus = async (id: number, checked: boolean) => {
    try {
      await toggleMallProductStatus(id, checked ? "on_sale" : "off_sale");
      message.success("状态更新成功");
      loadData();
    } catch (err: any) {
      message.error(err.message || "操作失败");
    }
  };

  const columns = [
    {
      title: "图片",
      dataIndex: "image",
      width: 80,
      render: (url: string) => url ? <Image src={url} width={50} height={50} style={{ objectFit: "cover", borderRadius: 4 }} /> : "-",
    },
    { title: "商品名称", dataIndex: "name", width: 160 },
    {
      title: "类型",
      dataIndex: "type",
      width: 100,
      render: (type: string) => {
        const map: Record<string, { color: string; text: string }> = {
          virtual_decoration: { color: "purple", text: "虚拟装扮" },
          virtual_privilege: { color: "blue", text: "功能特权" },
          physical: { color: "green", text: "实物商品" },
        };
        const item = map[type] || { color: "default", text: type };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    { title: "积分价格", dataIndex: "points_price", width: 100, sorter: true },
    { title: "库存", dataIndex: "stock", width: 80 },
    { title: "兑换次数", dataIndex: "exchange_count", width: 100 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: string, record: any) => (
        <Switch checked={status === "on_sale"} onChange={(checked) => handleToggleStatus(record.id, checked)} checkedChildren="上架" unCheckedChildren="下架" />
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

  const formTypeValue = Form.useWatch("type", form);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>商品管理</Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select placeholder="类型筛选" allowClear options={typeOptions} value={filterType} onChange={setFilterType} style={{ width: 120 }} />
          <Select placeholder="状态" allowClear options={[{ label: "上架", value: "on_sale" }, { label: "下架", value: "off_sale" }]} value={filterStatus} onChange={setFilterStatus} style={{ width: 100 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增商品</Button>
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal title={editingItem ? "编辑商品" : "新增商品"} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={600} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: "请输入商品名称" }]}>
            <Input placeholder="如: 金色头像框" />
          </Form.Item>
          <Form.Item name="description" label="商品描述">
            <TextArea rows={3} placeholder="商品详细描述" />
          </Form.Item>
          <Form.Item label="商品图片">
            <Upload
              name="file"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={async (file) => {
                const isImage = file.type.startsWith("image/");
                if (!isImage) { message.error("只能上传图片文件"); return false; }
                const isLt2M = file.size / 1024 / 1024 < 2;
                if (!isLt2M) { message.error("图片不能超过2MB"); return false; }
                setUploading(true);
                try {
                  const res = await uploadMallImage(file);
                  setImageUrl(res.data.url);
                  message.success("上传成功");
                } catch { message.error("上传失败"); }
                setUploading(false);
                return false;
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="商品图片" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div>
                  {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item name="type" label="商品类型" rules={[{ required: true, message: "请选择类型" }]}>
            <Select options={typeOptions} placeholder="选择类型" />
          </Form.Item>
          {formTypeValue === "virtual_decoration" && (
            <Form.Item name="sub_type" label="装扮子类型" rules={[{ required: true, message: "请选择子类型" }]}>
              <Select options={subTypeOptions} placeholder="选择子类型" />
            </Form.Item>
          )}
          <Form.Item name="points_price" label="积分价格" rules={[{ required: true, message: "请输入价格" }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="stock" label="库存" rules={[{ required: true, message: "请输入库存" }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="daily_exchange_limit" label="每人每日限购">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="不填则不限" />
          </Form.Item>
          <Form.Item name="total_limit" label="每人总限购">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="不填则不限" />
          </Form.Item>
          <Form.Item name="exchange_time" label="兑换时间范围">
            <RangePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
