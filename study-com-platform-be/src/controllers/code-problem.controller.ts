import { Request, Response } from "express";
import CodeProblem from "../models/code-problem.model";
import ProblemTestCase from "../models/problem-test-case.model";
import { Op } from "sequelize";

export const createProblem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      title,
      description,
      difficulty,
      time_limit,
      memory_limit,
      languages,
      template_code,
      sample_input,
      sample_output,
      hint,
      status,
    } = req.body;

    if (!title || !description || !difficulty || !languages) {
      return res
        .status(400)
        .json({ success: false, message: "缺少必填字段" });
    }

    const problem = await CodeProblem.create({
      title,
      description,
      difficulty,
      time_limit: time_limit || 10,
      memory_limit: memory_limit || 128,
      languages: JSON.stringify(languages),
      template_code: template_code ? JSON.stringify(template_code) : null,
      sample_input: sample_input || null,
      sample_output: sample_output || null,
      hint: hint || null,
      status: status || "draft",
      created_by: userId,
    });

    res.status(201).json({ success: true, data: problem });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProblems = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      pageSize = "20",
      difficulty,
      status,
      keyword,
    } = req.query;

    const where: any = {};
    if (difficulty) where.difficulty = difficulty;
    if (status) where.status = status;
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const { rows, count } = await CodeProblem.findAndCountAll({
      where,
      limit,
      offset,
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

export const getProblemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await CodeProblem.findByPk(id, {
      include: [
        {
          model: ProblemTestCase,
          as: "TestCases",
          order: [["sort_order", "ASC"]],
        },
      ],
    });

    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    res.json({ success: true, data: problem });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProblem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await CodeProblem.findByPk(id);
    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    const {
      title,
      description,
      difficulty,
      time_limit,
      memory_limit,
      languages,
      template_code,
      sample_input,
      sample_output,
      hint,
      status,
    } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (time_limit !== undefined) updateData.time_limit = time_limit;
    if (memory_limit !== undefined) updateData.memory_limit = memory_limit;
    if (languages !== undefined)
      updateData.languages = JSON.stringify(languages);
    if (template_code !== undefined)
      updateData.template_code = template_code
        ? JSON.stringify(template_code)
        : null;
    if (sample_input !== undefined) updateData.sample_input = sample_input;
    if (sample_output !== undefined) updateData.sample_output = sample_output;
    if (hint !== undefined) updateData.hint = hint;
    if (status !== undefined) updateData.status = status;

    await problem.update(updateData);
    res.json({ success: true, data: problem });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProblem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await CodeProblem.findByPk(id);
    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    await ProblemTestCase.destroy({ where: { problem_id: id } });
    await problem.destroy();
    res.json({ success: true, message: "删除成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleProblemStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["draft", "published"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "状态值无效" });
    }

    const problem = await CodeProblem.findByPk(id);
    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    await problem.update({ status });
    res.json({ success: true, data: problem });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== 测试用例管理 =====

export const createTestCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { input, expected_output, is_hidden, sort_order } = req.body;

    if (input === undefined || expected_output === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "input 和 expected_output 为必填" });
    }

    const problem = await CodeProblem.findByPk(id);
    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    const testCase = await ProblemTestCase.create({
      problem_id: parseInt(id),
      input,
      expected_output,
      is_hidden: is_hidden || false,
      sort_order: sort_order || 0,
    });

    res.status(201).json({ success: true, data: testCase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTestCases = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const testCases = await ProblemTestCase.findAll({
      where: { problem_id: id },
      order: [["sort_order", "ASC"]],
    });

    res.json({ success: true, data: testCases });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTestCase = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const testCase = await ProblemTestCase.findByPk(caseId);
    if (!testCase) {
      return res
        .status(404)
        .json({ success: false, message: "用例不存在" });
    }

    const { input, expected_output, is_hidden, sort_order } = req.body;
    const updateData: any = {};
    if (input !== undefined) updateData.input = input;
    if (expected_output !== undefined)
      updateData.expected_output = expected_output;
    if (is_hidden !== undefined) updateData.is_hidden = is_hidden;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    await testCase.update(updateData);
    res.json({ success: true, data: testCase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTestCase = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const testCase = await ProblemTestCase.findByPk(caseId);
    if (!testCase) {
      return res
        .status(404)
        .json({ success: false, message: "用例不存在" });
    }

    await testCase.destroy();
    res.json({ success: true, message: "删除成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const batchCreateTestCases = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { test_cases } = req.body;

    if (!Array.isArray(test_cases) || test_cases.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "test_cases 不能为空" });
    }

    const problem = await CodeProblem.findByPk(id);
    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "题目不存在" });
    }

    const records = test_cases.map((tc: any, index: number) => ({
      problem_id: parseInt(id),
      input: tc.input,
      expected_output: tc.expected_output,
      is_hidden: tc.is_hidden || false,
      sort_order: tc.sort_order !== undefined ? tc.sort_order : index,
    }));

    const created = await ProblemTestCase.bulkCreate(records);
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
