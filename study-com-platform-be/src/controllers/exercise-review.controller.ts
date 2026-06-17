import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import UserAnswerDetail from "../models/user-answer-detail.model";
import UserExerciseRecord from "../models/user-exercise-record.model";
import Question from "../models/question.model";
import QuestionBank from "../models/question-bank.model";
import User from "../models/user.model";
import UserStats from "../models/user-stats.model";
import { addPoints } from "../services/points.service";
import { sendReviewNotification, sendBatchReviewNotification } from "../services/review-notification.service";

export const getReviewList = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, bankId, status = 1 } = req.query;
    const limit = Math.min(Number(pageSize), 50);
    const offset = (Number(page) - 1) * limit;

    const where: any = {
      review_status: Number(status),
    };

    const includeRecord: any = {
      model: UserExerciseRecord,
      attributes: ["id", "user_id", "bank_id", "start_time", "submit_time"],
      include: [
        {
          model: User,
          attributes: ["id", "username"],
        },
        {
          model: QuestionBank,
          attributes: ["id", "name"],
        },
      ],
    };

    if (bankId) {
      includeRecord.where = { bank_id: Number(bankId) };
    }

    const { count, rows } = await UserAnswerDetail.findAndCountAll({
      where,
      include: [
        includeRecord,
        {
          model: Question,
          attributes: ["id", "type", "content", "options", "answer", "score", "difficulty", "analysis"],
        },
        {
          model: User,
          as: "Reviewer",
          attributes: ["id", "username"],
          required: false,
        },
      ],
      order: [["created_at", "ASC"]],
      limit,
      offset,
    });

    const items = rows.map((row: any) => {
      const d = row.toJSON();
      return {
        detailId: d.id,
        recordId: d.record_id,
        studentName: d.UserExerciseRecord?.User?.username || "",
        studentId: d.UserExerciseRecord?.User?.id,
        questionId: d.question_id,
        questionContent: d.Question?.content || "",
        questionOptions: d.Question?.options,
        questionType: d.Question?.type,
        userAnswer: d.user_answer,
        referenceAnswer: d.Question?.answer || "",
        analysis: d.Question?.analysis || "",
        maxScore: d.Question?.score || 1,
        bankName: d.UserExerciseRecord?.QuestionBank?.name || "",
        bankId: d.UserExerciseRecord?.bank_id,
        submittedAt: d.created_at,
        reviewStatus: d.review_status,
        reviewScore: d.review_score,
        reviewComment: d.review_comment,
        reviewerName: d.Reviewer?.username || null,
        reviewedAt: d.reviewed_at,
      };
    });

    res.json({
      success: true,
      data: {
        items,
        pagination: { page: Number(page), pageSize: limit, total: count },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取批改列表失败" });
  }
};

export const getReviewStats = async (req: Request, res: Response) => {
  try {
    const pendingCount = await UserAnswerDetail.count({
      where: { review_status: 1 },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewedTodayCount = await UserAnswerDetail.count({
      where: {
        review_status: 2,
        reviewed_at: { [Op.gte]: today },
      },
    });

    res.json({
      success: true,
      data: { pendingCount, reviewedTodayCount },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取统计失败" });
  }
};

export const gradeAnswer = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const { detailId } = req.params;
    const { score, comment } = req.body;
    const reviewerId = req.user!.id;

    if (score === undefined || score === null) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "请提供评分" });
    }

    const detail = await UserAnswerDetail.findByPk(Number(detailId), {
      include: [{ model: Question, attributes: ["id", "type", "score"] }],
      transaction: t,
    });

    if (!detail) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "答题记录不存在" });
    }

    if ((detail as any).review_status !== 1 && (detail as any).review_status !== 2) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "该题目无需批改" });
    }

    const maxScore = (detail as any).Question?.score || 1;
    if (score < 0 || score > maxScore) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `评分范围为 0~${maxScore}` });
    }

    const oldEarnedPoints = (detail as any).earned_points || 0;
    const delta = score - oldEarnedPoints;

    await detail.update(
      {
        review_status: 2,
        review_score: score,
        review_comment: comment || null,
        reviewer_id: reviewerId,
        reviewed_at: new Date(),
        earned_points: score,
        is_correct: score >= maxScore ? 1 : 0,
      },
      { transaction: t },
    );

    if (delta !== 0) {
      await UserExerciseRecord.increment("score", {
        by: delta,
        where: { id: (detail as any).record_id },
        transaction: t,
      });
    }

    const pendingCount = await UserAnswerDetail.count({
      where: { record_id: (detail as any).record_id, review_status: 1 },
      transaction: t,
    });

    if (pendingCount === 0) {
      await UserExerciseRecord.update(
        { status: 1 },
        { where: { id: (detail as any).record_id, status: 3 }, transaction: t },
      );
    }

    const record = await UserExerciseRecord.findByPk((detail as any).record_id, {
      attributes: ["user_id"],
      transaction: t,
    });
    const userId = (record as any).user_id;

    if (delta !== 0) {
      const stats = await UserStats.findOne({ where: { user_id: userId }, transaction: t });
      if (stats) {
        const newPoints = (stats as any).total_points + delta;
        const updateData: any = { total_points: newPoints };
        if (score >= maxScore && oldEarnedPoints < maxScore) {
          updateData.correct_count = (stats as any).correct_count + 1;
          const newTotal = (stats as any).total_questions;
          updateData.accuracy_rate = newTotal > 0
            ? Math.round((updateData.correct_count / newTotal) * 10000) / 100
            : 0;
        }
        await stats.update(updateData, { transaction: t });
      }
    }

    await t.commit();

    if (delta > 0) {
      try {
        await addPoints({
          userId,
          change: delta,
          reason: "exercise_review",
          sourceType: "study",
          sourceId: Number(detailId),
          dailyCap: 100,
        });
      } catch {
        // 积分发放失败不影响批改结果
      }
    }

    try {
      const recordWithBank = await UserExerciseRecord.findByPk((detail as any).record_id, {
        include: [{ model: QuestionBank, attributes: ["id", "name"] }],
      });
      const bankName = (recordWithBank as any)?.QuestionBank?.name || "";
      const bankId = (recordWithBank as any)?.bank_id;
      await sendReviewNotification({
        userId,
        bankName,
        score,
        maxScore,
        recordId: (detail as any).record_id,
        bankId,
      });
    } catch {
      // 通知发送失败不影响批改结果
    }

    res.json({
      success: true,
      message: "批改成功",
      data: {
        detailId: Number(detailId),
        reviewScore: score,
        reviewComment: comment || null,
        earnedPoints: score,
      },
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message || "批改失败" });
  }
};

