import {
  Button,
  Card,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile } from "antd";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { 
  createCommunityPost,
  fetchCommunityTagSuggestions,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import {
  EditOutlined,
  TagsOutlined,
  PictureOutlined,
  SendOutlined,
  HomeOutlined,
  FileTextOutlined,
  StarOutlined,
  TrophyOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

const CATEGORY_OPTIONS = ["学习心得", "问题求助", "经验分享", "聊天交友"];

type PublishForm = {
  title: string;
  content: string;
  category: string;
  tags?: string[];
};

export default function PublishPost() {
  const navigate = useNavigate();
  const { token } = useAppSelector((state: RootState) => state.auth);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<PublishForm>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [tagFetching, setTagFetching] = useState(false);
  const tagTimerRef = useRef<number | null>(null);
  const watchedTags = Form.useWatch("tags", form) || [];

  const handleSubmit = async (values: PublishForm) => {
    if (!token) {
      messageApi.warning("请先登录再发帖");
      navigate("/admin/login");
      return;
    }

    const formData = new FormData();
    formData.append("title", values.title.trim());
    formData.append("content", values.content.trim());
    formData.append("category", values.category);
    if (values.tags && values.tags.length) {
      formData.append("tags", values.tags.join(","));
    }

    fileList.forEach((file) => {
      if (file.originFileObj) {
        formData.append("images", file.originFileObj);
      }
    });

    try {
      setSubmitting(true);
      await createCommunityPost(formData);
      messageApi.success("发帖成功，等待审核");
      form.resetFields();
      setFileList([]);
      window.setTimeout(() => {
        navigate("/community");
      }, 300);
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "发帖失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTagSearch = (value: string) => {
    if (!value || value.trim().length < 1) {
      setTagOptions([]);
      return;
    }
    if (tagTimerRef.current) {
      window.clearTimeout(tagTimerRef.current);
    }
    tagTimerRef.current = window.setTimeout(async () => {
      try {
        setTagFetching(true);
        const res = await fetchCommunityTagSuggestions(value.trim());
        setTagOptions((res?.data as string[]) || []);
      } catch {
        setTagOptions([]);
      } finally {
        setTagFetching(false);
      }
    }, 300);
  };

  const handleTagsChange = (values: string[]) => {
    const deduped = Array.from(new Set(values.map((v) => v.trim()))).filter(
      (v) => v.length > 0,
    );
    form.setFieldsValue({ tags: deduped.slice(0, 5) });
  };

  return (
    <div 
      className="page-container"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px 16px",
        position: "relative"
      }}
    >
      {contextHolder}
      
      {/* 装饰背景 */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 200,
        background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)"
      }} />
      
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        position: "relative",
        zIndex: 1
      }}>
        {/* 返回按钮 */}
        <Button
          type="text"
          icon={<HomeOutlined />}
          onClick={() => navigate('/community')}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 10,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: 12,
            padding: "12px 16px",
            color: "#667eea",
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
          }}
        >
          返回社区
        </Button>
        
        {/* 标题区域 */}
        <div style={{
          textAlign: "center",
          marginBottom: 32,
          paddingTop: 16
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255, 255, 255, 0.95)",
            padding: "16px 32px",
            borderRadius: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            marginBottom: 16,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)"
          }}>
            <EditOutlined style={{
              fontSize: 28,
              color: "#667eea",
              filter: "drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))"
            }} />
            <Title
              level={2}
              style={{
                margin: 0,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 800,
                fontSize: 32
              }}
            >
              发布新帖
            </Title>
            <TrophyOutlined style={{
              fontSize: 28,
              color: "#F59E0B",
              filter: "drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))"
            }} />
          </div>
          
          <Text type="secondary" style={{
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: 15,
            maxWidth: 600,
            margin: "0 auto",
            display: "block"
          }}>
            分享你的知识和经验，让更多人受益，优质内容有机会登上排行榜！
          </Text>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 24,
          }}
          className="publish-grid"
        >
          <Card
            style={{
              borderRadius: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              border: "none",
              background: "white",
              overflow: "hidden"
            }}
            styles={{ body: { padding: 32 } }}
          >
            <div style={{
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: "2px solid #F3F4F6"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 8
              }}>
                <div style={{
                  width: 8,
                  height: 32,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: 4
                }} />
                <Title level={3} style={{ margin: 0, color: "#1F2937" }}>
                  创作内容
                </Title>
              </div>
              <Text type="secondary">填写以下信息来发布你的精彩内容</Text>
            </div>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label={
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    <FileTextOutlined style={{ marginRight: 8, color: "#667eea" }} />
                    标题
                  </span>
                }
                name="title"
                rules={[
                  { required: true, message: "请输入标题" },
                  { min: 2, max: 100, message: "标题长度为2-100字符" },
                ]}
              >
                <Input
                  placeholder="在此输入帖子标题，2-100字符"
                  maxLength={100}
                  showCount
                  size="large"
                  style={{
                    borderRadius: 12,
                    borderColor: "#E5E7EB",
                    transition: "all 0.3s ease",
                    background: "#FAFAFA"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#667eea";
                    e.target.style.boxShadow = "0 0 0 2px rgba(102, 126, 234, 0.2)";
                    e.target.style.background = "white";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7EB";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "#FAFAFA";
                  }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    <TagsOutlined style={{ marginRight: 8, color: "#10B981" }} />
                    分类选择
                  </span>
                }
                name="category"
                rules={[{ required: true, message: "请选择分类" }]}
              >
                <Radio.Group optionType="button" buttonStyle="solid" size="large">
                  {CATEGORY_OPTIONS.map((item) => (
                    <Radio.Button 
                      key={item} 
                      value={item}
                      style={{
                        borderRadius: 12,
                        margin: "6px 8px 6px 0",
                        border: "2px solid #E5E7EB",
                        transition: "all 0.3s ease",
                        background: "#FAFAFA",
                        padding: "8px 20px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#E5E7EB";
                        e.currentTarget.style.background = "#FAFAFA";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{item}</span>
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    <EditOutlined style={{ marginRight: 8, color: "#8B5CF6" }} />
                    内容编辑区
                  </span>
                }
                name="content"
                rules={[{ required: true, message: "请输入内容" }]}
              >
                <TextArea
                  placeholder="在这里写下你的精彩内容，让更多人看到你的想法..."
                  maxLength={5000}
                  autoSize={{ minRows: 12 }}
                  style={{ 
                    minHeight: 320,
                    borderRadius: 12,
                    borderColor: "#E5E7EB",
                    transition: "all 0.3s ease",
                    background: "#FAFAFA"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#8B5CF6";
                    e.target.style.boxShadow = "0 0 0 2px rgba(139, 92, 246, 0.2)";
                    e.target.style.background = "white";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7EB";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "#FAFAFA";
                  }}
                />
              </Form.Item>

              <Form.Item 
                label={
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    <StarOutlined style={{ marginRight: 8, color: "#F59E0B" }} />
                    标签
                  </span>
                } 
                name="tags"
              >
                <Select
                  mode="tags"
                  maxTagCount={5}
                  placeholder="输入标签，按Enter添加，帮助更多人发现你的内容"
                  options={tagOptions.map((tag) => ({ label: tag, value: tag }))}
                  onSearch={handleTagSearch}
                  onChange={handleTagsChange}
                  loading={tagFetching}
                  size="large"
                  style={{ 
                    borderRadius: 12,
                    background: "#FAFAFA"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.parentElement.parentElement.style.borderColor = "#F59E0B";
                    e.currentTarget.parentElement.parentElement.style.boxShadow = "0 0 0 2px rgba(245, 158, 11, 0.2)";
                    e.currentTarget.parentElement.parentElement.style.background = "white";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.parentElement.parentElement.style.borderColor = "#E5E7EB";
                    e.currentTarget.parentElement.parentElement.style.boxShadow = "none";
                    e.currentTarget.parentElement.parentElement.style.background = "#FAFAFA";
                  }}
                />
              </Form.Item>
              <div style={{ marginBottom: 24 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  💡 已添加：
                  {watchedTags.length
                    ? watchedTags.map((tag: string) => (
                        <span 
                          key={tag}
                          style={{
                            background: "#E0F2FE",
                            color: "#0369A1",
                            padding: "2px 8px",
                            borderRadius: 12,
                            marginLeft: 8,
                            fontSize: 12,
                            fontWeight: 500
                          }}
                        >
                          #{tag}
                        </span>
                      ))
                    : <span style={{ color: "#9CA3AF" }}>-</span>}
                </Text>
              </div>

              <Form.Item 
                label={
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    <PictureOutlined style={{ marginRight: 8, color: "#10B981" }} />
                    图片上传（最多4张，可选）
                  </span>
                }
              >
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  onChange={({ fileList: next }) => setFileList(next.slice(0, 4))}
                  beforeUpload={(file) => {
                    const isImage = file.type.startsWith("image/");
                    if (!isImage) {
                      messageApi.error("仅支持图片格式");
                      return Upload.LIST_IGNORE;
                    }
                    return false;
                  }}
                  maxCount={4}
                  accept="image/*"
                  style={{
                    borderRadius: 12
                  }}
                >
                  {fileList.length >= 4 ? null : (
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      color: "#6B7280"
                    }}>
                      <PictureOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                      <div style={{ fontSize: 14 }}>上传图片</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <div style={{
                textAlign: "center",
                marginTop: 32,
                paddingTop: 24,
                borderTop: "1px solid #F3F4F6",
                position: "relative"
              }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={submitting}
                  size="large"
                  style={{
                    padding: "0 48px",
                    height: 48,
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 24,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "none",
                    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
                    transition: "all 0.3s ease"
                  }}
                  icon={<SendOutlined />}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(102, 126, 234, 0.3)";
                  }}
                >
                  {submitting ? "发布中..." : "发布帖子"}
                </Button>
                <div style={{
                  marginTop: 16,
                  fontSize: 13,
                  color: "#6B7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}>
                  <span>✨</span>
                  <span>优质内容有机会登上社区排行榜</span>
                </div>
              </div>
            </Form>
          </Card>

          <Space direction="vertical" style={{ width: "100%" }} size={24}>
            <Card 
              title={
                <span>
                  <StarOutlined style={{ marginRight: 8, color: "#F59E0B" }} />
                  发布指南
                </span>
              }
              style={{
                borderRadius: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                border: "1px solid #E5E7EB"
              }}
            >
              <Space direction="vertical" size={12}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  background: "#EFF6FF",
                  borderRadius: 12,
                  border: "1px solid #BFDBFE"
                }}>
                  <span style={{ fontSize: 18 }}>📌</span>
                  <Text strong style={{ color: "#1E40AF" }}>标题要明确具体</Text>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  background: "#F0FDF4",
                  borderRadius: 12,
                  border: "1px solid #BBF7D0"
                }}>
                  <span style={{ fontSize: 18 }}>📝</span>
                  <Text strong style={{ color: "#166534" }}>内容需详细完整</Text>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  background: "#FEF3C7",
                  borderRadius: 12,
                  border: "1px solid #FDE68A"
                }}>
                  <span style={{ fontSize: 18 }}>🏷️</span>
                  <Text strong style={{ color: "#B45309" }}>选择合适分类和标签</Text>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  background: "#F3E8FF",
                  borderRadius: 12,
                  border: "1px solid #DDD6FE"
                }}>
                  <span style={{ fontSize: 18 }}>🏆</span>
                  <Text strong style={{ color: "#7C3AED" }}>优质内容有机会登上排行榜</Text>
                </div>
              </Space>
            </Card>
            
            <Card 
              title={
                <span>
                  <EditOutlined style={{ marginRight: 8, color: "#667eea" }} />
                  格式示例
                </span>
              }
              style={{
                borderRadius: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                border: "1px solid #E5E7EB"
              }}
            >
              <div style={{
                background: "#F9FAFB",
                padding: 16,
                borderRadius: 12,
                border: "1px solid #E5E7EB"
              }}>
                <Text strong style={{ color: "#667eea", display: "block", marginBottom: 12 }}>
                  【问题求助】
                </Text>
                <div style={{ paddingLeft: 16, marginBottom: 16 }}>
                  <Text>1. 🔍 问题描述</Text><br/>
                  <Text>2. 🛠️ 已尝试的解决方案</Text><br/>
                  <Text>3. 🎯 期望结果</Text>
                </div>
                
                <Text strong style={{ color: "#10B981", display: "block", marginBottom: 12 }}>
                  【经验分享】
                </Text>
                <div style={{ paddingLeft: 16 }}>
                  <Text>1. 📚 资源介绍</Text><br/>
                  <Text>2. 👥 适用人群</Text><br/>
                  <Text>3. 💡 使用建议</Text>
                </div>
              </div>
            </Card>
            
            <Card 
              title={
                <span>
                  <TrophyOutlined style={{ marginRight: 8, color: "#F59E0B" }} />
                  社区规则
                </span>
              }
              style={{
                borderRadius: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                border: "1px solid #E5E7EB"
              }}
            >
              <Space direction="vertical" size={12}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#FEF2F2",
                  borderRadius: 12,
                  border: "1px solid #FECACA"
                }}>
                  <span style={{ fontSize: 18, color: "#EF4444" }}>🚫</span>
                  <Text style={{ color: "#B91C1C" }}>禁止发布广告内容</Text>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#FEF2F2",
                  borderRadius: 12,
                  border: "1px solid #FECACA"
                }}>
                  <span style={{ fontSize: 18, color: "#EF4444" }}>😡</span>
                  <Text style={{ color: "#B91C1C" }}>禁止人身攻击和辱骂</Text>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#EFF6FF",
                  borderRadius: 12,
                  border: "1px solid #BFDBFE"
                }}>
                  <span style={{ fontSize: 18, color: "#3B82F6" }}>⚖️</span>
                  <Text style={{ color: "#1E40AF" }}>尊重他人知识产权</Text>
                </div>
              </Space>
            </Card>
          </Space>
        </div>

        {/* 响应式样式 */}
        <style>
          {`
            @media (max-width: 768px) {
              .publish-grid {
                grid-template-columns: 1fr !important;
                gap: 16px !important;
              }
              
              .ant-card {
                margin-bottom: 16px !important;
              }
              
              .ant-form-item-label {
                padding-bottom: 8px !important;
              }
            }
            
            @media (max-width: 480px) {
              .page-container {
                padding: 12px 8px !important;
              }
              
              .ant-card-body {
                padding: 16px !important;
              }
            }
          `}
        </style>

        <CommunityFooter
          style={{
            marginTop: 48,
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: 16,
            padding: 24,
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}
        />
      </div>
    </div>
  );
}
