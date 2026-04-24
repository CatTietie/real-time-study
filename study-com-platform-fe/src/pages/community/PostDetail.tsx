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

const { Title, Text, Paragraph } = Typography;
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
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
};

type CommentRow = {
  id: number;
  content: string;
  createdAt?: string;
  User?: { nickname?: string; username?: string };
  like_count?: number;
  status?: number;
  is_deleted?: number;
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

  const handleReply = (targetName: string) => {
    const content = commentForm.getFieldValue("content") || "";
    const prefix = `@${targetName} `;
    if (!content.includes(prefix)) {
      commentForm.setFieldsValue({ content: `${prefix}${content}`.trim() });
    }
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
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

              <Paragraph style={{
                margin: '0 0 16px 0',
                textAlign: 'left',
                fontSize: 14,
                whiteSpace: 'pre-wrap'
              }}>
                {post?.content || "我真有点想骂人了"}
              </Paragraph>

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
        >
          <List
            rowKey="id"
            dataSource={comments}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar size={32}>
                      {(item.User?.nickname || item.User?.username || "U")[0]}
                    </Avatar>
                  }
                  title={
                    <Space wrap>
                      <Text>
                        {item.User?.nickname || item.User?.username || "匿名"}
                      </Text>
                      {item.status === 0 ? (
                        <Tag color="orange">审核中</Tag>
                      ) : null}
                      <Text type="secondary">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "-"}
                      </Text>
                    </Space>
                  }
                  description={
                    <Paragraph
                      type={item.status === 0 ? "secondary" : undefined}
                    >
                      {item.content}
                    </Paragraph>
                  }
                />
                <Space>
                  <Button
                    size="small"
                    disabled={item.status === 0}
                    onClick={() => handleToggleCommentLike(item.id)}
                  >
                    👍 {item.like_count || 0}
                  </Button>
                  <Button
                    size="small"
                    disabled={item.status === 0}
                    onClick={() =>
                      handleReply(
                        item.User?.nickname || item.User?.username || "匿名",
                      )
                    }
                  >
                    回复
                  </Button>
                </Space>
              </List.Item>
            )}
          />
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
    </div>
  );
}
