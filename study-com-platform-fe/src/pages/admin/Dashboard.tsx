import { Card, Col, Row, Statistic, Table, Typography, Skeleton } from "antd";
import { Column, Line, WordCloud } from "@ant-design/charts";
import { useEffect, useState, useCallback } from "react";
import { fetchDashboard } from "../../services/admin";

const { Title } = Typography;

interface DashboardStats {
  activeUsers: number;
  newPosts: number;
  pendingPosts: number;
  pendingReports: number;
  trendData: Array<{
    metric: string;
    value: number;
    change: string;
  }>;
  timeSeries: Array<{
    date: string;
    posts: number;
    activeUsers: number;
  }>;
  categoryStats: Array<{
    category: string;
    count: number;
  }>;
  tagStats: Array<{
    tag: string;
    count: number;
  }>;
  reviewMetrics: {
    avgReviewTime: number;
    approvalRate: number;
    processedReports: number;
    punishedUsers: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const response = await fetchDashboard();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  if (loading) {
    return (
      <div className="page-container">
        <Title level={3}>数据看板</Title>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-container">
        <Title level={3}>数据看板</Title>
        <Card>加载失败</Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Title level={3}>数据看板</Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="今日活跃用户" value={stats.activeUsers} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日发帖" value={stats.newPosts} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待审核帖子" value={stats.pendingPosts} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待处理举报" value={stats.pendingReports} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="运营概览">
            <Table
              pagination={false}
              dataSource={stats.trendData}
              rowKey={(record) => record.metric}
              columns={[
                { title: "指标", dataIndex: "metric", key: "metric" },
                { title: "数值", dataIndex: "value", key: "value" },
                { title: "变化", dataIndex: "change", key: "change" },
              ]}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="审核效率">
            <Row gutter={12}>
              <Col span={12}>
                <Statistic
                  title="平均审核时长"
                  value={stats.reviewMetrics.avgReviewTime}
                  suffix="min"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="通过率"
                  value={stats.reviewMetrics.approvalRate}
                  suffix="%"
                />
              </Col>
            </Row>
            <Row gutter={12} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Statistic
                  title="处理举报"
                  value={stats.reviewMetrics.processedReports}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="处罚用户"
                  value={stats.reviewMetrics.punishedUsers}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="近7日活跃与发帖趋势">
            <Line
              data={stats.timeSeries.flatMap((item) => [
                { date: item.date, type: "活跃用户", value: item.activeUsers },
                { date: item.date, type: "发帖数", value: item.posts },
              ])}
              xField="date"
              yField="value"
              seriesField="type"
              smooth
              height={260}
              autoFit
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="社区分类分布">
            <Column
              data={stats.categoryStats}
              xField="category"
              yField="count"
              height={260}
              autoFit
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="热门标签词云">
            <WordCloud
              data={stats.tagStats.map((item) => ({
                name: item.tag,
                value: item.count,
              }))}
              wordField="name"
              weightField="value"
              colorField="name"
              height={280}
              autoFit
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
