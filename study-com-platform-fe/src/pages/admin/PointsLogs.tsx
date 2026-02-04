import { Card, Table, Tag, Typography } from "antd";

const { Title } = Typography;

const data = [
  {
    key: 1,
    user: "小王",
    change: "+5",
    reason: "发帖",
    source: "post_create",
  },
  {
    key: 2,
    user: "小李",
    change: "-3",
    reason: "违规评论",
    source: "comment_violation",
  },
];

export default function PointsLogs() {
  return (
    <div className="page-container">
      <Title level={3}>积分流水</Title>
      <Card>
        <Table
          dataSource={data}
          columns={[
            { title: "用户", dataIndex: "user" },
            { title: "变动", dataIndex: "change" },
            { title: "原因", dataIndex: "reason" },
            {
              title: "来源",
              dataIndex: "source",
              render: (value) => <Tag>{value}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
