import { useState, useEffect } from "react";
import { Card, Button, Tag, Typography, Spin, Modal, Form, Input, Tooltip, message, Descriptions, Divider } from "antd";
import { ShoppingCartOutlined, ArrowLeftOutlined, CrownOutlined, GiftOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { fetchMallProductDetail, exchangeProduct } from "../../services/mall";
import { fetchPointsSummary } from "../../services/communityPublic";

const { Title, Text, Paragraph } = Typography;

const typeLabels: Record<string, { text: string; color: string }> = {
  virtual_decoration: { text: "虚拟装扮", color: "purple" },
  virtual_privilege: { text: "功能特权", color: "blue" },
  physical: { text: "实物商品", color: "green" },
};

const subTypeLabels: Record<string, string> = {
  avatar_frame: "头像框",
  profile_background: "名片背景",
  study_room_skin: "自习室皮肤",
};

export default function MallProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingForm] = Form.useForm();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchMallProductDetail(parseInt(id)),
      fetchPointsSummary(),
    ]).then(([productRes, pointsRes]) => {
      setProduct(productRes.data);
      setUserPoints(pointsRes.data?.total || 0);
    }).catch(() => {
      message.error("加载商品信息失败");
    }).finally(() => setLoading(false));
  }, [id]);

  const canAfford = product ? userPoints >= product.points_price : false;
  const inStock = product ? product.stock > 0 : false;
  const deficit = product ? product.points_price - userPoints : 0;

  const handleExchange = async (shippingInfo?: any) => {
    if (!product) return;
    setExchangeLoading(true);
    try {
      await exchangeProduct({ productId: product.id, shippingInfo });
      message.success("兑换成功！");
      setShippingModalOpen(false);
      // Refresh data
      const [productRes, pointsRes] = await Promise.all([
        fetchMallProductDetail(product.id),
        fetchPointsSummary(),
      ]);
      setProduct(productRes.data);
      setUserPoints(pointsRes.data?.total || 0);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || "兑换失败");
    }
    setExchangeLoading(false);
  };

  const handleExchangeClick = () => {
    if (!product) return;
    if (product.type === "physical") {
      shippingForm.resetFields();
      setShippingModalOpen(true);
    } else {
      Modal.confirm({
        title: "确认兑换",
        content: `确定使用 ${product.points_price} 积分兑换「${product.name}」？`,
        okText: "确认兑换",
        onOk: () => handleExchange(),
      });
    }
  };

  const handleShippingSubmit = async () => {
    try {
      const values = await shippingForm.validateFields();
      await handleExchange(values);
    } catch { /* validation error */ }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;
  if (!product) return <div style={{ textAlign: "center", padding: 100 }}>商品不存在</div>;

  const typeInfo = typeLabels[product.type] || { text: product.type, color: "default" };
  const now = new Date();
  const notStarted = product.exchange_start_time && now < new Date(product.exchange_start_time);
  const ended = product.exchange_end_time && now > new Date(product.exchange_end_time);

  let buttonDisabled = false;
  let buttonText = "立即兑换";
  let tooltipText = "";

  if (!inStock) { buttonDisabled = true; buttonText = "已售罄"; }
  else if (notStarted) { buttonDisabled = true; buttonText = "兑换未开始"; }
  else if (ended) { buttonDisabled = true; buttonText = "兑换已结束"; }
  else if (!canAfford) { buttonDisabled = true; buttonText = "积分不足"; tooltipText = `还差 ${deficit} 积分`; }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate("/community/mall")} style={{ marginBottom: 16, padding: 0 }}>
        返回商城
      </Button>

      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {/* Product Image */}
          <div style={{ width: 320, height: 320, background: "#f5f5f5", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {product.image ? (
              <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <GiftOutlined style={{ fontSize: 80, color: "#ccc" }} />
            )}
          </div>

          {/* Product Info */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <Title level={3} style={{ marginBottom: 8 }}>{product.name}</Title>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
              {product.sub_type && <Tag>{subTypeLabels[product.sub_type] || product.sub_type}</Tag>}
            </Space>

            <div style={{ background: "#fff7e6", padding: "16px 20px", borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 28, color: "#f5222d", fontWeight: 700 }}>
                {product.points_price}
              </Text>
              <Text style={{ fontSize: 14, color: "#f5222d", marginLeft: 4 }}>积分</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">我的积分余额: {userPoints}</Text>
              </div>
            </div>

            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="库存">{inStock ? `${product.stock} 件` : "已售罄"}</Descriptions.Item>
              <Descriptions.Item label="已兑换">{product.exchange_count} 次</Descriptions.Item>
              {product.daily_exchange_limit && <Descriptions.Item label="每日限购">{product.daily_exchange_limit} 次/人</Descriptions.Item>}
              {product.total_limit && <Descriptions.Item label="总限购">{product.total_limit} 次/人</Descriptions.Item>}
              {product.exchange_start_time && <Descriptions.Item label="兑换时间">{new Date(product.exchange_start_time).toLocaleString()} ~ {product.exchange_end_time ? new Date(product.exchange_end_time).toLocaleString() : "长期"}</Descriptions.Item>}
            </Descriptions>

            <Tooltip title={tooltipText} placement="top">
              <Button
                type="primary"
                size="large"
                icon={<ShoppingCartOutlined />}
                disabled={buttonDisabled}
                loading={exchangeLoading}
                onClick={handleExchangeClick}
                style={{ width: "100%", height: 48, fontSize: 16, borderRadius: 8 }}
              >
                {buttonText}
              </Button>
            </Tooltip>
          </div>
        </div>

        {product.description && (
          <>
            <Divider />
            <Title level={5}>商品详情</Title>
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>{product.description}</Paragraph>
          </>
        )}
      </Card>

      {/* Shipping Info Modal */}
      <Modal title="填写收货信息" open={shippingModalOpen} onOk={handleShippingSubmit} onCancel={() => setShippingModalOpen(false)} confirmLoading={exchangeLoading} okText="确认兑换" destroyOnClose>
        <div style={{ marginBottom: 16, padding: 12, background: "#f6ffed", borderRadius: 8 }}>
          <Text>将花费 <Text strong style={{ color: "#f5222d" }}>{product.points_price}</Text> 积分兑换「{product.name}」</Text>
        </div>
        <Form form={shippingForm} layout="vertical">
          <Form.Item name="shipping_name" label="收货人姓名" rules={[{ required: true, message: "请输入收货人姓名" }]}>
            <Input placeholder="请输入收货人姓名" />
          </Form.Item>
          <Form.Item name="shipping_phone" label="手机号码" rules={[{ required: true, message: "请输入手机号码" }, { pattern: /^1\d{10}$/, message: "请输入正确的手机号" }]}>
            <Input placeholder="请输入手机号码" />
          </Form.Item>
          <Form.Item name="shipping_address" label="收货地址" rules={[{ required: true, message: "请输入收货地址" }]}>
            <Input.TextArea rows={2} placeholder="请输入详细收货地址" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
