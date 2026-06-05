import cron from "node-cron";
import { Op } from "sequelize";
import Post from "../models/post.model";
import { getAuditConfig } from "../models/audit-config.model";
import ContentAudit from "../models/content-audit.model";
import { sendAuditNotification } from "./audit-notification.service";
import { addPoints } from "./points.service";
import { log } from "../utils/logger";

export const checkAutoApprovePosts = async () => {
  try {
    const config = await getAuditConfig();

    if (!config.auto_approve_hours || config.auto_approve_hours <= 0) {
      return;
    }

    const cutoffTime = new Date(
      Date.now() - config.auto_approve_hours * 60 * 60 * 1000,
    );

    const pendingPosts = await Post.findAll({
      where: {
        status: 0,
        publish_status: 1,
        created_at: { [Op.lte]: cutoffTime },
      },
    });

    for (const post of pendingPosts) {
      const autoReason = `系统自动通过（超过${config.auto_approve_hours}小时未审核）`;

      await Post.update(
        {
          status: 1,
          audit_admin_id: null,
          audit_reason: autoReason,
          audit_at: new Date(),
        },
        { where: { id: post.id } },
      );

      await ContentAudit.create({
        target_type: "post",
        target_id: post.id,
        status: 1,
        reason: autoReason,
        admin_id: 0,
      });

      await sendAuditNotification(
        { id: post.id, user_id: post.user_id, title: post.title },
        1,
        autoReason,
      );

      await addPoints({
        userId: post.user_id,
        change: 5,
        reason: "post_approved",
        sourceType: "post",
        sourceId: post.id,
      });

      log(`[审核自动通过] 帖子ID ${post.id} 已自动通过审核`);
    }

    if (pendingPosts.length > 0) {
      log(
        `[审核自动通过] 本次共自动通过 ${pendingPosts.length} 篇帖子`,
      );
    }
  } catch (error) {
    log(`[审核自动通过] 执行失败: ${error}`);
  }
};

export const initAuditCron = () => {
  const task = cron.schedule("*/10 * * * *", async () => {
    await checkAutoApprovePosts();
  });

  log("[审核自动通过] 定时任务已启动，每10分钟执行一次");
  return task;
};

export default initAuditCron;
