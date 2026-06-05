import { Request, Response } from "express";
import { generateIntelligentPaper, getTagMasteryForBank } from "../services/intelligent-exercise.service";
import QuestionBank from "../models/question-bank.model";

export const getTagMastery = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bankId = Number(req.query.bankId);

    if (!bankId) {
      return res.status(400).json({ success: false, message: "bankId 参数必填" });
    }

    const data = await getTagMasteryForBank(userId, bankId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("getTagMastery error:", error);
    res.status(500).json({ success: false, message: "获取知识点掌握数据失败" });
  }
};

export const generatePaper = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { bankId, questionCount = 20 } = req.body;

    if (!bankId) {
      return res.status(400).json({ success: false, message: "bankId 参数必填" });
    }

    const count = Math.max(1, Math.min(50, Number(questionCount)));

    const bank = await QuestionBank.findByPk(bankId);
    if (!bank) {
      return res.status(404).json({ success: false, message: "题库不存在" });
    }

    const result = await generateIntelligentPaper(userId, bankId, count);

    if (result.questionCount === 0) {
      return res.status(400).json({ success: false, message: "该题库暂无可用题目" });
    }

    result.bankName = (bank as any).name;

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("generateIntelligentPaper error:", error);
    res.status(500).json({ success: false, message: "智能组卷失败" });
  }
};
