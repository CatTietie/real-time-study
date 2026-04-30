import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Button, Tooltip, Upload, message, Modal, Input } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  BlockOutlined,
  CodeOutlined,
  LinkOutlined,
  PictureOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  MessageOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import api from '../../services/api';

// 自定义图片上传到服务器
const uploadImageToServer = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await api.post('/community/posts/image-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // 假设返回格式 { success: true, data: { url: 'xxx' } }
    if (response.data?.success) {
      return response.data.data.url;
    }
    throw new Error('上传失败');
  } catch (error) {
    console.error('图片上传失败:', error);
    throw error;
  }
};

// 工具函数：处理粘贴内容，去除多余样式
const sanitizeHTML = (html: string): string => {
  // 创建临时元素来处理HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 移除所有内联样式（除了必要的）
  const elementsWithStyle = tempDiv.querySelectorAll('[style]');
  elementsWithStyle.forEach(el => {
    const element = el as HTMLElement;
    // 只保留列表样式相关的样式
    const style = element.getAttribute('style');
    if (style && style.includes('list-style')) {
      // 保留列表样式
    } else {
      element.removeAttribute('style');
    }
  });
  
  // 移除不需要的标签和属性
  const unwantedTags = tempDiv.querySelectorAll('script, style, iframe, form, input, select, textarea, button');
  unwantedTags.forEach(tag => tag.remove());
  
  // 移除多余的 class（保留 tiptap 相关的）
  const elementsWithClass = tempDiv.querySelectorAll('[class]');
  elementsWithClass.forEach(el => {
    const element = el as HTMLElement;
    const classes = element.className.split(' ').filter(cls => 
      cls.startsWith('hljs') || // 保留代码高亮类
      cls.startsWith('ProseMirror')
    );
    if (classes.length > 0) {
      element.className = classes.join(' ');
    } else {
      element.removeAttribute('class');
    }
  });
  
  return tempDiv.innerHTML;
};

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = '请输入内容...',
  maxLength = 50000,
  disabled = false,
}) => {
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        dropcursor: {
          color: '#1890ff',
          width: 2,
        },
        gapcursor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      
      // 更新字数统计
      setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
      setCharCount(text.length);
      
      onChange?.(html);
    },
    onPaste: ({ event, editor }) => {
      // 处理粘贴事件
      const clipboardData = event.clipboardData;
      if (clipboardData) {
        const html = clipboardData.getData('text/html');
        const text = clipboardData.getData('text/plain');
        const items = clipboardData.items;
        
        // 检查是否粘贴的是图片
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleImageFileUpload(file, editor);
            }
            return;
          }
        }
        
        // 如果有 HTML，进行清理
        if (html) {
          event.preventDefault();
          const cleanHTML = sanitizeHTML(html);
          editor.chain().focus().insertContent(cleanHTML).run();
        }
      }
    },
  });

  // 同步外部 value 变化
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', true);
    }
  }, [value, editor]);

  // 初始化字数统计
  useEffect(() => {
    if (editor) {
      const text = editor.getText();
      setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
      setCharCount(text.length);
    }
  }, [editor]);

  // 处理图片文件上传
  const handleImageFileUpload = async (file: File, editorInstance: any) => {
    try {
      message.loading({ content: '图片上传中...', key: 'imageUpload' });
      const url = await uploadImageToServer(file);
      
      editorInstance.chain().focus().setImage({ src: url }).run();
      message.success({ content: '图片上传成功', key: 'imageUpload' });
    } catch (error) {
      message.error({ content: '图片上传失败，请重试', key: 'imageUpload' });
    }
  };

  // 工具栏按钮点击事件
  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const toggleHeading = useCallback((level: 1 | 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const undo = useCallback(() => {
    editor?.chain().focus().undo().run();
  }, [editor]);

  const redo = useCallback(() => {
    editor?.chain().focus().redo().run();
  }, [editor]);

  // 处理链接
  const openLinkModal = useCallback(() => {
    const { from, to } = editor?.state.selection || { from: 0, to: 0 };
    const selectedText = editor?.state.doc.textBetween(from, to) || '';
    const currentLink = editor?.getAttributes('link').href || '';
    
    setLinkText(selectedText || '');
    setLinkUrl(currentLink || 'https://');
    setLinkModalVisible(true);
  }, [editor]);

  const insertLink = useCallback(() => {
    if (!linkUrl) {
      message.warning('请输入链接地址');
      return;
    }

    if (linkText) {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).insertContent(linkText).run();
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    
    setLinkModalVisible(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl, linkText]);

  const removeLink = useCallback(() => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkModalVisible(false);
  }, [editor]);

  // 处理图片上传
  const handleImageUpload: UploadProps['beforeUpload'] = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('仅支持图片格式');
      return false;
    }
    
    handleImageFileUpload(file, editor);
    return false; // 阻止自动上传
  };

  // 键盘快捷键处理
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            toggleBold();
            break;
          case 'i':
            e.preventDefault();
            toggleItalic();
            break;
          case 'u':
            e.preventDefault();
            toggleUnderline();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, toggleBold, toggleItalic, toggleUnderline]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor" style={{ width: '100%' }}>
      {/* 工具栏 */}
      <div 
        className="editor-toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          backgroundColor: '#fafafa',
        }}
      >
        {/* 撤销/重做 */}
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            type="text"
            size="small"
            icon={<UndoOutlined />}
            onClick={undo}
            disabled={!editor.can().undo()}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button
            type="text"
            size="small"
            icon={<RedoOutlined />}
            onClick={redo}
            disabled={!editor.can().redo()}
          />
        </Tooltip>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#d9d9d9', margin: '0 4px' }} />
        
        {/* 文本格式 */}
        <Tooltip title="加粗 (Ctrl+B)">
          <Button
            type="text"
            size="small"
            icon={<BoldOutlined />}
            onClick={toggleBold}
            className={editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        <Tooltip title="斜体 (Ctrl+I)">
          <Button
            type="text"
            size="small"
            icon={<ItalicOutlined />}
            onClick={toggleItalic}
            className={editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        <Tooltip title="下划线 (Ctrl+U)">
          <Button
            type="text"
            size="small"
            icon={<UnderlineOutlined />}
            onClick={toggleUnderline}
            className={editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        <Tooltip title="删除线">
          <Button
            type="text"
            size="small"
            icon={<StrikethroughOutlined />}
            onClick={toggleStrike}
            className={editor.isActive('strike') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#d9d9d9', margin: '0 4px' }} />
        
        {/* 标题 */}
        <Tooltip title="标题 H1">
          <Button
            type="text"
            size="small"
            onClick={() => toggleHeading(1)}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-600' : ''}
            style={{ fontWeight: 'bold', fontSize: '16px' }}
          >
            H1
          </Button>
        </Tooltip>
        <Tooltip title="标题 H2">
          <Button
            type="text"
            size="small"
            onClick={() => toggleHeading(2)}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600' : ''}
            style={{ fontWeight: 'bold', fontSize: '14px' }}
          >
            H2
          </Button>
        </Tooltip>
        <Tooltip title="标题 H3">
          <Button
            type="text"
            size="small"
            onClick={() => toggleHeading(3)}
            className={editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-600' : ''}
            style={{ fontWeight: 'bold', fontSize: '12px' }}
          >
            H3
          </Button>
        </Tooltip>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#d9d9d9', margin: '0 4px' }} />
        
        {/* 列表和引用 */}
        <Tooltip title="无序列表">
          <Button
            type="text"
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={toggleBulletList}
            className={editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        <Tooltip title="有序列表">
          <Button
            type="text"
            size="small"
            icon={<OrderedListOutlined />}
            onClick={toggleOrderedList}
            className={editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        <Tooltip title="引用">
          <Button
            type="text"
            size="small"
            icon={<MessageOutlined />}
            onClick={toggleBlockquote}
            className={editor.isActive('blockquote') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        <Tooltip title="代码块">
          <Button
            type="text"
            size="small"
            icon={<CodeOutlined />}
            onClick={toggleCodeBlock}
            className={editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#d9d9d9', margin: '0 4px' }} />
        
        {/* 链接和图片 */}
        <Tooltip title="插入链接">
          <Button
            type="text"
            size="small"
            icon={<LinkOutlined />}
            onClick={openLinkModal}
            className={editor.isActive('link') ? 'bg-blue-100 text-blue-600' : ''}
          />
        </Tooltip>
        <Tooltip title="插入图片">
          <Upload
            beforeUpload={handleImageUpload}
            accept="image/*"
            showUploadList={false}
          >
            <Button
              type="text"
              size="small"
              icon={<PictureOutlined />}
            />
          </Upload>
        </Tooltip>
      </div>
      
      {/* 编辑器内容区域 */}
      <div
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: '0 0 8px 8px',
          backgroundColor: '#fff',
          minHeight: '200px',
          maxHeight: '600px',
          overflow: 'auto',
        }}
      >
        <EditorContent 
          editor={editor}
          className="prose max-w-none"
          style={{
            padding: '12px 16px',
          }}
        />
      </div>
      
      {/* 底部状态栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 12px',
          marginTop: '4px',
          fontSize: '12px',
          color: '#999',
        }}
      >
        <span>
          字数：{wordCount} 词 / {charCount} 字符
        </span>
        {maxLength && charCount > maxLength * 0.9 && (
          <span style={{ color: charCount > maxLength ? '#ff4d4f' : '#faad14' }}>
            {charCount > maxLength ? '已超出' : '已接近'}最大限制 {maxLength} 字符
          </span>
        )}
      </div>
      
      {/* 链接插入弹窗 */}
      <Modal
        title="插入链接"
        open={linkModalVisible}
        onOk={insertLink}
        onCancel={() => setLinkModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            链接文字
          </label>
          <Input
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            placeholder="请输入链接显示的文字（可选）"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            链接地址
          </label>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        {editor.isActive('link') && (
          <Button
            type="link"
            danger
            onClick={removeLink}
            style={{ padding: 0 }}
          >
            移除链接
          </Button>
        )}
      </Modal>
      
      {/* 编辑器样式 */}
      <style>{`
        /* 编辑器基础样式 */
        .ProseMirror {
          outline: none;
          min-height: 200px;
          line-height: 1.8;
          font-size: 16px;
          color: #333;
        }
        
        /* 占位符样式 */
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #999;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        /* 标题样式 */
        .ProseMirror h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 20px 0 12px 0;
          color: #111;
          line-height: 1.4;
        }
        
        .ProseMirror h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 16px 0 10px 0;
          color: #222;
          line-height: 1.4;
        }
        
        .ProseMirror h3 {
          font-size: 20px;
          font-weight: 600;
          margin: 14px 0 8px 0;
          color: #333;
          line-height: 1.4;
        }
        
        /* 段落样式 */
        .ProseMirror p {
          margin: 8px 0;
        }
        
        /* 列表样式 */
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        
        .ProseMirror li {
          margin: 4px 0;
          line-height: 1.8;
        }
        
        .ProseMirror ul {
          list-style-type: disc;
        }
        
        .ProseMirror ol {
          list-style-type: decimal;
        }
        
        /* 引用样式 */
        .ProseMirror blockquote {
          border-left: 4px solid #1890ff;
          padding-left: 16px;
          margin: 16px 0;
          color: #666;
          font-style: italic;
          background-color: #f8f9fa;
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
        }
        
        /* 代码块样式 */
        .ProseMirror pre {
          background-color: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .ProseMirror pre code {
          background: none;
          padding: 0;
          font-size: inherit;
        }
        
        /* 行内代码样式 */
        .ProseMirror code {
          background-color: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 14px;
          color: #e96900;
        }
        
        /* 链接样式 */
        .ProseMirror a {
          color: #1890ff;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .ProseMirror a:hover {
          color: #40a9ff;
        }
        
        /* 图片样式 */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 12px 0;
          display: block;
        }
        
        /* 水平分割线 */
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #e8e8e8;
          margin: 24px 0;
        }
        
        /* 表格样式（如果需要） */
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #d9d9d9;
          padding: 8px 12px;
          text-align: left;
        }
        
        .ProseMirror table th {
          background-color: #fafafa;
          font-weight: 600;
        }
        
        /* 选中状态 */
        .ProseMirror ::selection {
          background-color: rgba(24, 144, 255, 0.2);
        }
        
        /* 滚动条样式 */
        .ProseMirror::-webkit-scrollbar {
          width: 6px;
        }
        
        .ProseMirror::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .ProseMirror::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .ProseMirror::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* 响应式样式 */
        @media (max-width: 768px) {
          .editor-toolbar {
            padding: 6px 8px;
          }
          
          .ProseMirror {
            padding: 10px 12px;
            font-size: 15px;
          }
          
          .ProseMirror h1 {
            font-size: 24px;
          }
          
          .ProseMirror h2 {
            font-size: 20px;
          }
          
          .ProseMirror h3 {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
