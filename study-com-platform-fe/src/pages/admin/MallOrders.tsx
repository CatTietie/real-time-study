import { useState, useEffect, useCallback } from "react";
import { Card, Table, Button, Modal, Form, Input, Select, Space, Tag, message, Typography } from "antd";
import { fetchAdminMallOrders, shipMallOrder } from "../../services/mallAdmin";

const { Title } = Typography;

const statusMap: Record<string, { color: string; text: string }> = {
  pending_shipment: { color: "orange", text: "待发货" },
  shipped: { color: "blue", text: "已发货" },
  completed: { color: "green", text: "已完成" },
  cancelled: { color: "default", text: "已取消" },
};

export default function MallOrders() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>();
  const [keyword, setKeyword] = useState("");
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shippingOrderId, setShippingOrderId] = useState<number | null>(null);
  const [shipForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminMallOrders({ page, pageSize, status: filterStatus, keyword: keyword || undefined });
      setData(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {
      message.error("加载订单列表失败");
    }
    setLoading(false);
  }, [page, pageSize, filterStatus, keyword]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleShip = (orderId: number) => {
    setShippingOrderId(orderId);
    shipForm.resetFields();
    setShipModalOpen(true);
  };

  const handleShipSubmit = async () => {
    try {
      const values = await shipForm.validateFields();
      await shipMallOrder(shippingOrderId!, values);
      message.success("发货成功");
      setShipModalOpen(false);
      loadData();
    } catch (err: any) {
      if (err.message) message.error(err.message);
    }
  };

  const columns = [
    { title: "订单号", dataIndex: "order_no", width: 180 },
    {
      title: "用户",
      dataIndex: "User",
      width: 120,
      render: (user: any) => user?.nickname || user?.username || "-",
    },
    {
      title: "商品",
      dataIndex: "product_snapshot",
      width: 150,
      render: (snapshot: any) => snapshot?.name || "-",
    },
    { title: "花费积分", dataIndex: "points_cost", width: 100 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: string) => {
        const item = statusMap[status] || { color: "default", text: status };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: "收货信息",
      width: 200,
      render: (_: any, record: any) => {
        if (!record.shipping_name) return <span style={{ color: "#999" }}>虚拟商品</span>;
        return (
          <div style={{ fontSize: 12 }}>
            <div>{record.shipping_name} {record.shipping_phone}</div>
            <div style={{ color: "#666" }}>{record.shipping_address}</div>
          </div>
        );
      },
    },
    {
      title: "物流信息",
      width: 150,
      render: (_: any, record: any) => {
        if (!record.tracking_number) return "-";
        return <span>{record.tracking_company} {record.tracking_number}</span>;
      },
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      width: 160,
      render: (t: string) => t ? new Date(t).toLocaleString() : "-",
    },
    {
      title: "操作",
      width: 100,
      render: (_: any, record: any) => {
        if (record.status === "pending_shipment") {
          return <Button type="primary" size="small" onClick={() => handleShip(record.id)}>发货</Button>;
        }
        return null;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>订单管理</Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="订单状态"
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 120 }}
            options={Object.entries(statusMap).map(([value, { text }]) => ({ label: text, value }))}
          />
          <Input.Search placeholder="搜索订单号/收货人" onSearch={setKeyword} allowClear style={{ width: 220 }} />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal title="填写发货信息" open={shipModalOpen} onOk={handleShipSubmit} onCancel={() => setShipModalOpen(false)} destroyOnClose>
        <Form form={shipForm} layout="vertical">
          <Form.Item name="tracking_company" label="快递公司" rules={[{ required: true, message: "请输入快递公司" }]}>
            <Select placeholder="选择快递公司" options={[
              { label: "顺丰速运", value: "顺丰速运" },
              { label: "中通快递", value: "中通快递" },
              { label: "圆通速递", value: "圆通速递" },
              { label: "韵达快递", value: "韵达快递" },
              { label: "申通快递", value: "申通快递" },
              { label: "京东物流", value: "京东物流" },
              { label: "邮政EMS", value: "邮政EMS" },
            ]} />
          </Form.Item>
          <Form.Item name="tracking_number" label="快递单号" rules={[{ required: true, message: "请输入快递单号" }]}>
            <Input placeholder="输入快递单号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
