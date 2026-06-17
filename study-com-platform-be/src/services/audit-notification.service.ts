import Notification from "../models/notification.model";
import { getSocketIo } from "../utils/socketManager";

interface AuditPostInfo {
  id: number;
  user_id: number;
  title: string;
}

export async function sendAuditNotification(
  post: AuditPostInfo,
  status: 1 | 2,
  reason?: string,
) {
  const isApproved = status === 1;
  const notifTitle = isApproved ? "帖子审核通过" : "帖子审核未通过";
  const notifContent = isApproved
    ? `您的帖子"${post.title}"已通过审核，已发布至社区。`
    : `您的帖子"${post.title}"未通过审核。原因：${reason || "违反社区规范"}`;

  await Notification.create({
    user_id: post.user_id,
    title: notifTitle,
    content: notifContent,
    notification_type: "system",
    reservation_id: null,
    chat_room_id: null,
    is_read: false,
    metadata: {
      subType: "content_audit",
      postId: post.id,
      auditStatus: status,
      reason: reason || null,
    },
  });

  const io = getSocketIo();
  if (io) {
    io.to(`user_${post.user_id}`).emit("notification", {
      type: "content_audit",
      data: {
        postId: post.id,
        postTitle: post.title,
        status,
        reason: reason || null,
      },
    });
  }
}
