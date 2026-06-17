import { Request, Response } from "express";
import { Op } from "sequelize";
import WrongBook from "../models/wrong-book.model";
import Question from "../models/question.model";
import QuestionBank from "../models/question-bank.model";

export const getWrongBookList = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, pageSize = 20, bankId } = req.query;

    const whereClause: any = { user_id: userId };
    const questionWhere: any = { status: 1 };

    if (bankId) {
      questionWhere.bank_id = Number(bankId);
    }

    const offset = (Number(page) - 1) * Number(pageSize);

    const { count, rows } = await WrongBook.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Question,
          where: questionWhere,
          attributes: ["id", "type", "content", "options", "answer", "score", "difficulty", "tags", "analysis", "bank_id"],
          include: [
            {
              model: QuestionBank,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["last_wrong_time", "DESC"]],
      limit: Number(pageSize),
      offset,
    });

    const items = rows.map((row: any) => {
      const r = row.toJSON();
      return {
        id: r.id,
        questionId: r.question_id,
        wrongCount: r.wrong_count,
        lastWrongTime: r.last_wrong_time,
        question: {
          type: r.Question.type,
          content: r.Question.content,
          options: r.Question.options,
          answer: r.Question.answer,
          score: r.Question.score,
          difficulty: r.Question.difficulty,
          tags: r.Question.tags,
          analysis: r.Question.analysis,
          bankId: r.Question.bank_id,
          bankName: r.Question.QuestionBank?.name || "",
        },
      };
    });

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total: count,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取错题本失败" });
  }
};

export const removeWrongBookEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const entry = await WrongBook.findOne({
      where: { id: Number(id), user_id: userId },
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: "错题记录不存在" });
    }

    await entry.destroy();

    res.json({ success: true, message: "已从错题本移除" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "删除失败" });
  }
};

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const getWrongQuestionsForPractice = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { bankId, questionIds, count } = req.body;

    let whereClause: any = { user_id: userId };

    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      whereClause.question_id = { [Op.in]: questionIds };
    }

    const wrongEntries = await WrongBook.findAll({
      where: whereClause,
      attributes: ["question_id"],
    });

    const wrongQuestionIds = wrongEntries.map((e: any) => e.question_id);

    if (wrongQuestionIds.length === 0) {
      return res.json({
        success: true,
        data: {
          questions: [],
          bankName: "错题强化练习",
          questionCount: 0,
          totalScore: 0,
        },
      });
    }

    const questionWhere: any = { id: { [Op.in]: wrongQuestionIds }, status: 1 };
    if (bankId) {
      questionWhere.bank_id = Number(bankId);
    }

    let questions = await Question.findAll({
      where: questionWhere,
      attributes: ["id", "type", "content", "options", "score", "difficulty", "resource_url", "bank_id"],
      order: [["id", "ASC"]],
    });

    if (count && Number(count) < questions.length) {
      questions = shuffleArray(questions).slice(0, Number(count));
    }

    const totalScore = questions.reduce((sum, q: any) => sum + (q.score || 1), 0);

    res.json({
      success: true,
      data: {
        questions: questions.map((q: any) => {
          const json = q.toJSON();
          delete json.bank_id;
          return json;
        }),
        bankName: "错题强化练习",
        questionCount: questions.length,
        totalScore,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取错题练习失败" });
  }
};
