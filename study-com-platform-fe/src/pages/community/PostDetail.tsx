import {
  Button,
  Card,
  Form,
  Image,
  Input,
  List,
  Modal,
  Space,
  Avatar,
  Typography,
  message,
  Tag,
  Upload,
  Checkbox,
  Popover,
  Dropdown,
  Tabs,
  Pagination,
  Divider,
  Tooltip,
  Flex,
} from "antd";
import type { InputRef, UploadProps } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RobotOutlined } from "@ant-design/icons";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import {
  createCommunityComment,
  createCommunityPost,
  createFavorite,
  deleteFavorite,
  deleteCommunityPost,
  fetchCommunityPostComments,
  fetchCommunityPostDetail,
  fetchFavoriteStatus,
  fetchMyPermissions,
  reportCommunityPost,
  toggleCommentLike,
  togglePostLike,
} from "../../services/communityPublic";
import AiAssistantDrawer from "../../components/community/AiAssistantDrawer";

const { Title, Text, Paragraph } = Typography;
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api"
).replace(/\/$/, "");
const IMAGE_BASE = API_BASE.replace(/\/api$/, "");
const resolveImageUrl = (src?: string) => {
  if (!src) return undefined;
  const normalized = src.replace(/\\/g, "/");
  if (normalized.startsWith("http")) return normalized;
  if (normalized.startsWith("/")) return `${IMAGE_BASE}${normalized}`;
  return `${IMAGE_BASE}/${normalized}`;
};

type PostDetailData = {
  id: number;
  title: string;
  content: string;
  category?: string;
  tags?: string;
  images?: string[];
  favoriteCount?: number;
  createdAt?: string;
  updatedAt?: string;
  last_edited_at?: string;
  view_count?: number;
  User?: { nickname?: string; username?: string };
  likeUsers?: Array<{
    id: number;
    nickname?: string;
    avatar?: string;
    username?: string;
  }>;
  like_count?: number;
  comment_count?: number;
  LinkedQuestion?: {
    id: number;
    bank_id: number;
    type: number;
    content: string;
    options?: string | { label: string; text: string }[];
    difficulty: number;
  };
};

type CommentRow = {
  id: number;
  content: string;
  created_at?: string;
  createdAt?: string;
  parent_id?: number;
  User?: { nickname?: string; username?: string; avatar?: string };
  like_count?: number;
  status?: number;
  is_deleted?: number;
  Replies?: CommentRow[];
  ParentComment?: CommentRow;
};

interface PostDetailProps {
  postId: number;
  onClose?: () => void;
}

const quickTags = ["楼主说得对！", "学到了", "感谢分享", "支持一下", "一起加油", "说得好", "我也这么想", "太棒了", "期待后续", "加油"];

const quickEmojis = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "😊", "🙏", "💪", "😎"];

const emojiCategories = [
  { key: "emotion", label: "表情", emojis: ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "😘", "🥰", "😗", "😙", "😚", "🙂", "🤗", "🤩", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣", "😥", "😮", "🤐", "😯", "😪", "😫", "😴", "😌", "😛", "😜", "😝", "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "☹️", "🙁", "😖", "😞", "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬", "😰", "😱"] },
  { key: "gesture", label: "手势", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👈", "👉", "👆", "👇", "☝️", "✋", "🖐️", "🖖", "👋", "🤚", "🖐", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅", "👄", "🫀", "🫁", "🧠", "🦷", "🦴"] },
  { key: "object", label: "物品", emojis: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🔩", "⚙️", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🏹", "🛡️", "📦", "📫", "📪", "📬", "📭", "📮", "📯", "📜", "📃", "📄", "📑", "📊", "📈", "📉", "📰", "🗞️", "📎", "📐", "📍", "📌", "🏷️", "✂️", "🗃️", "🗳️", "🗄️", "📋", "📁", "📂", "🗂️", "🗃️", "🗄️"] }
];

const topics = ["#学习分享", "#日常打卡", "#求助问答", "#经验交流", "#资源分享", "#技术讨论", "#求职就业", "#考研考公", "#编程学习", "#英语学习", "#读书笔记", "#生活随想"];

