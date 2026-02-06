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
          <Space align="center">
            <svg
                k1="1770195626963"
                className="icon"
                viewBox="0 0 1264 1024"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                style={{ marginRight: 8 }}
            >
              <path
                  d="M856.786824 323.794824V0.030118h-462.607059v137.366588a293.586824 293.586824 0 0 1 192.752941 275.727059c0 126.674824-80.293647 234.526118-192.752941 275.57647V1002.315294h848.112941V323.794824h-385.505882z"
                  fill="#4C86C6"
              />
              <path
                  d="M293.436235 119.657412c-162.032941 0-293.406118 131.373176-293.406117 293.466353 0 144.564706 104.568471 264.613647 242.145882 288.88847v300.303059h102.520471v-300.272941a290.936471 290.936471 0 0 0 49.483294-13.312V137.396706a292.803765 292.803765 0 0 0-100.74353-17.739294"
                  fill="#31EC7C"
              />
              <path
                  d="M586.932706 413.123765a293.586824 293.586824 0 0 0-192.752941-275.727059v551.303529c112.459294-41.050353 192.752941-148.901647 192.752941-275.57647"
                  fill="#1565B2"
              />
              <path
                  d="M671.744 917.473882h107.911529V84.811294h-107.911529zM860.611765 917.473882h107.941647V408.606118h-107.941647zM1049.509647 917.473882h107.941647V408.606118h-107.941647z"
                  fill="#FFFFFF"
              />
            </svg>
            <Button
                type="pri"
                onClick={() => navigate("/community")}
                level={3}
                style={{
                  margin: 0,
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "30px",
                }}
            >
              学习社区
            </Button>
          </Space>
          <Space wrap>
            <Button onClick={() => navigate("/community/posts")}>
              我的帖子
            </Button>
            <Button onClick={() => navigate("/community/favorites")}>
              我的收藏
            </Button>
            <Button onClick={() => navigate("/community/leaderboard")}>
              排行榜
            </Button>
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
              icon={
                <svg
                  t="1770209095246"
                  className="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                >
                  <path
                    d="M744.6016 148.9152l-159.9488 159.2832-62.5408 62.2336-56.3712 56.064c-16.9728 16.9216-64.4352 62.976-75.776 74.496-11.3152 11.52-18.5088 18.816-21.6064 21.888-7.1936 7.168-12.7232 13.696-16.5888 19.6096-3.84 5.888-7.3472 12.416-10.4192 19.584-2.56 4.608-5.9136 13.056-10.0352 25.344s-8.3712 25.728-12.7488 40.3456c-4.352 14.592-8.4992 28.672-12.3392 42.24-3.8656 13.568-6.3232 23.936-7.3472 31.1296-2.048 13.312-0.768 22.784 3.84 28.416 4.6592 5.632 13.9264 7.68 27.8016 6.144 6.7072-1.024 16.8704-3.328 30.5152-6.912 13.6448-3.584 28.032-7.808 43.2128-12.672a1083.904 1083.904 0 0 0 43.648-14.976c13.8752-5.12 24.4224-9.472 31.6416-13.056 7.1936-3.072 14.1568-7.168 20.8384-12.288 6.7072-5.12 12.6208-9.984 17.7664-14.592 2.048-1.536 8.4992-7.7056 19.3024-18.4576s24.448-24.4736 40.9088-41.1136c16.4608-16.64 68.3008-66.7904 88.8832-86.784l61.7728-62.208 161.2032-162.8928-145.6128-140.8zM640.512 487.296l-38.6048 37.1712c-12.8768 11.9296-45.2864 41.856-55.552 51.7888-10.3168 9.9328-18.8416 18.1248-25.6 24.5504a203.52 203.52 0 0 1-23.168 19.712c-4.1728 3.072-8.5248 5.504-13.0304 7.3472a216.3968 216.3968 0 0 1-19.7888 7.808c-8.704 3.0464-17.7664 6.016-27.264 8.9344-9.472 2.8928-18.5088 5.4272-27.0336 7.552a212.0704 212.0704 0 0 1-19.072 4.1472c-8.6784 0.9216-14.464-0.3072-17.3568-3.6608-2.8928-3.3792-3.712-9.0368-2.4064-16.9728 0.64-4.3008 2.1504-10.496 4.5824-18.5856 2.4064-8.1152 4.9664-16.512 7.7056-25.2416 2.7392-8.704 5.376-16.7168 7.9616-24.064 2.5856-7.3472 4.6848-12.3904 6.272-15.1296 1.9456-4.3008 4.096-8.192 6.528-11.6992 2.4064-3.5072 5.888-7.424 10.368-11.6992 1.9456-1.8432 6.4512-6.1952 13.5168-13.056 7.0912-6.912 304.3328-291.5072 304.3328-291.5072l91.264 86.144-183.6544 176.4608z"
                    fill="#ffffff"
                    p-id="7693"
                  ></path>
                  <path
                    d="M938.496 396.8256v373.1968-0.8704 30.3616c0 78.6432-66.944 142.6432-149.1968 142.6432H235.4432c-82.2528 0-149.2224-64-149.2224-142.6432V251.5456v2.0992-29.4912c0-78.6688 66.9696-142.6432 149.2224-142.6432h365.2864L701.7728 0.0512h-33.3056V0H235.4432C109.9776 0 7.168 94.72 1.2288 213.3248h-0.256V810.3424h0.256c5.9392 118.5792 108.7488 213.2992 234.2144 213.2992h553.856c125.4656 0 228.2752-94.72 234.2144-213.2992h0.256V316.7744l-85.248 80.0512zM918.2976 33.3568a47.3344 47.3344 0 0 0-13.824-2.5088c4.7104 0.3072 9.2928 1.152 13.824 2.5088z"
                    fill="#ffffff"
                    p-id="7694"
                  ></path>
                  <path
                    d="M1010.2784 136.0384c0.8448-14.3872-3.1488-30.208-11.5712-45.312a118.1952 118.1952 0 0 0-23.1424-29.1072c-17.3312-16-37.76-25.984-57.2672-29.44a110.1312 110.1312 0 0 0-13.824-1.3568h-2.3296a84.736 84.736 0 0 0-53.888 18.688c-7.0656 5.7344-15.872 13.5424-26.4704 23.424-10.5728 9.9072-19.712 18.3552-27.392 25.344l144.8448 140.8c4.5056-3.84 9.2928-8.32 14.4384-13.4144 4.48-4.4544 9.7792-9.5744 15.872-15.3088 6.0672-5.7344 12.9792-12.4416 20.6592-20.096 7.0656-7.68 12.1856-15.6416 15.4112-23.936a68.6592 68.6592 0 0 0 4.6592-30.2848z m-36.6848 19.84a51.9424 51.9424 0 0 1-10.5472 16.384c-5.248 5.2224-9.984 9.8048-14.1312 13.7216-4.1728 3.9424-7.7824 7.424-10.8544 10.496 3.072-2.6368-3.5072 3.4816 0 0l-100.0192-95.3856c5.2736-4.7872 2.56-2.3296 9.8048-9.088 7.2192-6.784 13.2608-12.1344 18.0736-16.0512a57.9584 57.9584 0 0 1 36.864-12.8 75.264 75.264 0 0 1 11.0592 0.9472 79.36 79.36 0 0 1 39.168 20.1472c6.656 6.1184 11.9296 12.9024 15.872 19.9168 5.76 10.3424 8.4736 21.1456 7.9104 31.0016l0.0768 3.6864c0 5.6832-1.1008 11.3664-3.2768 17.024z"
                    fill="#ffffff"
                    p-id="7695"
                  ></path>
                </svg>
              }
            />
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
          <Card loading={loading} style={{ backgroundColor: '#fff' }}>
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              
              {/* 顶部作者信息栏（通栏布局） */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-start', 
                alignItems: 'flex-start',
                width: '100%',
                paddingBottom: 16,
                borderBottom: '1px solid #f0f0f0'
              }}>
                
                {/* 左侧区域 */}
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
                      {post?.createdAt ? new Date(post.createdAt).toLocaleString() : "-"}
                      {' · Lv.1'}
                    </Text>
                  </div>
                </div>
              </div>

              {/* 帖子核心内容区（左对齐布局） */}
              <div style={{ textAlign: 'left' }}>
                
                {/* 第一行：主标题 */}
                <Title level={3} style={{ 
                  margin: '0 0 8px 0', 
                  fontWeight: 'bold',
                  textAlign: 'left'
                }}>
                  {post?.title || "求一个不把应届生当cs的城市"}
                </Title>
                
                {/* 第二行：补充文案 */}
                <Paragraph style={{ 
                  margin: '0 0 16px 0', 
                  textAlign: 'left',
                  fontSize: 14
                }}>
                  {post?.content || "我真有点想骂人了"}
                </Paragraph>
                
                {/* 配图区域 */}
                {post?.images && post.images.length > 0 && (
                  <div style={{ textAlign: 'left', marginBottom: 16 }}>
                    <Image.PreviewGroup>
                      <Space>
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

              {/* 互动工具栏（水平排列） */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 24,
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0'
              }}>
                <div style={{ display: 'flex', gap: 24 }}>
                  <Space size="small">
                    <span style={{ fontSize: 16 }}>💬</span>
                    <Text>{post?.comment_count || 39}</Text>
                  </Space>
                  <Space size="small">
                    <span style={{ fontSize: 16 }}>👍</span>
                    <Text>{post?.like_count || 6}</Text>
                  </Space>
                  <Space size="small">
                    <span style={{ fontSize: 16 }}>⭐</span>
                    <Text>{post?.favoriteCount || 3}</Text>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  浏览 {post?.view_count ? (post.view_count > 10000 ? `${(post.view_count/10000).toFixed(1)}w` : post.view_count) : '1.2w'}
                </Text>
              </div>


            </Space>
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
