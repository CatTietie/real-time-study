import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import LearningPath from "../models/learning-path.model";
import PathNode from "../models/path-node.model";
import PathEdge from "../models/path-edge.model";
import PathNodeResource from "../models/path-node-resource.model";
import UserNodeProgress from "../models/user-node-progress.model";
import UserLearningPath from "../models/user-learning-path.model";

export const createPath = async (req: Request, res: Response) => {
  try {
    const { name, description, cover_image, sort_order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "路径名称不能为空" });

    const path = await LearningPath.create({
      name,
      description,
      cover_image,
      sort_order: sort_order || 0,
      status: 0,
      created_by: (req as any).user?.id,
    });

    res.json({ success: true, message: "创建成功", data: path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建失败";
    res.status(500).json({ success: false, message });
  }
};

export const getPaths = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, status } = req.query;
    const where: any = {};
    if (keyword) where.name = { [Op.like]: `%${keyword}%` };
    if (status !== undefined && status !== "") where.status = Number(status);

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await LearningPath.findAndCountAll({
      where,
      order: [["sort_order", "ASC"], ["created_at", "DESC"]],
      limit: Number(pageSize),
      offset,
      include: [{ association: "Creator", attributes: ["id", "nickname", "username"] }],
    });

    const pathsWithCount = await Promise.all(
      rows.map(async (p) => {
        const nodeCount = await PathNode.count({ where: { path_id: p.id } });
        return { ...p.toJSON(), node_count: nodeCount };
      })
    );

    res.json({
      success: true,
      data: pathsWithCount,
      pagination: { page: Number(page), pageSize: Number(pageSize), total: count },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取列表失败";
    res.status(500).json({ success: false, message });
  }
};

export const getPathById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const path = await LearningPath.findByPk(id, {
      include: [
        { association: "Nodes", include: [{ association: "Resources", order: [["sort_order", "ASC"]] }] },
        { association: "Edges" },
        { association: "Creator", attributes: ["id", "nickname", "username"] },
      ],
    });

    if (!path) return res.status(404).json({ success: false, message: "路径不存在" });
    res.json({ success: true, data: path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取详情失败";
    res.status(500).json({ success: false, message });
  }
};

