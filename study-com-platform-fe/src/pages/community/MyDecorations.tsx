import { useState, useEffect } from "react";
import { Card, Row, Col, Button, Tag, Typography, Spin, Empty, message } from "antd";
import { ArrowLeftOutlined, CrownOutlined, CheckCircleOutlined, GiftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchMyDecorations, equipDecoration, unequipDecoration } from "../../services/mall";

const { Title, Text } = Typography;

const typeLabels: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  avatar_frame: { text: "头像框", color: "#722ed1", icon: <CrownOutlined /> },
  profile_background: { text: "名片背景", color: "#1890ff", icon: <GiftOutlined /> },
  study_room_skin: { text: "自习室皮肤", color: "#13c2c2", icon: <GiftOutlined /> },
};

export default function MyDecorations() {
  const navigate = useNavigate();
  const [decorations, setDecorations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchMyDecorations();
      setDecorations(res.data || []);
    } catch {
      message.error("加载装扮列表失败");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleEquip = async (id: number) => {
    try {
      await equipDecoration(id);
      message.success("装备成功");
      loadData();
    } catch (err: any) {
      message.error(err.message || "操作失败");
    }
  };

  const handleUnequip = async (id: number) => {
    try {
      await unequipDecoration(id);
      message.success("卸下成功");
      loadData();
    } catch (err: any) {
      message.error(err.message || "操作失败");
    }
  };

  const groupedDecorations = decorations.reduce((acc: Record<string, any[]>, item) => {
    const type = item.decoration_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate("/community/mall")} style={{ marginBottom: 16, padding: 0 }}>
        返回商城
      </Button>
      <Title level={3}><CrownOutlined style={{ marginRight: 8 }} />我的装扮</Title>

      <Spin spinning={loading}>
        {decorations.length === 0 ? (
          <Card style={{ borderRadius: 12 }}>
            <Empty description="暂无装扮，去商城逛逛吧">
              <Button type="primary" onClick={() => navigate("/community/mall")}>去逛商城</Button>
            </Empty>
          </Card>
        ) : (
          Object.entries(groupedDecorations).map(([type, items]) => {
            const typeInfo = typeLabels[type] || { text: type, color: "#666", icon: null };
            return (
              <Card key={type} title={<span style={{ color: typeInfo.color }}>{typeInfo.icon} {typeInfo.text}</span>} style={{ marginBottom: 16, borderRadius: 12 }}>
                <Row gutter={[16, 16]}>
                  {items.map((item: any) => {
                    const product = item.MallProduct || {};
                    return (
                      <Col xs={12} sm={8} md={6} key={item.id}>
                        <Card
                          size="small"
                          style={{
                            borderRadius: 10,
                            border: item.is_equipped ? "2px solid #52c41a" : "1px solid #f0f0f0",
                            position: "relative",
                          }}
                        >
                          {item.is_equipped && (
                            <div style={{ position: "absolute", top: 8, right: 8 }}>
                              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
                            </div>
                          )}
                          <div style={{ textAlign: "center" }}>
                            <div style={{ width: 80, height: 80, margin: "0 auto 8px", borderRadius: 8, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                              {product.image ? <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GiftOutlined style={{ fontSize: 32, color: "#ccc" }} />}
                            </div>
                            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>{product.name}</Text>
                            {item.is_equipped ? (
                              <Button size="small" onClick={() => handleUnequip(item.id)}>卸下</Button>
                            ) : (
                              <Button size="small" type="primary" onClick={() => handleEquip(item.id)}>装备</Button>
                            )}
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            );
          })
        )}
      </Spin>
    </div>
  );
}