export const batchGrade = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body;
    const reviewerId = req.user!.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "请提供批改数据" });
    }

    const detailIds = items.map((item: any) => item.detailId);
    const details = await UserAnswerDetail.findAll({
      where: { id: { [Op.in]: detailIds }, review_status: [1, 2] },
      include: [{ model: Question, attributes: ["id", "type", "score"] }],
      transaction: t,
    });

    const detailMap = new Map<number, any>();
    details.forEach((d: any) => detailMap.set(d.id, d));

    const recordDeltas = new Map<number, number>();
    const userDeltas = new Map<number, { pointsDelta: number; correctDelta: number }>();
    const userRecordInfo = new Map<number, { recordId: number; gradedCount: number; earnedScore: number; totalScore: number }>();
    let gradedCount = 0;

    for (const item of items) {
      const detail = detailMap.get(item.detailId);
      if (!detail) continue;

      const maxScore = detail.Question?.score || 1;
      const score = Math.max(0, Math.min(item.score, maxScore));
      const oldEarnedPoints = detail.earned_points || 0;
      const delta = score - oldEarnedPoints;

      await detail.update(
        {
          review_status: 2,
          review_score: score,
          review_comment: item.comment || null,
          reviewer_id: reviewerId,
          reviewed_at: new Date(),
          earned_points: score,
          is_correct: score >= maxScore ? 1 : 0,
        },
        { transaction: t },
      );

      if (delta !== 0) {
        const prev = recordDeltas.get(detail.record_id) || 0;
        recordDeltas.set(detail.record_id, prev + delta);
      }

      const record = await UserExerciseRecord.findByPk(detail.record_id, {
        attributes: ["user_id"],
        transaction: t,
      });
      if (record) {
        const uid = (record as any).user_id;
        const prev = userDeltas.get(uid) || { pointsDelta: 0, correctDelta: 0 };
        prev.pointsDelta += delta;
        if (score >= maxScore && oldEarnedPoints < maxScore) prev.correctDelta += 1;
        userDeltas.set(uid, prev);

        const info = userRecordInfo.get(uid) || { recordId: detail.record_id, gradedCount: 0, earnedScore: 0, totalScore: 0 };
        info.gradedCount += 1;
        info.earnedScore += score;
        info.totalScore += maxScore;
        userRecordInfo.set(uid, info);
      }

      gradedCount++;
    }

    for (const [recordId, delta] of recordDeltas.entries()) {
      if (delta !== 0) {
        await UserExerciseRecord.increment("score", {
          by: delta,
          where: { id: recordId },
          transaction: t,
        });
      }

      const pendingCount = await UserAnswerDetail.count({
        where: { record_id: recordId, review_status: 1 },
        transaction: t,
      });
      if (pendingCount === 0) {
        await UserExerciseRecord.update(
          { status: 1 },
          { where: { id: recordId, status: 3 }, transaction: t },
        );
      }
    }

    for (const [userId, deltas] of userDeltas.entries()) {
      if (deltas.pointsDelta === 0 && deltas.correctDelta === 0) continue;
      const stats = await UserStats.findOne({ where: { user_id: userId }, transaction: t });
      if (stats) {
        const updateData: any = {};
        if (deltas.pointsDelta !== 0) {
          updateData.total_points = (stats as any).total_points + deltas.pointsDelta;
        }
        if (deltas.correctDelta > 0) {
          updateData.correct_count = (stats as any).correct_count + deltas.correctDelta;
          const newTotal = (stats as any).total_questions;
          updateData.accuracy_rate = newTotal > 0
            ? Math.round((updateData.correct_count / newTotal) * 10000) / 100
            : 0;
        }
        await stats.update(updateData, { transaction: t });
      }
    }

    await t.commit();

    for (const [userId, deltas] of userDeltas.entries()) {
      if (deltas.pointsDelta > 0) {
        try {
          await addPoints({
            userId,
            change: deltas.pointsDelta,
            reason: "exercise_review",
            sourceType: "study",
            dailyCap: 100,
          });
        } catch {
          // ignore
        }
      }
    }

    for (const [userId, info] of userRecordInfo.entries()) {
      try {
        const recordWithBank = await UserExerciseRecord.findByPk(info.recordId, {
          include: [{ model: QuestionBank, attributes: ["id", "name"] }],
        });
        const bankName = (recordWithBank as any)?.QuestionBank?.name || "";
        const bankId = (recordWithBank as any)?.bank_id;
        await sendBatchReviewNotification({
          userId,
          bankName,
          gradedCount: info.gradedCount,
          totalScore: info.totalScore,
          earnedScore: info.earnedScore,
          recordId: info.recordId,
          bankId,
        });
      } catch {
        // 通知发送失败不影响批改结果
      }
    }

    res.json({
      success: true,
      message: `成功批改 ${gradedCount} 条`,
      data: { gradedCount },
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message || "批量批改失败" });
  }
};
