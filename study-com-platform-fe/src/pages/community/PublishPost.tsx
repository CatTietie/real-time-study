import {
  Button,
  Form,
  Input,
  Modal,
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
  fetchCommunityDrafts,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import RichTextEditor from "../../components/community/RichTextEditor";
import {
  EditOutlined,
  TagsOutlined,
  PictureOutlined,
  SendOutlined,
  HomeOutlined,
  FileTextOutlined,
  StarOutlined,
  TrophyOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  DownOutlined,
  UpOutlined,
  SaveOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const CATEGORY_OPTIONS = [
  { 
    value: "学习心得", 
    label: "学习心得", 
    placeholder: "分享你的学习感悟和心得体会...",
    isStructured: false
  },
  { 
    value: "问题求助", 
    label: "问题求助", 
    template: '<h2>请描述你的问题：</h2><h3>1. 问题背景：</h3><p>请详细描述你遇到问题的背景和场景...</p><h3>2. 遇到的困难：</h3><p>具体描述你遇到了什么困难...</p><h3>3. 已尝试的方法：</h3><p>你已经尝试了哪些解决方案？</p><h3>4. 期望的结果：</h3><p>你期望达到什么效果？</p>',
    placeholder: "请按模板描述您的问题...",
    isStructured: true
  },
  { 
    value: "经验分享", 
    label: "经验分享", 
    template: '<h2>分享你的经验和技巧：</h2><h3>1. 资源/方法介绍：</h3><p>详细介绍你要分享的资源或方法...</p><h3>2. 适用人群：</h3><p>这个资源/方法适合哪些人群？</p><h3>3. 使用建议：</h3><p>有什么使用建议或技巧？</p><h3>4. 注意事项：</h3><p>使用过程中需要注意什么？</p>',
    placeholder: "请按模板分享您的经验...",
    isStructured: true
  },
  { 
    value: "聊天交友", 
    label: "聊天交友", 
    placeholder: "在这里分享你的日常，寻找志同道合的朋友...",
    isStructured: false
  }
];

// 默认占位文案
const DEFAULT_PLACEHOLDER = "分享你的经验/问题背景...";

// 草稿相关常量
const LOCAL_STORAGE_DRAFT_KEY = "community_post_draft";
const AUTO_SAVE_INTERVAL = 8000; // 自动保存间隔：8秒（5-10秒范围）
const MIN_AUTO_SAVE_INTERVAL = 5000; // 最小间隔：5秒
const MAX_AUTO_SAVE_INTERVAL = 10000; // 最大间隔：10秒

// 根据分类获取占位文案
const getPlaceholderByCategory = (category: string): string => {
  const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
  if (option) {
    return option.placeholder || DEFAULT_PLACEHOLDER;
  }
  return DEFAULT_PLACEHOLDER;
};

// 根据分类获取结构化模板内容
const getTemplateByCategory = (category: string): string | null => {
  const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
  if (option && option.isStructured && option.template) {
    return option.template;
  }
  return null;
};

type PublishForm = {
  title: string;
  content: string;
  category: string;
  tags?: string[];
};

// 草稿数据类型
interface DraftData {
  title: string;
  content: string;
  category: string;
  tags: string[];
  savedAt: number; // 保存时间戳
}

// 草稿恢复弹窗数据
interface DraftModalData {
  visible: boolean;
  draft: DraftData | null;
}

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
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");
  
  // 草稿相关状态
  const [draftModal, setDraftModal] = useState<DraftModalData>({ visible: false, draft: null });
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 记录最后一次自动填充的模板内容，用于判断用户是否修改了内容
  const lastAutoFilledTemplateRef = useRef<string | null>(null);
  const tagTimerRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const watchedTags = Form.useWatch("tags", form) || [];
  const watchedCategory = Form.useWatch("category", form) || "";
  const watchedTitle = Form.useWatch("title", form) || "";

  // 监听滚动事件，改变顶部栏样式
  const handleScroll = () => {
    const scrollTop = window.scrollY;
    setIsScrolled(scrollTop > 20);
  };

  // ========================================
  // 草稿相关函数
  // ========================================

  // 检查是否有实际内容（用于判断是否需要自动保存）
  const hasContent = useCallback(() => {
    const hasTitle = watchedTitle && watchedTitle.trim().length > 0;
    const hasCategory = watchedCategory && watchedCategory.length > 0;
    const hasEditorContent = editorContent && 
      editorContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
    return hasTitle || hasCategory || hasEditorContent;
  }, [watchedTitle, watchedCategory, editorContent]);

  // 从 localStorage 读取草稿
  const loadLocalDraft = useCallback((): DraftData | null => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved) as DraftData;
      }
    } catch (error) {
      console.error('读取本地草稿失败:', error);
    }
    return null;
  }, []);

  // 保存草稿到 localStorage
  const saveLocalDraft = useCallback(() => {
    try {
      const draftData: DraftData = {
        title: watchedTitle || '',
        content: editorContent || '',
        category: watchedCategory || '',
        tags: watchedTags || [],
        savedAt: Date.now(),
      };
      localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, JSON.stringify(draftData));
      setLastSavedTime(Date.now());
      return draftData;
    } catch (error) {
      console.error('保存本地草稿失败:', error);
      return null;
    }
  }, [watchedTitle, editorContent, watchedCategory, watchedTags]);

  // 清空本地草稿
  const clearLocalDraft = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
      setLastSavedTime(null);
    } catch (error) {
      console.error('清空本地草稿失败:', error);
    }
  }, []);

  // 恢复草稿
  const restoreDraft = useCallback((draft: DraftData) => {
    // 设置表单值
    form.setFieldsValue({
      title: draft.title,
      category: draft.category || undefined,
      tags: draft.tags?.length > 0 ? draft.tags : undefined,
    });
    // 设置编辑器内容
    setEditorContent(draft.content || '');
    // 更新选中的分类
    if (draft.category) {
      setSelectedCategory(draft.category);
    }
    // 记录自动填充的模板（如果是模板内容）
    lastAutoFilledTemplateRef.current = null;
    // 关闭弹窗
    setDraftModal({ visible: false, draft: null });
    // 提示用户
    messageApi.success('已恢复草稿内容');
  }, [form, messageApi]);

  // 保存草稿到后端（同步到服务端）
  const saveDraftToServer = useCallback(async () => {
    if (!token) {
      messageApi.warning('请先登录');
      return;
    }

    // 校验必填字段（至少要有标题或内容）
    if (!watchedTitle?.trim() && !editorContent?.replace(/<[^>]+>/g, '').trim()) {
      messageApi.warning('请至少输入标题或内容');
      return;
    }

    setSaveDraftLoading(true);
    try {
      const formData = new FormData();
      if (watchedTitle) {
        formData.append("title", watchedTitle.trim());
      }
      if (editorContent) {
        formData.append("content", editorContent);
      }
      if (watchedCategory) {
        formData.append("category", watchedCategory);
      }
      if (watchedTags && watchedTags.length > 0) {
        formData.append("tags", watchedTags.join(","));
      }
      formData.append("isDraft", "true");

      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append("images", file.originFileObj);
        }
      });

      const result = await createCommunityPost(formData);
      
      if (result?.success) {
        messageApi.success('草稿已保存到服务端');
        // 保存成功后清空本地草稿（因为已同步到服务端）
        clearLocalDraft();
      } else {
        messageApi.error(result?.message || '保存草稿失败');
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '保存草稿失败');
    } finally {
      setSaveDraftLoading(false);
    }
  }, [token, watchedTitle, editorContent, watchedCategory, watchedTags, fileList, messageApi, clearLocalDraft]);

  // ========================================
  // 自动保存逻辑
  // ========================================

  // 启动自动保存定时器
  const startAutoSave = useCallback(() => {
    // 先清除已有的定时器
    if (autoSaveTimerRef.current !== null) {
      window.clearInterval(autoSaveTimerRef.current);
    }

    // 创建新的定时器
    autoSaveTimerRef.current = window.setInterval(() => {
      // 只有当有实际内容时才保存
      if (hasContent()) {
        saveLocalDraft();
        // 显示轻微的提示（可选，避免频繁打扰）
        // messageApi.info('已自动保存');
      }
    }, AUTO_SAVE_INTERVAL);
  }, [hasContent, saveLocalDraft]);

  // 停止自动保存定时器
  const stopAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current !== null) {
      window.clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // ========================================
  // 页面离开时的处理
  // ========================================

  // 处理页面离开（刷新或关闭）
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    // 如果有未保存的内容，提示用户
    if (hasContent()) {
      // 立即保存一次
      saveLocalDraft();
      // 提示用户（现代浏览器可能不会显示自定义消息）
      event.preventDefault();
      event.returnValue = '您有未保存的内容，确定要离开吗？';
      return '您有未保存的内容，确定要离开吗？';
    }
    return undefined;
  }, [hasContent, saveLocalDraft]);

  // 添加和移除滚动监听
  React.useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // ========================================
  // 草稿相关的 useEffect
  // ========================================

  // 页面初始化时检查是否有本地草稿
  React.useEffect(() => {
    const localDraft = loadLocalDraft();
    if (localDraft) {
      // 检查草稿是否有实际内容
      const hasDraftContent = 
        localDraft.title?.trim() || 
        localDraft.category || 
        (localDraft.content && localDraft.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
      
      if (hasDraftContent) {
        // 显示草稿恢复弹窗
        setDraftModal({ visible: true, draft: localDraft });
      }
    }
  }, [loadLocalDraft]);

  // 启动自动保存
  React.useEffect(() => {
    // 启动自动保存定时器
    startAutoSave();
    
    // 组件卸载时停止自动保存
    return () => {
      stopAutoSave();
    };
  }, [startAutoSave, stopAutoSave]);

  // 监听页面离开事件
  React.useEffect(() => {
    // 添加 beforeunload 事件监听
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleBeforeUnload]);

  // 监听分类变化，更新内容模板
  React.useEffect(() => {
    if (watchedCategory && watchedCategory !== selectedCategory) {
      setSelectedCategory(watchedCategory);
      
      // 获取当前内容
      const currentContent = editorContent || '';
      const lastTemplate = lastAutoFilledTemplateRef.current;
      
      // 判断是否应该自动填充模板：
      // 1. 当前内容为空或只有默认空标签
      // 2. 或者当前内容等于上一次自动填充的模板（说明用户没有修改）
      const isEmptyContent = !currentContent || 
        currentContent.trim() === '' || 
        currentContent === '<p></p>' || 
        currentContent === '<p><br></p>';
      
      const shouldAutoFill = isEmptyContent || 
        (lastTemplate !== null && currentContent === lastTemplate);
      
      if (shouldAutoFill) {
        // 获取新分类的模板
        const newTemplate = getTemplateByCategory(watchedCategory);
        
        if (newTemplate) {
          // 对于结构化模板（问题求助、经验分享），自动填充内容
          setEditorContent(newTemplate);
          // 记录这次自动填充的模板
          lastAutoFilledTemplateRef.current = newTemplate;
        } else {
          // 对于非结构化模板（学习心得、聊天交友），清空内容（使用placeholder）
          setEditorContent('');
          lastAutoFilledTemplateRef.current = null;
        }
      }
    }
  }, [watchedCategory, selectedCategory, editorContent]);

  const handleSubmit = async (values: PublishForm) => {
    if (!token) {
      messageApi.warning("请先登录再发帖");
      navigate("/admin/login");
      return;
    }

    // 明确的校验提示
    if (!values.title || !values.title.trim()) {
      messageApi.warning("请输入帖子标题");
      return;
    }
    if (!values.category) {
      messageApi.warning("请选择帖子分类");
      return;
    }
    
    // 校验富文本内容：去除HTML标签后检查是否有实际内容
    const plainContent = editorContent
      .replace(/<[^>]+>/g, '') // 去除HTML标签
      .replace(/&nbsp;/g, ' ') // 替换HTML空格
      .trim();
    
    if (!plainContent) {
      messageApi.warning("请输入帖子内容");
      return;
    }

    const formData = new FormData();
    formData.append("title", values.title.trim());
    formData.append("content", editorContent); // 直接使用HTML格式的内容
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
      const result = await createCommunityPost(formData);
      messageApi.success("发帖成功，等待审核");
      
      // 发布成功后清空草稿
      stopAutoSave();
      clearLocalDraft();
      
      form.resetFields();
      setEditorContent(""); // 清空编辑器内容
      setFileList([]);
      lastAutoFilledTemplateRef.current = null;
      
      // 发布成功后跳转：优先跳转到详情页，否则跳转到社区首页
      window.setTimeout(() => {
        // 检查返回结果中是否有帖子ID
        const postId = result?.data?.id || result?.id;
        if (postId) {
          // 跳转到社区首页并打开详情弹窗
          navigate(`/community?postId=${postId}`);
        } else {
          navigate("/community");
        }
      }, 500);
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "发帖失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 搜索标签（支持空关键词获取热门标签）
  const fetchTagSuggestions = async (keyword: string) => {
    try {
      setTagFetching(true);
      const res = await fetchCommunityTagSuggestions(keyword.trim());
      setTagOptions((res?.data as string[]) || []);
    } catch {
      setTagOptions([]);
    } finally {
      setTagFetching(false);
    }
  };

  // 处理标签搜索输入
  const handleTagSearch = (value: string) => {
    if (tagTimerRef.current) {
      window.clearTimeout(tagTimerRef.current);
    }
    
    // 如果有输入内容，延迟搜索（防抖）
    if (value && value.trim().length > 0) {
      tagTimerRef.current = window.setTimeout(() => {
        fetchTagSuggestions(value);
      }, 300);
    } else {
      // 没有输入内容时，直接获取热门标签
      fetchTagSuggestions('');
    }
  };

  // 处理标签输入框获得焦点
  const handleTagFocus = () => {
    // 如果还没有标签选项，获取热门标签
    if (tagOptions.length === 0) {
      fetchTagSuggestions('');
    }
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
      
      {/* 草稿恢复弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-blue-500" />
            <span>发现未发布的草稿</span>
          </div>
        }
        open={draftModal.visible && draftModal.draft !== null}
        onCancel={() => setDraftModal({ visible: false, draft: null })}
        footer={null}
        centered
        destroyOnHidden
        width={520}
      >
        {draftModal.draft && (
          <div className="py-2">
            {/* 草稿信息 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              {/* 保存时间 */}
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                <ClockCircleOutlined />
                <span>
                  保存于 {new Date(draftModal.draft.savedAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {/* 草稿标题 */}
              {draftModal.draft.title?.trim() && (
                <div className="mb-2">
                  <Text type="secondary" className="text-xs">标题</Text>
                  <div className="text-base font-medium text-gray-800 mt-1">
                    {draftModal.draft.title}
                  </div>
                </div>
              )}
              
              {/* 草稿分类 */}
              {draftModal.draft.category && (
                <div className="mb-2">
                  <Text type="secondary" className="text-xs">分类</Text>
                  <div className="mt-1">
                    <span className="inline-block bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded">
                      {draftModal.draft.category}
                    </span>
                  </div>
                </div>
              )}
              
              {/* 草稿内容预览 */}
              {draftModal.draft.content && (
                <div>
                  <Text type="secondary" className="text-xs">内容预览</Text>
                  <div 
                    className="text-sm text-gray-600 mt-1 line-clamp-3"
                    style={{
                      lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: '3',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: draftModal.draft.content
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .trim()
                        .slice(0, 150) + 
                        (draftModal.draft.content.length > 150 ? '...' : '')
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={() => {
                  // 清空草稿
                  clearLocalDraft();
                  setDraftModal({ visible: false, draft: null });
                  messageApi.info('已放弃草稿');
                }}
                icon={<DeleteOutlined />}
              >
                放弃草稿
              </Button>
              <Button
                type="primary"
                onClick={() => restoreDraft(draftModal.draft!)}
                icon={<ReloadOutlined />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                恢复草稿
              </Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* 固定顶部导航栏 - 滚动时保持可见 */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={() => navigate('/community')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              返回社区
            </Button>
            
            {/* 自动保存提示 */}
            {lastSavedTime && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <ClockCircleOutlined style={{ fontSize: '12px' }} />
                <span>
                  已保存于 {new Date(lastSavedTime).toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 保存草稿按钮 */}
            <Button
              type="default"
              loading={saveDraftLoading}
              onClick={saveDraftToServer}
              className="border border-blue-200 text-blue-600 hover:bg-blue-50"
              icon={<SaveOutlined />}
            >
              保存草稿
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
      </div>
      
      {/* 主内容区域 - 减少留白，提升填写效率 */}
      <div className="max-w-4xl mx-auto px-4 py-4 pt-14">

        {/* 主编辑区域 - 白色卡片，与灰色背景形成对比 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* 标题输入区域 - 压缩间距 */}
            <div className="px-5 pt-4 pb-3">
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
            <div className="h-px bg-gray-100 mx-5" />

            {/* 分类选择区域 - 压缩间距 */}
            <div className="px-5 py-4 bg-gray-50/50">
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
            <div className="h-px bg-gray-100 mx-5" />

            {/* 正文编辑区域 - 压缩间距，优化高度 */}
            <div className="px-5 py-4">
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
              <RichTextEditor
                value={editorContent}
                onChange={setEditorContent}
                placeholder={watchedCategory 
                  ? getPlaceholderByCategory(watchedCategory)
                  : DEFAULT_PLACEHOLDER
                }
                maxLength={50000}
              />
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
            <div className="px-6 py-4 bg-gray-50/80">
              {/* 标签选择 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <TagsOutlined className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">添加标签</span>
                  <span className="text-xs text-gray-400">（建议3~5个，最多5个）</span>
                </div>
                <Form.Item 
                  name="tags"
                  className="mb-0"
                >
                  <Select
                    mode="tags"
                    maxTagCount={5}
                    placeholder="输入标签后按 Enter 添加（支持联想推荐）"
                    options={tagOptions.map((tag) => ({ label: tag, value: tag }))}
                    onSearch={handleTagSearch}
                    onChange={handleTagsChange}
                    onFocus={handleTagFocus}
                    loading={tagFetching}
                    className="w-full"
                    style={{
                      borderRadius: '8px',
                    }}
                    allowClear={true}
                    showSearch={true}
                    filterOption={false}
                  />
                </Form.Item>
                {/* 已选标签展示 - 带删除按钮 */}
                {watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {watchedTags.map((tag: string) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-100 transition-colors group"
                        onClick={() => {
                          const newTags = watchedTags.filter((t: string) => t !== tag);
                          form.setFieldsValue({ tags: newTags });
                        }}
                      >
                        <span>#{tag}</span>
                        <CloseOutlined 
                          className="text-blue-400 group-hover:text-blue-600 transition-colors" 
                          style={{ fontSize: '10px' }}
                        />
                      </span>
                    ))}
                    {watchedTags.length < 5 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <InfoCircleOutlined />
                        还可添加 {5 - watchedTags.length} 个标签
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 图片上传 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PictureOutlined className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700">上传图片</span>
                  <span className="text-xs text-gray-400">（可选，最多4张）</span>
                </div>
                <Form.Item className="mb-0">
                  <div className="flex flex-wrap gap-2">
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

            {/* 底部提示栏 - 简化版 */}
            <div className="px-6 py-3 border-t border-gray-200 bg-white rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <span>💡</span>
                  <span>优质内容有机会登上社区排行榜</span>
                </div>
                {/* 折叠的发布指南 */}
                <Button 
                  type="text" 
                  size="small" 
                  className="text-gray-400 text-xs"
                  onClick={() => setShowGuidelines(!showGuidelines)}
                  icon={showGuidelines ? <UpOutlined /> : <DownOutlined />}
                >
                  {showGuidelines ? '收起指南' : '发布指南'}
                </Button>
              </div>
              
              {/* 折叠的发布指南内容 */}
              {showGuidelines && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <StarOutlined className="text-yellow-500" style={{ fontSize: '14px' }} />
                        <span className="text-sm font-medium text-gray-700">发布指南</span>
                      </div>
                      <ul className="text-xs text-gray-500 space-y-1.5">
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">📌</span>
                          <span>标题要明确具体</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">📝</span>
                          <span>内容需详细完整</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-yellow-500 mt-0.5">🏷️</span>
                          <span>选择合适分类和标签</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <EditOutlined className="text-blue-500" style={{ fontSize: '14px' }} />
                        <span className="text-sm font-medium text-gray-700">格式示例</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-2">
                        <div className="bg-white rounded p-2">
                          <span className="font-medium text-blue-600">【问题求助】</span>
                          <p className="text-gray-400 mt-1 leading-relaxed">1. 问题描述<br/>2. 已尝试的方案<br/>3. 期望结果</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <span className="font-medium text-green-600">【经验分享】</span>
                          <p className="text-gray-400 mt-1 leading-relaxed">1. 资源介绍<br/>2. 适用人群<br/>3. 使用建议</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrophyOutlined className="text-yellow-500" style={{ fontSize: '14px' }} />
                        <span className="text-sm font-medium text-gray-700">社区规则</span>
                      </div>
                      <ul className="text-xs text-gray-500 space-y-1.5">
                        <li className="flex items-start gap-1">
                          <span className="text-red-500 mt-0.5">🚫</span>
                          <span>禁止发布广告内容</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-red-500 mt-0.5">😡</span>
                          <span>禁止人身攻击和辱骂</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">⚖️</span>
                          <span>尊重他人知识产权</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Form>
        </div>

        {/* 简化的底部 */}
        <CommunityFooter
          className="mt-6 text-center text-gray-400 text-sm"
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
