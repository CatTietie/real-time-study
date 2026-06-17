import { Op, Sequelize } from "sequelize";
import DailyQuestionAnswer from "../models/daily-question-answer.model";
import Question from "../models/question.model";
import { addPoints } from "./points.service";

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function gradeAnswer(questionType: number, correctAnswer: string, userAnswer: string): boolean {
  const correct = correctAnswer.trim();
  const user = userAnswer.trim();

  switch (questionType) {
    case 1:
    case 3:
      return user.toUpperCase() === correct.toUpperCase();
    case 2: {
      const userSet = user.toUpperCase().split(",").map((s) => s.trim()).filter(Boolean).sort();
      const answerSet = correct.toUpperCase().split(",").map((s) => s.trim()).filter(Boolean).sort();
      return JSON.stringify(userSet) === JSON.stringify(answerSet);
    }
    default:
      return user.toLowerCase() === correct.toLowerCase();
  }
}

export const getOrAssignTodayQuestion = async (userId: number) => {
  const today = getTodayDate();

  const existing = await DailyQuestionAnswer.findOne({
    where: { user_id: userId, date: today },
  });

  if (existing) {
    const question = await Question.findByPk(existing.question_id);
    return { record: existing, question };
  }

  const recentQuestionIds = await DailyQuestionAnswer.findAll({
    where: {
      user_id: userId,
      date: { [Op.gte]: Sequelize.literal(`DATE_SUB(CURDATE(), INTERVAL 30 DAY)`) },
    },
    attributes: ["question_id"],
  }).then((rows) => rows.map((r) => r.question_id));

  const whereClause: any = {
    type: { [Op.in]: [1, 2, 3] },
    status: 1,
  };
  if (recentQuestionIds.length > 0) {
    whereClause.id = { [Op.notIn]: recentQuestionIds };
  }

  let question = await Question.findOne({
    where: whereClause,
    order: Sequelize.literal("RAND()"),
  });

  if (!question) {
    question = await Question.findOne({
      where: { type: { [Op.in]: [1, 2, 3] }, status: 1 },
      order: Sequelize.literal("RAND()"),
    });
  }

  if (!question) {
    return { record: null, question: null };
  }

  const record = await DailyQuestionAnswer.create({
    user_id: userId,
    date: today,
    question_id: question.id,
  });

  return { record, question };
};

export const submitDailyAnswer = async (userId: number, answer: string) => {
  const today = getTodayDate();

  const record = await DailyQuestionAnswer.findOne({
    where: { user_id: userId, date: today },
  });

  if (!record) {
    throw new Error("今日尚未分配题目，请先获取每日一题");
  }

  if (record.is_correct !== null) {
    throw new Error("今日已作答，不可重复提交");
  }

  const question = await Question.findByPk(record.question_id);
  if (!question) {
    throw new Error("题目不存在");
  }

  const isCorrect = gradeAnswer(question.type, question.answer, answer);
  let pointsEarned = 0;

  if (isCorrect) {
    const result = await addPoints({
      userId,
      change: 10,
      reason: "daily_question_correct",
      sourceType: "study",
      dailyCap: 10,
    });
    pointsEarned = result || 0;
  }

  await record.update({
    user_answer: answer,
    is_correct: isCorrect ? 1 : 0,
    points_earned: pointsEarned,
  });

  const streak = await getDailyQuestionStreak(userId);
  const milestone = await checkStreakMilestone(userId, streak);

  return {
    isCorrect,
    correctAnswer: question.answer,
    analysis: question.analysis,
    pointsEarned,
    streak,
    milestone,
  };
};

export const getDailyQuestionStreak = async (userId: number): Promise<number> => {
  const records = await DailyQuestionAnswer.findAll({
    where: {
      user_id: userId,
      is_correct: { [Op.ne]: null },
    },
    attributes: ["date"],
    order: [["date", "DESC"]],
    limit: 60,
  });

  if (records.length === 0) return 0;

  const dates = records.map((r) => r.date);
  const today = getTodayDate();

  let streak = 0;
  let checkDate = new Date(today);

  if (dates[0] !== today) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (dates[0] !== checkDate.toISOString().slice(0, 10)) {
      return 0;
    }
  }

  const dateSet = new Set(dates);
  while (dateSet.has(checkDate.toISOString().slice(0, 10))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
};

export const checkStreakMilestone = async (userId: number, streak: number) => {
  if (streak !== 7 && streak !== 30) return null;

  const reason = streak === 7 ? "daily_question_streak_7" : "daily_question_streak_30";
  const bonusPoints = streak === 7 ? 30 : 150;

  const today = getTodayDate();
  const existingBonus = await (await import("../models/points-log.model")).default.findOne({
    where: {
      user_id: userId,
      reason,
      [Op.and]: [
        Sequelize.where(Sequelize.fn("DATE", Sequelize.col("created_at")), today),
      ],
    },
  });

  if (existingBonus) return null;

  await addPoints({
    userId,
    change: bonusPoints,
    reason,
    sourceType: "study",
  });

  return { days: streak, bonusPoints, badge: reason };
};
