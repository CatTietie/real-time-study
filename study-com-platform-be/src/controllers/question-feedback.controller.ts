import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import Question from "../models/question.model";
import QuestionBank from "../models/question-bank.model";
import QuestionFeedback from "../models/question-feedback.model";

export const submitFeedback = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const userId = (req as any).user?.id;
    const questionId = Number(req.params.questionId);
    const { feedbackType } = req.body;

    if (!["like", "dislike"].includes(feedbackType)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "feedbackType 必须为 like 或 dislike" });
    }

    const question = await Question.findByPk(questionId, { transaction: t });
    if (!question) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "题目不存在" });
    }

    const existing = await QuestionFeedback.findOne({
      where: { user_id: userId, question_id: questionId },
      transaction: t,
    });

    let resultType: string | null = feedbackType;

    if (!existing) {
      await QuestionFeedback.create(
        { user_id: userId, question_id: questionId, feedback_type: feedbackType },
        { transaction: t },
      );
      await Question.increment(
        feedbackType === "like" ? "like_count" : "dislike_count",
        { where: { id: questionId }, transaction: t },
      );
    } else if (existing.feedback_type === feedbackType) {
      await existing.destroy({ transaction: t });
      await Question.decrement(
        feedbackType === "like" ? "like_count" : "dislike_count",
        { where: { id: questionId }, transaction: t },
      );
      resultType = null;
    } else {
      const oldType = existing.feedback_type;
      await existing.update({ feedback_type: feedbackType }, { transaction: t });
      await Question.decrement(
        oldType === "like" ? "like_count" : "dislike_count",
        { where: { id: questionId }, transaction: t },
      );
      await Question.increment(
        feedbackType === "like" ? "like_count" : "dislike_count",
        { where: { id: questionId }, transaction: t },
      );
    }

    await t.commit();

    const updated = await Question.findByPk(questionId, {
      attributes: ["like_count", "dislike_count"],
    });

    res.json({
      success: true,
      message: resultType ? "反馈成功" : "已取消反馈",
      data: {
        feedbackType: resultType,
        likeCount: updated?.like_count || 0,
        dislikeCount: updated?.dislike_count || 0,
      },
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message || "操作失败" });
  }
};

export const getMyFeedback = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const questionId = Number(req.params.questionId);

    const [feedback, question] = await Promise.all([
      QuestionFeedback.findOne({ where: { user_id: userId, question_id: questionId } }),
      Question.findByPk(questionId, { attributes: ["like_count", "dislike_count"] }),
    ]);

    res.json({
      success: true,
      data: {
        feedbackType: feedback?.feedback_type || null,
        likeCount: question?.like_count || 0,
        dislikeCount: question?.dislike_count || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取反馈失败" });
  }
};

export const getDislikedQuestions = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
    const bankId = req.query.bankId ? Number(req.query.bankId) : undefined;

    const where: any = { dislike_count: { [Op.gt]: 0 } };
    if (bankId) where.bank_id = bankId;

    const { rows, count } = await Question.findAndCountAll({
      where,
      attributes: ["id", "bank_id", "type", "content", "difficulty", "like_count", "dislike_count", "status"],
      include: [
        {
          model: QuestionBank,
          attributes: ["id", "name"],
        },
      ],
      order: [["dislike_count", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { page, pageSize, total: count },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取反馈统计失败" });
  }
};
