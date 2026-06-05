import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import Question from "../models/question.model";
import QuestionBank from "../models/question-bank.model";
import UserExerciseRecord from "../models/user-exercise-record.model";
import UserAnswerDetail from "../models/user-answer-detail.model";
import WrongBook from "../models/wrong-book.model";
import UserStats from "../models/user-stats.model";
import User from "../models/user.model";
import { addPoints } from "../services/points.service";
import { updateTagMastery } from "../services/intelligent-exercise.service";

function gradeAnswer(
  questionType: number,
  correctAnswer: string,
  userAnswer: string | undefined,
): { isCorrect: number; earnedPoints: number; score: number } {
  if (!userAnswer || userAnswer.trim() === "") {
    return { isCorrect: 0, earnedPoints: 0, score: 0 };
  }

  const correct = correctAnswer.trim();
  const user = userAnswer.trim();

  switch (questionType) {
    case 1: // single choice
    case 3: // true/false
      const match = user.toUpperCase() === correct.toUpperCase();
      return { isCorrect: match ? 1 : 0, earnedPoints: match ? 1 : 0, score: 1 };

    case 2: {
      // multiple choice
      const userSet = user.toUpperCase().split(",").map((s) => s.trim()).filter(Boolean).sort();
      const answerSet = correct.toUpperCase().split(",").map((s) => s.trim()).filter(Boolean).sort();
      const multiMatch = JSON.stringify(userSet) === JSON.stringify(answerSet);
      return { isCorrect: multiMatch ? 1 : 0, earnedPoints: multiMatch ? 1 : 0, score: 1 };
    }

    case 4: {
      // fill-in-blank
      const fillMatch = user.toLowerCase() === correct.toLowerCase();
      return { isCorrect: fillMatch ? 1 : 0, earnedPoints: fillMatch ? 1 : 0, score: 1 };
    }

    case 5: // subjective - pending review
      return { isCorrect: 0, earnedPoints: 0, score: 0 };

    case 6: // programming - graded via code execution
      return { isCorrect: 0, earnedPoints: 0, score: 0 };

    default:
      return { isCorrect: 0, earnedPoints: 0, score: 0 };
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function weightedRandomSelect<T>(items: T[], n: number, getWeight: (item: T) => number): T[] {
  if (n >= items.length) return shuffleArray(items);

  const remaining = items.map((item) => ({ item, weight: getWeight(item) }));
  const selected: T[] = [];

  for (let i = 0; i < n && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].weight;
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    selected.push(remaining[selectedIndex].item);
    remaining.splice(selectedIndex, 1);
  }

  return shuffleArray(selected);
}

export const getQuestionsForPractice = async (req: Request, res: Response) => {
  try {
    const { bankId } = req.params;
    const { mode = "sequential", count } = req.query;

    const bank = await QuestionBank.findOne({
      where: { id: Number(bankId), status: 1 },
      attributes: ["id", "name", "question_count", "difficulty"],
    });

    if (!bank) {
      return res.status(404).json({ success: false, message: "题库不存在或已禁用" });
    }

    let questions = await Question.findAll({
      where: { bank_id: Number(bankId), status: 1 },
      attributes: ["id", "type", "content", "options", "score", "difficulty", "resource_url", "like_count", "dislike_count"],
      order: [["id", "ASC"]],
    });

    if (mode === "random" && count) {
      const n = Math.min(Number(count), questions.length);
      questions = weightedRandomSelect(questions, n, (q: any) => {
        const likeCount = q.like_count || 0;
        const dislikeCount = q.dislike_count || 0;
        return Math.max(0.1, 1 + likeCount * 0.1 - dislikeCount * 0.2);
      });
    }

    const totalScore = questions.reduce((sum, q: any) => sum + (q.score || 1), 0);

    res.json({
      success: true,
      data: {
        questions: questions.map((q: any) => {
          const json = q.toJSON();
          delete json.like_count;
          delete json.dislike_count;
          return json;
        }),
        bankName: (bank as any).name,
        questionCount: questions.length,
        totalScore,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取题目失败" });
  }
};

export const submitExercise = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user!.id;
    const { bankId, mode, startTime, answers, source } = req.body;

    if (!bankId || !mode || !answers || !Array.isArray(answers)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    const bank = await QuestionBank.findOne({
      where: { id: bankId, status: 1 },
      attributes: ["id"],
      transaction: t,
    });

    if (!bank) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "题库不存在" });
    }

    const questionIds = answers.map((a: any) => a.questionId);
    const questionWhere: any = { id: { [Op.in]: questionIds }, status: 1 };
    if (source !== "wrong-book") {
      questionWhere.bank_id = bankId;
    }
    const questions = await Question.findAll({
      where: questionWhere,
      attributes: ["id", "type", "answer", "score"],
      transaction: t,
    });

    const questionMap = new Map<number, any>();
    questions.forEach((q: any) => questionMap.set(q.id, q));

    const record = await UserExerciseRecord.create(
      {
        user_id: userId,
        bank_id: bankId,
        start_time: startTime ? new Date(startTime) : new Date(),
        submit_time: new Date(),
        mode,
        status: 1,
        score: 0,
        total_score: 0,
      },
      { transaction: t },
    );

    let totalScore = 0;
    let earnedScore = 0;
    let correctCount = 0;
    let hasSubjective = false;
    const answerDetails: any[] = [];
    const wrongEntries: { questionId: number }[] = [];

    for (const item of answers) {
      const question = questionMap.get(item.questionId);
      if (!question) continue;

      const qScore = question.score || 1;
      totalScore += qScore;

      const result = gradeAnswer(question.type, question.answer, item.answer);
      const earnedPoints = result.isCorrect ? qScore : 0;

      const isSubjective = question.type === 5;
      if (isSubjective) hasSubjective = true;

      answerDetails.push({
        record_id: record.id,
        question_id: item.questionId,
        user_answer: item.answer || null,
        is_correct: result.isCorrect,
        earned_points: earnedPoints,
        review_status: isSubjective ? 1 : 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (result.isCorrect) {
        correctCount++;
        earnedScore += earnedPoints;
      } else if (question.type !== 5) {
        wrongEntries.push({ questionId: item.questionId });
      }
    }

    await UserAnswerDetail.bulkCreate(answerDetails, { transaction: t });

    await record.update(
      { score: earnedScore, total_score: totalScore, status: hasSubjective ? 3 : 1 },
      { transaction: t },
    );

    for (const entry of wrongEntries) {
      const existing = await WrongBook.findOne({
        where: { user_id: userId, question_id: entry.questionId },
        transaction: t,
      });
      if (existing) {
        await existing.update(
          { wrong_count: (existing as any).wrong_count + 1, last_wrong_time: new Date() },
          { transaction: t },
        );
      } else {
        await WrongBook.create(
          {
            user_id: userId,
            question_id: entry.questionId,
            wrong_count: 1,
            last_wrong_time: new Date(),
          },
          { transaction: t },
        );
      }
    }

    const stats = await UserStats.findOne({ where: { user_id: userId }, transaction: t });
    const newTotal = (stats ? (stats as any).total_questions : 0) + answers.length;
    const newCorrect = (stats ? (stats as any).correct_count : 0) + correctCount;
    const newAccuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 10000) / 100 : 0;
    const newPoints = (stats ? (stats as any).total_points : 0) + earnedScore;

    if (stats) {
      await stats.update(
        {
          total_questions: newTotal,
          correct_count: newCorrect,
          accuracy_rate: newAccuracy,
          total_points: newPoints,
        },
        { transaction: t },
      );
    } else {
      await UserStats.create(
        {
          user_id: userId,
          total_questions: newTotal,
          correct_count: newCorrect,
          accuracy_rate: newAccuracy,
          total_points: newPoints,
        },
        { transaction: t },
      );
    }

    await t.commit();

    let communityPointsEarned = 0;
    let bonusPointsEarned = 0;

    try {
      if (earnedScore > 0) {
        const awarded = await addPoints({
          userId,
          change: earnedScore,
          reason: "exercise_correct",
          sourceType: "study",
          sourceId: record.id,
          dailyCap: 100,
        });
        communityPointsEarned = awarded ?? 0;
      }

      const bonusAwarded = await addPoints({
        userId,
        change: 10,
        reason: `exercise_session_${bankId}`,
        sourceType: "study",
        sourceId: record.id,
        dailyCap: 10,
      });
      bonusPointsEarned = bonusAwarded ?? 0;
    } catch {
      // 积分发放失败不影响做题结果
    }

    try {
      await updateTagMastery(
        userId,
        answerDetails.map((d: any) => ({ questionId: d.question_id, isCorrect: d.is_correct })),
      );
    } catch {
      // 知识点掌握度更新失败不影响做题结果
    }

    res.json({
      success: true,
      data: {
        recordId: record.id,
        score: earnedScore,
        totalScore,
        correctCount,
        totalCount: answers.length,
        accuracy: newTotal > 0 ? Math.round((correctCount / answers.length) * 100) : 0,
        communityPointsEarned,
        bonusPointsEarned,
      },
      message: "提交成功",
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message || "提交失败" });
  }
};

export const getTagAnalysis = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recordId } = req.params;

    const record = await UserExerciseRecord.findOne({
      where: { id: Number(recordId), user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "练习记录不存在" });
    }

    const answerDetails = await UserAnswerDetail.findAll({
      where: { record_id: record.id },
      order: [["id", "ASC"]],
    });

    const questionIds = answerDetails.map((d: any) => d.question_id);
    const questions = await Question.findAll({
      where: { id: { [Op.in]: questionIds } },
      attributes: ["id", "tags"],
    });

    const questionMap = new Map<number, any>();
    questions.forEach((q: any) => questionMap.set(q.id, q.toJSON()));

    const tagStats = new Map<string, { totalCount: number; correctCount: number }>();

    for (const detail of answerDetails) {
      const d = detail as any;
      const q = questionMap.get(d.question_id);
      if (!q || !q.tags) continue;

      let tags: string[] = [];
      try {
        const parsed = JSON.parse(q.tags);
        tags = Array.isArray(parsed) ? parsed : [q.tags];
      } catch {
        tags = q.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      }

      for (const tag of tags) {
        const stat = tagStats.get(tag) || { totalCount: 0, correctCount: 0 };
        stat.totalCount++;
        if (d.is_correct === 1) stat.correctCount++;
        tagStats.set(tag, stat);
      }
    }

    const tags = Array.from(tagStats.entries())
      .map(([tag, stat]) => ({
        tag,
        totalCount: stat.totalCount,
        correctCount: stat.correctCount,
        accuracy: stat.totalCount > 0 ? Math.round((stat.correctCount / stat.totalCount) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    res.json({ success: true, data: { tags } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取知识点分析失败" });
  }
};

export const getExerciseResult = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recordId } = req.params;

    const record = await UserExerciseRecord.findOne({
      where: { id: Number(recordId), user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "练习记录不存在" });
    }

    const answerDetails = await UserAnswerDetail.findAll({
      where: { record_id: record.id },
      include: [
        {
          model: User,
          as: "Reviewer",
          attributes: ["id", "username"],
          required: false,
        },
      ],
      order: [["id", "ASC"]],
    });

    const questionIds = answerDetails.map((d: any) => d.question_id);
    const questions = await Question.findAll({
      where: { id: { [Op.in]: questionIds } },
      attributes: ["id", "type", "content", "options", "answer", "score", "difficulty", "analysis", "resource_url"],
    });

    const questionMap = new Map<number, any>();
    questions.forEach((q: any) => questionMap.set(q.id, q.toJSON()));

    const details = answerDetails.map((d: any) => {
      const q = questionMap.get(d.question_id) || {};
      return {
        questionId: d.question_id,
        type: q.type,
        content: q.content,
        options: q.options,
        userAnswer: d.user_answer,
        correctAnswer: q.answer,
        analysis: q.analysis,
        isCorrect: d.is_correct,
        earnedPoints: d.earned_points,
        score: q.score || 1,
        difficulty: q.difficulty,
        resourceUrl: q.resource_url,
        reviewStatus: d.review_status,
        reviewScore: d.review_score,
        reviewComment: d.review_comment,
        reviewerName: d.Reviewer ? d.Reviewer.username : null,
        reviewedAt: d.reviewed_at,
      };
    });

    res.json({
      success: true,
      data: {
        record: {
          id: record.id,
          score: (record as any).score,
          totalScore: (record as any).total_score,
          mode: (record as any).mode,
          startTime: (record as any).start_time,
          submitTime: (record as any).submit_time,
          status: (record as any).status,
        },
        details,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取练习结果失败" });
  }
};

export const getExerciseHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, pageSize = 20 } = req.query;
    const limit = Math.min(Number(pageSize), 50);
    const offset = (Number(page) - 1) * limit;

    const { count, rows } = await UserExerciseRecord.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: QuestionBank,
          attributes: ["id", "name"],
        },
      ],
      order: [["submit_time", "DESC"]],
      limit,
      offset,
    });

    const recordIds = rows.map((r: any) => r.id);
    let pendingMap = new Map<number, number>();
    if (recordIds.length > 0) {
      const pendingCounts: any[] = await UserAnswerDetail.findAll({
        attributes: [
          "record_id",
          [sequelize.fn("COUNT", sequelize.col("id")), "pendingCount"],
        ],
        where: { record_id: { [Op.in]: recordIds }, review_status: 1 },
        group: ["record_id"],
        raw: true,
      });
      pendingCounts.forEach((pc) => pendingMap.set(pc.record_id, Number(pc.pendingCount)));
    }

    const items = rows.map((r: any) => {
      const d = r.toJSON();
      return {
        id: d.id,
        bankId: d.bank_id,
        bankName: d.QuestionBank?.name || "",
        score: d.score,
        totalScore: d.total_score,
        mode: d.mode,
        status: d.status,
        startTime: d.start_time,
        submitTime: d.submit_time,
        pendingReviewCount: pendingMap.get(d.id) || 0,
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
    res.status(500).json({ success: false, message: error.message || "获取练习历史失败" });
  }
};
