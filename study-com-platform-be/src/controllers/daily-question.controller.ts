import { Request, Response } from "express";
import {
  getOrAssignTodayQuestion,
  submitDailyAnswer,
  getDailyQuestionStreak,
} from "../services/daily-question.service";

export const getDailyQuestionToday = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "未登录" });

    const { record, question } = await getOrAssignTodayQuestion(userId);

    if (!question || !record) {
      return res.json({
        success: true,
        data: { available: false, message: "暂无可用的每日一题" },
      });
    }

    const answered = record.is_correct !== null;
    const streak = await getDailyQuestionStreak(userId);

    const questionData: any = {
      id: question.id,
      type: question.type,
      content: question.content,
      options: question.options,
      difficulty: question.difficulty,
    };

    const data: any = {
      available: true,
      date: record.date,
      question: questionData,
      answered,
      streak,
    };

    if (answered) {
      data.userAnswer = record.user_answer;
      data.isCorrect = record.is_correct === 1;
      data.correctAnswer = question.answer;
      data.analysis = question.analysis;
      data.pointsEarned = record.points_earned;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "获取每日一题失败" });
  }
};

export const submitDailyQuestionAnswer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "未登录" });

    const { answer } = req.body;
    if (!answer || typeof answer !== "string" || !answer.trim()) {
      return res.status(400).json({ success: false, message: "请提交答案" });
    }

    const result = await submitDailyAnswer(userId, answer.trim());

    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message.includes("已作答")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message || "提交失败" });
  }
};

export const getDailyQuestionStreakInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "未登录" });

    const streak = await getDailyQuestionStreak(userId);

    res.json({ success: true, data: { streak } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "获取打卡信息失败" });
  }
};
