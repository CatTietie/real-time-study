import { Request, Response } from "express";
import CodeProblem from "../models/code-problem.model";
import ProblemTestCase from "../models/problem-test-case.model";
import CodeSubmission from "../models/code-submission.model";
import { judgeSubmission } from "../services/code-judge.service";
import { renderMarkdown } from "../utils/markdown";
import { Op } from "sequelize";

const submitRateLimit = new Map<number, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const timestamps = submitRateLimit.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  submitRateLimit.set(userId, recent);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  return true;
}

export const listPublishedProblems = async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "20", difficulty, keyword } = req.query;

    const where: any = { status: "published" };
    if (difficulty) where.difficulty = difficulty;
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const { rows, count } = await CodeProblem.findAndCountAll({
      where,
      limit,
      offset,
      attributes: [
        "id",
        "title",
        "difficulty",
        "time_limit",
        "memory_limit",
        "languages",
        "status",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page as string),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProblemDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await CodeProblem.findOne({
      where: { id, status: "published" },
      include: [
        {
          model: ProblemTestCase,
          as: "TestCases",
          where: { is_hidden: false },
          required: false,
          attributes: ["id", "input", "expected_output", "sort_order"],
          order: [["sort_order", "ASC"]],
        },
      ],
    });

    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    const data = problem.toJSON() as any;
    data.description = renderMarkdown(data.description);
    if (data.hint) {
      data.hint = renderMarkdown(data.hint);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { language, code } = req.body;

    if (!language || !code) {
      return res
        .status(400)
        .json({ success: false, message: "language 和 code 为必填" });
    }

    if (!["python", "javascript"].includes(language)) {
      return res
        .status(400)
        .json({ success: false, message: "不支持的语言" });
    }

    if (!checkRateLimit(userId)) {
      return res
        .status(429)
        .json({ success: false, message: "提交过于频繁，请稍后再试" });
    }

    const problem = await CodeProblem.findOne({
      where: { id, status: "published" },
    });
    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    const languages: string[] =
      typeof problem.languages === "string"
        ? JSON.parse(problem.languages)
        : problem.languages;
    if (!languages.includes(language)) {
      return res
        .status(400)
        .json({ success: false, message: "该题目不支持此语言" });
    }

    const result = await judgeSubmission({
      userId,
      problemId: parseInt(id),
      language,
      code,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubmissionHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { page = "1", pageSize = "20" } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const { rows, count } = await CodeSubmission.findAndCountAll({
      where: { user_id: userId, problem_id: id },
      limit,
      offset,
      attributes: [
        "id",
        "language",
        "total_cases",
        "passed_cases",
        "status",
        "score",
        "execution_time_ms",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page as string),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
