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
} from "antd";
import type { InputRef } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import {
  createCommunityComment,
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
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentInputRef = useRef<InputRef>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);

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
  }, [postId]);

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
      commentForm.resetFields();
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
        style={{ 
          flex: 1,
          overflowY: "auto",
          paddingRight: 8,
          paddingLeft: 8,
          paddingBottom: 70
        }}
        className="hide-scrollbar"
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
          <Space align="start" style={{ width: "100%" }}>
            <Avatar size={32}>{(username || "U").slice(0, 1)}</Avatar>
            <Form
              form={commentForm}
              layout="vertical"
              onFinish={handleCreateComment}
              style={{ width: "100%" }}
            >
              <Form.Item
                name="content"
                rules={[{ required: true, message: "请输入评论内容" }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="输入评论内容..."
                  ref={commentInputRef}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={commentSubmitting}
              >
                发布评论
              </Button>
            </Form>
          </Space>
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
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(transparent, rgba(255,255,255,0.95) 20%, #fff)',
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
