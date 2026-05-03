import {
    Card,
    Col,
    Row,
    Statistic,
    Typography,
    message,
    Tooltip,
    Tag,
    Progress,
    Space,
    Button,
} from "antd";
import {
    TrophyOutlined,
    EditOutlined,
    MessageOutlined,
    TeamOutlined,
    FireOutlined,
    CalendarOutlined,
    RocketOutlined,
    RiseOutlined,
    StarOutlined,
    CrownOutlined,
    LikeOutlined,
    HeartOutlined,
    BookOutlined,
    HomeOutlined,
    LockOutlined,
    UnlockOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBadgesOverview } from "../../services/communityPublic";
import type {
    BadgeProgress,
    BadgeCategoryGroup,
    BadgesOverviewSummary,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Text } = Typography;

const getBadgeIcon = (iconName: string, isUnlocked: boolean): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
        EditOutlined: <EditOutlined />,
        MessageOutlined: <MessageOutlined />,
        TeamOutlined: <TeamOutlined />,
        FireOutlined: <FireOutlined />,
        CalendarOutlined: <CalendarOutlined />,
        RocketOutlined: <RocketOutlined />,
        RiseOutlined: <RiseOutlined />,
        StarOutlined: <StarOutlined />,
        CrownOutlined: <CrownOutlined />,
        LikeOutlined: <LikeOutlined />,
        HeartOutlined: <HeartOutlined />,
        BookOutlined: <BookOutlined />,
    };
    return iconMap[iconName] || <TrophyOutlined />;
};

const getCategoryIcon = (category: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
        learning: <BookOutlined />,
        community: <TeamOutlined />,
        challenge: <TrophyOutlined />,
    };
    return iconMap[category] || <TrophyOutlined />;
};

const getCategoryGradient = (category: string): string => {
    const gradientMap: Record<string, string> = {
        learning: "linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)",
        community: "linear-gradient(135deg, #52c41a 0%, #73d13d 100%)",
        challenge: "linear-gradient(135deg, #722ed1 0%, #9254de 100%)",
    };
    return gradientMap[category] || "linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)";
};

const getCategoryBg = (category: string): string => {
    const bgMap: Record<string, string> = {
        learning: "#e6f7ff",
        community: "#f6ffed",
        challenge: "#f9f0ff",
    };
    return bgMap[category] || "#e6f7ff";
};

const CircularProgress = ({ percent, size = 200, strokeWidth = 12 }: { percent: number; size?: number; strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="50%" stopColor="#764ba2" />
                    <stop offset="100%" stopColor="#f093fb" />
                </linearGradient>
                <filter id="shadow">
                    <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#667eea" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#f0f0f0"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                filter="url(#shadow)"
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
        </svg>
    );
};

