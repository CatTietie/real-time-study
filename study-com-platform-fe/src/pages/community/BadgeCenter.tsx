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
    Radio,
    Divider,
    Empty,
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
    ThunderboltOutlined,
    BulbOutlined,
    FilterOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBadgesOverview, BADGE_RARITY_CONFIG } from "../../services/communityPublic";
import type {
    BadgeProgress,
    BadgeCategoryGroup,
    BadgesOverviewSummary,
    BadgeRarity,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Text } = Typography;

const getBadgeRedirectPath = (badgeId: string): string => {
    const publishBadges = [
        "first_post",
        "regular_poster",
        "content_master",
        "first_like_received",
        "popular_author",
    ];

    if (publishBadges.includes(badgeId)) {
        return "/community/publish";
    }

    return "/community";
};

const getBadgeIcon = (iconName: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
        EditOutlined: <EditOutlined />,
        EditFilled: <EditOutlined />,
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
        ThunderboltOutlined: <ThunderboltOutlined />,
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

const getRarityGradient = (rarity: BadgeRarity, isUnlocked: boolean): string => {
    if (!isUnlocked) {
        return "linear-gradient(135deg, #d9d9d9 0%, #bfbfbf 100%)";
    }
    const gradientMap: Record<BadgeRarity, string> = {
        common: "linear-gradient(135deg, #8c8c8c 0%, #bfbfbf 100%)",
        rare: "linear-gradient(135deg, #1890ff 0%, #69c0ff 100%)",
        epic: "linear-gradient(135deg, #722ed1 0%, #b37feb 100%)",
    };
    return gradientMap[rarity];
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

type FilterType = "all" | "unlocked" | "locked";

export default function BadgeCenter() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<BadgesOverviewSummary | null>(null);
    const [categories, setCategories] = useState<BadgeCategoryGroup[]>([]);
    const [recommendedBadges, setRecommendedBadges] = useState<BadgeProgress[]>([]);
    const [animatePercent, setAnimatePercent] = useState(0);
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [newlyUnlockedIds, setNewlyUnlockedIds] = useState<Set<string>>(new Set());
    const [justUnlockedBadges, setJustUnlockedBadges] = useState<BadgeProgress[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchBadgesOverview();
            if (res?.data) {
                setSummary(res.data.summary);
                setCategories(res.data.categories);
                setRecommendedBadges(res.data.recommendedBadges || []);
                setTimeout(() => setAnimatePercent(res.data.summary.completionRate), 300);

                const justUnlocked = res.data.justUnlocked || [];
                if (justUnlocked.length > 0) {
                    setJustUnlockedBadges(justUnlocked);
                    const newIds = new Set(justUnlocked.map(b => b.id));
                    setNewlyUnlockedIds(newIds);

                    justUnlocked.forEach((badge, index) => {
                        setTimeout(() => {
                            message.config({
                                top: 100,
                            });
                            message.success({
                                content: (
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: getRarityGradient(badge.rarity, true),
                                                color: "white",
                                                fontSize: 20,
                                            }}
                                        >
                                            {getBadgeIcon(badge.icon)}
                                        </div>
                                        <div>
                                            <Text strong>🎉 新成就解锁！</Text>
                                            <br />
                                            <Text type="secondary">
                                                {badge.name} - {badge.description}
                                            </Text>
                                        </div>
                                    </div>
                                ),
                                duration: 5,
                                style: {
                                    marginTop: "10vh",
                                },
                            });
                        }, index * 500);
                    });

                    setTimeout(() => {
                        setNewlyUnlockedIds(new Set());
                        setJustUnlockedBadges([]);
                    }, 10000);
                }
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

    const filteredCategories = useMemo(() => {
        if (filterType === "all") return categories;

        return categories.map((cat) => ({
            ...cat,
            badges: cat.badges.filter((b) =>
                filterType === "unlocked" ? b.isUnlocked : !b.isUnlocked
            ),
        })).filter((cat) => cat.badges.length > 0);
    }, [categories, filterType]);

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

    const renderRecommendedSection = () => {
        if (recommendedBadges.length === 0) return null;

        const handleBadgeClick = (badgeId: string) => {
            const path = getBadgeRedirectPath(badgeId);
            navigate(path);
        };

        return (
            <Card
                loading={loading}
                style={{ marginBottom: 24, borderRadius: 16, border: "none", background: "linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)" }}
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
                                background: "linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)",
                                color: "white",
                                fontSize: 20,
                            }}
                        >
                            <ThunderboltOutlined />
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 16, color: "#fa8c16" }}>
                                推荐挑战
                            </Text>
                            <br />
                            <Text style={{ fontSize: 12, color: "#faad14" }}>
                                点击卡片即可前往完成挑战
                            </Text>
                        </div>
                    </Space>
                }
                headStyle={{ background: "transparent", borderBottom: "1px solid #ffd591", padding: "16px 24px" }}
                bodyStyle={{ padding: "20px 24px" }}
            >
                <Row gutter={[16, 16]}>
                    {recommendedBadges.map((badge, index) => (
                        <Col xs={24} sm={8} key={badge.id}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => handleBadgeClick(badge.id)}
                                style={{
                                    background: "white",
                                    borderRadius: 12,
                                    border: "2px solid #ffd591",
                                    boxShadow: "0 4px 12px rgba(250, 173, 20, 0.15)",
                                    cursor: "pointer",
                                    transition: "all 0.3s ease",
                                }}
                                bodyStyle={{ padding: "16px" }}
                            >
                                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: getRarityGradient(badge.rarity, badge.isUnlocked),
                                                color: "white",
                                                fontSize: 24,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {getBadgeIcon(badge.icon)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <Space>
                                                <Text strong style={{ fontSize: 14 }}>
                                                    {badge.name}
                                                </Text>
                                                <Tag
                                                    color={BADGE_RARITY_CONFIG[badge.rarity].color}
                                                    style={{ margin: 0 }}
                                                >
                                                    {BADGE_RARITY_CONFIG[badge.rarity].name}
                                                </Tag>
                                            </Space>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {badge.requirement}
                                                </Text>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#fff7e6",
                                                border: "2px solid #ffd591",
                                                color: "#fa8c16",
                                                fontWeight: "bold",
                                                fontSize: 14,
                                            }}
                                        >
                                            {index + 1}
                                        </div>
                                    </div>
                                    <Progress
                                        percent={badge.progress}
                                        size="small"
                                        strokeColor="#fa8c16"
                                        trailColor="#fff1e0"
                                        format={() => (
                                            <Text style={{ color: "#fa8c16", fontWeight: 500 }}>
                                                {badge.current}/{badge.threshold}
                                            </Text>
                                        )}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 6,
                                            color: "#fa8c16",
                                            fontSize: 12,
                                        }}
                                    >
                                        <BulbOutlined />
                                        <Text>还需 {badge.threshold - badge.current} 即可达成</Text>
                                        <Text type="secondary" style={{ marginLeft: 4 }}>
                                            点击前往 →
                                        </Text>
                                    </div>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card>
        );
    };

    const renderFilterSection = () => {
        return (
            <Card
                style={{ marginBottom: 24, borderRadius: 16, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                bodyStyle={{ padding: "16px 24px" }}
            >
                <Row align="middle" justify="space-between">
                    <Col>
                        <Space size={12}>
                            <FilterOutlined style={{ color: "#8c8c8c" }} />
                            <Text type="secondary">筛选：</Text>
                            <Radio.Group value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <Radio.Button value="all">全部</Radio.Button>
                                <Radio.Button value="unlocked">已解锁</Radio.Button>
                                <Radio.Button value="locked">未解锁</Radio.Button>
                            </Radio.Group>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <Tag color="default">普通</Tag>
                            <Tag color="blue">稀有</Tag>
                            <Tag color="purple">史诗</Tag>
                        </Space>
                    </Col>
                </Row>
            </Card>
        );
    };

    const renderBadgeCard = (badge: BadgeProgress, category: string, isNewlyUnlocked: boolean = false) => {
        const rarityConfig = BADGE_RARITY_CONFIG[badge.rarity];

        return (
            <Tooltip
                key={badge.id}
                title={
                    <div style={{ padding: 8, maxWidth: 280 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 14 }}>
                                {badge.name}
                            </Text>
                            <Tag color={rarityConfig.color}>
                                {rarityConfig.name}
                            </Tag>
                            {isNewlyUnlocked && (
                                <Tag color="gold">
                                    ✨ 新解锁
                                </Tag>
                            )}
                        </div>
                        <div style={{ color: "#999", marginBottom: 8, fontSize: 12 }}>
                            {badge.description}
                        </div>
                        {badge.isUnlocked ? (
                            <Tag color="green" icon={<UnlockOutlined />}>
                                已解锁
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
                        opacity: badge.isUnlocked ? 1 : 0.8,
                        border: isNewlyUnlocked
                            ? `3px solid #faad14`
                            : badge.isUnlocked
                            ? `2px solid ${rarityConfig.color}`
                            : "2px solid #e8e8e8",
                        borderRadius: 16,
                        transition: "all 0.3s ease",
                        boxShadow: isNewlyUnlocked
                            ? "0 0 20px rgba(250, 173, 20, 0.4)"
                            : badge.isUnlocked
                            ? `0 2px 8px ${rarityConfig.color}22`
                            : "none",
                        transform: isNewlyUnlocked ? "scale(1.05)" : "scale(1)",
                    }}
                    bodyStyle={{ padding: "20px 16px" }}
                >
                    <div style={{ textAlign: "center" }}>
                        {isNewlyUnlocked && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: -5,
                                    right: -5,
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #faad14, #fadb14)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: 14,
                                    fontWeight: "bold",
                                    boxShadow: "0 2px 8px rgba(250, 173, 20, 0.5)",
                                }}
                            >
                                ✨
                            </div>
                        )}
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                margin: "0 auto 12px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: getRarityGradient(badge.rarity, badge.isUnlocked),
                                boxShadow: isNewlyUnlocked
                                    ? `0 0 20px ${rarityConfig.color}88`
                                    : badge.isUnlocked
                                    ? `0 4px 16px ${rarityConfig.color}33`
                                    : "none",
                                fontSize: 32,
                                color: badge.isUnlocked ? "white" : "#aaa",
                                transition: "all 0.3s ease",
                            }}
                        >
                            {getBadgeIcon(badge.icon)}
                        </div>

                        <div
                            style={{
                                fontWeight: "bold",
                                marginBottom: 4,
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
                            <Tag
                                color={badge.isUnlocked ? rarityConfig.color : "default"}
                                style={{ fontSize: 11 }}
                            >
                                {rarityConfig.name}
                            </Tag>
                            {badge.isUnlocked ? (
                                <Tag color="green" icon={<UnlockOutlined />} style={{ fontSize: 11 }}>
                                    已解锁
                                </Tag>
                            ) : (
                                <Tag color="default" icon={<LockOutlined />} style={{ fontSize: 11 }}>
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

        const sortedBadges = [...category.badges].sort((a, b) => {
            const aIsNew = newlyUnlockedIds.has(a.id);
            const bIsNew = newlyUnlockedIds.has(b.id);
            if (aIsNew !== bIsNew) {
                return aIsNew ? -1 : 1;
            }
            return a.sortOrder - b.sortOrder;
        });

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
                    {sortedBadges.map((badge) => (
                        <Col xs={12} sm={8} md={6} lg={4} xl={3} key={badge.id}>
                            {renderBadgeCard(badge, category.category, newlyUnlockedIds.has(badge.id))}
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
        <div className="page-container" style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>
            {renderHeader()}

            {recommendedBadges.length > 0 && renderRecommendedSection()}

            {renderFilterSection()}

            {filteredCategories.length > 0 ? (
                filteredCategories.map(renderCategorySection)
            ) : (
                <Card style={{ borderRadius: 16, textAlign: "center", padding: "40px 0" }}>
                    <Empty
                        description={
                            filterType === "unlocked"
                                ? "暂无已解锁的徽章，继续努力！"
                                : filterType === "locked"
                                ? "所有徽章已解锁，太棒了！"
                                : "暂无徽章"
                        }
                    />
                </Card>
            )}

            <Divider style={{ margin: "32px 0 16px 0" }} />

            <CommunityFooter />
        </div>
    );
}
