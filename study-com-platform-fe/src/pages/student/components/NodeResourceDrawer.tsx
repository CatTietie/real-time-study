import { Drawer, List, Tag, Empty, Button } from "antd";
import { LinkOutlined, BookOutlined, FileTextOutlined } from "@ant-design/icons";

const resourceTypeIcons: Record<string, any> = {
  question_bank: <BookOutlined />,
  post: <FileTextOutlined />,
  external_link: <LinkOutlined />,
};

const resourceTypeLabels: Record<string, string> = {
  question_bank: "题库",
  post: "帖子",
  external_link: "外部链接",
};

interface Resource {
  id: number;
  resource_type: string;
  resource_id?: number;
  title: string;
  url?: string;
}

interface Props {
  open: boolean;
  nodeTitle: string;
  resources: Resource[];
  onClose: () => void;
}

export default function NodeResourceDrawer({ open, nodeTitle, resources, onClose }: Props) {
  return (
    <Drawer
      title={`${nodeTitle} - 关联资源`}
      open={open}
      onClose={onClose}
      width={400}
    >
      {resources.length === 0 ? (
        <Empty description="暂无关联资源" />
      ) : (
        <List
          dataSource={resources}
          renderItem={(item) => (
            <List.Item
              actions={[
                item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <Button type="link" size="small">查看</Button>
                  </a>
                ) : null,
              ]}
            >
              <List.Item.Meta
                avatar={resourceTypeIcons[item.resource_type]}
                title={item.title}
                description={
                  <Tag>{resourceTypeLabels[item.resource_type] || item.resource_type}</Tag>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
