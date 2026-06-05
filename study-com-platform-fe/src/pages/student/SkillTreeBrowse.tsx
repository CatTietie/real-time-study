import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Button, Progress, Tag, Empty, Spin, message } from "antd";
import { ApartmentOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { getPublishedPaths, getMyPaths, enrollInPath } from "../../services/learningPath";

export default function SkillTreeBrowse() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [publishedPaths, setPublishedPaths] = useState<any[]>([]);
  const [myPaths, setMyPaths] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pubRes, myRes] = await Promise.all([getPublishedPaths(), getMyPaths()]);
      if (pubRes.success) setPublishedPaths(pubRes.data);
      if (myRes.success) setMyPaths(myRes.data);
    } catch {
      message.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (pathId: number) => {
    try {
      const res = await enrollInPath(pathId);
      if (res.success) {
        message.success("加入成功");
        loadData();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "操作失败");
    }
  };

  const isEnrolled = (pathId: number) => myPaths.some((m) => m.path_id === pathId);
  const getEnrollment = (pathId: number) => myPaths.find((m) => m.path_id === pathId);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: 24 }}>
      {myPaths.length > 0 && (
        <>
          <h2 style={{ marginBottom: 16 }}>我的学习路径</h2>
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            {myPaths.map((item) => (
              <Col key={item.path_id} xs={24} sm={12} lg={8}>
                <Card
                  hoverable
                  onClick={() => navigate(`/student/skill-tree/${item.path_id}`)}
                  cover={
                    item.LearningPath?.cover_image ? (
                      <img alt="" src={item.LearningPath.cover_image} style={{ height: 120, objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: 120, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ApartmentOutlined style={{ fontSize: 40, color: "#fff" }} />
                      </div>
                    )
                  }
                >
                  <Card.Meta
                    title={item.LearningPath?.name}
                    description={
                      <div>
                        <Progress percent={item.progress_percent} size="small" style={{ marginTop: 8 }} />
                        <Tag color="blue" style={{ marginTop: 8 }}>进行中</Tag>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      <h2 style={{ marginBottom: 16 }}>探索学习路径</h2>
      {publishedPaths.length === 0 ? (
        <Empty description="暂无可用学习路径" />
      ) : (
        <Row gutter={[16, 16]}>
          {publishedPaths.map((path) => {
            const enrolled = isEnrolled(path.id);
            return (
              <Col key={path.id} xs={24} sm={12} lg={8}>
                <Card
                  hoverable
                  cover={
                    path.cover_image ? (
                      <img alt="" src={path.cover_image} style={{ height: 120, objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: 120, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ApartmentOutlined style={{ fontSize: 40, color: "#fff" }} />
                      </div>
                    )
                  }
                  actions={[
                    enrolled ? (
                      <Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate(`/student/skill-tree/${path.id}`)}>
                        继续学习
                      </Button>
                    ) : (
                      <Button type="link" onClick={() => handleEnroll(path.id)}>加入学习</Button>
                    ),
                  ]}
                >
                  <Card.Meta
                    title={path.name}
                    description={
                      <div>
                        <div style={{ marginBottom: 8, color: "#666", minHeight: 40 }}>{path.description || "暂无描述"}</div>
                        <Tag>{path.node_count} 个节点</Tag>
                        {enrolled && <Tag color="green">已加入</Tag>}
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
