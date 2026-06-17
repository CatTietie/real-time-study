import { Request, Response } from "express";
import { Op } from "sequelize";
import LearningPath from "../models/learning-path.model";
import PathNode from "../models/path-node.model";
import PathNodeResource from "../models/path-node-resource.model";
import UserLearningPath from "../models/user-learning-path.model";
import UserNodeProgress from "../models/user-node-progress.model";
import { getStudentSkillTree, computePathProgress, enrollUserInPath } from "../services/learning-path.service";

export const getPublishedPaths = async (req: Request, res: Response) => {
  try {
    const paths = await LearningPath.findAll({
      where: { status: 1 },
      order: [["sort_order", "ASC"], ["created_at", "DESC"]],
      attributes: ["id", "name", "description", "cover_image", "sort_order"],
    });

    const pathsWithCount = await Promise.all(
      paths.map(async (p) => {
        const nodeCount = await PathNode.count({ where: { path_id: p.id } });
        return { ...p.toJSON(), node_count: nodeCount };
      })
    );

    res.json({ success: true, data: pathsWithCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取路径列表失败";
    res.status(500).json({ success: false, message });
  }
};

export const getPathTree = async (req: Request, res: Response) => {
  try {
    const { pathId } = req.params;
    const userId = (req as any).user?.id;

    const treeData = await getStudentSkillTree(userId, Number(pathId));

    // Update progress
    if (treeData.enrollment) {
      const progress = await computePathProgress(userId, Number(pathId));
      await UserLearningPath.update(
        { progress_percent: progress },
        { where: { user_id: userId, path_id: Number(pathId) } }
      );
      treeData.enrollment.progress_percent = progress;
    }

    res.json({ success: true, data: treeData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取技能树失败";
    res.status(500).json({ success: false, message });
  }
};

export const enrollInPath = async (req: Request, res: Response) => {
  try {
    const { pathId } = req.params;
    const userId = (req as any).user?.id;

    const enrollment = await enrollUserInPath(userId, Number(pathId));
    res.json({ success: true, message: "加入成功", data: enrollment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "加入失败";
    res.status(400).json({ success: false, message });
  }
};

export const getNodeResources = async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const userId = (req as any).user?.id;

    const progress = await UserNodeProgress.findOne({
      where: { user_id: userId, node_id: Number(nodeId), is_unlocked: 1 },
    });

    if (!progress) {
      return res.status(403).json({ success: false, message: "节点尚未解锁" });
    }

    const resources = await PathNodeResource.findAll({
      where: { node_id: Number(nodeId) },
      order: [["sort_order", "ASC"]],
    });

    res.json({ success: true, data: resources });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取资源失败";
    res.status(500).json({ success: false, message });
  }
};

export const getMyPaths = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const enrollments = await UserLearningPath.findAll({
      where: { user_id: userId, status: { [Op.ne]: "abandoned" } },
      include: [{ association: "LearningPath", attributes: ["id", "name", "description", "cover_image"] }],
      order: [["created_at", "DESC"]],
    });

    const result = await Promise.all(
      enrollments.map(async (e) => {
        const progress = await computePathProgress(userId, e.path_id);
        return { ...e.toJSON(), progress_percent: progress };
      })
    );

    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取我的路径失败";
    res.status(500).json({ success: false, message });
  }
};

export const abandonPath = async (req: Request, res: Response) => {
  try {
    const { pathId } = req.params;
    const userId = (req as any).user?.id;

    const enrollment = await UserLearningPath.findOne({
      where: { user_id: userId, path_id: Number(pathId) },
    });

    if (!enrollment) return res.status(404).json({ success: false, message: "未加入该路径" });

    await enrollment.update({ status: "abandoned" });
    res.json({ success: true, message: "已放弃该路径" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "操作失败";
    res.status(500).json({ success: false, message });
  }
};
