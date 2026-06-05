import React from "react";
import { Tree } from "antd";
import { FolderOutlined, FolderOpenOutlined } from "@ant-design/icons";
import type { KnowledgeCategory } from "../../types/knowledge-library";

interface CategoryTreeProps {
  categories: KnowledgeCategory[];
  selectedKey?: string | null;
  onSelect: (categoryId: string | null) => void;
  showPending?: boolean;
}

function convertToTreeData(categories: KnowledgeCategory[]): any[] {
  return categories.map((cat) => ({
    key: String(cat.id),
    title: cat.name,
    icon: <FolderOutlined />,
    children: cat.children ? convertToTreeData(cat.children) : [],
  }));
}

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedKey,
  onSelect,
  showPending = true,
}) => {
  const treeData = [
    { key: "all", title: "全部文档", icon: <FolderOpenOutlined /> },
    ...(showPending
      ? [{ key: "pending", title: "待整理", icon: <FolderOutlined /> }]
      : []),
    ...convertToTreeData(categories),
  ];

  return (
    <Tree
      showIcon
      selectedKeys={selectedKey ? [selectedKey] : ["all"]}
      onSelect={(keys) => {
        const key = keys[0] as string;
        if (key === "all") {
          onSelect(null);
        } else {
          onSelect(key);
        }
      }}
      treeData={treeData}
      defaultExpandAll
    />
  );
};

export default CategoryTree;
