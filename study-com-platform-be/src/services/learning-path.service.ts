import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import User from "../models/user.model";
import UserStats from "../models/user-stats.model";
import PointsLog from "../models/points-log.model";
import LearningPath from "../models/learning-path.model";
import PathNode from "../models/path-node.model";
import PathEdge from "../models/path-edge.model";
import PathNodeResource from "../models/path-node-resource.model";
import UserLearningPath from "../models/user-learning-path.model";
import UserNodeProgress from "../models/user-node-progress.model";
import { UnlockCondition } from "../models/path-node.model";
import { getLoginStreak } from "./learning-stats.service";

export interface BehaviorMetrics {
  check_in_count: number;
  points: number;
  exercise_count: number;
  correct_rate: number;
  study_duration: number;
  login_streak: number;
}

export interface ConditionProgress {
  type: string;
  operator: string;
  required: number;
  current: number;
  met: boolean;
}

export interface PrerequisiteStatus {
  node_id: number;
  title: string;
  is_unlocked: boolean;
}

export interface StudentNodeData {
  id: number;
  title: string;
  description: string | null;
  position_x: number;
  position_y: number;
  icon: string;
  color: string;
  node_type: string;
  is_unlocked: boolean;
  unlocked_at: Date | null;
  unlock_conditions: UnlockCondition[] | null;
  condition_progress: ConditionProgress[];
  prerequisites_met: boolean;
  prerequisites: PrerequisiteStatus[];
}

export async function getUserBehaviorMetrics(userId: number): Promise<BehaviorMetrics> {
  const [user, stats, checkInCount, streakData] = await Promise.all([
    User.findByPk(userId, { attributes: ["points", "study_duration"] }),
    UserStats.findOne({ where: { user_id: userId }, attributes: ["total_questions", "accuracy_rate"] }),
    PointsLog.count({ where: { user_id: userId, reason: "community_daily_login" } }),
    getLoginStreak(userId),
  ]);

  return {
    check_in_count: checkInCount,
    points: user?.getDataValue("points") || 0,
    exercise_count: stats?.getDataValue("total_questions") || 0,
    correct_rate: stats?.getDataValue("accuracy_rate") || 0,
    study_duration: user?.getDataValue("study_duration") || 0,
    login_streak: streakData.current,
  };
}

export function evaluateUnlockConditions(
  conditions: UnlockCondition[] | null,
  metrics: BehaviorMetrics
): { unlocked: boolean; progress: ConditionProgress[] } {
  if (!conditions || conditions.length === 0) {
    return { unlocked: true, progress: [] };
  }

  const progress: ConditionProgress[] = conditions.map((cond) => {
    const current = metrics[cond.type] ?? 0;
    let met = false;
    switch (cond.operator) {
      case ">=":
        met = current >= cond.value;
        break;
      case ">":
        met = current > cond.value;
        break;
      case "=":
        met = current === cond.value;
        break;
    }
    return {
      type: cond.type,
      operator: cond.operator,
      required: cond.value,
      current,
      met,
    };
  });

  const unlocked = progress.every((p) => p.met);
  return { unlocked, progress };
}

