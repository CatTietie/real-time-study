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
import React, { useRef, useState } from "react";
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

const CATEGORY_OPTIONS = [
  { value: "学习心得", label: "学习心得", template: "分享你的学习感悟和心得体会..." },
  { value: "问题求助", label: "问题求助", template: "请描述你的问题：\n\n1. 问题背景：\n2. 遇到的困难：\n3. 已尝试的方法：\n4. 期望的结果：" },
  { value: "经验分享", label: "经验分享", template: "分享你的经验和技巧：\n\n1. 资源/方法介绍：\n2. 适用人群：\n3. 使用建议：\n4. 注意事项：" },
  { value: "聊天交友", label: "聊天交友", template: "在这里分享你的日常，寻找志同道合的朋友..." }
];

// 默认占位文案
const DEFAULT_PLACEHOLDER = "分享你的经验/问题背景...";

// 根据分类获取占位文案
const getPlaceholderByCategory = (category: string): string => {
  const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
  return option ? option.template : DEFAULT_PLACEHOLDER;
};

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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);
  const tagTimerRef = useRef<number | null>(null);
  const watchedTags = Form.useWatch("tags", form) || [];
  const watchedCategory = Form.useWatch("category", form) || "";

  // 监听滚动事件，改变顶部栏样式
  const handleScroll = () => {
    const scrollTop = window.scrollY;
    setIsScrolled(scrollTop > 20);
  };

  // 添加和移除滚动监听
  React.useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 监听分类变化，更新内容模板
  React.useEffect(() => {
    if (watchedCategory && watchedCategory !== selectedCategory) {
      setSelectedCategory(watchedCategory);
      // 获取当前内容
      const currentContent = form.getFieldValue('content');
      // 只有当内容为空或只有默认占位时才自动填充模板
      if (!currentContent || currentContent.trim() === '') {
        const template = getPlaceholderByCategory(watchedCategory);
        if (watchedCategory === '问题求助' || watchedCategory === '经验分享') {
          // 对于问题求助和经验分享，直接设置内容为模板
          form.setFieldsValue({ content: template });
        }
      }
    }
  }, [watchedCategory, selectedCategory, form]);

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
      
      {/* 固定顶部导航栏 - 滚动时保持可见 */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
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
            className="bg-blue-600 hover:bg-blue-700 border-none px-6 shadow-md"
            icon={<SendOutlined />}
          >
            发布
          </Button>
        </div>
      </div>
      
      {/* 主内容区域 - 增加顶部边距以容纳固定导航栏 */}
      <div className="max-w-4xl mx-auto px-4 py-6 pt-16">

        {/* 主编辑区域 - 白色卡片，与灰色背景形成对比 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* 标题输入区域 - 顶部区域，有内边距 */}
            <div className="px-6 pt-6 pb-4">
              <div className="title-input-wrapper">
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
                    className="title-input-field"
                    style={{
                      fontSize: '32px',
                      fontWeight: 700,
                      border: 'none',
                      boxShadow: 'none',
                      outline: 'none',
                      paddingLeft: 0,
                      paddingRight: 0,
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      backgroundColor: 'transparent',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </Form.Item>
                {/* 标题输入框底部边框 - 聚焦时高亮 */}
                <div className="title-input-border h-0.5 bg-gray-100 transition-all duration-300 mt-1" />
              </div>
            </div>

            {/* 分隔线 - 区分标题和正文区域 */}
            <div className="h-px bg-gray-100 mx-6" />

            {/* 分类选择区域 - 浅色背景区分 */}
            <div className="px-6 py-5 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-3">
                <TagsOutlined className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700">选择分类</span>
                <span className="text-xs text-red-500">（必选）</span>
              </div>
              <Form.Item
                name="category"
                rules={[{ required: true, message: "请选择分类" }]}
                className="mb-0"
              >
                <Radio.Group 
                  optionType="button" 
                  buttonStyle="solid" 
                  className="category-button-group flex flex-wrap gap-3"
                >
                  {CATEGORY_OPTIONS.map((item) => (
                    <Radio.Button 
                      key={item.value} 
                      value={item.value}
                      className="category-button"
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>
              {/* 分类选择提示 */}
              {!watchedCategory && (
                <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>请选择一个分类后再发布</span>
                </div>
              )}
            </div>

            {/* 分隔线 */}
            <div className="h-px bg-gray-100 mx-6" />

            {/* 正文编辑区域 - 主要内容区域，有更多内边距 */}
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <EditOutlined className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">正文内容</span>
                  {watchedCategory && (
                    <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                      {watchedCategory}
                    </span>
                  )}
                </div>
              </div>
              <Form.Item
                name="content"
                rules={[{ required: true, message: "请输入内容" }]}
                className="mb-0"
              >
                <TextArea
                  placeholder={watchedCategory 
                    ? (watchedCategory === '问题求助' || watchedCategory === '经验分享' 
                        ? '' 
                        : getPlaceholderByCategory(watchedCategory))
                    : DEFAULT_PLACEHOLDER
                  }
                  maxLength={5000}
                  autoSize={{ minRows: 16, maxRows: 40 }}
                  className="border-none shadow-none outline-none focus:ring-0 px-0 py-2 text-base text-gray-700 placeholder:text-gray-300 resize-none"
                  style={{
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none',
                    paddingLeft: 0,
                    paddingRight: 0,
                    backgroundColor: 'transparent',
                    fontSize: '16px',
                    lineHeight: '2',
                    resize: 'none',
                    minHeight: '320px',
                  }}
                />
              </Form.Item>
              {/* 分类模板提示 */}
              {watchedCategory && (
                <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                  <span>💡</span>
                  <span>
                    {watchedCategory === '问题求助' && '已为您填充问题模板，请按结构填写您的问题'}
                    {watchedCategory === '经验分享' && '已为您填充经验模板，请按结构分享您的经验'}
                    {watchedCategory === '学习心得' && '分享您的学习感悟和心得体会'}
                    {watchedCategory === '聊天交友' && '分享您的日常，寻找志同道合的朋友'}
                  </span>
                </div>
              )}
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

            {/* 底部提示栏 */}
            <div className="px-6 py-5 border-t border-gray-200 bg-white rounded-b-xl">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <span>💡</span>
                <span>优质内容有机会登上社区排行榜</span>
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
          .title-input-field {
            font-size: 32px !important;
            font-weight: 700 !important;
            padding: 12px 0 !important;
            color: #111827 !important;
          }
          
          .title-input-field::placeholder {
            color: #d1d5db !important;
            font-weight: 500 !important;
          }
          
          /* 标题输入框聚焦时的边框高亮效果 */
          .title-input-wrapper:focus-within .title-input-border {
            background-color: #3b82f6 !important;
            height: 2px !important;
          }
          
          /* 正文区域样式 */
          textarea.ant-input {
            font-size: 16px !important;
            line-height: 2 !important;
            padding: 8px 0 !important;
            resize: none !important;
            color: #374151 !important;
          }
          
          textarea.ant-input::placeholder {
            color: #9ca3af !important;
          }
          
          /* 分类按钮样式 - 增强版 */
          .category-button-group .ant-radio-button-wrapper {
            border: 2px solid #e5e7eb !important;
            background: white !important;
            color: #6b7280 !important;
            border-radius: 8px !important;
            margin: 0 4px 8px 0 !important;
            padding: 0 20px !important;
            height: 40px !important;
            line-height: 36px !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
          }
          
          .category-button-group .ant-radio-button-wrapper:hover {
            border-color: #93c5fd !important;
            color: #2563eb !important;
            background: #eff6ff !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15) !important;
          }
          
          .category-button-group .ant-radio-button-wrapper-checked {
            border-color: #3b82f6 !important;
            background: #3b82f6 !important;
            color: white !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
          }
          
          .category-button-group .ant-radio-button-wrapper-checked:hover {
            border-color: #2563eb !important;
            background: #2563eb !important;
            color: white !important;
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4) !important;
          }
          
          /* 移除 Radio Group 之间的边框 */
          .ant-radio-group-solid .ant-radio-button-wrapper:not(:first-child)::before {
            background-color: transparent !important;
          }
          
          /* 移除 Radio Button 的默认圆角问题 */
          .ant-radio-button-wrapper:first-child {
            border-start-start-radius: 8px !important;
            border-end-start-radius: 8px !important;
          }
          
          .ant-radio-button-wrapper:last-child {
            border-start-end-radius: 8px !important;
            border-end-end-radius: 8px !important;
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
          
          /* 固定顶部导航栏的间距 */
          .pt-16 {
            padding-top: 4rem !important;
          }
          
          /* 响应式样式 */
          @media (max-width: 768px) {
            .title-input-field {
              font-size: 24px !important;
            }
            
            .category-button-group .ant-radio-button-wrapper {
              padding: 0 16px !important;
              font-size: 14px !important;
              height: 36px !important;
              line-height: 32px !important;
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
