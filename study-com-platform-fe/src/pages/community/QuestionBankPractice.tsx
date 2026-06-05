import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Tree,
  Input,
  Row,
  Col,
  Rate,
  Progress,
  Pagination,
  Radio,
  Tag,
  Typography,
  Spin,
  Empty,
  Button,
  Space,
  message,
} from "antd";
import {
  HomeOutlined,
  SearchOutlined,
  BookOutlined,
  ReadOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import CommunityFooter from "../../components/community/CommunityFooter";
import {
  fetchProfessionals,
  fetchCategories,
  fetchBanks,
} from "../../services/questionBankPublic";
import type {
  ProfessionalItem,
  CategoryTreeNode,
  QuestionBankItem,
} from "../../services/questionBankPublic";

const { Title, Text } = Typography;
const { Search } = Input;

function mapTreeData(nodes: CategoryTreeNode[]): any[] {
  return nodes.map((node) => ({
    key: node.id,
    title: node.name,
    children: node.children && node.children.length > 0 ? mapTreeData(node.children) : undefined,
  }));
}

export default function QuestionBankPractice() {
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [banks, setBanks] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0 });

  useEffect(() => {
    loadProfessionals();
  }, []);

  useEffect(() => {
    if (selectedProfessionalId) {
      loadCategories(selectedProfessionalId);
      setSelectedCategoryId(null);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [selectedProfessionalId]);

  useEffect(() => {
    if (selectedProfessionalId) {
      loadBanks();
    }
  }, [selectedCategoryId, selectedProfessionalId, keyword, pagination.page]);

  const loadProfessionals = async () => {
    try {
      const res = await fetchProfessionals();
      if (res.success && res.data.length > 0) {
        setProfessionals(res.data);
        setSelectedProfessionalId(res.data[0].id);
      }
    } catch {
      message.error("获取专业列表失败");
    }
  };

  const loadCategories = async (professionalId: number) => {
    setTreeLoading(true);
    try {
      const res = await fetchCategories(professionalId);
      if (res.success) {
        setCategoryTree(res.data);
      }
    } catch {
      message.error("获取分类失败");
    } finally {
      setTreeLoading(false);
    }
  };

  const loadBanks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (selectedCategoryId) {
        params.categoryId = selectedCategoryId;
      } else if (selectedProfessionalId) {
        params.professionalId = selectedProfessionalId;
      }
      if (keyword) params.keyword = keyword;

      const res = await fetchBanks(params);
      if (res.success) {
        setBanks(res.data);
        setPagination((prev) => ({ ...prev, total: res.pagination?.total || 0 }));
      }
    } catch {
      message.error("获取题库列表失败");
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, selectedProfessionalId, keyword, pagination.page, pagination.pageSize]);

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTreeSelect = (selectedKeys: any[]) => {
    const id = selectedKeys.length > 0 ? Number(selectedKeys[0]) : null;
    setSelectedCategoryId(id);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return { text: "简单", color: "#52c41a" };
    if (difficulty <= 3.5) return { text: "中等", color: "#faad14" };
    return { text: "困难", color: "#f5222d" };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "32px 0",
      }}
    >
      <Button
        icon={<HomeOutlined />}
        onClick={() => navigate("/community")}
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          zIndex: 100,
          borderRadius: 20,
          background: "rgba(255,255,255,0.95)",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        返回社区
      </Button>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <Card
          style={{
            borderRadius: 20,
            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            border: "none",
            marginBottom: 24,
            boxShadow: "0 8px 32px rgba(79,172,254,0.3)",
          }}
          styles={{ body: { padding: "32px 40px" } }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ReadOutlined style={{ fontSize: 40, color: "#fff" }} />
              <div>
                <Title level={2} style={{ color: "#fff", margin: 0 }}>
                  题库练习
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 16 }}>
                  选择专业和分类，开始刷题之旅
                </Text>
              </div>
            </div>
            <Button
              size="large"
              icon={<BookOutlined />}
              onClick={() => navigate("/community/wrong-book")}
              style={{
                borderRadius: 12,
                height: 44,
                paddingInline: 24,
                background: "rgba(255,255,255,0.9)",
                border: "none",
                fontWeight: 500,
              }}
            >
              我的错题本
            </Button>
            <Button
              size="large"
              icon={<HistoryOutlined />}
              onClick={() => navigate("/community/exercise-history")}
              style={{
                borderRadius: 12,
                height: 44,
                paddingInline: 24,
                background: "rgba(255,255,255,0.9)",
                border: "none",
                fontWeight: 500,
                marginLeft: 12,
              }}
            >
              练习记录
            </Button>
          </div>
        </Card>

        {/* Professional Tabs */}
        {professionals.length > 0 && (
          <Card
            style={{ borderRadius: 16, marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            styles={{ body: { padding: "16px 24px" } }}
          >
            <Radio.Group
              value={selectedProfessionalId}
              onChange={(e) => setSelectedProfessionalId(e.target.value)}
              buttonStyle="solid"
              size="large"
            >
              {professionals.map((p) => (
                <Radio.Button key={p.id} value={p.id}>
                  {p.name}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Card>
        )}

        {/* Main Content */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Left: Category Tree */}
          <Card
            style={{
              width: 280,
              flexShrink: 0,
              borderRadius: 16,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              position: "sticky",
              top: 24,
            }}
            styles={{ body: { padding: "16px" } }}
            title={
              <Space>
                <BookOutlined />
                <span>分类导航</span>
              </Space>
            }
          >
            <Spin spinning={treeLoading}>
              {categoryTree.length > 0 ? (
                <Tree
                  treeData={mapTreeData(categoryTree)}
                  onSelect={handleTreeSelect}
                  selectedKeys={selectedCategoryId ? [selectedCategoryId] : []}
                  defaultExpandAll
                  blockNode
                  style={{ background: "transparent" }}
                />
              ) : (
                <Empty description="暂无分类" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Spin>
          </Card>

          {/* Right: Banks */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Search */}
            <Card
              style={{ borderRadius: 16, marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              styles={{ body: { padding: "16px 24px" } }}
            >
              <Space size="middle" wrap>
                <Search
                  placeholder="搜索题库名称"
                  allowClear
                  onSearch={handleSearch}
                  enterButton={<SearchOutlined />}
                  style={{ width: 320 }}
                  size="large"
                />
                {selectedCategoryId && (
                  <Tag
                    closable
                    onClose={() => {
                      setSelectedCategoryId(null);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    color="blue"
                    style={{ fontSize: 14, padding: "4px 12px" }}
                  >
                    已筛选分类
                  </Tag>
                )}
              </Space>
            </Card>

            {/* Bank Cards */}
            <Spin spinning={loading}>
              {banks.length > 0 ? (
                <>
                  <Row gutter={[20, 20]}>
                    {banks.map((bank) => {
                      const diffLabel = getDifficultyLabel(bank.difficulty);
                      return (
                        <Col xs={24} sm={12} lg={8} key={bank.id}>
                          <Card
                            hoverable
                            onClick={() => navigate(`/community/question-bank/${bank.id}/mode`)}
                            style={{
                              borderRadius: 16,
                              overflow: "hidden",
                              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                              transition: "all 0.3s ease",
                              height: "100%",
                            }}
                            styles={{ body: { padding: "20px" } }}
                          >
                            <div style={{ marginBottom: 12 }}>
                              <Title level={5} style={{ margin: 0, marginBottom: 4 }} ellipsis>
                                {bank.name}
                              </Title>
                              {bank.description && (
                                <Text type="secondary" style={{ fontSize: 13 }} ellipsis>
                                  {bank.description}
                                </Text>
                              )}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Text type="secondary">题目数量</Text>
                                <Tag color="blue">{bank.question_count} 题</Tag>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Text type="secondary">难度</Text>
                                <Space size={4}>
                                  <Rate disabled allowHalf value={bank.difficulty} style={{ fontSize: 14 }} />
                                  <Tag color={diffLabel.color}>{diffLabel.text}</Tag>
                                </Space>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Text type="secondary">好评率</Text>
                                <Progress
                                  percent={Math.round(bank.rating * 20)}
                                  size="small"
                                  style={{ width: 120, margin: 0 }}
                                  strokeColor={bank.rating >= 4 ? "#52c41a" : bank.rating >= 3 ? "#faad14" : "#f5222d"}
                                />
                              </div>
                            </div>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>

                  {pagination.total > pagination.pageSize && (
                    <div style={{ textAlign: "center", marginTop: 32 }}>
                      <Pagination
                        current={pagination.page}
                        total={pagination.total}
                        pageSize={pagination.pageSize}
                        onChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                        showTotal={(total) => `共 ${total} 个题库`}
                        showSizeChanger={false}
                      />
                    </div>
                  )}
                </>
              ) : (
                !loading && (
                  <Card style={{ borderRadius: 16, textAlign: "center", padding: 40 }}>
                    <Empty description="暂无题库，请选择分类或调整搜索条件" />
                  </Card>
                )
              )}
            </Spin>
          </div>
        </div>

        <div style={{ marginTop: 48 }}>
          <CommunityFooter />
        </div>
      </div>
    </div>
  );
}
