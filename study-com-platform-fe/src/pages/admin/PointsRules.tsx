import { Card, Input, Space, Table, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchPointsRules } from "../../services/admin";

const { Title, Text } = Typography;

type PointsRuleRow = {
  id: number;
  code: string;
  title: string;
  change: number;
  status: number;
  description?: string;
  createdAt?: string;
  created_at?: string;
};

export default function PointsRules() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PointsRuleRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const loadData = useCallback(
    async (nextPage = page, nextSize = pageSize) => {
      setLoading(true);
      try {
        const res = await fetchPointsRules({
          page: nextPage,
          pageSize: nextSize,
          keyword: keyword || undefined,
        });
        setData(res.data || []);
        setTotal(res.pagination?.total || 0);
        setPage(nextPage);
        setPageSize(nextSize);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, keyword],
  );

  useEffect(() => {
    loadData(1, pageSize);
  }, [loadData, pageSize]);

  return (
    <div className="page-container">
      <Title level={3}>积分规则</Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Text>筛选：</Text>
          <Input.Search
            placeholder="规则码或名称"
            allowClear
            style={{ width: 220 }}
            onSearch={(value) => setKeyword(value.trim())}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextSize) => loadData(nextPage, nextSize),
          }}
          columns={[
            { title: "规则ID", dataIndex: "id", width: 90 },
            { title: "规则码", dataIndex: "code" },
            { title: "规则名称", dataIndex: "title" },
            { title: "积分变动", dataIndex: "change" },
            {
              title: "规则说明",
              dataIndex: "description",
              render: (v) => v || "-",
            },
            {
              title: "状态",
              dataIndex: "status",
              render: (value) => (
                <Tag color={value ? "green" : "red"}>
                  {value ? "启用" : "禁用"}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
