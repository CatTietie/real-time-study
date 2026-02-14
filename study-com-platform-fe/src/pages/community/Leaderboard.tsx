import { Card, Table, Typography, message, Badge, Button } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    HomeOutlined
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
    // 添加浏览量字段
    view_count?: number;
    // 评论数量字段
    commentCount?: number;
    // 作者信息字段
    author?: { nickname?: string; username?: string };
    author_nickname?: string;
    author_username?: string;
};

export default function Leaderboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<LeaderboardRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("posts"); // 改为标签页形式

    const loadData = useCallback(
        async () => {
            setLoading(true);
            try {
                // 根据活动标签映射对应的类型
                const typeMap = {
                    posts: "post_hot", // 修改为热门内容（包含浏览量）
                    users: "total",
                    comments: "comment_count" // 修改为评论数量排行
                };

                const res = await fetchCommunityLeaderboardByType(typeMap[activeTab as keyof typeof typeMap]);
                const list = ((res?.data as LeaderboardRow[] | undefined) || []).map(
                    (item, index) => ({
                        ...item,
                        key: item.key ?? item.id ?? index,
                        // 确保作者信息有值 - 适配后端返回的字段名
                        author_nickname: item.user_nickname || item.author?.nickname || item.Post?.User?.nickname || item.nickname,
                        author_username: item.user_username || item.author?.username || item.Post?.User?.username || item.username,
                    }),
                );
                setData(list);
                
                // 添加加载完成提示
                if (list.length > 0) {
                    message.success(`已加载${list.length}条${tabs.find(t => t.key === activeTab)?.label}数据`);
                }
            } catch (err) {
                message.error(err instanceof Error ? err.message : "加载失败");
            } finally {
                setLoading(false);
            }
        },
        [activeTab],
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
        { key: "comments", label: "评论之星", icon: <MessageOutlined />, description: "根据评论数量排名" }
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
                    render: (_value: unknown, record: LeaderboardRow) => (
                        <div style={{ maxWidth: 400 }}>
                            <div style={{
                                fontWeight: 600,
                                color: "#1F2937",
                                marginBottom: 8,
                                fontSize: 15,
                                lineHeight: 1.4,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                            }}>
                                {record.title || record.Post?.title || "未命名内容"}
                            </div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                color: "#6B7280",
                                fontSize: 13,
                                flexWrap: "wrap"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <UserOutlined style={{ fontSize: 12 }} />
                                    <span style={{ fontWeight: 500 }}>
                    {record.author_nickname || record.author?.nickname || record.Post?.User?.nickname || record.nickname || "匿名用户"}
                  </span>
                                    <span style={{ color: "#9CA3AF" }}>
                    @{record.author_username || record.author?.username || record.Post?.User?.username || record.username || "anonymous"}
                  </span>
                                </div>
                            </div>
                        </div>
                    ),
                    ellipsis: { showTitle: true },
                },
                {
                    title: "互动数据",
                    render: (_value: unknown, record: LeaderboardRow) => (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <EyeOutlined style={{ color: "#6366F1", fontSize: 12 }} />
                                <Text style={{ color: "#374151", fontWeight: 500, minWidth: 40 }}>
                                    {record.view_count || record.Post?.viewCount || 0}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>浏览</Text>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <LikeOutlined style={{ color: "#EF4444", fontSize: 12 }} />
                                <Text style={{ color: "#374151", fontWeight: 500, minWidth: 40 }}>
                                    {record.like_count || 0}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>点赞</Text>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <MessageOutlined style={{ color: "#10B981", fontSize: 12 }} />
                                <Text style={{ color: "#374151", fontWeight: 500, minWidth: 40 }}>
                                    {record.comment_count || 0}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>评论</Text>
                            </div>
                        </div>
                    ),
                    width: 140,
                    align: "center",
                },
                {
                    title: "热度值",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const viewCount = record.view_count || record.Post?.viewCount || 0;
                        const likeCount = record.like_count || 0;
                        const commentCount = record.comment_count || 0;
                        // 综合计算热度值：浏览量 * 0.5 + 点赞 * 2 + 评论 * 1
                        const score = Math.round(viewCount * 0.5 + likeCount * 2 + commentCount);

                        const getHeatLevel = (score: number) => {
                            if (score > 500) return { color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5", label: "爆款" };
                            if (score > 200) return { color: "#F59E0B", bg: "#FEF3C7", border: "#FBBF24", label: "热门" };
                            if (score > 50) return { color: "#10B981", bg: "#D1FAE5", border: "#34D399", label: "活跃" };
                            return { color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB", label: "普通" };
                        };

                        const level = getHeatLevel(score);

                        return (
                            <div style={{
                                background: level.bg,
                                padding: "12px 8px",
                                borderRadius: 12,
                                border: `1px solid ${level.border}`,
                                textAlign: "center",
                                minWidth: 100
                            }}>
                                <Text style={{
                                    color: level.color,
                                    fontWeight: 700,
                                    fontSize: 20,
                                    display: "block",
                                    lineHeight: 1
                                }}>
                                    {score}
                                </Text>
                                <div style={{
                                    fontSize: 12,
                                    color: level.color,
                                    fontWeight: 600,
                                    marginTop: 4,
                                    background: "rgba(255, 255, 255, 0.7)",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    display: "inline-block"
                                }}>
                                    {level.label}
                                </div>
                            </div>
                        );
                    },
                    width: 120,
                    align: "center",
                }
            ];
        } else if (activeTab === "users") {
            return [
                ...baseColumns,
                {
                    title: "用户信息",
                    render: (_value: unknown, record: LeaderboardRow) => (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: 18
                            }}>
                                {(record.nickname || record.user?.nickname || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{
                                    fontWeight: 600,
                                    color: "#1F2937",
                                    marginBottom: 2,
                                    fontSize: 15
                                }}>
                                    {record.nickname || record.user?.nickname || record.user_nickname || "匿名用户"}
                                </div>
                                <div style={{
                                    color: "#6B7280",
                                    fontSize: 13,
                                    background: "#F3F4F6",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    display: "inline-block"
                                }}>
                                    @{record.username || record.user?.username || record.user_username || "-"}
                                </div>
                            </div>
                        </div>
                    ),
                },
                {
                    title: "等级",
                    render: (_value: unknown, record: LeaderboardRow) => (
                        <div style={{
                            background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
                            color: "white",
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: 20,
                            margin: "0 auto",
                            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
                        }}>
                            Lv.{record.level ?? 1}
                        </div>
                    ),
                    width: 100,
                    align: "center",
                },
                {
                    title: "积分",
                    render: (_value: unknown, record: LeaderboardRow) => (
                        <div style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#10B981",
                            textShadow: "0 2px 4px rgba(16, 185, 129, 0.1)"
                        }}>
                            {record.points ?? record.user?.points ?? 0}
                        </div>
                    ),
                    width: 100,
                    align: "center",
                }
            ];
        } else { // comments - 评论之星
            return [
                ...baseColumns,
                {
                    title: "评论达人",
                    render: (_value: unknown, record: LeaderboardRow) => (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: 18
                            }}>
                                {(record.user?.nickname || record.nickname || record.user_nickname || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{
                                    fontWeight: 600,
                                    color: "#1F2937",
                                    marginBottom: 2,
                                    fontSize: 15
                                }}>
                                    {record.user?.nickname || record.nickname || record.user_nickname || "匿名用户"}
                                </div>
                                <div style={{
                                    color: "#6B7280",
                                    fontSize: 13
                                }}>
                                    @{record.user?.username || record.username || record.user_username || "-"}
                                </div>
                            </div>
                        </div>
                    ),
                },
                {
                    title: "评论数",
                    render: (_value: unknown, record: LeaderboardRow) => (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            background: "#E0F2FE",
                            padding: "12px 16px",
                            borderRadius: 12,
                            border: "1px solid #7DD3FC",
                            minWidth: 120
                        }}>
                            <MessageOutlined style={{ color: "#0EA5E9", fontSize: 16 }} />
                            <Text style={{
                                color: "#0369A1",
                                fontWeight: 700,
                                fontSize: 24
                            }}>
                                {record.commentCount || record.comment_count || 0}
                            </Text>
                            <Text style={{
                                color: "#0EA5E9",
                                fontWeight: 600,
                                fontSize: 12
                            }}>
                                条
                            </Text>
                        </div>
                    ),
                    width: 140,
                    align: "center",
                },
                {
                    title: "达人等级",
                    render: (_value: unknown, record: LeaderboardRow) => {
                        const commentCount = record.commentCount || record.comment_count || 0;
                        let badge = "💬 新秀";
                        let color = "#10B981";
                        let bgColor = "#D1FAE5";

                        if (commentCount > 100) {
                            badge = "🏆 评论家";
                            color = "#8B5CF6";
                            bgColor = "#EDE9FE";
                        } else if (commentCount > 50) {
                            badge = "⭐ 活跃";
                            color = "#F59E0B";
                            bgColor = "#FEF3C7";
                        } else if (commentCount > 20) {
                            badge = "💬 积极";
                            color = "#0EA5E9";
                            bgColor = "#E0F2FE";
                        }

                        return (
                            <div style={{
                                background: bgColor,
                                padding: "8px 16px",
                                borderRadius: 20,
                                border: `2px solid ${color}`,
                                color: color,
                                fontWeight: 700,
                                fontSize: 13,
                                display: "inline-block"
                            }}>
                                {badge}
                            </div>
                        );
                    },
                    width: 120,
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
                            onClick={() => setActiveTab(tab.key)}
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
                                overflow: "hidden"
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
                            <div>
                                <Title level={4} style={{
                                    margin: 0,
                                    color: "white",
                                    fontWeight: 600
                                }}>
                                    {tabs.find(t => t.key === activeTab)?.label} TOP 10
                                </Title>
                                <div style={{
                                    fontSize: 13,
                                    opacity: 0.9,
                                    marginTop: 4
                                }}>
                                    {tabs.find(t => t.key === activeTab)?.description}
                                </div>
                            </div>
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
                            <span>🎯</span>
                            <span>榜单每周一更新，数据截止至昨日24:00</span>
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
                    <p style={{ margin: 0 }}>💡 <strong>上榜不仅带来荣誉，还能获得更多社区曝光机会！</strong></p>
                    <p style={{ margin: "8px 0 0 0", fontSize: 13, opacity: 0.8 }}>
                        {activeTab === "posts"
                            ? "热门内容根据浏览量×0.5 + 点赞数×2 + 评论数综合计算"
                            : activeTab === "comments"
                                ? "评论之星根据用户发布的评论数量进行排名"
                                : "社区达人根据用户在社区积累的总积分进行排名"}
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