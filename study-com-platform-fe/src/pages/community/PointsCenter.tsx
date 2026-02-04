import { Card, Col, List, Row, Statistic, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import {
  fetchPointsLogs,
  fetchPointsSummary,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title } = Typography;

type PointsLogRow = {
  id: number;
  change: number;
  reason: string;
  source_type: string;
  createdAt?: string;
};

export default function PointsCenter() {
  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    week: 0,
    month: 0,
    level: 1,
  });
  const [logs, setLogs] = useState<PointsLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, logsRes] = await Promise.all([
        fetchPointsSummary(),
        fetchPointsLogs({ page: 1, pageSize: 20 }),
      ]);
      if (summaryRes?.data) {
        setSummary(summaryRes.data);
      }
      setLogs(logsRes?.data || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="page-container">
      <Title level={3}>我的积分</Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="总积分" value={summary.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="今日积分" value={summary.today} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="本周积分" value={summary.week} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="等级" value={summary.level} />
          </Card>
        </Col>
      </Row>

      <Card loading={loading} style={{ marginTop: 16 }} title="积分明细">
        <List
          dataSource={logs}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={`${item.reason} (${item.source_type})`}
                description={item.createdAt}
              />
              <div>{item.change > 0 ? `+${item.change}` : item.change}</div>
            </List.Item>
          )}
        />
      </Card>
      <CommunityFooter />
    </div>
  );
}