export default function PostDetail({ postId, onClose }: PostDetailProps) {
  const navigate = useNavigate();
  const { token, username, role } = useAppSelector(
    (state: RootState) => state.auth,
  );
  const [post, setPost] = useState<PostDetailData | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [commentForm] = Form.useForm();
  const watchContent = Form.useWatch('content', commentForm);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentInputRef = useRef<InputRef>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);

  const [uploadedImages, setUploadedImages] = useState<UploadFile[]>([]);
  const [forwardToPost, setForwardToPost] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const [currentEmojiTab, setCurrentEmojiTab] = useState("emotion");
  const [emojiPage, setEmojiPage] = useState(1);
  const [topicVisible, setTopicVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  
  // 楼中楼折叠/展开状态
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  
  // 楼中楼回复状态
  const [replyingTo, setReplyingTo] = useState<{
    commentId: number;
    userName: string;
    isReplyToReply?: boolean;
    parentCommentId?: number;
  } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const replyInputRef = useRef<InputRef>(null);

  // 格式化时间显示
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // 小于1分钟
    if (diff < 60 * 1000) {
      return "刚刚";
    }
    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}分钟前`;
    }
    // 小于1天
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
    }
    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
    }
    // 超过7天，显示完整日期
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 切换楼中楼展开/折叠
  const toggleRepliesExpand = (commentId: number) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // 获取评论的用户昵称
  const getCommentUserNickname = (comment?: CommentRow) => {
    if (!comment) return "匿名";
    return comment.User?.nickname || comment.User?.username || "匿名";
  };

  // 渲染单个评论（主评论或子评论）
  const renderCommentItem = (comment: CommentRow, isReply: boolean = false) => {
    const isExpanded = expandedReplies.has(comment.id);
    const replies = comment.Replies || [];
    const hasReplies = replies.length > 0;
    const showExpandButton = hasReplies && replies.length > 3;
    const visibleReplies = isExpanded ? replies : replies.slice(0, 3);
    
    // 获取时间
    const timeStr = comment.created_at || comment.createdAt;
    
    // 判断是否是审核中
    const isPending = comment.status === 0;
    
    // 判断是否正在回复该评论
    const isReplyingToThis = replyingTo && replyingTo.commentId === comment.id;
    
    return (
      <div 
        key={comment.id} 
        className={`comment-item ${isReply ? 'reply-item' : 'main-comment-item'}`}
      >
        {/* 左侧头像 */}
        <div className="comment-avatar">
          <Avatar size={isReply ? 28 : 40}>
            {(comment.User?.nickname || comment.User?.username || "U")[0]}
          </Avatar>
        </div>
        
        {/* 右侧内容 */}
        <div className="comment-content">
          {/* 用户信息行 */}
          <div className="comment-user-info">
            <Space wrap size={8}>
              <Text strong className="comment-username">
                {getCommentUserNickname(comment)}
              </Text>
              
              {/* 等级标签 */}
              <Tag color="orange" className="level-tag">Lv.1</Tag>
              
              {/* 审核中标签 */}
              {isPending && <Tag color="orange">审核中</Tag>}
            </Space>
          </div>
          
          {/* 评论正文 */}
          <div className={`comment-text ${isPending ? 'pending-comment' : ''}`}>
            {comment.content}
          </div>
          
          {/* 底部操作栏 */}
          <div className="comment-actions">
            <Space size={16}>
              {/* 时间 */}
              <Text type="secondary" className="comment-time">
                {formatTime(timeStr)}
              </Text>
              
              {/* 点赞 */}
              <Button
                type="text"
                size="small"
                disabled={isPending}
                onClick={() => handleToggleCommentLike(comment.id)}
                className="action-btn"
              >
                <span className="action-icon">👍</span>
                <span className="action-text">{comment.like_count || 0}</span>
              </Button>
              
              {/* 回复 */}
              <Button
                type="text"
                size="small"
                disabled={isPending}
                onClick={() => handleReply(comment, isReply)}
                className="action-btn"
              >
                <span className="action-text">回复</span>
              </Button>
            </Space>
          </div>
          
          {/* 回复输入框 - 显示在任何被回复的评论下方 */}
          {isReplyingToThis && (
            <div className="reply-input-container">
              <div className="reply-input-wrapper">
                <Input.TextArea
                  placeholder={`回复 @${replyingTo?.userName}...`}
                  ref={replyInputRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{
                    resize: 'none',
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 12
                  }}
                />
                
                {/* 快捷回复标签 */}
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>快捷回复</Text>
                  <Space size={[8, 8]} wrap>
                    {quickTags.map((tag, index) => (
                      <Tag
                        key={index}
                        style={{
                          borderColor: '#52c41a',
                          color: '#52c41a',
                          cursor: 'pointer',
                          margin: 0
                        }}
                        onClick={() => setReplyContent(prev => `${prev}${tag}`)}
                      >
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                </div>
                
                {/* 快捷表情 */}
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>表情</Text>
                  <Space size={[12, 12]} wrap>
                    {quickEmojis.map((emoji, index) => (
                      <span
                        key={index}
                        style={{
                          fontSize: 20,
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          lineHeight: 1
                        }}
                        onClick={() => setReplyContent(prev => `${prev}${emoji}`)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {emoji}
                      </span>
                    ))}
                  </Space>
                </div>
                
                {/* 按钮区域 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <Button
                    onClick={handleCancelReply}
                    style={{ borderRadius: 20 }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleSubmitReply}
                    loading={replySubmitting}
                    disabled={!replyContent.trim()}
                    style={{ borderRadius: 20 }}
                  >
                    回复
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* 楼中楼回复区 - 包裹在浅灰色背景块中（仅主评论有） */}
          {!isReply && hasReplies && (
            <div className="replies-container">
              <div className="replies-list">
                {visibleReplies.map(reply => renderCommentItem(reply, true))}
              </div>
              
              {/* 展开/折叠按钮 */}
              {showExpandButton && (
                <div className="expand-replies-btn">
                  <Button
                    type="text"
                    onClick={() => toggleRepliesExpand(comment.id)}
                    className="expand-btn"
                  >
                    {isExpanded ? (
                      <>收起回复 ↑</>
                    ) : (
                      <>查看全部 {replies.length} 条回复 ↓</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const isOwner = Boolean(
    post?.User?.username && username === post.User.username,
  );
  const canShowDelete = isOwner || canDelete || role === "super_admin";

  const loadData = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const [postRes, commentRes, permissionRes] = await Promise.all([
        fetchCommunityPostDetail(Number(postId)),
        fetchCommunityPostComments(Number(postId), { page: 1, pageSize: 20 }),
        token ? fetchMyPermissions() : Promise.resolve({ data: [] }),
      ]);
      setPost(postRes?.data || null);
      setComments(commentRes?.data || []);
      const permissionCodes = (permissionRes?.data as string[]) || [];
      setCanDelete(
        permissionCodes.includes("community.post.manage") ||
          role === "super_admin",
      );
      if (token) {
        const statusRes = await fetchFavoriteStatus(Number(postId));
        setFavorited(Boolean(statusRes?.data?.favorited));
        setFavoriteId(statusRes?.data?.favoriteId || null);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    const scrollContainer = document.querySelector('.post-detail-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [postId]);

  const insertTextToInput = (text: string) => {
    const currentContent = commentForm.getFieldValue("content") || "";
    const newContent = currentContent ? `${currentContent}${text}` : text;
    commentForm.setFieldsValue({ content: newContent });
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const insertQuickTag = (tag: string) => {
    insertTextToInput(tag);
  };

  const insertEmoji = (emoji: string) => {
    insertTextToInput(emoji);
  };

  const insertTopic = (topic: string) => {
    insertTextToInput(`${topic} `);
    setTopicVisible(false);
  };

  const filteredTopics = topicSearch
    ? topics.filter(topic => topic.toLowerCase().includes(topicSearch.toLowerCase()))
    : topics;

  const uploadProps: UploadProps = {
    multiple: true,
    listType: "picture",
    fileList: uploadedImages,
    maxCount: 9,
    onChange(info) {
      const { fileList } = info;
      setUploadedImages(fileList);
    },
    beforeUpload(file) {
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        message.error("只能上传图片文件！");
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error("图片大小不能超过 5MB！");
        return false;
      }
      return false;
    },
  };

  const getCurrentEmojis = () => {
    const category = emojiCategories.find(c => c.key === currentEmojiTab);
    if (!category) return [];
    const pageSize = 20;
    const startIndex = (emojiPage - 1) * pageSize;
    return category.emojis.slice(startIndex, startIndex + pageSize);
  };

  const getEmojiTotalPages = () => {
    const category = emojiCategories.find(c => c.key === currentEmojiTab);
    if (!category) return 1;
    return Math.ceil(category.emojis.length / 20);
  };

  const handleCreateComment = async (values: { content: string }) => {
    if (!token) {
      message.warning("请先登录再评论");
      navigate("/admin/login");
      return;
    }
    if (!postId) return;
    try {
      setCommentSubmitting(true);
      const res = await createCommunityComment(Number(postId), values);
      message.success(res?.message || "评论成功");

      if (forwardToPost && post) {
        try {
          const forwardContent = values.content;
          const forwardTitle = post.title ? `转发: ${post.title}` : "转发帖子";

          await createCommunityPost({
            title: forwardTitle,
            content: forwardContent,
            category: "聊天交友",
            forwardPostId: Number(postId),
          });

          message.success("评论已转发到我的动态");
        } catch (forwardErr) {
          message.warning("评论成功，但转发到动态失败");
        }
      }

      commentForm.resetFields();
      setUploadedImages([]);
      setForwardToPost(false);
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "评论失败");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleTogglePostLike = async () => {
    if (!token) {
      message.warning("请先登录再点赞");
      navigate("/admin/login");
      return;
    }
    if (isOwner) {
      message.info("不能给自己的帖子点赞");
      return;
    }
    if (!postId) return;
    try {
      setLikeAnimating(true);
      const response = await togglePostLike(Number(postId));
      
      if (post) {
        const newLikeCount = response.data?.likeCount || (post.like_count || 0) + (response.data?.liked ? 1 : -1);
        setPost({
          ...post,
          like_count: newLikeCount,
          likeUsers: response.data?.likeUsers || post.likeUsers
        });
      }
      
      message.success(response.message || (response.data?.liked ? "点赞成功" : "取消点赞"));
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      window.setTimeout(() => setLikeAnimating(false), 200);
    }
  };

  // 处理回复评论（在评论下方弹出输入框）
  const handleReply = (targetComment: CommentRow, isReplyToReply: boolean = false) => {
    if (!token) {
      message.warning("请先登录再回复");
      navigate("/admin/login");
      return;
    }
    
    // 确定父评论ID（如果是回复子评论，则父评论是主评论）
    let parentCommentId = targetComment.id;
    if (isReplyToReply && targetComment.parent_id) {
      parentCommentId = targetComment.parent_id;
    }
    
    setReplyingTo({
      commentId: targetComment.id,
      userName: getCommentUserNickname(targetComment),
      isReplyToReply,
      parentCommentId,
    });
    setReplyContent(`@${getCommentUserNickname(targetComment)} `);
    window.setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  // 取消回复
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent("");
  };

  // 提交回复
  const handleSubmitReply = async () => {
    if (!token) {
      message.warning("请先登录再回复");
      navigate("/admin/login");
      return;
    }
    if (!replyingTo || !replyContent.trim()) {
      message.warning("请输入回复内容");
      return;
    }
    if (!postId) return;
    
    try {
      setReplySubmitting(true);
      
      // 检查内容是否有效
      const trimmedContent = replyContent.trim();
      const prefix = `@${replyingTo.userName} `;
      
      // 如果只有 @用户名 前缀，没有实际内容
      if (trimmedContent === prefix.trim()) {
        message.warning("请输入回复内容");
        return;
      }
      
      // 提交回复 - parentId 始终指向主评论（保持同级）
      // 回复内容保留 @用户名 前缀，通过 @符号 区别评论层级
      const res = await createCommunityComment(Number(postId), {
        content: trimmedContent,
        parentId: replyingTo.parentCommentId || replyingTo.commentId,
      });
      
      message.success(res?.message || "回复成功");
      
      // 重置回复状态
      setReplyingTo(null);
      setReplyContent("");
      
      // 刷新评论列表
      await loadData();
      
      // 自动展开该评论的回复区
      if (replyingTo.parentCommentId) {
        setExpandedReplies(prev => {
          const newSet = new Set(prev);
          newSet.add(replyingTo.parentCommentId!);
          return newSet;
        });
      } else {
        setExpandedReplies(prev => {
          const newSet = new Set(prev);
          newSet.add(replyingTo.commentId);
          return newSet;
        });
      }
      
    } catch (err) {
      message.error(err instanceof Error ? err.message : "回复失败");
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!token) {
      message.warning("请先登录再收藏");
      navigate("/admin/login");
      return;
    }
    if (!postId) return;
    try {
      if (favorited && favoriteId) {
        await deleteFavorite(favoriteId);
        setFavorited(false);
        setFavoriteId(null);
        if (post) {
          setPost({
            ...post,
            favoriteCount: Math.max(0, (post.favoriteCount || 0) - 1)
          });
        }
        message.success("已取消收藏");
      } else {
        const res = await createFavorite({ postId: Number(postId) });
        setFavorited(true);
        setFavoriteId(res?.data?.id || null);
        if (post) {
          setPost({
            ...post,
            favoriteCount: (post.favoriteCount || 0) + 1
          });
        }
        message.success("收藏成功");
      }
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleToggleCommentLike = async (commentId: number) => {
    if (!token) {
      message.warning("请先登录再点赞");
      navigate("/admin/login");
      return;
    }
    try {
      const response = await toggleCommentLike(commentId);
      
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId 
            ? { ...comment, like_count: response.data?.likeCount || (comment.like_count || 0) + (response.data?.liked ? 1 : -1) }
            : comment
        )
      );
      
      message.success(response.message || (response.data?.liked ? "点赞成功" : "取消点赞"));
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleReport = async () => {
    if (!token) {
      message.warning("请先登录再举报");
      navigate("/admin/login");
      return;
    }
    if (!postId) return;
    try {
      await reportCommunityPost(Number(postId), { reason: reportReason });
      message.success("举报已提交");
      setReportReason("");
      setReportVisible(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "举报失败");
    }
  };

  const handleDeletePost = async () => {
    if (!token) {
      message.warning("请先登录");
      navigate("/admin/login");
      return;
    }
    if (!postId) return;
    Modal.confirm({
      title: "确认删除该帖子？",
      content: "删除后将进入回收站",
      okText: "删除",
      cancelText: "取消",
      async onOk() {
        try {
          await deleteCommunityPost(Number(postId));
          message.success("删除成功");
          onClose?.();
        } catch (err) {
          if (err instanceof Error && err.message.includes("需确认删除")) {
            await deleteCommunityPost(Number(postId), true);
            message.success("删除成功");
            onClose?.();
            return;
          }
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const scrollToCommentSection = () => {
    if (commentSectionRef.current) {
      commentSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => commentInputRef.current?.focus(), 300);
    }
  };

  return (
    <div 
      ref={contentContainerRef}
      style={{ 
        display: "flex", 
        flexDirection: "column",
        height: "100%",
        overflow: "hidden"
      }}
    >
      <div 
        className="post-detail-scroll-container"
        style={{ 
          flex: 1,
          overflowY: "auto",
          paddingRight: 16,
          paddingLeft: 16,
          paddingBottom: 16
        }}
      >
        <Card loading={loading} style={{ backgroundColor: "#fff", border: "none", boxShadow: "none" }}>
          <Space direction="vertical" style={{ width: "100%" }} size={16}>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              width: '100%',
              paddingBottom: 16,
              borderBottom: '1px solid #f0f0f0'
            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={48} style={{ flexShrink: 0 }}>
                  {(post?.User?.nickname || post?.User?.username || "U")[0]}
                </Avatar>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      {post?.User?.nickname || post?.User?.username || "未知用户"}
                    </Text>
                    {post?.category && <Tag color="blue">{post.category}</Tag>}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {post?.created_at ? new Date(post.created_at).toLocaleString() : "-"}
                    {' · Lv.1'}
                  </Text>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>

              <Title level={3} style={{
                margin: '0 0 8px 0',
                fontWeight: 'bold',
                textAlign: 'left'
              }}>
                {post?.title || "求一个不把应届生当cs的城市"}
              </Title>

              <div 
                className="post-content-render"
                style={{
                  margin: '0 0 16px 0',
                  textAlign: 'left',
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: '#333',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: post?.content || "<p style='color: #999;'>暂无内容</p>" 
                }}
              />

              {post?.images && post.images.length > 0 && (
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  <Image.PreviewGroup>
                    <Space wrap size={8}>
                      {post.images.map((src) => (
                        <Image
                          key={src}
                          src={resolveImageUrl(src)}
                          style={{
                            width: '33%',
                            maxWidth: 300,
                            height: 'auto',
                            borderRadius: 8
                          }}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </div>
              )}

              {post?.LinkedQuestion && (
                <Card
                  size="small"
                  style={{
                    marginBottom: 16,
                    background: "#f6f8fa",
                    borderRadius: 12,
                    border: "1px solid #e8eaed",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Tag color="blue">关联题目</Tag>
                    <Tag color={
                      { 1: "blue", 2: "purple", 3: "green", 4: "orange", 5: "red" }[post.LinkedQuestion.type] || "default"
                    }>
                      {{ 1: "单选题", 2: "多选题", 3: "判断题", 4: "填空题", 5: "主观题" }[post.LinkedQuestion.type] || "题目"}
                    </Tag>
                  </div>
                  <Paragraph style={{ margin: 0, fontSize: 14, color: "#333", marginBottom: 8 }}>
                    {post.LinkedQuestion.content}
                  </Paragraph>
                  {(() => {
                    let opts: { label: string; text: string }[] | null = null;
                    if (post.LinkedQuestion.options) {
                      if (Array.isArray(post.LinkedQuestion.options)) {
                        opts = post.LinkedQuestion.options;
                      } else if (typeof post.LinkedQuestion.options === "string") {
                        try { opts = JSON.parse(post.LinkedQuestion.options); } catch {}
                      }
                    }
                    if (opts && opts.length > 0) {
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                          {opts.map((opt) => (
                            <Text key={opt.label} style={{ fontSize: 13, color: "#555", paddingLeft: 12 }}>
                              {opt.label}. {opt.text}
                            </Text>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div style={{ marginTop: 8 }}>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => navigate(`/community/question-bank/${post.LinkedQuestion!.bank_id}/mode`)}
                      style={{ paddingLeft: 0 }}
                    >
                      前往该题库练习 →
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
              paddingTop: 16,
              borderTop: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <Button
                  type="text"
                  icon={<span>👍</span>}
                  onClick={handleTogglePostLike}
                  style={{
                    transition: 'all 0.3s ease',
                    transform: likeAnimating ? 'scale(1.2)' : 'scale(1)',
                    color: likeAnimating ? '#1890ff' : 'inherit'
                  }}
                >
                  {post?.like_count || 0}
                </Button>
                
                <Button
                  type="text"
                  icon={<span>💬</span>}
                  onClick={scrollToCommentSection}
                >
                  {post?.comment_count || 0}
                </Button>
                
                <Button
                  type="text"
                  icon={<span>⭐</span>}
                  onClick={handleToggleFavorite}
                  style={{
                    color: favorited ? '#faad14' : 'inherit',
                    transition: 'color 0.3s ease'
                  }}
                >
                  {post?.favoriteCount || 0}
                </Button>

                {canShowDelete && (
                  <Button
                    type="text"
                    danger
                    onClick={handleDeletePost}
                  >
                    删除
                  </Button>
                )}

                <Button
                  type="text"
                  onClick={() => setReportVisible(true)}
                >
                  举报
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                浏览 {post?.view_count ? (post.view_count > 10000 ? `${(post.view_count/10000).toFixed(1)}w` : post.view_count) : '1.2w'}
              </Text>
            </div>

          </Space>
        </Card>

        <Card 
          title="发表评论" 
          style={{ marginTop: 16, backgroundColor: '#fff' }}
          ref={commentSectionRef}
        >
          <Form
            form={commentForm}
            layout="vertical"
            onFinish={handleCreateComment}
            style={{ width: "100%" }}
          >
            <div style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <Text type="secondary" style={{ fontSize: 12 }}>一键发评</Text>
                <div style={{
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  paddingBottom: 4,
                  scrollbarWidth: 'thin'
                }}>
                  <Space size={[8, 8]} wrap>
                    {quickTags.map((tag, index) => (
                      <Tag
                        key={index}
                        style={{
                          borderColor: '#52c41a',
                          color: '#52c41a',
                          cursor: 'pointer',
                          margin: 0
                        }}
                        onClick={() => insertQuickTag(tag)}
                      >
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <Text type="secondary" style={{ fontSize: 12 }}>表情</Text>
                <Space size={[12, 12]} wrap>
                  {quickEmojis.map((emoji, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: 24,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        lineHeight: 1
                      }}
                      onClick={() => insertEmoji(emoji)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {emoji}
                    </span>
                  ))}
                </Space>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 12,
                minHeight: 100
              }}>
                <Form.Item
                  name="content"
                  rules={[{ required: true, message: "请输入评论内容" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    placeholder="畅所欲言吧～"
                    ref={commentInputRef}
                    bordered={false}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{
                      resize: 'none',
                      fontSize: 14,
                      lineHeight: 1.6
                    }}
                  />
                </Form.Item>
              </div>

              {uploadedImages.length > 0 && (
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 8
                }}>
                  <Upload {...uploadProps} />
                </div>
              )}

              <Divider style={{ margin: '8px 0' }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <Space size={[16, 8]} wrap>
                  <Upload {...uploadProps}>
                    <Tooltip title="上传图片 (最多9张)">
                      <Button
                        type="text"
                        icon={<span style={{ fontSize: 18 }}>📷</span>}
                        style={{ padding: '4px 8px' }}
                      >
                        图片
                      </Button>
                    </Tooltip>
                  </Upload>

                  <Popover
                    content={
                      <div style={{ width: 280 }}>
                        <Input.Search
                          placeholder="搜索话题"
                          allowClear
                          value={topicSearch}
                          onChange={(e) => setTopicSearch(e.target.value)}
                          style={{ marginBottom: 12 }}
                        />
                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                          <Space size={[8, 8]} wrap>
                            {filteredTopics.map((topic, index) => (
                              <Tag
                                key={index}
                                color="blue"
                                style={{ cursor: 'pointer' }}
                                onClick={() => insertTopic(topic)}
                              >
                                {topic}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      </div>
                    }
                    title="选择话题"
                    trigger="click"
                    open={topicVisible}
                    onOpenChange={setTopicVisible}
                  >
                    <Button
                      type="text"
                      icon={<span style={{ fontSize: 18 }}>#</span>}
                      style={{ padding: '4px 8px' }}
                    >
                      话题
                    </Button>
                  </Popover>

                  <Popover
                    content={
                      <div style={{ width: 320 }}>
                        <Tabs
                          activeKey={currentEmojiTab}
                          onChange={(key) => {
                            setCurrentEmojiTab(key);
                            setEmojiPage(1);
                          }}
                          items={emojiCategories.map((category) => ({
                            key: category.key,
                            label: category.label,
                            children: (
                              <div>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(6, 1fr)',
                                  gap: 8,
                                  padding: 8
                                }}>
                                  {getCurrentEmojis().map((emoji, index) => (
                                    <span
                                      key={index}
                                      style={{
                                        fontSize: 24,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        padding: 4,
                                        borderRadius: 4,
                                        transition: 'all 0.2s'
                                      }}
                                      onClick={() => insertEmoji(emoji)}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f0f0f0';
                                        e.currentTarget.style.transform = 'scale(1.2)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.transform = 'scale(1)';
                                      }}
                                    >
                                      {emoji}
                                    </span>
                                  ))}
                                </div>
                                {getEmojiTotalPages() > 1 && (
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    padding: '8px 0',
                                    borderTop: '1px solid #f0f0f0',
                                    marginTop: 8
                                  }}>
                                    <Pagination
                                      simple
                                      current={emojiPage}
                                      total={getEmojiTotalPages() * 20}
                                      pageSize={20}
                                      onChange={(page) => setEmojiPage(page)}
                                      size="small"
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          }))}
                        />
                      </div>
                    }
                    title="选择表情"
                    trigger="click"
                    open={emojiVisible}
                    onOpenChange={setEmojiVisible}
                  >
                    <Button
                      type="text"
                      icon={<span style={{ fontSize: 18 }}>😊</span>}
                      style={{ padding: '4px 8px' }}
                    >
                      表情
                    </Button>
                  </Popover>
                </Space>

                <Space size={[16, 8]} wrap style={{ alignItems: 'center' }}>
                  <Checkbox
                    checked={forwardToPost}
                    onChange={(e) => setForwardToPost(e.target.checked)}
                  >
                    同时转发到我的动态
                  </Checkbox>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={commentSubmitting}
                      disabled={!watchContent?.trim()}
                      style={{
                        borderRadius: 20,
                        paddingLeft: 24,
                        paddingRight: 24
                      }}
                    >
                      评论
                    </Button>
                  </Form.Item>
                </Space>
              </div>
            </div>
          </Form>
        </Card>

        <Card
          title={`评论列表（${post?.comment_count || comments.length || 0}）`}
          style={{ marginTop: 16, backgroundColor: '#fff', marginBottom: 16 }}
          className="comments-card"
        >
          <div className="comments-list">
            {comments.length > 0 ? (
              comments.map(comment => renderCommentItem(comment, false))
            ) : (
              <div className="no-comments">
                <Text type="secondary">暂无评论，快来抢沙发吧～</Text>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          zIndex: 10
        }}
      >
        <Button
          type="primary"
          block
          onClick={scrollToCommentSection}
          style={{
            borderRadius: 20,
            height: 44,
            background: 'linear-gradient(135deg, #1890ff, #52c41a)',
            border: 'none'
          }}
        >
          💬 发表评论
        </Button>
      </div>

      <Modal
        title="举报帖子"
        open={reportVisible}
        onCancel={() => setReportVisible(false)}
        onOk={handleReport}
        okText="提交举报"
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入举报原因"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
        />
      </Modal>

      {/* 富文本内容渲染样式 */}
      <style>{`
        .post-content-render {
          word-break: break-word;
        }
        
        .post-content-render h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 24px 0 16px 0;
          color: #111;
          line-height: 1.4;
        }
        
        .post-content-render h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 20px 0 12px 0;
          color: #222;
          line-height: 1.4;
        }
        
        .post-content-render h3 {
          font-size: 20px;
          font-weight: 600;
          margin: 16px 0 10px 0;
          color: #333;
          line-height: 1.4;
        }
        
        .post-content-render p {
          margin: 10px 0;
          line-height: 1.8;
        }
        
        .post-content-render strong,
        .post-content-render b {
          font-weight: 600;
          color: #111;
        }
        
        .post-content-render em,
        .post-content-render i {
          font-style: italic;
        }
        
        .post-content-render u {
          text-decoration: underline;
        }
        
        .post-content-render del,
        .post-content-render s {
          text-decoration: line-through;
          color: #999;
        }
        
        .post-content-render ul,
        .post-content-render ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        
        .post-content-render ul {
          list-style-type: disc;
        }
        
        .post-content-render ol {
          list-style-type: decimal;
        }
        
        .post-content-render li {
          margin: 6px 0;
          line-height: 1.8;
        }
        
        .post-content-render blockquote {
          border-left: 4px solid #1890ff;
          padding: 12px 16px;
          margin: 16px 0;
          background-color: #f8f9fa;
          border-radius: 0 8px 8px 0;
          color: #666;
          font-style: italic;
        }
        
        .post-content-render blockquote p {
          margin: 0;
        }
        
        .post-content-render pre {
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
        
        .post-content-render pre code {
          background: none;
          padding: 0;
          font-size: inherit;
          color: inherit;
        }
        
        .post-content-render code {
          background-color: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 14px;
          color: #e96900;
        }
        
        .post-content-render a {
          color: #1890ff;
          text-decoration: underline;
          cursor: pointer;
          transition: color 0.2s;
        }
        
        .post-content-render a:hover {
          color: #40a9ff;
        }
        
        .post-content-render img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 12px 0;
          display: block;
        }
        
        .post-content-render hr {
          border: none;
          border-top: 1px solid #e8e8e8;
          margin: 24px 0;
        }
        
        .post-content-render table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        
        .post-content-render table th,
        .post-content-render table td {
          border: 1px solid #d9d9d9;
          padding: 8px 12px;
          text-align: left;
        }
        
        .post-content-render table th {
          background-color: #fafafa;
          font-weight: 600;
        }
        
        /* 响应式调整 */
        @media (max-width: 768px) {
          .post-content-render h1 {
            font-size: 24px;
          }
          
          .post-content-render h2 {
            font-size: 20px;
          }
          
          .post-content-render h3 {
            font-size: 18px;
          }
          
          .post-content-render pre {
            padding: 12px;
            font-size: 13px;
          }
        }
      `}</style>

      {/* AI 学习助手浮窗按钮 */}
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<RobotOutlined />}
        onClick={() => setAiDrawerOpen(true)}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          width: 52,
          height: 52,
          fontSize: 24,
          boxShadow: "0 4px 12px rgba(24,144,255,0.4)",
          zIndex: 999,
        }}
      />
      <AiAssistantDrawer
        postId={postId}
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />
    </div>
  );
}
