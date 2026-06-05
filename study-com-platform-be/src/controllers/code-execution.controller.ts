import { Request, Response } from "express";
import { scanCode } from "../services/code-scanner.service";
import { executeCode, checkDockerAvailable } from "../services/code-executor.service";
import CodeExecution from "../models/code-execution.model";
import Question from "../models/question.model";

const rateLimitMap = new Map<number, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export async function runCode(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { questionId, language, code } = req.body;

    if (!questionId || !language || !code) {
      return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    if (!["python", "javascript"].includes(language)) {
      return res.status(400).json({ success: false, message: "不支持的语言类型" });
    }

    if (code.length > 50000) {
      return res.status(400).json({ success: false, message: "代码长度超限（最大50KB）" });
    }

    const question = await Question.findByPk(questionId);
    if (!question || question.type !== 6) {
      return res.status(400).json({ success: false, message: "题目不存在或非编程题" });
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, message: "操作过于频繁，请稍后再试（每分钟最多10次）" });
    }

    const dockerStatus = await checkDockerAvailable();
    if (!dockerStatus.available) {
      return res.status(503).json({ success: false, message: "Docker服务不可用，请联系管理员" });
    }
    if (!dockerStatus.imagesReady) {
      return res.status(503).json({ success: false, message: "代码执行环境正在初始化，请稍后重试" });
    }

    const scanResult = scanCode(code, language);
    if (!scanResult.safe) {
      await CodeExecution.create({
        user_id: userId,
        question_id: questionId,
        language,
        code,
        status: "blocked",
        blocked_reason: scanResult.violations.join("; "),
      });

      return res.json({
        success: true,
        data: {
          stdout: "",
          stderr: "",
          exitCode: -1,
          executionTimeMs: 0,
          status: "blocked",
          violations: scanResult.violations,
        },
      });
    }

    const result = await executeCode({ code, language });

    await CodeExecution.create({
      user_id: userId,
      question_id: questionId,
      language,
      code,
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
      execution_time_ms: result.executionTimeMs,
      status: result.status,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error("代码执行错误:", err);
    return res.status(500).json({ success: false, message: "服务器内部错误" });
  }
}

export async function submitCode(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { questionId, language, code } = req.body;

    if (!questionId || !language || !code) {
      return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    if (!["python", "javascript"].includes(language)) {
      return res.status(400).json({ success: false, message: "不支持的语言类型" });
    }

    if (code.length > 50000) {
      return res.status(400).json({ success: false, message: "代码长度超限（最大50KB）" });
    }

    const question = await Question.findByPk(questionId);
    if (!question || question.type !== 6) {
      return res.status(400).json({ success: false, message: "题目不存在或非编程题" });
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, message: "操作过于频繁，请稍后再试" });
    }

    const dockerStatus = await checkDockerAvailable();
    if (!dockerStatus.available) {
      return res.status(503).json({ success: false, message: "Docker服务不可用，请联系管理员" });
    }
    if (!dockerStatus.imagesReady) {
      return res.status(503).json({ success: false, message: "代码执行环境正在初始化，请稍后重试" });
    }

    const scanResult = scanCode(code, language);
    if (!scanResult.safe) {
      await CodeExecution.create({
        user_id: userId,
        question_id: questionId,
        language,
        code,
        status: "blocked",
        blocked_reason: scanResult.violations.join("; "),
      });

      return res.json({
        success: true,
        data: {
          status: "blocked",
          violations: scanResult.violations,
          results: [],
          totalPassed: 0,
          totalCases: 0,
          allPassed: false,
        },
      });
    }

    const options = question.options ? JSON.parse(question.options as string) : {};
    const testCases: Array<{ input: string; expectedOutput: string; hidden: boolean }> =
      options.testCases || [];

    if (testCases.length === 0) {
      return res.status(400).json({ success: false, message: "该题目暂无测试用例" });
    }

    const timeLimit = (options.timeLimit || 10) * 1000;
    const memoryLimit = options.memoryLimit || 128;

    const results: Array<{
      index: number;
      passed: boolean;
      input?: string;
      expectedOutput?: string;
      actualOutput: string;
      stderr: string;
      hidden: boolean;
      executionTimeMs: number;
      status: string;
    }> = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const execResult = await executeCode({
        code,
        language,
        stdin: tc.input,
        timeoutMs: timeLimit,
        memoryLimitMb: memoryLimit,
      });

      const actualOutput = execResult.stdout.trim();
      const expectedOutput = tc.expectedOutput.trim();
      const passed = execResult.status === "success" && actualOutput === expectedOutput;

      await CodeExecution.create({
        user_id: userId,
        question_id: questionId,
        language,
        code,
        stdin: tc.input,
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        exit_code: execResult.exitCode,
        execution_time_ms: execResult.executionTimeMs,
        status: execResult.status,
        test_case_index: i,
        passed,
      });

      results.push({
        index: i,
        passed,
        input: tc.hidden ? undefined : tc.input,
        expectedOutput: tc.hidden ? undefined : tc.expectedOutput,
        actualOutput: tc.hidden ? (passed ? "" : "[隐藏用例未通过]") : actualOutput,
        stderr: tc.hidden ? "" : execResult.stderr,
        hidden: tc.hidden,
        executionTimeMs: execResult.executionTimeMs,
        status: execResult.status,
      });

      if (execResult.status === "timeout" || execResult.status === "oom") {
        break;
      }
    }

    const totalPassed = results.filter((r) => r.passed).length;
    const totalCases = testCases.length;

    return res.json({
      success: true,
      data: {
        results,
        totalPassed,
        totalCases,
        allPassed: totalPassed === totalCases,
        status: "completed",
      },
    });
  } catch (err: any) {
    console.error("代码提交错误:", err);
    return res.status(500).json({ success: false, message: "服务器内部错误" });
  }
}

export async function getHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { questionId } = req.params;

    const executions = await CodeExecution.findAll({
      where: { user_id: userId, question_id: questionId, test_case_index: null },
      order: [["created_at", "DESC"]],
      limit: 20,
      attributes: ["id", "language", "code", "status", "execution_time_ms", "created_at"],
    });

    return res.json({ success: true, data: executions });
  } catch (err: any) {
    console.error("获取执行历史错误:", err);
    return res.status(500).json({ success: false, message: "服务器内部错误" });
  }
}
