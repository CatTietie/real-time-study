import { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Tag, Space, Select, InputNumber, Button, Carousel, Typography, Spin, Empty, Badge } from "antd";
import { ShoppingOutlined, FireOutlined, CrownOutlined, GiftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchMallProducts, fetchMallHotProducts, fetchMallBanners } from "../../services/mall";
import { fetchPointsSummary } from "../../services/communityPublic";

const { Title, Text } = Typography;

const typeLabels: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  virtual_decoration: { text: "虚拟装扮", color: "purple", icon: <CrownOutlined /> },
  virtual_privilege: { text: "功能特权", color: "blue", icon: <GiftOutlined /> },
  physical: { text: "实物商品", color: "green", icon: <ShoppingOutlined /> },
};

export default function PointsMall() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [hotProducts, setHotProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const [filterType, setFilterType] = useState<string>();
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [sortBy, setSortBy] = useState<string>("default");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 12, sort_by: sortBy === "default" ? undefined : sortBy };
      if (filterType) params.type = filterType;
      if (minPrice !== undefined) params.min_price = minPrice;
      if (maxPrice !== undefined) params.max_price = maxPrice;
      if (sortBy === "price_asc") { params.sort_by = "price"; params.sort_order = "asc"; }
      if (sortBy === "price_desc") { params.sort_by = "price"; params.sort_order = "desc"; }
      if (sortBy === "popular") { params.sort_by = "popular"; }

      const res = await fetchMallProducts(params);
      setProducts(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, filterType, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    fetchMallHotProducts().then((res) => setHotProducts(res.data || [])).catch(() => {});
    fetchMallBanners().then((res) => setBanners(res.data || [])).catch(() => {});
    fetchPointsSummary().then((res) => setUserPoints(res.data?.total || 0)).catch(() => {});
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <ShoppingOutlined style={{ marginRight: 8 }} />积分商城
        </Title>
        <Space>
          <Card size="small" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>
            <Text style={{ color: "#fff", fontWeight: 600 }}>我的积分: {userPoints}</Text>
          </Card>
          <Button onClick={() => navigate("/community/mall/orders")}>我的订单</Button>
          <Button onClick={() => navigate("/community/mall/decorations")}>我的装扮</Button>
        </Space>
      </div>

      {/* Banners */}
      {banners.length > 0 && (
        <Card style={{ marginBottom: 24, overflow: "hidden", borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Carousel autoplay>
            {banners.map((banner) => (
              <div key={banner.id}>
                <div
                  style={{ height: 200, background: `url(${banner.image}) center/cover no-repeat`, display: "flex", alignItems: "center", justifyContent: "center", cursor: banner.link_type !== "none" ? "pointer" : "default" }}
                  onClick={() => {
                    if (banner.link_type === "product") navigate(`/community/mall/product/${banner.link_value}`);
                    else if (banner.link_type === "external") window.open(banner.link_value);
                  }}
                >
                  {!banner.image && <Title level={3} style={{ color: "#fff" }}>{banner.title}</Title>}
                </div>
              </div>
            ))}
          </Carousel>
        </Card>
      )}

      {/* Hot Products */}
      {hotProducts.length > 0 && (
        <Card title={<span><FireOutlined style={{ color: "#f5222d", marginRight: 8 }} />热门兑换</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
          <Row gutter={[12, 12]}>
            {hotProducts.slice(0, 6).map((product, idx) => (
              <Col xs={12} sm={8} md={4} key={product.id}>
                <div
                  style={{ textAlign: "center", cursor: "pointer", padding: 8, borderRadius: 8, transition: "background 0.2s" }}
                  onClick={() => navigate(`/community/mall/product/${product.id}`)}
                >
                  <Badge count={idx < 3 ? idx + 1 : 0} style={{ backgroundColor: idx === 0 ? "#f5222d" : idx === 1 ? "#fa8c16" : "#faad14" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 8, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {product.image ? <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GiftOutlined style={{ fontSize: 24, color: "#999" }} />}
                    </div>
                  </Badge>
                  <div style={{ marginTop: 4, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</div>
                  <div style={{ color: "#f5222d", fontWeight: 600, fontSize: 12 }}>{product.points_price} 积分</div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space wrap>
          <Select placeholder="商品类型" allowClear value={filterType} onChange={(v) => { setFilterType(v); setPage(1); }} style={{ width: 130 }}
            options={[
              { label: "全部", value: undefined as any },
              { label: "虚拟装扮", value: "virtual_decoration" },
              { label: "功能特权", value: "virtual_privilege" },
              { label: "实物商品", value: "physical" },
            ]}
          />
          <InputNumber placeholder="最低积分" min={0} value={minPrice} onChange={(v) => { setMinPrice(v ?? undefined); setPage(1); }} style={{ width: 110 }} />
          <span>-</span>
          <InputNumber placeholder="最高积分" min={0} value={maxPrice} onChange={(v) => { setMaxPrice(v ?? undefined); setPage(1); }} style={{ width: 110 }} />
          <Select value={sortBy} onChange={(v) => { setSortBy(v); setPage(1); }} style={{ width: 130 }}
            options={[
              { label: "默认排序", value: "default" },
              { label: "积分从低到高", value: "price_asc" },
              { label: "积分从高到低", value: "price_desc" },
              { label: "最热门", value: "popular" },
            ]}
          />
        </Space>
      </Card>

      {/* Product Grid */}
      <Spin spinning={loading}>
        {products.length === 0 && !loading ? (
          <Empty description="暂无商品" style={{ marginTop: 48 }} />
        ) : (
          <Row gutter={[16, 16]}>
            {products.map((product) => {
              const canAfford = userPoints >= product.points_price;
              const typeInfo = typeLabels[product.type] || { text: product.type, color: "default", icon: null };
              return (
                <Col xs={12} sm={8} md={6} key={product.id}>
                  <Card
                    hoverable
                    style={{ borderRadius: 12, overflow: "hidden" }}
                    cover={
                      <div style={{ height: 160, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {product.image ? <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GiftOutlined style={{ fontSize: 48, color: "#ccc" }} />}
                      </div>
                    }
                    onClick={() => navigate(`/community/mall/product/${product.id}`)}
                  >
                    <Card.Meta
                      title={<span style={{ fontSize: 14 }}>{product.name}</span>}
                      description={
                        <div>
                          <Tag color={typeInfo.color} style={{ marginBottom: 4 }}>{typeInfo.text}</Tag>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                            <span style={{ color: "#f5222d", fontWeight: 700, fontSize: 16 }}>{product.points_price} <span style={{ fontSize: 12, fontWeight: 400 }}>积分</span></span>
                            {product.stock <= 5 && product.stock > 0 && <Tag color="warning">仅剩{product.stock}件</Tag>}
                            {product.stock === 0 && <Tag color="default">已售罄</Tag>}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: "#999" }}>
                            已兑换 {product.exchange_count} 次
                          </div>
                          {!canAfford && product.stock > 0 && (
                            <div style={{ marginTop: 4, fontSize: 12, color: "#ff4d4f" }}>
                              还差 {product.points_price - userPoints} 积分
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      {/* Pagination */}
      {total > 12 && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Button disabled={page * 12 >= total} onClick={() => setPage(page + 1)}>加载更多</Button>
        </div>
      )}
    </div>
  );
}
