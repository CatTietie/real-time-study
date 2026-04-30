import {
  Button,
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
    <div className="min-h-screen bg-gray-50">
      {contextHolder}
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between mb-6">
          <Button
            type="text"
            icon={<HomeOutlined />}
            onClick={() => navigate('/community')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            返回社区
          </Button>
          
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            onClick={() => form.submit()}
            className="bg-blue-600 hover:bg-blue-700 border-none px-6"
            icon={<SendOutlined />}
          >
            发布
          </Button>
        </div>

        {/* 主编辑区域 - 白色卡片，与灰色背景形成对比 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* 标题输入区域 - 顶部区域，有内边距 */}
            <div className="px-6 pt-6 pb-4">
              <Form.Item
                name="title"
                rules={[
                  { required: true, message: "请输入标题" },
                  { min: 2, max: 100, message: "标题长度为2-100字符" },
                ]}
                className="mb-0"
              >
                <Input
                  placeholder="请输入标题"
                  maxLength={100}
                  className="text-3xl font-bold border-none shadow-none outline-none focus:ring-0 px-0 py-2 text-gray-900 placeholder:text-gray-300"
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none',
                    paddingLeft: 0,
                    paddingRight: 0,
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    backgroundColor: 'transparent',
                  }}
                />
              </Form.Item>
            </div>

            {/* 分隔线 - 区分标题和正文区域 */}
            <div className="h-px bg-gray-100 mx-6" />

            {/* 分类选择区域 - 浅色背景区分 */}
            <div className="px-6 py-4 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-2">
                <TagsOutlined className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700">选择分类</span>
              </div>
              <Form.Item
                name="category"
                rules={[{ required: true, message: "请选择分类" }]}
                className="mb-0"
              >
                <Radio.Group optionType="button" buttonStyle="solid" className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((item) => (
                    <Radio.Button 
                      key={item} 
                      value={item}
                      className="border border-gray-200 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors rounded-md px-4 py-1"
                    >
                      <span className="text-sm">{item}</span>
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>
            </div>

            {/* 分隔线 */}
            <div className="h-px bg-gray-100 mx-6" />

            {/* 正文编辑区域 - 主要内容区域，有更多内边距 */}
            <div className="px-6 py-6">
              <div className="flex items-center gap-2 mb-3">
                <EditOutlined className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700">正文内容</span>
              </div>
              <Form.Item
                name="content"
                rules={[{ required: true, message: "请输入内容" }]}
                className="mb-0"
              >
                <TextArea
                  placeholder="在这里写下你的想法..."
                  maxLength={5000}
                  autoSize={{ minRows: 12, maxRows: 30 }}
                  className="border-none shadow-none outline-none focus:ring-0 px-0 py-2 text-base text-gray-700 placeholder:text-gray-300 resize-none"
                  style={{
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none',
                    paddingLeft: 0,
                    paddingRight: 0,
                    backgroundColor: 'transparent',
                    fontSize: '16px',
                    lineHeight: '1.8',
                    resize: 'none',
                  }}
                />
              </Form.Item>
            </div>

            {/* 分隔线 */}
            <div className="h-px bg-gray-100 mx-6" />

            {/* 底部辅助区域 - 标签和图片上传 */}
            <div className="px-6 py-5 bg-gray-50/80">
              {/* 标签选择 */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <TagsOutlined className="text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">添加标签</span>
                  <span className="text-xs text-gray-400">（最多5个）</span>
                </div>
                <Form.Item 
                  name="tags"
                  className="mb-0"
                >
                  <Select
                    mode="tags"
                    maxTagCount={5}
                    placeholder="输入标签后按 Enter 添加"
                    options={tagOptions.map((tag) => ({ label: tag, value: tag }))}
                    onSearch={handleTagSearch}
                    onChange={handleTagsChange}
                    loading={tagFetching}
                    className="w-full"
                    style={{
                      borderRadius: '8px',
                    }}
                  />
                </Form.Item>
                {watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Text type="secondary" className="text-xs">已添加：</Text>
                    {watchedTags.map((tag: string) => (
                      <span 
                        key={tag}
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 图片上传 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <PictureOutlined className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700">上传图片</span>
                  <span className="text-xs text-gray-400">（最多4张）</span>
                </div>
                <Form.Item className="mb-0">
                  <div className="flex flex-wrap gap-3">
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
                    >
                      {fileList.length >= 4 ? null : (
                        <div className="flex flex-col items-center justify-center text-gray-400 py-2">
                          <PictureOutlined className="text-lg mb-1" />
                          <span className="text-xs">上传图片</span>
                        </div>
                      )}
                    </Upload>
                  </div>
                </Form.Item>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="px-6 py-5 border-t border-gray-200 bg-white rounded-b-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span>💡</span>
                  <span>优质内容有机会登上社区排行榜</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    type="text"
                    onClick={() => navigate('/community')}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    className="bg-blue-600 hover:bg-blue-700 border-none px-8 py-2 h-auto"
                    icon={<SendOutlined />}
                  >
                    {submitting ? "发布中..." : "发布帖子"}
                  </Button>
                </div>
              </div>
            </div>
          </Form>
        </div>

        {/* 右侧辅助卡片 - 简化版，只在大屏幕显示 */}
        <div className="hidden lg:block mt-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <StarOutlined className="text-yellow-500" />
                <span className="font-medium text-gray-800">发布指南</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">📌</span>
                  <span>标题要明确具体</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">📝</span>
                  <span>内容需详细完整</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">🏷️</span>
                  <span>选择合适分类和标签</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <EditOutlined className="text-blue-500" />
                <span className="font-medium text-gray-800">格式示例</span>
              </div>
              <div className="text-sm text-gray-600 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="font-medium text-blue-600">【问题求助】</span>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">1. 问题描述<br/>2. 已尝试的方案<br/>3. 期望结果</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="font-medium text-green-600">【经验分享】</span>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">1. 资源介绍<br/>2. 适用人群<br/>3. 使用建议</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <TrophyOutlined className="text-yellow-500" />
                <span className="font-medium text-gray-800">社区规则</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">🚫</span>
                  <span>禁止发布广告内容</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">😡</span>
                  <span>禁止人身攻击和辱骂</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">⚖️</span>
                  <span>尊重他人知识产权</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <CommunityFooter
          className="mt-12 text-center text-gray-400 text-sm"
        />
      </div>

      {/* 自定义样式覆盖 */}
      <style>
        {`
          /* 移除 Ant Design Input 默认边框和阴影 */
          .ant-input,
          .ant-input-affix-wrapper {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }
          
          .ant-input:focus,
          .ant-input-focused,
          .ant-input-affix-wrapper:focus,
          .ant-input-affix-wrapper-focused {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }
          
          /* 标题输入框样式 */
          .ant-input[placeholder*="请输入标题"] {
            font-size: 28px !important;
            font-weight: 700 !important;
            padding: 8px 0 !important;
          }
          
          /* 正文区域样式 */
          .ant-input[placeholder*="在这里写下你的想法"],
          textarea.ant-input {
            font-size: 16px !important;
            line-height: 1.8 !important;
            padding: 8px 0 !important;
            resize: none !important;
          }
          
          /* 分类按钮样式 */
          .ant-radio-button-wrapper {
            border: 1px solid #e5e7eb !important;
            background: white !important;
            color: #4b5563 !important;
            border-radius: 6px !important;
            margin: 0 8px 8px 0 !important;
            padding: 0 16px !important;
            height: 32px !important;
            line-height: 30px !important;
          }
          
          .ant-radio-button-wrapper:hover {
            border-color: #3b82f6 !important;
            color: #3b82f6 !important;
          }
          
          .ant-radio-button-wrapper-checked {
            border-color: #3b82f6 !important;
            background: #3b82f6 !important;
            color: white !important;
          }
          
          .ant-radio-button-wrapper-checked:hover {
            border-color: #2563eb !important;
            background: #2563eb !important;
            color: white !important;
          }
          
          /* 移除 Radio Group 之间的边框 */
          .ant-radio-group-solid .ant-radio-button-wrapper:not(:first-child)::before {
            background-color: transparent !important;
          }
          
          /* Select 样式 */
          .ant-select-selector {
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            min-height: 40px !important;
            padding: 4px 12px !important;
          }
          
          .ant-select-focused .ant-select-selector,
          .ant-select-selector:focus,
          .ant-select-selector:active,
          .ant-select-open .ant-select-selector {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
          }
          
          /* Upload 样式 */
          .ant-upload.ant-upload-select-picture-card {
            width: 88px !important;
            height: 88px !important;
            border: 1px dashed #d1d5db !important;
            border-radius: 12px !important;
            background: #f9fafb !important;
            margin-right: 12px !important;
            margin-bottom: 12px !important;
          }
          
          .ant-upload.ant-upload-select-picture-card:hover {
            border-color: #3b82f6 !important;
            background: #eff6ff !important;
          }
          
          .ant-upload-list-picture-card .ant-upload-list-item {
            width: 88px !important;
            height: 88px !important;
            border-radius: 12px !important;
            margin-right: 12px !important;
            margin-bottom: 12px !important;
            border: 1px solid #e5e7eb !important;
          }
          
          /* 响应式样式 */
          @media (max-width: 768px) {
            .ant-input[placeholder*="请输入标题"] {
              font-size: 24px !important;
            }
            
            .ant-radio-button-wrapper {
              padding: 0 12px !important;
              font-size: 14px !important;
            }
            
            .ant-upload.ant-upload-select-picture-card,
            .ant-upload-list-picture-card .ant-upload-list-item {
              width: 72px !important;
              height: 72px !important;
              margin-right: 8px !important;
              margin-bottom: 8px !important;
            }
          }
        `}
      </style>
    </div>
  );
}
