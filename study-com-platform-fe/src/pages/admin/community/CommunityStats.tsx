import { Card, Col, Row, Statistic, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { fetchCommunityStats } from "../../../services/community";

const { Title } = Typography;

export default function CommunityStats() {
  const [stats, setStats] = useState({
    todayPosts: 0,
    todayComments: 0,
    pendingReports: 0,
    passRate: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetchCommunityStats();
      setStats({
        todayPosts: res?.data?.todayPosts ?? 0,
        todayComments: res?.data?.todayComments ?? 0,
        pendingReports: res?.data?.pendingReports ?? 0,
        passRate: res?.data?.passRate ?? 0,
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="page-container">
      <Title level={3}>社区统计</Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="今日发帖" value={stats.todayPosts} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="今日评论" value={stats.todayComments} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="待处理举报" value={stats.pendingReports} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="通过率" value={`${stats.passRate}%`} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