export default function BadgeCenter() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<BadgesOverviewSummary | null>(null);
    const [categories, setCategories] = useState<BadgeCategoryGroup[]>([]);
    const [animatePercent, setAnimatePercent] = useState(0);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchBadgesOverview();
            if (res?.data) {
                setSummary(res.data.summary);
                setCategories(res.data.categories);
                setTimeout(() => setAnimatePercent(res.data.summary.completionRate), 300);
            }
        } catch (err) {
            message.error(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const renderHeader = () => {
        if (!summary) return null;

        return (
            <Card
                loading={loading}
                style={{
                    marginBottom: 24,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                    borderRadius: 20,
                    border: "none",
                    boxShadow: "0 12px 40px rgba(102, 126, 234, 0.35)",
                }}
                bodyStyle={{ padding: "32px 40px" }}
            >
                <Row gutter={48} align="middle">
                    <Col xs={24} md={16}>
                        <div style={{ color: "white" }}>
                            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                                <div>
                                    <Text
                                        style={{
                                            color: "rgba(255,255,255,0.8)",
                                            fontSize: 14,
                                        }}
                                    >
                                        成就中心
                                    </Text>
                                    <Title
                                        level={2}
                                        style={{
                                            color: "white",
                                            margin: "8px 0 0 0",
                                            fontWeight: 800,
                                            fontSize: 36,
                                        }}
                                    >
                                        我的成就徽章
                                    </Title>
                                </div>

                                <Row gutter={32}>
                                    <Col>
                                        <Statistic
                                            title={
                                                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                                                    已解锁
                                                </Text>
                                            }
                                            value={summary.unlockedCount}
                                            suffix={<Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>/{summary.totalCount}</Text>}
                                            valueStyle={{ color: "white", fontWeight: "bold", fontSize: 48 }}
                                        />
                                    </Col>
                                    <Col>
                                        <div
                                            style={{
                                                padding: "12px 24px",
                                                background: "rgba(255,255,255,0.15)",
                                                borderRadius: 12,
                                            }}
                                        >
                                            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                                                完成率
                                            </Text>
                                            <div
                                                style={{
                                                    color: "white",
                                                    fontSize: 36,
                                                    fontWeight: "bold",
                                                    marginTop: 4,
                                                }}
                                            >
                                                {summary.completionRate}%
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                <Button
                                    type="default"
                                    size="large"
                                    icon={<HomeOutlined />}
                                    onClick={() => navigate("/community")}
                                    style={{
                                        background: "rgba(255,255,255,0.2)",
                                        border: "none",
                                        color: "white",
                                        fontWeight: 500,
                                        marginTop: 8,
                                    }}
                                >
                                    返回社区首页
                                </Button>
                            </Space>
                        </div>
                    </Col>

                    <Col xs={24} md={8} style={{ textAlign: "center" }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <CircularProgress percent={animatePercent} size={200} strokeWidth={14} />
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: 200,
                                    height: 200,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Text style={{ color: "white", fontSize: 14, opacity: 0.8 }}>
                                    完成率
                                </Text>
                                <Text
                                    style={{
                                        color: "white",
                                        fontSize: 42,
                                        fontWeight: "bold",
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {animatePercent}%
                                </Text>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>
        );
    };

    const renderBadgeCard = (badge: BadgeProgress, category: string) => {
        return (
            <Tooltip
                key={badge.id}
                title={
                    <div style={{ padding: 8, maxWidth: 280 }}>
                        <div style={{ fontWeight: "bold", marginBottom: 6, fontSize: 14 }}>
                            {badge.name}
                        </div>
                        <div style={{ color: "#999", marginBottom: 8, fontSize: 12 }}>
                            {badge.description}
                        </div>
                        {badge.isUnlocked ? (
                            <Tag color="green">
                                <UnlockOutlined /> 已解锁
                            </Tag>
                        ) : (
                            <>
                                <Tag color="orange">{badge.requirement}</Tag>
                                <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                                    进度: {badge.current}/{badge.threshold} ({badge.progress}%)
                                </div>
                            </>
                        )}
                    </div>
                }
            >
                <Card
                    size="small"
                    hoverable
                    style={{
                        background: badge.isUnlocked ? "white" : "#fafafa",
                        opacity: badge.isUnlocked ? 1 : 0.7,
                        border: badge.isUnlocked
                            ? `2px solid ${category === "learning" ? "#1890ff" : category === "community" ? "#52c41a" : "#722ed1"}`
                            : "2px solid #e8e8e8",
                        borderRadius: 16,
                        transition: "all 0.3s ease",
                    }}
                    bodyStyle={{ padding: "20px 16px" }}
                >
                    <div style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                margin: "0 auto 12px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: badge.isUnlocked
                                    ? getCategoryGradient(category)
                                    : "#e8e8e8",
                                boxShadow: badge.isUnlocked
                                    ? `0 4px 16px ${category === "learning" ? "rgba(24, 144, 255, 0.3)" : category === "community" ? "rgba(82, 196, 26, 0.3)" : "rgba(114, 46, 209, 0.3)"}`
                                    : "none",
                                fontSize: 32,
                                color: badge.isUnlocked ? "white" : "#aaa",
                                transition: "all 0.3s ease",
                            }}
                        >
                            {getBadgeIcon(badge.icon, badge.isUnlocked)}
                        </div>

                        <div
                            style={{
                                fontWeight: "bold",
                                marginBottom: 6,
                                fontSize: 14,
                                color: badge.isUnlocked ? "#333" : "#999",
                            }}
                        >
                            {badge.name}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 6,
                                marginBottom: 12,
                            }}
                        >
                            {badge.isUnlocked ? (
                                <Tag color="green" icon={<UnlockOutlined />}>
                                    已解锁
                                </Tag>
                            ) : (
                                <Tag color="default" icon={<LockOutlined />}>
                                    未解锁
                                </Tag>
                            )}
                        </div>

                        {!badge.isUnlocked && (
                            <div>
                                <Progress
                                    percent={badge.progress}
                                    size="small"
                                    strokeColor={
                                        badge.progress >= 80
                                            ? "#52c41a"
                                            : badge.progress >= 50
                                            ? "#1890ff"
                                            : "#faad14"
                                    }
                                    trailColor="#f0f0f0"
                                    format={() => `${badge.current}/${badge.threshold}`}
                                />
                            </div>
                        )}

                        {badge.isUnlocked && (
                            <div
                                style={{
                                    color: "#52c41a",
                                    fontSize: 12,
                                    fontWeight: 500,
                                }}
                            >
                                🎉 恭喜达成！
                            </div>
                        )}
                    </div>
                </Card>
            </Tooltip>
        );
    };

    const renderCategorySection = (category: BadgeCategoryGroup) => {
        if (category.badges.length === 0) return null;

        return (
            <Card
                key={category.category}
                loading={loading}
                style={{ marginBottom: 24, borderRadius: 16 }}
                title={
                    <Space size={12}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: getCategoryGradient(category.category),
                                color: "white",
                                fontSize: 20,
                            }}
                        >
                            {getCategoryIcon(category.category)}
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 16 }}>
                                {category.categoryName}
                            </Text>
                            <br />
                            <Tag color={category.unlockedCount === category.totalCount ? "success" : "blue"}>
                                {category.unlockedCount}/{category.totalCount} 已解锁
                            </Tag>
                        </div>
                    </Space>
                }
                headStyle={{
                    background: getCategoryBg(category.category),
                    borderBottom: "none",
                    borderRadius: "16px 16px 0 0",
                    padding: "16px 24px",
                }}
                bodyStyle={{ padding: "24px" }}
            >
                <Row gutter={[16, 16]}>
                    {category.badges.map((badge) => (
                        <Col xs={12} sm={8} md={6} lg={4} key={badge.id}>
                            {renderBadgeCard(badge, category.category)}
                        </Col>
                    ))}
                </Row>

                {category.badges.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
                        <LockOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                        <div>暂无该分类的徽章</div>
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div className="page-container" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
            {renderHeader()}

            {categories.map(renderCategorySection)}

            <CommunityFooter />
        </div>
    );
}
