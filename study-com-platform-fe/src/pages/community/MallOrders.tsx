import { useState, useEffect, useCallback } from "react";
import { Card, Tabs, List, Tag, Typography, Spin, Empty, Space, Button } from "antd";
import { ArrowLeftOutlined, ShoppingOutlined, GiftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchMyMallOrders } from "../../services/mall";

const { Title, Text } = Typography;

const statusMap: Record<string, { color: string; text: string }> = {
  pending_shipment: { color: "orange", text: "待发货" },
  shipped: { color: "blue", text: "已发货" },
  completed: { color: "green", text: "已完成" },
  cancelled: { color: "default", text: "已取消" },
};

export default function MallOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 10 };
      if (activeTab !== "all") params.status = activeTab;
      const res = await fetchMyMallOrders(params);
      setOrders(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, activeTab]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const tabItems = [
    { key: "all", label: "全部" },
    { key: "pending_shipment", label: "待发货" },
    { key: "shipped", label: "已发货" },
    { key: "completed", label: "已完成" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate("/community/mall")} style={{ marginBottom: 16, padding: 0 }}>
        返回商城
      </Button>
      <Title level={3}><ShoppingOutlined style={{ marginRight: 8 }} />我的订单</Title>

      <Card style={{ borderRadius: 12 }}>
        <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k); setPage(1); }} items={tabItems} />
        <Spin spinning={loading}>
          {orders.length === 0 ? (
            <Empty description="暂无订单" style={{ padding: 48 }} />
          ) : (
            <List
              dataSource={orders}
              pagination={{ current: page, pageSize: 10, total, onChange: setPage, size: "small" }}
              renderItem={(order) => {
                const snapshot = order.product_snapshot || {};
                const statusInfo = statusMap[order.status] || { color: "default", text: order.status };
                return (
                  <List.Item>
                    <div style={{ display: "flex", gap: 16, width: "100%", alignItems: "center" }}>
                      <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {snapshot.image ? <img src={snapshot.image} alt={snapshot.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GiftOutlined style={{ fontSize: 24, color: "#ccc" }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Text strong>{snapshot.name}</Text>
                          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>订单号: {order.order_no}</Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Text style={{ color: "#f5222d", fontWeight: 600 }}>-{order.points_cost} 积分</Text>
                          <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>{order.created_at ? new Date(order.created_at).toLocaleString() : ""}</Text>
                        </div>
                        {order.tracking_number && (
                          <div style={{ marginTop: 8, padding: "8px 12px", background: "#f6ffed", borderRadius: 6 }}>
                            <Text style={{ fontSize: 12 }}>物流: {order.tracking_company} {order.tracking_number}</Text>
                          </div>
                        )}
                        {order.status === "pending_shipment" && order.shipping_name && (
                          <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                            收货: {order.shipping_name} {order.shipping_phone} | {order.shipping_address}
                          </div>
                        )}
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
