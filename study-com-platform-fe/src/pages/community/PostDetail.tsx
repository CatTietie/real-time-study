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
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";
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

export default function PostDetail() {
  const { id } = useParams();
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
  const isOwner = Boolean(
    post?.User?.username && username === post.User.username,
  );
  const canShowDelete = isOwner || canDelete || role === "super_admin";
  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [postRes, commentRes, permissionRes] = await Promise.all([
        fetchCommunityPostDetail(Number(id)),
        fetchCommunityPostComments(Number(id), { page: 1, pageSize: 20 }),
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
        const statusRes = await fetchFavoriteStatus(Number(id));
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
  }, [id]);
  const handleCreateComment = async (values: { content: string }) => {
    if (!token) {
      message.warning("请先登录再评论");
      navigate("/admin/login");
      return;
    }
    if (!id) return;
    try {
      setCommentSubmitting(true);
      const res = await createCommunityComment(Number(id), values);
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
    if (!id) return;
    try {
      setLikeAnimating(true);
      await togglePostLike(Number(id));
      loadData();
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
    if (!id) return;
    try {
      if (favorited && favoriteId) {
        await deleteFavorite(favoriteId);
        setFavorited(false);
        setFavoriteId(null);
        message.success("已取消收藏");
        await loadData();
      } else {
        const res = await createFavorite({ postId: Number(id) });
        setFavorited(true);
        setFavoriteId(res?.data?.id || null);
        message.success("收藏成功");
        await loadData();
      }
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
      await toggleCommentLike(commentId);
      loadData();
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
    if (!id) return;
    try {
      await reportCommunityPost(Number(id), { reason: reportReason });
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
    if (!id) return;
    Modal.confirm({
      title: "确认删除该帖子？",
      content: "删除后将进入回收站",
      okText: "删除",
      cancelText: "取消",
      async onOk() {
        try {
          await deleteCommunityPost(Number(id));
          message.success("删除成功");
          navigate("/community");
        } catch (err) {
          if (err instanceof Error && err.message.includes("需确认删除")) {
            await deleteCommunityPost(Number(id), true);
            message.success("删除成功");
            navigate("/community");
            return;
          }
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };
  return (
    <div className="page-container">
      <Card style={{ marginBottom: 16 }}>
        <Space
          align="center"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Title level={4} style={{ margin: 0 }}>
            学习社区
          </Title>
          <Space wrap>
            <Button type="primary" onClick={() => navigate("/community")}>
              社区首页
            </Button>
            <Button onClick={() => navigate("/community/posts")}>
              我的帖子
            </Button>
            <Button onClick={() => navigate("/community/favorites")}>
              我的收藏
            </Button>
            <Button onClick={() => navigate("/community/leaderboard")}>
              排行榜
            </Button>
            <Button onClick={() => navigate(-1)}>返回列表</Button>
            <Button
              onClick={() =>
                navigate(
                  role === "admin" || role === "super_admin"
                    ? "/admin/dashboard"
                    : "/student/entry",
                )
              }
            >
              {role === "admin" || role === "super_admin"
                ? "返回管理端"
                : "返回学生入口"}
            </Button>
            <Button
              type="primary"
              onClick={() => navigate("/community/publish")}
            >
              发布新帖
            </Button>
          </Space>
        </Space>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1fr) 360px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          <Card title="推荐区">
            <Text type="secondary">暂无推荐内容</Text>
          </Card>
        </div>

        <div>
          <Card loading={loading}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Space wrap align="center">
                {post?.category && <Tag color="blue">{post.category}</Tag>}
                <Title level={3} style={{ margin: 0 }}>
                  {post?.title || "-"}
                </Title>
              </Space>

              <Space wrap align="center">
                <Avatar size={40}>
                  {(post?.User?.nickname || post?.User?.username || "U")[0]}
                </Avatar>
                <Text>
                  {post?.User?.nickname || post?.User?.username || "未知"}
                </Text>
                <Text type="secondary">· 发布时间：</Text>
                <Text type="secondary">
                  {post?.createdAt
                    ? new Date(post.createdAt).toLocaleString()
                    : "-"}
                </Text>
                <Text type="secondary">· 最后编辑：</Text>
                <Text type="secondary">
                  {post?.last_edited_at || post?.updatedAt
                    ? new Date(
                        (post?.last_edited_at || post?.updatedAt) as string,
                      ).toLocaleString()
                    : "-"}
                </Text>
              </Space>

              <Space wrap>
                <Text type="secondary">阅读数：{post?.view_count ?? 0}</Text>
                <Text type="secondary">分类：{post?.category || "-"}</Text>
                <Text type="secondary">
                  标签：
                  {post?.tags
                    ? (() => {
                        try {
                          return JSON.parse(post.tags)
                            .map((tag: string) => `#${tag}`)
                            .join(" ");
                        } catch {
                          return "-";
                        }
                      })()
                    : "-"}
                </Text>
              </Space>
            </Space>
          </Card>

          <Card style={{ marginTop: 16 }} title="帖子内容">
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>
              {post?.content || "暂无内容"}
            </Paragraph>
            {post?.images && post.images.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Image.PreviewGroup>
                  <Space wrap>
                    {post.images.map((src) => (
                      <Image
                        key={src}
                        src={resolveImageUrl(src)}
                        style={{ maxWidth: "100%", height: "auto" }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </div>
            )}
          </Card>

          <Card style={{ marginTop: 16 }} title="互动工具栏">
            <Space wrap>
              <Button
                onClick={handleTogglePostLike}
                disabled={isOwner}
                style={{
                  transform: likeAnimating ? "scale(1.06)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
              >
                👍 点赞({post?.like_count || 0})
              </Button>
              <Button>
                💬 评论({post?.comment_count || comments.length || 0})
              </Button>
              <Button onClick={handleToggleFavorite}>
                ⭐ {favorited ? "已收藏" : "收藏"}({post?.favoriteCount || 0})
              </Button>
              <Button onClick={() => setReportVisible(true)}>举报</Button>
              {canShowDelete ? (
                <Button danger onClick={handleDeletePost}>
                  删除
                </Button>
              ) : null}
            </Space>
            {post?.likeUsers && post.likeUsers.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Avatar.Group max={{ count: 5 }}>
                  {post.likeUsers.map((user) => (
                    <Avatar
                      key={user.id}
                      src={user.avatar}
                      alt={user.nickname || user.username}
                    >
                      {(user.nickname || user.username || "U").slice(0, 1)}
                    </Avatar>
                  ))}
                </Avatar.Group>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="评论输入" style={{ marginBottom: 16 }}>
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
                    rows={4}
                    placeholder="输入评论内容..."
                    ref={commentInputRef}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={commentSubmitting}
                >
                  发布
                </Button>
              </Form>
            </Space>
          </Card>

          <Card
            title={`评论列表（${post?.comment_count || comments.length || 0}）`}
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
      <CommunityFooter />
    </div>
  );
  /*
      ]);
      setPost(postRes?.data || null);
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1fr) 360px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          <Card title="推荐区">
            <Text type="secondary">暂无推荐内容</Text>
          </Card>
        </div>

        <div>
          <Card loading={loading}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Space wrap align="center">
                {post?.category && <Tag color="blue">{post.category}</Tag>}
                <Title level={3} style={{ margin: 0 }}>
                  {post?.title || "-"}
                </Title>
              </Space>

              <Space wrap align="center">
                <Avatar size={40}>
                  {(post?.User?.nickname || post?.User?.username || "U")[0]}
                </Avatar>
                <Text>{post?.User?.nickname || post?.User?.username || "未知"}</Text>
                <Text type="secondary">· 发布时间：</Text>
                <Text type="secondary">
                  {post?.createdAt
                    ? new Date(post.createdAt).toLocaleString()
                    : "-"}
                </Text>
                <Text type="secondary">· 最后编辑：</Text>
                <Text type="secondary">
                  {post?.last_edited_at || post?.updatedAt
                    ? new Date(
                        (post?.last_edited_at || post?.updatedAt) as string,
                      ).toLocaleString()
                    : "-"}
                </Text>
              </Space>

              <Space wrap>
                <Text type="secondary">阅读数：{post?.view_count ?? 0}</Text>
                <Text type="secondary">分类：{post?.category || "-"}</Text>
                <Text type="secondary">
                  标签：
                  {post?.tags
                    ? (() => {
                        try {
                          return JSON.parse(post.tags)
                            .map((tag: string) => `#${tag}`)
                            .join(" ");
                        } catch {
                          return "-";
                        }
                      })()
                    : "-"}
                </Text>
              </Space>
            </Space>
          </Card>

          <Card style={{ marginTop: 16 }} title="帖子内容">
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>
              {post?.content || "暂无内容"}
            </Paragraph>
            {post?.images && post.images.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Image.PreviewGroup>
                  <Space wrap>
                    {post.images.map((src) => (
                      <Image
                        key={src}
                        src={resolveImageUrl(src)}
                        style={{ maxWidth: "100%", height: "auto" }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </div>
            )}
          </Card>

          <Card style={{ marginTop: 16 }} title="互动工具栏">
            <Space wrap>
              <Button
                onClick={handleTogglePostLike}
                style={{
                  transform: likeAnimating ? "scale(1.06)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
              >
                👍 点赞({post?.like_count || 0})
              </Button>
              <Button>💬 评论({post?.comment_count || comments.length || 0})</Button>
              <Button onClick={handleToggleFavorite}>
                ⭐ {favorited ? "已收藏" : "收藏"}({post?.favoriteCount || 0})
              </Button>
              <Button onClick={() => setReportVisible(true)}>举报</Button>
              {(post?.User?.username && username === post.User.username) ||
              canDelete ? (
                <Button danger onClick={handleDeletePost}>
                  删除
                </Button>
              ) : null}
            </Space>
            {post?.likeUsers && post.likeUsers.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Avatar.Group max={{ count: 5 }}>
                  {post.likeUsers.map((user) => (
                    <Avatar
                      key={user.id}
                      src={user.avatar}
                      alt={user.nickname || user.username}
                    >
                      {(user.nickname || user.username || "U").slice(0, 1)}
                    </Avatar>
                  ))}
                </Avatar.Group>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="评论输入" style={{ marginBottom: 16 }}>
            <Space align="start" style={{ width: "100%" }}>
              <Avatar size={32}>
                {(username || "U").slice(0, 1)}
              </Avatar>
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
                    rows={4}
                    placeholder="输入评论内容..."
                    ref={commentInputRef}
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  发布
                </Button>
              </Form>
            </Space>
          </Card>

          <Card title={`评论列表（${post?.comment_count || comments.length || 0}）`}>
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
                        <Text type="secondary">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : "-"}
                        </Text>
                      </Space>
                    }
                    description={<Paragraph>{item.content}</Paragraph>}
                  />
                  <Space>
                    <Button
                      size="small"
                      onClick={() => handleToggleCommentLike(item.id)}
                    >
                      👍 {item.like_count || 0}
                    </Button>
                    <Button
                      size="small"
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
      </div>
                transform: likeAnimating ? "scale(1.06)" : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            >
              👍 点赞({post?.like_count || 0})
            </Button>
            <Button>
              💬 评论({post?.comment_count || comments.length || 0})
            </Button>
            <Button onClick={handleToggleFavorite}>
              ⭐ {favorited ? "已收藏" : "收藏"}({post?.favoriteCount || 0})
            </Button>
            <Button>🔗 分享</Button>
            <Button onClick={() => setReportVisible(true)}>举报</Button>
            <Button>更多操作</Button>
          </Space>

          {canShowDelete ? (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">作者专属工具栏：</Text>
              <Space wrap style={{ marginTop: 8 }}>
                <Button disabled>编辑</Button>
                <Button disabled>置顶</Button>
                <Button disabled>加精</Button>
                <Button danger onClick={handleDeletePost}>
                  删除
                </Button>
              </Space>
            </div>
          ) : null}

          {post?.likeUsers && post.likeUsers.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Avatar.Group max={{ count: 5 }}>
                {post.likeUsers.map((user) => (
                  <Avatar
                    key={user.id}
                    src={user.avatar}
                    alt={user.nickname || user.username}
                  >
                    {(user.nickname || user.username || "U").slice(0, 1)}
                  </Avatar>
                ))}
              </Avatar.Group>
            </div>
          )}
        </Card>

        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Title level={4} style={{ margin: 0 }}>
              评论（{post?.comment_count || comments.length || 0}）
            </Title>
            <Space wrap>
              <Select
                defaultValue="time"
                style={{ width: 140 }}
                options={[
                  { label: "按时间正序", value: "time" },
                  { label: "按热度倒序", value: "hot" },
                ]}
              />
              <Select
                defaultValue="all"
                style={{ width: 140 }}
                options={[
                  { label: "全部评论", value: "all" },
                  { label: "只看楼主", value: "author" },
                  { label: "只看优质", value: "best" },
                ]}
              />
            </Space>
          </Space>
        </Card>

        <Card title="评论输入区">
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
                  rows={4}
                  placeholder="输入评论内容..."
                  ref={commentInputRef}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                发布
              </Button>
            </Form>
          </Space>
          <Text type="secondary">支持@用户、基础格式（加粗、代码）</Text>
        </Card>

        <Card title="评论列表区" loading={loading}>
          <List
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
                        {item.User?.nickname || item.User?.username || "匿名"}{" "}
                        (Lv.-)
                      </Text>
                      <Text type="secondary">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "-"}
                      </Text>
                    </Space>
                  }
                  description={<Paragraph>{item.content}</Paragraph>}
                />
                <Space>
                  <Button
                    size="small"
                    onClick={() => handleToggleCommentLike(item.id)}
                  >
                    👍 {item.like_count || 0}
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      handleReply(
                        item.User?.nickname || item.User?.username || "匿名",
                      )
                    }
                  >
                    回复
                  </Button>
                  <Button size="small">举报</Button>
                </Space>
              </List.Item>
            )}
          />
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Button>加载更多评论</Button>
          </div>
        </Card>

        <Card title="侧边推荐区">
          <Space direction="vertical">
            <Title level={5}>相关帖子</Title>
            <Text>• 基于相同标签</Text>
            <Text>• 相同分类</Text>
            <Text>• 相同作者</Text>
            <Divider />
            <Title level={5}>作者的其他帖子</Title>
            <Text>• 帖子标题1</Text>
            <Text>• 帖子标题2</Text>
            <Divider />
            <Title level={5}>社区热帖</Title>
            <Text>• [热] 热门帖子1</Text>
            <Text>• [新] 最新帖子2</Text>
          </Space>
        </Card>
      </Space>
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
      <CommunityFooter />
    </div>
  );
  */
}
