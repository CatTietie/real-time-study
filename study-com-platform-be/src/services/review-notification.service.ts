import Notification from "../models/notification.model";
import { getSocketIo } from "../utils/socketManager";

interface ReviewNotificationParams {
  userId: number;
  bankName: string;
  score: number;
  maxScore: number;
  recordId: number;
  bankId: number;
}

export async function sendReviewNotification(params: ReviewNotificationParams) {
  const { userId, bankName, score, maxScore, recordId, bankId } = params;

  const title = "主观题批改完成";
  const content = `您在「${bankName}」中的主观题已被批改，得分 ${score}/${maxScore} 分。`;

  await Notification.create({
    user_id: userId,
    title,
    content,
    notification_type: "system",
    reservation_id: null,
    chat_room_id: null,
    is_read: false,
    metadata: {
      subType: "exercise_review",
      recordId,
      bankId,
      score,
      maxScore,
    },
  });

  const io = getSocketIo();
  if (io) {
    io.to(`user_${userId}`).emit("notification", {
      type: "exercise_review",
      data: { recordId, bankId, bankName, score, maxScore },
    });
  }
}

interface BatchReviewNotificationParams {
  userId: number;
  bankName: string;
  gradedCount: number;
  totalScore: number;
  earnedScore: number;
  recordId: number;
  bankId: number;
}

export async function sendBatchReviewNotification(params: BatchReviewNotificationParams) {
  const { userId, bankName, gradedCount, totalScore, earnedScore, recordId, bankId } = params;

  const title = "主观题批改完成";
  const content = `您在「${bankName}」中的 ${gradedCount} 道主观题已被批改，共获得 ${earnedScore}/${totalScore} 分。`;

  await Notification.create({
    user_id: userId,
    title,
    content,
    notification_type: "system",
    reservation_id: null,
    chat_room_id: null,
    is_read: false,
    metadata: {
      subType: "exercise_review",
      recordId,
      bankId,
      gradedCount,
      earnedScore,
      totalScore,
    },
  });

  const io = getSocketIo();
  if (io) {
    io.to(`user_${userId}`).emit("notification", {
      type: "exercise_review",
      data: { recordId, bankId, bankName, gradedCount, earnedScore, totalScore },
    });
  }
}