export const updatePath = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, cover_image, sort_order } = req.body;

    const path = await LearningPath.findByPk(id);
    if (!path) return res.status(404).json({ success: false, message: "路径不存在" });

    await path.update({ name, description, cover_image, sort_order });
    res.json({ success: true, message: "更新成功", data: path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const deletePath = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const path = await LearningPath.findByPk(id);
    if (!path) return res.status(404).json({ success: false, message: "路径不存在" });

    const pathId = Number(id);
    const t = await sequelize.transaction();
    try {
      const nodeIds = (await PathNode.findAll({ where: { path_id: pathId }, attributes: ["id"], transaction: t })).map((n) => n.id);

      // 1. 先删除边（关联关系）
      await PathEdge.destroy({ where: { path_id: pathId }, transaction: t });

      // 2. 删除节点关联的资源
      if (nodeIds.length > 0) {
        await PathNodeResource.destroy({ where: { node_id: nodeIds }, transaction: t });
        // 3. 删除用户节点进度
        await UserNodeProgress.destroy({ where: { node_id: nodeIds }, transaction: t });
      }

      // 4. 删除节点
      await PathNode.destroy({ where: { path_id: pathId }, transaction: t });

      // 5. 删除用户路径注册记录
      await UserLearningPath.destroy({ where: { path_id: pathId }, transaction: t });

      // 6. 删除路径本体
      await path.destroy({ transaction: t });

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }

    res.json({ success: true, message: "删除成功" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除失败";
    res.status(500).json({ success: false, message });
  }
};

export const updatePathStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const path = await LearningPath.findByPk(id);
    if (!path) return res.status(404).json({ success: false, message: "路径不存在" });

    await path.update({ status });
    res.json({ success: true, message: "状态更新成功", data: path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新状态失败";
    res.status(500).json({ success: false, message });
  }
};

export const createNode = async (req: Request, res: Response) => {
  try {
    const { path_id, title, description, position_x, position_y, icon, color, node_type, unlock_conditions, sort_order } = req.body;
    if (!path_id || !title) return res.status(400).json({ success: false, message: "参数不完整" });

    const node = await PathNode.create({
      path_id, title, description, position_x, position_y, icon, color, node_type, unlock_conditions, sort_order: sort_order || 0,
    });

    res.json({ success: true, message: "节点创建成功", data: node });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建节点失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateNode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, position_x, position_y, icon, color, node_type, unlock_conditions, sort_order } = req.body;

    const node = await PathNode.findByPk(id);
    if (!node) return res.status(404).json({ success: false, message: "节点不存在" });

    await node.update({ title, description, position_x, position_y, icon, color, node_type, unlock_conditions, sort_order });
    res.json({ success: true, message: "节点更新成功", data: node });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新节点失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteNode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const node = await PathNode.findByPk(id);
    if (!node) return res.status(404).json({ success: false, message: "节点不存在" });

    const nodeId = Number(id);
    const t = await sequelize.transaction();
    try {
      // 1. 先删除引用该节点的所有边（前置/后置关系）
      await PathEdge.destroy({
        where: { [Op.or]: [{ source_node_id: nodeId }, { target_node_id: nodeId }] },
        transaction: t,
      });
      // 2. 删除节点关联的资源
      await PathNodeResource.destroy({ where: { node_id: nodeId }, transaction: t });
      // 3. 删除用户节点进度记录
      await UserNodeProgress.destroy({ where: { node_id: nodeId }, transaction: t });
      // 4. 删除节点本体
      await node.destroy({ transaction: t });

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }

    res.json({ success: true, message: "节点删除成功" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除节点失败";
    res.status(500).json({ success: false, message });
  }
};

export const batchUpdateNodes = async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body;
    if (!Array.isArray(nodes)) return res.status(400).json({ success: false, message: "参数格式错误" });

    const t = await sequelize.transaction();
    try {
      for (const nodeData of nodes) {
        if (nodeData.id) {
          await PathNode.update(
            { position_x: nodeData.position_x, position_y: nodeData.position_y },
            { where: { id: nodeData.id }, transaction: t }
          );
        }
      }
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }

    res.json({ success: true, message: "批量更新成功" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "批量更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const createEdge = async (req: Request, res: Response) => {
  try {
    const { path_id, source_node_id, target_node_id } = req.body;
    if (!path_id || !source_node_id || !target_node_id) {
      return res.status(400).json({ success: false, message: "参数不完整" });
    }

    const edge = await PathEdge.create({ path_id, source_node_id, target_node_id });
    res.json({ success: true, message: "连线创建成功", data: edge });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建连线失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteEdge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const edge = await PathEdge.findByPk(id);
    if (!edge) return res.status(404).json({ success: false, message: "连线不存在" });

    await edge.destroy();
    res.json({ success: true, message: "连线删除成功" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除连线失败";
    res.status(500).json({ success: false, message });
  }
};

export const addNodeResource = async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { resource_type, resource_id, title, url, sort_order } = req.body;

    const node = await PathNode.findByPk(nodeId);
    if (!node) return res.status(404).json({ success: false, message: "节点不存在" });

    const resource = await PathNodeResource.create({
      node_id: Number(nodeId), resource_type, resource_id, title, url, sort_order: sort_order || 0,
    });

    res.json({ success: true, message: "资源添加成功", data: resource });
  } catch (err) {
    const message = err instanceof Error ? err.message : "添加资源失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateNodeResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resource_type, resource_id, title, url, sort_order } = req.body;

    const resource = await PathNodeResource.findByPk(id);
    if (!resource) return res.status(404).json({ success: false, message: "资源不存在" });

    await resource.update({ resource_type, resource_id, title, url, sort_order });
    res.json({ success: true, message: "资源更新成功", data: resource });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新资源失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteNodeResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resource = await PathNodeResource.findByPk(id);
    if (!resource) return res.status(404).json({ success: false, message: "资源不存在" });

    await resource.destroy();
    res.json({ success: true, message: "资源删除成功" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除资源失败";
    res.status(500).json({ success: false, message });
  }
};

export const saveTree = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nodes, edges, deleted_node_ids, deleted_edge_ids } = req.body;

    const path = await LearningPath.findByPk(id);
    if (!path) return res.status(404).json({ success: false, message: "路径不存在" });

    const pathId = Number(id);

    // ====== 前置校验：在事务外完成，避免长事务锁 ======

    // 校验待删除的节点确实属于该路径
    if (deleted_node_ids?.length > 0) {
      const existingNodes = await PathNode.findAll({
        where: { id: deleted_node_ids, path_id: pathId },
        attributes: ["id"],
      });
      const existingIds = new Set(existingNodes.map((n) => n.id));
      const invalidIds = (deleted_node_ids as number[]).filter((nid) => !existingIds.has(nid));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `以下节点ID不存在或不属于该路径: ${invalidIds.join(", ")}` });
      }
    }

    // 校验待删除的边确实属于该路径
    if (deleted_edge_ids?.length > 0) {
      const existingEdges = await PathEdge.findAll({
        where: { id: deleted_edge_ids, path_id: pathId },
        attributes: ["id"],
      });
      const existingIds = new Set(existingEdges.map((e) => e.id));
      const invalidIds = (deleted_edge_ids as number[]).filter((eid) => !existingIds.has(eid));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `以下边ID不存在或不属于该路径: ${invalidIds.join(", ")}` });
      }
    }

    // 校验待更新的节点确实属于该路径
    const updateNodeIds = (nodes || [])
      .filter((n: any) => n.id && typeof n.id === "number")
      .map((n: any) => n.id as number);
    if (updateNodeIds.length > 0) {
      const existingNodes = await PathNode.findAll({
        where: { id: updateNodeIds, path_id: pathId },
        attributes: ["id"],
      });
      const existingIds = new Set(existingNodes.map((n) => n.id));
      const invalidIds = updateNodeIds.filter((nid: number) => !existingIds.has(nid));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `以下节点ID不存在或不属于该路径: ${invalidIds.join(", ")}` });
      }
    }

    // 校验待更新的边确实属于该路径
    const updateEdgeIds = (edges || [])
      .filter((e: any) => e.id && typeof e.id === "number")
      .map((e: any) => e.id as number);
    if (updateEdgeIds.length > 0) {
      const existingEdges = await PathEdge.findAll({
        where: { id: updateEdgeIds, path_id: pathId },
        attributes: ["id"],
      });
      const existingIds = new Set(existingEdges.map((e) => e.id));
      const invalidIds = updateEdgeIds.filter((eid: number) => !existingIds.has(eid));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `以下边ID不存在或不属于该路径: ${invalidIds.join(", ")}` });
      }
    }

    // ====== 事务执行：保证原子性 ======
    const t = await sequelize.transaction();
    try {
      const deletedNodeSet = new Set<number>(deleted_node_ids || []);
      const deletedEdgeSet = new Set<number>(deleted_edge_ids || []);

      // ---- 第1步：删除边（先删除所有需要移除的关联关系） ----

      // 1a. 删除显式指定的边
      if (deletedEdgeSet.size > 0) {
        await PathEdge.destroy({
          where: { id: Array.from(deletedEdgeSet) },
          transaction: t,
        });
      }

      // 1b. 删除引用了待删除节点的所有边（source 或 target 指向待删除节点）
      if (deletedNodeSet.size > 0) {
        await PathEdge.destroy({
          where: {
            path_id: pathId,
            [Op.or]: [
              { source_node_id: Array.from(deletedNodeSet) },
              { target_node_id: Array.from(deletedNodeSet) },
            ],
          },
          transaction: t,
        });
      }

      // ---- 第2步：删除待删除节点的关联资源 ----
      if (deletedNodeSet.size > 0) {
        await PathNodeResource.destroy({
          where: { node_id: Array.from(deletedNodeSet) },
          transaction: t,
        });
      }

      // ---- 第3步：删除节点本体 ----
      if (deletedNodeSet.size > 0) {
        await PathNode.destroy({
          where: { id: Array.from(deletedNodeSet), path_id: pathId },
          transaction: t,
        });
      }

      // ---- 第4步：创建/更新节点 ----
      const tempIdToRealId = new Map<string, number>();

      if (nodes?.length > 0) {
        for (const nodeData of nodes) {
          // 跳过已在删除列表中的节点（防止前端传入冲突数据）
          if (nodeData.id && deletedNodeSet.has(nodeData.id)) continue;

          if (nodeData.id && typeof nodeData.id === "number") {
            // 更新已有节点
            await PathNode.update(
              {
                title: nodeData.title,
                description: nodeData.description,
                position_x: nodeData.position_x,
                position_y: nodeData.position_y,
                icon: nodeData.icon,
                color: nodeData.color,
                node_type: nodeData.node_type,
                unlock_conditions: nodeData.unlock_conditions,
                sort_order: nodeData.sort_order || 0,
              },
              { where: { id: nodeData.id, path_id: pathId }, transaction: t }
            );
            if (nodeData._tempId) tempIdToRealId.set(nodeData._tempId, nodeData.id);
          } else {
            // 创建新节点
            const created = await PathNode.create(
              {
                path_id: pathId,
                title: nodeData.title || "未命名节点",
                description: nodeData.description,
                position_x: nodeData.position_x ?? 0,
                position_y: nodeData.position_y ?? 0,
                icon: nodeData.icon || "BookOutlined",
                color: nodeData.color || "#1890ff",
                node_type: nodeData.node_type || "normal",
                unlock_conditions: nodeData.unlock_conditions || null,
                sort_order: nodeData.sort_order || 0,
              },
              { transaction: t }
            );
            if (nodeData._tempId) tempIdToRealId.set(nodeData._tempId, created.id);
          }

          // 同步该节点的资源（全量替换）
          const realNodeId = nodeData.id && typeof nodeData.id === "number"
            ? nodeData.id
            : tempIdToRealId.get(nodeData._tempId);

          if (realNodeId) {
            await PathNodeResource.destroy({ where: { node_id: realNodeId }, transaction: t });
            if (nodeData.resources?.length > 0) {
              for (let i = 0; i < nodeData.resources.length; i++) {
                const r = nodeData.resources[i];
                await PathNodeResource.create(
                  {
                    node_id: realNodeId,
                    resource_type: r.resource_type,
                    resource_id: r.resource_id || null,
                    title: r.title || "未命名资源",
                    url: r.url || null,
                    sort_order: r.sort_order ?? i,
                  },
                  { transaction: t }
                );
              }
            }
          }
        }
      }

      // ---- 第5步：收集本次保存后所有有效节点ID（用于边引用校验） ----
      const allValidNodeIds = new Set<number>();
      const remainingNodes = await PathNode.findAll({
        where: { path_id: pathId },
        attributes: ["id"],
        transaction: t,
      });
      for (const n of remainingNodes) allValidNodeIds.add(n.id);

      // ---- 第6步：删除不在本次提交中的旧边，然后创建/更新边 ----
      if (edges?.length > 0) {
        // 收集本次提交中保留的已有边ID
        const retainedEdgeIds = edges
          .filter((e: any) => e.id && typeof e.id === "number")
          .map((e: any) => e.id as number);

        // 删除本路径下不在保留列表也不在显式删除列表中的孤立边
        const edgesToRemove: any = { path_id: pathId };
        if (retainedEdgeIds.length > 0) {
          edgesToRemove.id = { [Op.notIn]: retainedEdgeIds };
        }
        await PathEdge.destroy({ where: edgesToRemove, transaction: t });

        // 创建/更新边
        for (const edgeData of edges) {
          if (edgeData.id && deletedEdgeSet.has(edgeData.id)) continue;

          // 解析 source/target：可能是数字ID或临时字符串ID
          const sourceId = typeof edgeData.source_node_id === "string"
            ? tempIdToRealId.get(edgeData.source_node_id)
            : edgeData.source_node_id;
          const targetId = typeof edgeData.target_node_id === "string"
            ? tempIdToRealId.get(edgeData.target_node_id)
            : edgeData.target_node_id;

          // 校验边引用的节点在当前有效节点集合中
          if (!sourceId || !targetId) continue;
          if (!allValidNodeIds.has(sourceId) || !allValidNodeIds.has(targetId)) continue;

          if (edgeData.id && typeof edgeData.id === "number") {
            await PathEdge.update(
              { source_node_id: sourceId, target_node_id: targetId },
              { where: { id: edgeData.id, path_id: pathId }, transaction: t }
            );
          } else {
            await PathEdge.create(
              { path_id: pathId, source_node_id: sourceId, target_node_id: targetId },
              { transaction: t }
            );
          }
        }
      } else {
        // 前端没有传 edges 数据，清空该路径所有边
        await PathEdge.destroy({ where: { path_id: pathId }, transaction: t });
      }

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }

    // 事务提交后查询最新数据返回
    const updated = await LearningPath.findByPk(id, {
      include: [
        { association: "Nodes", include: [{ association: "Resources" }] },
        { association: "Edges" },
      ],
    });

    res.json({ success: true, message: "保存成功", data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存失败";
    res.status(500).json({ success: false, message });
  }
};
