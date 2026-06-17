import { Card, Table, Typography, message, Badge, Button, Tooltip, Tag, Space, Radio } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchCommunityLeaderboardByType } from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import {
    TrophyOutlined,
    FireOutlined,
    StarOutlined,
    LikeOutlined,
    UserOutlined,
    EyeOutlined,
    MessageOutlined,
    HomeOutlined,
    QuestionCircleOutlined,
    CaretUpOutlined,
    CaretDownOutlined,
    MinusOutlined,
    CheckCircleOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

type LeaderboardRow = {
    key: string | number;
    id?: number;
    nickname?: string;
    username?: string;
    points?: number;
    level?: number;
    likeCount?: number;
    Post?: {
        title?: string;
        User?: { nickname?: string; username?: string };
        viewCount?: number;
    };
    title?: string;
    like_count?: number;
    comment_count?: number;
    user?: { nickname?: string; username?: string; points?: number };
    view_count?: number;
    commentCount?: number;
    author?: { nickname?: string; username?: string };
    author_nickname?: string;
    author_username?: string;
    heat_score?: number;
    avatar?: string;
    post_count?: number;
    post_like_count?: number;
    comment_like_count?: number;
    // 评论之星新增字段
    period_comment_count?: number;
    total_comment_count?: number;
    last_comment_time?: string;
    period_type?: string;
    period_label?: string;
    // 练题排行榜字段
    weekly_score?: number;
    accuracy_rate?: number;
    total_questions?: number;
    correct_count?: number;
    rank_change?: number | null;
};

type HeatRules = {
    viewWeight: number;
    likeWeight: number;
    commentWeight: number;
    formula: string;
    description: string;
};

// 数据缓存类型
type CachedData = {
    posts: {
        [timeRange: string]: {
            data: LeaderboardRow[];
            heatRules: HeatRules | null;
            timestamp: number;
        };
    };
    users: {
        data: LeaderboardRow[];
        timestamp: number;
    };
    comments: {
        [commentPeriod: string]: {
            data: LeaderboardRow[];
            timestamp: number;
        };
    };
    weekly_score: {
        data: LeaderboardRow[];
        timestamp: number;
    };
    accuracy: {
        data: LeaderboardRow[];
        timestamp: number;
    };
};

// 缓存过期时间（5分钟）
const CACHE_EXPIRE_TIME = 5 * 60 * 1000;

// 初始化缓存
const initialCache: CachedData = {
    posts: {},
    users: { data: [], timestamp: 0 },
    comments: {},
    weekly_score: { data: [], timestamp: 0 },
    accuracy: { data: [], timestamp: 0 },
};

export default function Leaderboard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<LeaderboardRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");
    const [timeRange, setTimeRange] = useState<string>("all");
    const [commentPeriod, setCommentPeriod] = useState<string>("7days"); // "7days" 或 "all"
    const [heatRules, setHeatRules] = useState<HeatRules | null>(null);
    const [cache, setCache] = useState<CachedData>(initialCache);
    const cacheRef = useRef<CachedData>(cache);
    cacheRef.current = cache;
    const [tabTransitioning, setTabTransitioning] = useState(false);

    // 检查缓存是否有效
    const isValidCache = (timestamp: number) => {
        return Date.now() - timestamp < CACHE_EXPIRE_TIME;
    };

    // 切换标签页（带动画）
    const handleTabChange = (newTab: string) => {
        if (newTab === activeTab) return;
        
        setTabTransitioning(true);
        
        setTimeout(() => {
            setActiveTab(newTab);
            // 如果是热门内容榜，重置时间筛选为all
            if (newTab !== "posts") {
                setTimeRange("all");
            }
            setTabTransitioning(false);
        }, 200);
    };

    const loadData = useCallback(
        async () => {
            const currentCache = cacheRef.current;
            // 检查缓存
            if (activeTab === "posts") {
                const cached = currentCache.posts[timeRange];
                if (cached && isValidCache(cached.timestamp)) {
                    setData(cached.data.slice(0, 10));
                    setHeatRules(cached.heatRules);
                    return;
                }
            } else if (activeTab === "users") {
                if (currentCache.users.data.length > 0 && isValidCache(currentCache.users.timestamp)) {
                    setData(currentCache.users.data.slice(0, 10));
                    return;
                }
            } else if (activeTab === "comments") {
                const cached = currentCache.comments[commentPeriod];
                if (cached && isValidCache(cached.timestamp)) {
                    setData(cached.data.slice(0, 10));
                    return;
                }
            } else if (activeTab === "weekly_score") {
                if (currentCache.weekly_score.data.length > 0 && isValidCache(currentCache.weekly_score.timestamp)) {
                    setData(currentCache.weekly_score.data.slice(0, 10));
                    return;
                }
            } else if (activeTab === "accuracy") {
                if (currentCache.accuracy.data.length > 0 && isValidCache(currentCache.accuracy.timestamp)) {
                    setData(currentCache.accuracy.data.slice(0, 10));
                    return;
                }
            }

            setLoading(true);
            try {
                const typeMap = {
                    posts: "post_hot",
                    users: "total",
                    comments: "comment_count",
                    weekly_score: "weekly_score",
                    accuracy: "accuracy_rate",
                };

                const actualTimeRange = activeTab === "posts" ? timeRange : undefined;
                const actualCommentPeriod = activeTab === "comments" ? commentPeriod : undefined;
                const res = await fetchCommunityLeaderboardByType(
                    typeMap[activeTab as keyof typeof typeMap], 
                    actualTimeRange,
                    actualCommentPeriod
                );

                if (activeTab === "posts" && res?.heat_rules) {
                    setHeatRules(res.heat_rules);
                }

                const fullList = ((res?.data as LeaderboardRow[] | undefined) || []).map(
                    (item, index) => ({
                        ...item,
                        key: item.key ?? item.id ?? index,
                        author_nickname: item.user_nickname || item.author?.nickname || item.Post?.User?.nickname || item.nickname,
                        author_username: item.user_username || item.author?.username || item.Post?.User?.username || item.username,
                    }),
                );
                
                const list = fullList.slice(0, 10);
                setData(list);

                // 更新缓存
                const now = Date.now();
                if (activeTab === "posts") {
                    setCache(prev => ({
                        ...prev,
                        posts: {
                            ...prev.posts,
                            [timeRange]: {
                                data: fullList,
                                heatRules: res?.heat_rules || null,
                                timestamp: now,
                            },
                        },
                    }));
                } else if (activeTab === "users") {
                    setCache(prev => ({
                        ...prev,
                        users: {
                            data: fullList,
                            timestamp: now,
                        },
                    }));
                } else if (activeTab === "comments") {
                    setCache(prev => ({
                        ...prev,
                        comments: {
                            ...prev.comments,
                            [commentPeriod]: {
                                data: fullList,
                                timestamp: now,
                            },
                        },
                    }));
                } else if (activeTab === "weekly_score") {
                    setCache(prev => ({
                        ...prev,
                        weekly_score: {
                            data: fullList,
                            timestamp: now,
                        },
                    }));
                } else if (activeTab === "accuracy") {
                    setCache(prev => ({
                        ...prev,
                        accuracy: {
                            data: fullList,
                            timestamp: now,
                        },
                    }));
                }
            } catch (err) {
                message.error(err instanceof Error ? err.message : "加载失败");
            } finally {
                setLoading(false);
            }
        },
        [activeTab, timeRange, commentPeriod],
    );

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 排行榜排名样式 - 修复偏移问题
    const renderRank = (_value: unknown, _record: LeaderboardRow, index: number) => {
        const rank = index + 1;

        if (rank === 1) {
            return (
                <div style={{ position: "relative", width: 60, margin: "0 auto" }}>
                    <Badge
                        count={
                            <div style={{
                                width: 36,
                                height: 36,
                                background: "linear-gradient(135deg, #FFD700 0%, #FFEC8B 100%)",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#7B5800",
                                fontWeight: "bold",
                                fontSize: 16,
                                boxShadow: "0 2px 8px rgba(255, 215, 0, 0.4)"
                            }}>
                                {rank}
                            </div>
                        }
                        offset={[0, 0]}
                        style={{
                            position: "absolute",
                            left: "50%",
                            transform: "translateX(-50%)",
                            top: 0
                        }}
                    >
                        <div style={{ width: 36, height: 36 }} />
                    </Badge>
                </div>
            );
        }

        if (rank === 2) {
            return (
                <div style={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, #E5E4E2 0%, #F5F5F5 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6B7280",
                    fontWeight: "bold",
                    fontSize: 16,
                    margin: "0 auto",
                    boxShadow: "0 2px 8px rgba(229, 228, 226, 0.4)"
                }}>
                    {rank}
                </div>
            );
        }

        if (rank === 3) {
            return (
                <div style={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, #CD7F32 0%, #E6B17E 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#7C4700",
                    fontWeight: "bold",
                    fontSize: 16,
                    margin: "0 auto",
                    boxShadow: "0 2px 8px rgba(205, 127, 50, 0.4)"
                }}>
                    {rank}
                </div>
            );
        }

        return (
            <div style={{
                width: 36,
                height: 36,
                background: "#F3F4F6",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6B7280",
                fontWeight: 500,
                fontSize: 14,
                margin: "0 auto"
            }}>
                {rank}
            </div>
        );
    };

    // 标签页配置
    const tabs = [
        { key: "posts", label: "热门内容", icon: <FireOutlined />, description: "根据浏览量、点赞、评论综合计算" },
        { key: "users", label: "社区达人", icon: <StarOutlined />, description: "根据总积分排名" },
        { key: "comments", label: "评论之星", icon: <MessageOutlined />, description: "根据评论数量排名" },
        { key: "weekly_score", label: "本周得分榜", icon: <ThunderboltOutlined />, description: "本周做题积分排名，每周一重置" },
        { key: "accuracy", label: "正确率榜", icon: <CheckCircleOutlined />, description: "做题超50道用户，按正确率排名" },
    ];

    // 根据活动标签生成对应列
    const getColumns = () => {
        const baseColumns = [
            {
                title: "排名",
                render: renderRank,
                width: 100,
                align: "center",
            }
        ];

        if (activeTab === "posts") {
            return [
                ...baseColumns,
                {
                    title: "热门内容",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const postId = record.id;
                        const title = record.title || record.Post?.title || "未命名内容";
                        
                        return (
                            <div style={{ maxWidth: 420, cursor: "pointer" }}>
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (postId) {
                                            navigate(`/community?postId=${postId}`);
                                        }
                                    }}
                                    style={{
                                        fontWeight: 600,
                                        color: "#1F2937",
                                        marginBottom: 8,
                                        fontSize: 15,
                                        lineHeight: 1.4,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        transition: "color 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = "#667eea";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = "#1F2937";
                                    }}
                                >
                                    {title}
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    color: "#9CA3AF",
                                    fontSize: 12,
                                    flexWrap: "wrap"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <UserOutlined style={{ fontSize: 11 }} />
                                        <span style={{ fontWeight: 500, color: "#6B7280" }}>
                                            {record.author_nickname || record.author?.nickname || record.Post?.User?.nickname || record.nickname || "匿名用户"}
                                        </span>
                                        <span style={{ color: "#9CA3AF" }}>
                                            @{record.author_username || record.author?.username || record.Post?.User?.username || record.username || "anonymous"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    },
                    ellipsis: { showTitle: true },
                },
                {
                    title: "互动数据",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const viewCount = record.view_count || record.Post?.viewCount || 0;
                        const likeCount = record.like_count || 0;
                        const commentCount = record.comment_count || 0;
                        
                        return (
                            <div style={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                gap: 4,
                                fontSize: 12,
                                color: "#9CA3AF"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <EyeOutlined style={{ fontSize: 11, opacity: 0.6 }} />
                                    <Text style={{ color: "#9CA3AF", minWidth: 32, fontSize: 12 }}>
                                        {viewCount}
                                    </Text>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <LikeOutlined style={{ fontSize: 11, opacity: 0.6 }} />
                                    <Text style={{ color: "#9CA3AF", minWidth: 32, fontSize: 12 }}>
                                        {likeCount}
                                    </Text>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <MessageOutlined style={{ fontSize: 11, opacity: 0.6 }} />
                                    <Text style={{ color: "#9CA3AF", minWidth: 32, fontSize: 12 }}>
                                        {commentCount}
                                    </Text>
                                </div>
                            </div>
                        );
                    },
                    width: 80,
                    align: "center",
                },
                {
                    title: (
                        <Space>
                            热度值
                            <Tooltip
                                title={
                                    <div style={{ maxWidth: 240, fontSize: 12 }}>
                                        <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                                            {heatRules?.formula || "热度值 = 浏览量 × 0.5 + 点赞数 × 2 + 评论数"}
                                        </div>
                                        <div style={{ color: "#D1D5DB", marginBottom: 6 }}>
                                            各维度权重：
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <span>• 浏览：权重 {heatRules?.viewWeight || 0.5}</span>
                                            <span>• 点赞：权重 {heatRules?.likeWeight || 2}（最高）</span>
                                            <span>• 评论：权重 {heatRules?.commentWeight || 1}</span>
                                        </div>
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                                            {heatRules?.description || "热度值综合考虑浏览、点赞、评论三个维度，其中点赞权重最高，评论次之，浏览最低。"}
                                        </div>
                                    </div>
                                }
                                placement="topRight"
                            >
                                <QuestionCircleOutlined style={{ color: "#9CA3AF", fontSize: 14, cursor: "help" }} />
                            </Tooltip>
                        </Space>
                    ),
                    render: (_value: unknown, record: LeaderboardRow) => {
                        // 使用后端返回的热度值，如果没有则降级到前端计算
                        const score = record.heat_score ?? Math.round(
                            (record.view_count || record.Post?.viewCount || 0) * 0.5 + 
                            (record.like_count || 0) * 2 + 
                            (record.comment_count || 0)
                        );

                        const getHeatLevel = (score: number) => {
                            if (score > 500) return { color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5", label: "爆款" };
                            if (score > 200) return { color: "#F59E0B", bg: "#FEF3C7", border: "#FBBF24", label: "热门" };
                            if (score > 50) return { color: "#10B981", bg: "#D1FAE5", border: "#34D399", label: "活跃" };
                            return { color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB", label: "普通" };
                        };

                        const level = getHeatLevel(score);

                        const tooltipContent = heatRules ? (
                            <div style={{ fontSize: 12 }}>
                                <div style={{ fontWeight: "bold", marginBottom: 6 }}>当前热度值：{score}</div>
                                <div style={{ color: "#D1D5DB", marginBottom: 4 }}>明细：</div>
                                <div>
                                    浏览 {(record.view_count || record.Post?.viewCount || 0)} × {heatRules.viewWeight} = {((record.view_count || record.Post?.viewCount || 0) * heatRules.viewWeight).toFixed(1)}
                                </div>
                                <div>
                                    点赞 {record.like_count || 0} × {heatRules.likeWeight} = {(record.like_count || 0) * heatRules.likeWeight}
                                </div>
                                <div>
                                    评论 {record.comment_count || 0} × {heatRules.commentWeight} = {record.comment_count || 0}
                                </div>
                                <div style={{ marginTop: 4, fontWeight: "bold" }}>
                                    合计：{score}
                                </div>
                            </div>
                        ) : undefined;

                        const heatDisplay = (
                            <div style={{
                                background: level.bg,
                                padding: "14px 12px",
                                borderRadius: 12,
                                border: `2px solid ${level.border}`,
                                textAlign: "center",
                                minWidth: 110,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                            }}>
                                <Text style={{
                                    color: level.color,
                                    fontWeight: 800,
                                    fontSize: 24,
                                    display: "block",
                                    lineHeight: 1
                                }}>
                                    {score}
                                </Text>
                                <div style={{
                                    fontSize: 11,
                                    color: level.color,
                                    fontWeight: 700,
                                    marginTop: 6,
                                    background: "rgba(255, 255, 255, 0.8)",
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    display: "inline-block"
                                }}>
                                    {level.label}
                                </div>
                            </div>
                        );

                        if (tooltipContent) {
                            return (
                                <Tooltip title={tooltipContent} placement="topRight">
                                    {heatDisplay}
                                </Tooltip>
                            );
                        }

                        return heatDisplay;
                    },
                    width: 140,
                    align: "center",
                }
            ];
        } else if (activeTab === "users") {
            // 等级颜色配置 - 渐变效果
            const getLevelStyle = (level: number) => {
                const levelStyles: Record<number, { bg: string; textColor: string; border: string; label: string }> = {
                    1: { 
                        bg: "linear-gradient(135deg, #9CA3AF 0%, #D1D5DB 100%)", 
                        textColor: "#374151", 
                        border: "#9CA3AF",
                        label: "新手" 
                    },
                    2: { 
                        bg: "linear-gradient(135deg, #10B981 0%, #34D399 100%)", 
                        textColor: "#064E3B", 
                        border: "#10B981",
                        label: "初级" 
                    },
                    3: { 
                        bg: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)", 
                        textColor: "#1E3A8A", 
                        border: "#3B82F6",
                        label: "中级" 
                    },
                    4: { 
                        bg: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)", 
                        textColor: "#4C1D95", 
                        border: "#8B5CF6",
                        label: "高级" 
                    },
                    5: { 
                        bg: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)", 
                        textColor: "#78350F", 
                        border: "#F59E0B",
                        label: "专家" 
                    },
                };
                // 等级 >= 5 都显示专家级别的样式
                return level >= 5 ? levelStyles[5] : levelStyles[level] || levelStyles[1];
            };

            return [
                ...baseColumns,
                {
                    title: "用户信息",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const level = record.level ?? 1;
                        const levelStyle = getLevelStyle(level);
                        const avatar = record.avatar;
                        const nickname = record.nickname || record.user?.nickname || record.user_nickname || "匿名用户";
                        const username = record.username || record.user?.username || record.user_username || "-";
                        const postCount = record.post_count ?? 0;
                        const postLikeCount = record.post_like_count ?? 0;
                        const commentLikeCount = record.comment_like_count ?? 0;
                        const totalLikes = postLikeCount + commentLikeCount;

                        return (
                            <div 
                                style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 16,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    padding: "4px 8px",
                                    borderRadius: "8px",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgba(102, 126, 234, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // 跳转到用户个人主页
                                    if (record.id) {
                                        navigate(`/community/user/${record.id}`);
                                    }
                                }}
                            >
                                {/* 头像 - 放大显示 */}
                                {avatar ? (
                                    <img
                                        src={avatar}
                                        alt={nickname}
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            border: `3px solid ${levelStyle.border}`,
                                            boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 64,
                                        height: 64,
                                        background: levelStyle.bg,
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white",
                                        fontWeight: "bold",
                                        fontSize: 24,
                                        boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
                                    }}>
                                        {nickname.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                
                                {/* 用户信息 */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* 昵称 + 等级标签 - 更突出显示 */}
                                    <div style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: 10, 
                                        marginBottom: 8,
                                        flexWrap: "wrap",
                                    }}>
                                        <Text style={{
                                            fontWeight: 700,
                                            fontSize: 17,
                                            color: "#1F2937",
                                        }}>
                                            {nickname}
                                        </Text>
                                        {/* 等级标签 - 颜色渐变 */}
                                        <Tag
                                            style={{
                                                background: levelStyle.bg,
                                                color: levelStyle.textColor,
                                                border: `1px solid ${levelStyle.border}`,
                                                fontWeight: 600,
                                                fontSize: 12,
                                                padding: "2px 10px",
                                                borderRadius: "20px",
                                                margin: 0,
                                            }}
                                        >
                                            Lv.{level} {levelStyle.label}
                                        </Tag>
                                    </div>
                                    
                                    {/* @用户名 */}
                                    <div style={{ marginBottom: 8 }}>
                                        <Text style={{
                                            color: "#6B7280",
                                            fontSize: 13,
                                            background: "#F3F4F6",
                                            padding: "2px 8px",
                                            borderRadius: 4,
                                        }}>
                                            @{username}
                                        </Text>
                                    </div>
                                    
                                    {/* 活跃度数据：发帖数 + 获赞数 */}
                                    <Space size={16} wrap>
                                        {/* 发帖数 */}
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 6,
                                            fontSize: 13,
                                        }}>
                                            <div style={{
                                                background: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
                                                color: "white",
                                                padding: "2px 8px",
                                                borderRadius: "4px",
                                                fontWeight: 600,
                                                fontSize: 12,
                                            }}>
                                                📝 帖子
                                            </div>
                                            <Text style={{ fontWeight: 600, color: "#1F2937", fontSize: 14 }}>
                                                {postCount}
                                            </Text>
                                        </div>
                                        
                                        {/* 获赞数 */}
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 6,
                                            fontSize: 13,
                                        }}>
                                            <div style={{
                                                background: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
                                                color: "white",
                                                padding: "2px 8px",
                                                borderRadius: "4px",
                                                fontWeight: 600,
                                                fontSize: 12,
                                            }}>
                                                ❤️ 获赞
                                            </div>
                                            <Text style={{ fontWeight: 600, color: "#1F2937", fontSize: 14 }}>
                                                {totalLikes}
                                            </Text>
                                            {/* 显示明细 */}
                                            {(postLikeCount > 0 || commentLikeCount > 0) && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    (帖子{postLikeCount} + 评论{commentLikeCount})
                                                </Text>
                                            )}
                                        </div>
                                    </Space>
                                </div>
                            </div>
                        );
                    },
                },
                {
                    title: "等级",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const level = record.level ?? 1;
                        const levelStyle = getLevelStyle(level);
                        
                        return (
                            <Tooltip title={`等级 ${level} (${levelStyle.label})`}>
                                <div style={{
                                    background: levelStyle.bg,
                                    color: "white",
                                    width: 64,
                                    height: 64,
                                    borderRadius: "50%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "bold",
                                    margin: "0 auto",
                                    boxShadow: `0 4px 16px rgba(0,0,0,0.15)`,
                                    border: `3px solid white`,
                                }}>
                                    <Text style={{
                                        color: "white",
                                        fontWeight: 800,
                                        fontSize: 20,
                                        lineHeight: 1,
                                    }}>
                                        {level}
                                    </Text>
                                    <Text style={{
                                        color: "rgba(255,255,255,0.9)",
                                        fontWeight: 600,
                                        fontSize: 10,
                                        marginTop: 2,
                                    }}>
                                        {levelStyle.label}
                                    </Text>
                                </div>
                            </Tooltip>
                        );
                    },
                    width: 120,
                    align: "center",
                },
                {
                    title: "积分",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const points = record.points ?? record.user?.points ?? 0;
                        
                        return (
                            <div style={{ textAlign: "center" }}>
                                <Text style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    display: "block",
                                }}>
                                    {points.toLocaleString()}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    总积分
                                </Text>
                            </div>
                        );
                    },
                    width: 120,
                    align: "center",
                }
            ];
        } else if (activeTab === "weekly_score") {
            const renderRankChange = (rankChange: number | null | undefined) => {
                if (rankChange == null) return null;
                if (rankChange > 0) {
                    return (
                        <span style={{ color: "#10B981", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>
                            <CaretUpOutlined /> {rankChange}
                        </span>
                    );
                }
                if (rankChange < 0) {
                    return (
                        <span style={{ color: "#EF4444", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>
                            <CaretDownOutlined /> {Math.abs(rankChange)}
                        </span>
                    );
                }
                return (
                    <span style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 4 }}>
                        <MinusOutlined />
                    </span>
                );
            };

            return [
                {
                    title: "排名",
                    render: (value: unknown, record: LeaderboardRow, index: number) => (
                        <div style={{ textAlign: "center" }}>
                            {renderRank(value, record, index)}
                            {renderRankChange(record.rank_change)}
                        </div>
                    ),
                    width: 100,
                    align: "center",
                },
                {
                    title: "用户信息",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const avatar = record.avatar;
                        const nickname = record.nickname || "匿名用户";
                        const username = record.username || "-";

                        return (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    cursor: "pointer",
                                    padding: "4px 8px",
                                    borderRadius: "8px",
                                    transition: "all 0.2s ease",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (record.id) navigate(`/community/user/${record.id}`);
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(102, 126, 234, 0.05)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                                {avatar ? (
                                    <img src={avatar} alt={nickname} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #E5E7EB" }} />
                                ) : (
                                    <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 18 }}>
                                        {nickname.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <Text style={{ fontWeight: 700, fontSize: 15, color: "#1F2937", display: "block" }}>{nickname}</Text>
                                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>@{username}</Text>
                                </div>
                            </div>
                        );
                    },
                },
                {
                    title: "本周积分",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const score = record.weekly_score ?? 0;
                        return (
                            <div style={{ textAlign: "center" }}>
                                <Text style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    display: "block",
                                }}>
                                    {score}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>分</Text>
                            </div>
                        );
                    },
                    width: 140,
                    align: "center",
                },
            ];
        } else if (activeTab === "accuracy") {
            const renderRankChange = (rankChange: number | null | undefined) => {
                if (rankChange == null) return null;
                if (rankChange > 0) {
                    return (
                        <span style={{ color: "#10B981", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>
                            <CaretUpOutlined /> {rankChange}
                        </span>
                    );
                }
                if (rankChange < 0) {
                    return (
                        <span style={{ color: "#EF4444", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>
                            <CaretDownOutlined /> {Math.abs(rankChange)}
                        </span>
                    );
                }
                return (
                    <span style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 4 }}>
                        <MinusOutlined />
                    </span>
                );
            };

            return [
                {
                    title: "排名",
                    render: (value: unknown, record: LeaderboardRow, index: number) => (
                        <div style={{ textAlign: "center" }}>
                            {renderRank(value, record, index)}
                            {renderRankChange(record.rank_change)}
                        </div>
                    ),
                    width: 100,
                    align: "center",
                },
                {
                    title: "用户信息",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const avatar = record.avatar;
                        const nickname = record.nickname || "匿名用户";
                        const username = record.username || "-";

                        return (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    cursor: "pointer",
                                    padding: "4px 8px",
                                    borderRadius: "8px",
                                    transition: "all 0.2s ease",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (record.id) navigate(`/community/user/${record.id}`);
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(102, 126, 234, 0.05)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                                {avatar ? (
                                    <img src={avatar} alt={nickname} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #E5E7EB" }} />
                                ) : (
                                    <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 18 }}>
                                        {nickname.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <Text style={{ fontWeight: 700, fontSize: 15, color: "#1F2937", display: "block" }}>{nickname}</Text>
                                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>@{username}</Text>
                                </div>
                            </div>
                        );
                    },
                },
                {
                    title: "正确率",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const rate = record.accuracy_rate ?? 0;
                        const getColor = (r: number) => {
                            if (r >= 90) return "#10B981";
                            if (r >= 75) return "#3B82F6";
                            if (r >= 60) return "#F59E0B";
                            return "#EF4444";
                        };
                        const color = getColor(rate);

                        return (
                            <div style={{ textAlign: "center" }}>
                                <Text style={{
                                    fontSize: 26,
                                    fontWeight: 800,
                                    color,
                                    display: "block",
                                }}>
                                    {rate.toFixed(1)}%
                                </Text>
                                <div style={{
                                    width: 80,
                                    height: 6,
                                    background: "#F3F4F6",
                                    borderRadius: 3,
                                    margin: "4px auto 0",
                                    overflow: "hidden",
                                }}>
                                    <div style={{
                                        width: `${rate}%`,
                                        height: "100%",
                                        background: color,
                                        borderRadius: 3,
                                        transition: "width 0.3s ease",
                                    }} />
                                </div>
                            </div>
                        );
                    },
                    width: 140,
                    align: "center",
                },
                {
                    title: "做题数",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const total = record.total_questions ?? 0;
                        const correct = record.correct_count ?? 0;
                        return (
                            <div style={{ textAlign: "center" }}>
                                <Text style={{ fontSize: 16, fontWeight: 700, color: "#1F2937" }}>{total}</Text>
                                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>正确 {correct}</Text>
                            </div>
                        );
                    },
                    width: 100,
                    align: "center",
                },
            ];
        } else { // comments - 评论之星
            // 格式化最新评论时间
            const formatLastCommentTime = (timeStr: string | undefined) => {
                if (!timeStr) return null;
                const now = new Date();
                const commentTime = new Date(timeStr);
                const diffHours = (now.getTime() - commentTime.getTime()) / (1000 * 60 * 60);
                
                if (diffHours < 1) {
                    return "活跃中";
                } else if (diffHours < 24) {
                    return `${Math.floor(diffHours)}小时前`;
                } else {
                    return `${Math.floor(diffHours / 24)}天前`;
                }
            };
            
            // 检查是否活跃（24小时内有评论）
            const isActive = (timeStr: string | undefined) => {
                if (!timeStr) return false;
                const now = new Date();
                const commentTime = new Date(timeStr);
                const diffHours = (now.getTime() - commentTime.getTime()) / (1000 * 60 * 60);
                return diffHours < 24;
            };

            return [
                ...baseColumns,
                {
                    title: "评论达人",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const nickname = record.nickname || record.user?.nickname || record.user_nickname || "匿名用户";
                        const username = record.username || record.user?.username || record.user_username || "-";
                        const avatar = record.avatar;
                        const lastCommentTime = record.last_comment_time;
                        const userId = record.id;
                        const isUserActive = isActive(lastCommentTime);
                        const lastTimeLabel = formatLastCommentTime(lastCommentTime);
                        
                        return (
                            <div 
                                style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 14,
                                    cursor: "pointer",
                                    padding: "6px 10px",
                                    borderRadius: "10px",
                                    transition: "all 0.2s ease",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (userId) {
                                        navigate(`/community/user/${userId}`);
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgba(102, 126, 234, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                {/* 头像 */}
                                <div style={{ position: "relative" }}>
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt={nickname}
                                            style={{
                                                width: 52,
                                                height: 52,
                                                borderRadius: "50%",
                                                objectFit: "cover",
                                                border: "2px solid #E5E7EB",
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 52,
                                            height: 52,
                                            background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "white",
                                            fontWeight: "bold",
                                            fontSize: 20,
                                        }}>
                                            {nickname.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {/* 活跃状态指示器 */}
                                    {isUserActive && (
                                        <div style={{
                                            position: "absolute",
                                            bottom: 0,
                                            right: 0,
                                            width: 14,
                                            height: 14,
                                            background: "#10B981",
                                            borderRadius: "50%",
                                            border: "2px solid white",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                        }} />
                                    )}
                                </div>
                                
                                {/* 用户信息 */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: 8, 
                                        marginBottom: 4,
                                    }}>
                                        <Text style={{
                                            fontWeight: 700,
                                            color: "#1F2937",
                                            fontSize: 15,
                                        }}>
                                            {nickname}
                                        </Text>
                                        {/* 活跃状态标签 */}
                                        {isUserActive && lastTimeLabel === "活跃中" && (
                                            <Tag color="success" style={{
                                                margin: 0,
                                                fontSize: 11,
                                                padding: "1px 6px",
                                            }}>
                                                🔥 活跃中
                                            </Tag>
                                        )}
                                    </div>
                                    <div style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: 10,
                                    }}>
                                        <Text style={{
                                            color: "#9CA3AF",
                                            fontSize: 12,
                                        }}>
                                            @{username}
                                        </Text>
                                        {/* 最后评论时间 */}
                                        {lastTimeLabel && lastTimeLabel !== "活跃中" && (
                                            <Text style={{
                                                color: "#D1D5DB",
                                                fontSize: 11,
                                            }}>
                                                最后评论：{lastTimeLabel}
                                            </Text>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    },
                },
                {
                    title: "近7天评论",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const periodCount = record.period_comment_count ?? record.comment_count ?? record.commentCount ?? 0;
                        const totalCount = record.total_comment_count ?? 0;
                        
                        // 根据评论数量确定样式等级
                        let badgeColor = "";
                        let bgGradient = "";
                        let textColor = "";
                        
                        if (periodCount >= 30) {
                            badgeColor = "🏆";
                            bgGradient = "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)";
                            textColor = "white";
                        } else if (periodCount >= 15) {
                            badgeColor = "⭐";
                            bgGradient = "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)";
                            textColor = "white";
                        } else if (periodCount >= 5) {
                            badgeColor = "💬";
                            bgGradient = "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)";
                            textColor = "white";
                        } else {
                            badgeColor = "📝";
                            bgGradient = "#F3F4F6";
                            textColor = "#4B5563";
                        }

                        const tooltipContent = totalCount > 0 ? (
                            <div style={{ fontSize: 12 }}>
                                <div style={{ fontWeight: "bold", marginBottom: 6 }}>评论统计</div>
                                <div>📅 近7天：<span style={{ fontWeight: "bold", color: "#10B981" }}>{periodCount} 条</span></div>
                                <div>📊 历史总计：<span style={{ fontWeight: "bold", color: "#3B82F6" }}>{totalCount} 条</span></div>
                                <div style={{ marginTop: 6, color: "#D1D5DB", fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                                    排名依据：近7天评论数量
                                </div>
                            </div>
                        ) : undefined;

                        const commentDisplay = (
                            <div style={{
                                background: bgGradient,
                                padding: "14px 20px",
                                borderRadius: 16,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 110,
                                boxShadow: periodCount >= 15 ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                            }}>
                                <div style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 6,
                                    marginBottom: 2,
                                }}>
                                    <span style={{ fontSize: 14 }}>{badgeColor}</span>
                                </div>
                                <Text style={{
                                    color: textColor,
                                    fontWeight: 800,
                                    fontSize: 28,
                                    lineHeight: 1,
                                }}>
                                    {periodCount}
                                </Text>
                                <Text style={{
                                    color: textColor === "white" ? "rgba(255,255,255,0.9)" : "#9CA3AF",
                                    fontWeight: 600,
                                    fontSize: 11,
                                    marginTop: 2,
                                }}>
                                    条
                                </Text>
                            </div>
                        );

                        if (tooltipContent) {
                            return (
                                <Tooltip title={tooltipContent} placement="topRight">
                                    {commentDisplay}
                                </Tooltip>
                            );
                        }

                        return commentDisplay;
                    },
                    width: 150,
                    align: "center",
                },
                {
                    title: "等级",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const level = record.level ?? 1;
                        
                        // 弱化显示等级
                        return (
                            <div style={{
                                textAlign: "center" }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: "#6B7280",
                                }}>
                                    Lv.{level}
                                </Text>
                            </div>
                        );
                    },
                    width: 100,
                    align: "center",
                }
            ];
        }
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
            {/* 返回按钮 */}
            <Button
                type="text"
                icon={<HomeOutlined />}
                onClick={() => navigate('/community')}
                style={{
                    position: "absolute",
                    top: 24,
                    left: 24,
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
                maxWidth: 1200,
                margin: "0 auto",
                position: "relative",
                zIndex: 1
            }}>
                {/* 标题区域 */}
                <div style={{
                    textAlign: "center",
                    marginBottom: 32,
                    paddingTop: 16
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: "rgba(255, 255, 255, 0.95)",
                        padding: "16px 32px",
                        borderRadius: 20,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                        marginBottom: 16,
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        animation: "pulse 2s infinite"
                    }}>
                        <TrophyOutlined style={{
                            fontSize: 28,
                            color: "#F59E0B",
                            filter: "drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))"
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
                            社区排行榜
                        </Title>
                        <FireOutlined style={{
                            fontSize: 28,
                            color: "#EF4444",
                            filter: "drop-shadow(0 2px 4px rgba(239, 68, 68, 0.3))"
                        }} />
                    </div>

                    <Text type="secondary" style={{
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: 15,
                        maxWidth: 600,
                        margin: "0 auto",
                        display: "block"
                    }}>
                        展示社区最受欢迎的内容和活跃用户，每周更新榜单数据
                    </Text>
                </div>

                {/* 标签页 */}
                <div 
                  style={{
                      display: "flex",
                      gap: 16,
                      justifyContent: "center",
                      marginBottom: 32,
                      flexWrap: "wrap"
                  }}
                  className="leaderboard-tabs"
                >
                    {tabs.map(tab => (
                        <div
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            style={{
                                background: activeTab === tab.key
                                    ? "white"
                                    : "rgba(255, 255, 255, 0.9)",
                                padding: "16px 24px",
                                borderRadius: 16,
                                cursor: "pointer",
                                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                minWidth: 180,
                                justifyContent: "center",
                                boxShadow: activeTab === tab.key
                                    ? "0 12px 40px rgba(0,0,0,0.2)"
                                    : "0 4px 16px rgba(0,0,0,0.1)",
                                border: activeTab === tab.key
                                    ? "2px solid #667eea"
                                    : "2px solid transparent",
                                transform: activeTab === tab.key ? "translateY(-4px)" : "none",
                                flexDirection: "column",
                                textAlign: "center",
                                position: "relative",
                                overflow: "hidden",
                                opacity: tabTransitioning ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.key) {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.key) {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                                }
                            }}
                        >
                            {/* 悬浮波纹效果 */}
                            <div style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
                                opacity: activeTab === tab.key ? 1 : 0,
                                transition: "opacity 0.3s ease",
                                pointerEvents: "none"
                            }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    fontSize: 20,
                                    color: activeTab === tab.key ? "#667eea" : "#6B7280"
                                }}>
                                    {tab.icon}
                                </div>
                                <span style={{
                                    fontWeight: 600,
                                    fontSize: 16,
                                    color: activeTab === tab.key ? "#1F2937" : "#6B7280"
                                }}>
                  {tab.label}
                </span>
                            </div>
                            <div style={{
                                fontSize: 12,
                                color: activeTab === tab.key ? "#6B7280" : "#9CA3AF",
                                marginTop: 4
                            }}>
                                {tab.description}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 排行榜卡片 */}
                <Card
                    loading={loading}
                    style={{
                        borderRadius: 24,
                        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                        border: "none",
                        background: "white",
                        overflow: "hidden",
                        position: "relative"
                    }}
                    styles={{ body: { padding: 0 } }}
                >
                    {/* 表头装饰 */}
                    <div style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        padding: "24px 32px",
                        color: "white"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12
                        }}>
                            <div style={{
                                width: 8,
                                height: 32,
                                background: "white",
                                borderRadius: 4
                            }} />
                            <div style={{ flex: 1 }}>
                                <Title level={4} style={{
                                    margin: 0,
                                    color: "white",
                                    fontWeight: 600
                                }}>
                                    {tabs.find(t => t.key === activeTab)?.label} 前10名
                                </Title>
                                <div style={{
                                    fontSize: 13,
                                    opacity: 0.9,
                                    marginTop: 4
                                }}>
                                    {tabs.find(t => t.key === activeTab)?.description}
                                </div>
                            </div>
                            
                            {/* 时间筛选 - 仅热门内容榜显示，移至头部栏中间 */}
                            {activeTab === "posts" && (
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                }}>
                                    <Radio.Group 
                                        value={timeRange} 
                                        onChange={(e) => setTimeRange(e.target.value)}
                                        buttonStyle="solid"
                                        style={{
                                            background: "rgba(255, 255, 255, 0.15)",
                                            borderRadius: "8px",
                                            padding: "2px",
                                        }}
                                    >
                                        <Radio.Button value="today" style={{
                                            background: "transparent",
                                            border: "none",
                                            color: timeRange === "today" ? "#1F2937" : "rgba(255, 255, 255, 0.85)",
                                            fontWeight: 500,
                                            borderRadius: "6px",
                                        }}>
                                            今日
                                        </Radio.Button>
                                        <Radio.Button value="week" style={{
                                            background: "transparent",
                                            border: "none",
                                            borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
                                            color: timeRange === "week" ? "#1F2937" : "rgba(255, 255, 255, 0.85)",
                                            fontWeight: 500,
                                            borderRadius: "6px",
                                        }}>
                                            本周
                                        </Radio.Button>
                                        <Radio.Button value="all" style={{
                                            background: "transparent",
                                            border: "none",
                                            borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
                                            color: timeRange === "all" ? "#1F2937" : "rgba(255, 255, 255, 0.85)",
                                            fontWeight: 500,
                                            borderRadius: "6px",
                                        }}>
                                            全部
                                        </Radio.Button>
                                    </Radio.Group>
                                </div>
                            )}
                            
                            {/* 评论数筛选 - 仅评论之星榜显示 */}
                            {activeTab === "comments" && (
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                }}>
                                    <Radio.Group 
                                        value={commentPeriod} 
                                        onChange={(e) => setCommentPeriod(e.target.value)}
                                        buttonStyle="solid"
                                        style={{
                                            background: "rgba(255, 255, 255, 0.15)",
                                            borderRadius: "8px",
                                            padding: "2px",
                                        }}
                                    >
                                        <Radio.Button value="7days" style={{
                                            background: "transparent",
                                            border: "none",
                                            color: commentPeriod === "7days" ? "#1F2937" : "rgba(255, 255, 255, 0.85)",
                                            fontWeight: 500,
                                            borderRadius: "6px",
                                        }}>
                                            近7天
                                        </Radio.Button>
                                        <Radio.Button value="all" style={{
                                            background: "transparent",
                                            border: "none",
                                            borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
                                            color: commentPeriod === "all" ? "#1F2937" : "rgba(255, 255, 255, 0.85)",
                                            fontWeight: 500,
                                            borderRadius: "6px",
                                        }}>
                                            全部
                                        </Radio.Button>
                                    </Radio.Group>
                                </div>
                            )}
                            
                            <div style={{
                                marginLeft: "auto",
                                background: "rgba(255, 255, 255, 0.2)",
                                padding: "6px 16px",
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: 6
                            }}>
                                <span>🔄</span>
                                <span>实时更新</span>
                            </div>
                        </div>
                    </div>

                    <Table
                        rowKey="key"
                        dataSource={data}
                        pagination={false}
                        columns={getColumns()}
                        style={{ fontSize: 14 }}
                        rowClassName={(_, index) => {
                            if (index < 3) return "leaderboard-top-row";
                            return "";
                        }}
                        components={{
                            Header: {
                                cell: (props) => (
                                    <th
                                        {...props}
                                        style={{
                                            background: "#F9FAFB",
                                            color: "#374151",
                                            fontWeight: 600,
                                            fontSize: 14,
                                            padding: "16px 24px",
                                            borderBottom: "2px solid #E5E7EB"
                                        }}
                                    />
                                ),
                            },
                            Body: {
                                row: (props) => (
                                    <tr
                                        {...props}
                                        style={{
                                            transition: "all 0.3s ease"
                                        }}
                                    />
                                ),
                            },
                        }}
                        onRow={(_, index) => ({
                            style: {
                                borderBottom: "1px solid #F3F4F6",
                                transition: "background 0.2s ease, transform 0.2s ease",
                            },
                            onMouseEnter: (e) => {
                                if (index !== undefined && index < 3) {
                                    e.currentTarget.style.background = "linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.04) 100%)";
                                } else {
                                    e.currentTarget.style.background = "#F9FAFB";
                                }
                                e.currentTarget.style.transform = "translateX(4px)";
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.background = "";
                                e.currentTarget.style.transform = "none";
                            },
                        })}
                    />

                    {/* 底部信息 */}
                    <div style={{
                        padding: "16px 32px",
                        background: "#F9FAFB",
                        borderTop: "1px solid #E5E7EB",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                        color: "#6B7280",
                        flexWrap: "wrap",
                        gap: 12
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span>🏆</span>
                            <span>仅展示前10名，完整榜单请关注每周更新</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span>📅</span>
                            <span>{new Date().toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
                    </div>
                </Card>

                {/* 说明文字 */}
                <div style={{
                    textAlign: "center",
                    marginTop: 24,
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: 14,
                    background: "rgba(255, 255, 255, 0.1)",
                    padding: "16px",
                    borderRadius: 12,
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)"
                }}>
                    <p style={{ margin: 0 }}>💡 <strong>上榜前10名不仅带来荣誉，还能获得更多社区曝光机会！</strong></p>
                    <p style={{ margin: "8px 0 0 0", fontSize: 13, opacity: 0.8 }}>
                        {activeTab === "posts"
                            ? "热门内容根据浏览量×0.5 + 点赞数×2 + 评论数综合计算，仅展示前10名"
                            : activeTab === "comments"
                                ? "评论之星根据用户发布的评论数量进行排名，仅展示前10名"
                                : activeTab === "weekly_score"
                                    ? "本周得分榜统计每周一00:00至周日23:59内通过做题获得的总积分，每周一重置"
                                    : activeTab === "accuracy"
                                        ? "正确率榜仅统计累计做题数超过50道的用户，按正确率降序排列"
                                        : "社区达人根据用户在社区积累的总积分进行排名，仅展示前10名"}
                    </p>
                </div>

                {/* 自定义样式 */}
                <style>
                    {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .leaderboard-top-row td {
            background: linear-gradient(90deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.02) 100%) !important;
            animation: fadeInUp 0.5s ease-out;
          }
          
          .ant-table-tbody > tr > td {
            padding: 20px 24px !important;
            border-bottom: 1px solid #F3F4F6;
            transition: all 0.3s ease;
          }
          
          .ant-table-tbody > tr:hover > td {
            background: #F9FAFB !important;
            transform: translateX(4px);
          }
          
          .leaderboard-top-row:hover > td {
            background: linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.04) 100%) !important;
          }
          
          .ant-card-loading .ant-card-body {
            padding: 48px;
          }
          
          /* 标签页切换动画 */
          .tab-transition {
            animation: fadeInUp 0.3s ease-out;
          }
        `}
                </style>
            </div>

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
    );
}