export async function getStudentSkillTree(userId: number, pathId: number) {
  const path = await LearningPath.findByPk(pathId, { attributes: ["id", "name", "description", "cover_image"] });
  if (!path) throw new Error("学习路径不存在");

  const [nodes, edges, enrollment, metrics] = await Promise.all([
    PathNode.findAll({ where: { path_id: pathId }, order: [["sort_order", "ASC"]] }),
    PathEdge.findAll({ where: { path_id: pathId } }),
    UserLearningPath.findOne({ where: { user_id: userId, path_id: pathId } }),
    getUserBehaviorMetrics(userId),
  ]);

  const existingProgress = await UserNodeProgress.findAll({
    where: { user_id: userId, node_id: nodes.map((n) => n.id) },
  });
  const progressMap = new Map(existingProgress.map((p) => [p.node_id, p]));

  // 构建前置关系图：parentMap[nodeId] = 该节点的所有前置节点 ID 列表
  const parentMap = new Map<number, number[]>();
  for (const edge of edges) {
    const parents = parentMap.get(edge.target_node_id) || [];
    parents.push(edge.source_node_id);
    parentMap.set(edge.target_node_id, parents);
  }

  // 构建后继关系图：childMap[nodeId] = 该节点的所有后继节点 ID 列表
  const childMap = new Map<number, number[]>();
  for (const edge of edges) {
    const children = childMap.get(edge.source_node_id) || [];
    children.push(edge.target_node_id);
    childMap.set(edge.source_node_id, children);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const unlockState = new Map<number, boolean>();

  // 使用 Kahn 拓扑排序，按照依赖顺序逐层评估节点解锁状态
  const inDegree = new Map<number, number>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.target_node_id, (inDegree.get(edge.target_node_id) || 0) + 1);
  }

  const queue: number[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId)!;

    const isUnlocked = evaluateNodeUnlock(node, nodeId, parentMap, unlockState, progressMap, metrics);
    unlockState.set(nodeId, isUnlocked);

    // 持久化新解锁的节点
    if (isUnlocked) {
      const existing = progressMap.get(nodeId);
      if (!existing || existing.is_unlocked === 0) {
        await UserNodeProgress.upsert({
          user_id: userId,
          node_id: nodeId,
          is_unlocked: 1,
          unlocked_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    // 将后继节点入度减 1，入度归零时加入队列
    const children = childMap.get(nodeId) || [];
    for (const childId of children) {
      const newDeg = (inDegree.get(childId) || 1) - 1;
      inDegree.set(childId, newDeg);
      if (newDeg === 0) queue.push(childId);
    }
  }

  // 处理环形依赖中不可达的节点——永远不解锁
  for (const node of nodes) {
    if (!unlockState.has(node.id)) {
      unlockState.set(node.id, false);
    }
  }

  // 构建返回数据，包含前置关系状态
  const studentNodes: StudentNodeData[] = nodes.map((node) => {
    const isUnlocked = unlockState.get(node.id) || false;
    const { progress } = evaluateUnlockConditions(node.unlock_conditions, metrics);
    const existing = progressMap.get(node.id);

    const prereqIds = parentMap.get(node.id) || [];
    const prerequisites: PrerequisiteStatus[] = prereqIds.map((pid) => ({
      node_id: pid,
      title: nodeMap.get(pid)?.title || "",
      is_unlocked: unlockState.get(pid) || false,
    }));
    const prerequisitesMet = prereqIds.length === 0 || prereqIds.every((pid) => unlockState.get(pid) === true);

    return {
      id: node.id,
      title: node.title,
      description: node.description,
      position_x: node.position_x,
      position_y: node.position_y,
      icon: node.icon,
      color: node.color,
      node_type: node.node_type,
      is_unlocked: isUnlocked,
      unlocked_at: isUnlocked ? (existing?.unlocked_at || new Date()) : null,
      unlock_conditions: node.unlock_conditions,
      condition_progress: progress,
      prerequisites_met: prerequisitesMet,
      prerequisites,
    };
  });

  return {
    path: { id: path.id, name: path.name, description: path.description, cover_image: path.cover_image },
    enrollment: enrollment ? { status: enrollment.status, progress_percent: enrollment.progress_percent } : null,
    nodes: studentNodes,
    edges: edges.map((e) => ({ id: e.id, source_node_id: e.source_node_id, target_node_id: e.target_node_id })),
  };
}

/**
 * 评估单个节点的解锁状态。
 * 解锁规则：
 * 1. start 类型节点始终解锁
 * 2. 已经持久化为解锁的节点保持解锁（不可回退）
 * 3. 其余节点必须同时满足：
 *    a) 所有前置节点（通过 edge 连入的 source 节点）全部已解锁
 *    b) 节点自身的 unlock_conditions 全部满足
 */
function evaluateNodeUnlock(
  node: PathNode,
  nodeId: number,
  parentMap: Map<number, number[]>,
  unlockState: Map<number, boolean>,
  progressMap: Map<number, UserNodeProgress>,
  metrics: BehaviorMetrics
): boolean {
  // 规则1: start 节点无条件解锁
  if (node.node_type === "start") {
    return true;
  }

  // 规则2: 已持久化为解锁的节点保持解锁，防止条件波动导致回退
  const existingProgress = progressMap.get(nodeId);
  if (existingProgress && existingProgress.is_unlocked === 1) {
    return true;
  }

  // 规则3a: 检查所有前置节点是否全部解锁
  const prereqNodeIds = parentMap.get(nodeId) || [];
  if (prereqNodeIds.length > 0) {
    const allPrerequisitesUnlocked = prereqNodeIds.every((pid) => unlockState.get(pid) === true);
    if (!allPrerequisitesUnlocked) {
      return false;
    }
  }

  // 规则3b: 前置全部通过后，检查自身解锁条件
  const { unlocked } = evaluateUnlockConditions(node.unlock_conditions, metrics);
  return unlocked;
}

export async function computePathProgress(userId: number, pathId: number): Promise<number> {
  const totalNodes = await PathNode.count({ where: { path_id: pathId } });
  if (totalNodes === 0) return 0;

  const nodeIds = (await PathNode.findAll({ where: { path_id: pathId }, attributes: ["id"] })).map((n) => n.id);
  const unlockedCount = await UserNodeProgress.count({
    where: { user_id: userId, node_id: nodeIds, is_unlocked: 1 },
  });

  return Math.round((unlockedCount / totalNodes) * 100);
}

export async function enrollUserInPath(userId: number, pathId: number): Promise<UserLearningPath> {
  const path = await LearningPath.findByPk(pathId);
  if (!path || path.status !== 1) throw new Error("学习路径不存在或未发布");

  const existing = await UserLearningPath.findOne({ where: { user_id: userId, path_id: pathId } });
  if (existing) {
    if (existing.status === "abandoned") {
      existing.status = "active";
      await existing.save();
      return existing;
    }
    throw new Error("已加入该学习路径");
  }

  return UserLearningPath.create({
    user_id: userId,
    path_id: pathId,
    progress_percent: 0,
    status: "active",
  });
}
