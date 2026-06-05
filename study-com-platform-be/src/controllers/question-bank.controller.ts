import { Request, Response } from "express";
import { Op } from "sequelize";
import Question from "../models/question.model";
import QuestionBank from "../models/question-bank.model";
import Professional from "../models/professional.model";
import Category from "../models/category.model";

export const getProfessionals = async (req: Request, res: Response) => {
  try {
    const professionals = await Professional.findAll({
      where: { status: 1 },
      order: [["sort_order", "ASC"]],
    });
    res.json({ success: true, data: professionals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取专业列表失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { professional_id } = req.query;
    if (!professional_id) {
      return res.status(400).json({ success: false, message: "professional_id为必填参数" });
    }
    const categories = await Category.findAll({
      where: { professional_id: Number(professional_id), status: 1 },
      order: [["sort_order", "ASC"]],
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取分类列表失败";
    res.status(500).json({ success: false, message });
  }
};

export const createBank = async (req: Request, res: Response) => {
  try {
    const { name, category_id, description, difficulty, status } = req.body;
    if (!name || !category_id) {
      return res.status(400).json({ success: false, message: "题库名称和分类ID为必填项" });
    }
    const bank = await QuestionBank.create({ name, category_id, description, difficulty, status });
    res.json({ success: true, data: bank, message: "题库创建成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建题库失败";
    res.status(500).json({ success: false, message });
  }
};

export const getBanks = async (req: Request, res: Response) => {
  try {
    const { keyword, category_id } = req.query;
    const where: any = {};
    if (keyword) where.name = { [Op.like]: `%${keyword}%` };
    if (category_id) where.category_id = Number(category_id);

    const banks = await QuestionBank.findAll({
      where,
      include: [
        {
          model: Category,
          required: false,
          attributes: ["id", "name", "professional_id"],
          include: [{ model: Professional, required: false, attributes: ["id", "name"] }],
        },
      ],
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: banks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取题库列表失败";
    res.status(500).json({ success: false, message });
  }
};

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { bank_id, type, content, options, answer, score, difficulty, tags, analysis } = req.body;
    if (!bank_id || !type || !content || !answer) {
      return res.status(400).json({ success: false, message: "bank_id、type、content、answer为必填项" });
    }
    const bank = await QuestionBank.findByPk(bank_id);
    if (!bank) {
      return res.status(400).json({ success: false, message: "题库不存在" });
    }
    const question = await Question.create({
      bank_id, type, content,
      options: options ? JSON.stringify(options) : null,
      answer, score, difficulty, tags, analysis,
    });
    await bank.increment("question_count");
    res.json({ success: true, data: question, message: "题目创建成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建题目失败";
    res.status(500).json({ success: false, message });
  }
};

const difficultyMap: Record<string, number> = { easy: 1, simple: 2, medium: 3, hard: 4, veryhard: 5 };
const validTypes = [1, 2, 3, 4, 5, 6];

export const batchImportQuestions = async (req: Request, res: Response) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "请提供有效的JSON数组" });
    }

    const errors: string[] = [];
    items.forEach((item: any, index: number) => {
      const row = index + 1;
      if (!item.bankId && item.bankId !== 0) errors.push(`第${row}条: 缺少bankId`);
      if (!item.type) errors.push(`第${row}条: 缺少type`);
      else if (!validTypes.includes(Number(item.type))) errors.push(`第${row}条: type值无效(应为1-6)`);
      if (!item.stem && !item.content) errors.push(`第${row}条: 缺少stem(题干)`);
      if (!item.answer && item.answer !== 0) errors.push(`第${row}条: 缺少answer`);
      if (item.options && !Array.isArray(item.options)) errors.push(`第${row}条: options必须为数组`);
    });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: "数据校验失败", errors });
    }

    const bankIds = [...new Set(items.map((item: any) => Number(item.bankId)))];
    const banks = await QuestionBank.findAll({ where: { id: bankIds } });
    const existingBankIds = new Set(banks.map((b) => b.id));
    const invalidIds = bankIds.filter((id) => !existingBankIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: `以下题库ID不存在: ${invalidIds.join(", ")}` });
    }

    const transformed = items.map((item: any) => {
      const optionsArray = Array.isArray(item.options)
        ? item.options.map((opt: any, i: number) => {
            if (typeof opt === "string") return { label: String.fromCharCode(65 + i), text: opt };
            if (typeof opt === "object" && opt.text) return { label: opt.label || String.fromCharCode(65 + i), text: opt.text };
            return { label: String.fromCharCode(65 + i), text: String(opt) };
          })
        : null;
      const difficulty = typeof item.difficulty === "string"
        ? (difficultyMap[item.difficulty.toLowerCase()] || 3)
        : (Number(item.difficulty) || 3);
      return {
        bank_id: Number(item.bankId),
        type: Number(item.type),
        content: String(item.stem || item.content),
        options: optionsArray ? JSON.stringify(optionsArray) : undefined,
        answer: String(item.answer),
        score: Number(item.score) || 1,
        difficulty: Math.min(5, Math.max(1, difficulty)),
        tags: item.tags ? String(item.tags) : undefined,
        analysis: item.analysis ? String(item.analysis) : undefined,
      };
    });

    const created = await Question.bulkCreate(transformed);

    const countByBank: Record<number, number> = {};
    transformed.forEach((q) => {
      countByBank[q.bank_id] = (countByBank[q.bank_id] || 0) + 1;
    });
    for (const [bankId, count] of Object.entries(countByBank)) {
      await QuestionBank.increment("question_count", { by: count, where: { id: Number(bankId) } });
    }

    res.json({ success: true, data: created, message: `成功导入${created.length}道题目` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量导入失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ success: false, message: "题目不存在" });
    }
    const { type, content, options, answer, score, difficulty, tags, analysis, status } = req.body;
    const oldStatus = question.status;
    await question.update({
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(options !== undefined && { options: JSON.stringify(options) }),
      ...(answer !== undefined && { answer }),
      ...(score !== undefined && { score }),
      ...(difficulty !== undefined && { difficulty }),
      ...(tags !== undefined && { tags }),
      ...(analysis !== undefined && { analysis }),
      ...(status !== undefined && { status }),
    });

    if (status !== undefined && status !== oldStatus) {
      if (oldStatus === 1 && status === 0) {
        await QuestionBank.decrement("question_count", { where: { id: question.bank_id } });
      } else if (oldStatus === 0 && status === 1) {
        await QuestionBank.increment("question_count", { where: { id: question.bank_id } });
      }
    }

    res.json({ success: true, data: question, message: "题目更新成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新题目失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ success: false, message: "题目不存在" });
    }
    const bankId = question.bank_id;
    await question.destroy();
    await QuestionBank.decrement("question_count", { where: { id: bankId } });
    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除题目失败";
    res.status(500).json({ success: false, message });
  }
};

export const getBankQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const { type, difficulty, keyword } = req.query;

    const where: any = { bank_id: id };
    if (type) where.type = Number(type);
    if (difficulty) where.difficulty = Number(difficulty);
    if (keyword) where.content = { [Op.like]: `%${keyword}%` };

    const { rows, count } = await Question.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { page, pageSize, total: count },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取题目列表失败";
    res.status(500).json({ success: false, message });
  }
};
