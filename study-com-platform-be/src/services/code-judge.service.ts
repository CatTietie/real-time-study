import { scanCode } from "./code-scanner.service";
import { executeCode, checkDockerAvailable } from "./code-executor.service";
import CodeProblem from "../models/code-problem.model";
import ProblemTestCase from "../models/problem-test-case.model";
import CodeSubmission from "../models/code-submission.model";
import { JudgeResult, SubmissionResult } from "../types/code-problem.types";

function normalizeOutput(output: string): string {
  return output.replace(/\s+$/gm, "").trim();
}

export async function judgeSubmission(params: {
  userId: number;
  problemId: number;
  language: "python" | "javascript";
  code: string;
}): Promise<SubmissionResult> {
  const { userId, problemId, language, code } = params;

  const docker = await checkDockerAvailable();
  if (!docker.available) {
    throw new Error("代码执行服务不可用");
  }

  const scanResult = scanCode(code, language);
  if (!scanResult.safe) {
    const submission = await CodeSubmission.create({
      user_id: userId,
      problem_id: problemId,
      language,
      code,
      status: "error",
      total_cases: 0,
      passed_cases: 0,
      score: 0,
      execution_time_ms: 0,
    });
    return {
      submission_id: submission.id,
      status: "error",
      score: 0,
      total_cases: 0,
      passed_cases: 0,
      execution_time_ms: 0,
      results: [],
    };
  }

  const problem = await CodeProblem.findByPk(problemId);
  if (!problem) {
    throw new Error("题目不存在");
  }

  const testCases = await ProblemTestCase.findAll({
    where: { problem_id: problemId },
    order: [["sort_order", "ASC"]],
  });

  if (testCases.length === 0) {
    throw new Error("该题目暂无测试用例");
  }

  const submission = await CodeSubmission.create({
    user_id: userId,
    problem_id: problemId,
    language,
    code,
    status: "judging",
    total_cases: testCases.length,
    passed_cases: 0,
    score: 0,
    execution_time_ms: 0,
  });

  const results: JudgeResult[] = [];
  let passedCount = 0;
  let maxTimeMs = 0;
  let finalStatus: "accepted" | "wrong_answer" | "error" | "timeout" =
    "accepted";
  let earlyStop = false;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    let execResult;
    try {
      execResult = await executeCode({
        code,
        language,
        stdin: tc.input,
        timeoutMs: problem.time_limit * 1000,
        memoryLimitMb: problem.memory_limit,
      });
    } catch (err: any) {
      const msg = (err.message || "").toLowerCase();
      const isTimeout =
        msg.includes("timeout") ||
        msg.includes("timed out") ||
        msg.includes("killed") ||
        msg.includes("sigkill") ||
        msg.includes("signal");
      results.push({
        case_index: i,
        passed: false,
        is_hidden: tc.is_hidden,
        actual_output: tc.is_hidden ? undefined : isTimeout ? "[超时]" : err.message,
        expected_output: tc.is_hidden ? undefined : tc.expected_output,
        execution_time_ms: problem.time_limit * 1000,
        status: isTimeout ? "timeout" : "error",
      });
      finalStatus = isTimeout ? "timeout" : "error";
      earlyStop = true;
      break;
    }

    const timeMs = execResult.executionTimeMs || 0;
    if (timeMs > maxTimeMs) maxTimeMs = timeMs;

    const isTimeoutBySignal =
      execResult.status === "error" &&
      execResult.executionTimeMs >= problem.time_limit * 1000 * 0.9;

    if (execResult.status === "timeout" || isTimeoutBySignal) {
      results.push({
        case_index: i,
        passed: false,
        is_hidden: tc.is_hidden,
        actual_output: tc.is_hidden ? undefined : "[超时]",
        expected_output: tc.is_hidden ? undefined : tc.expected_output,
        execution_time_ms: timeMs,
        status: "timeout",
      });
      finalStatus = "timeout";
      earlyStop = true;
      break;
    }

    if (execResult.status === "oom") {
      results.push({
        case_index: i,
        passed: false,
        is_hidden: tc.is_hidden,
        actual_output: tc.is_hidden ? undefined : "[内存超限]",
        expected_output: tc.is_hidden ? undefined : tc.expected_output,
        execution_time_ms: timeMs,
        status: "oom",
      });
      finalStatus = "error";
      earlyStop = true;
      break;
    }

    if (execResult.status === "error") {
      results.push({
        case_index: i,
        passed: false,
        is_hidden: tc.is_hidden,
        actual_output: tc.is_hidden ? undefined : execResult.stderr || execResult.stdout,
        expected_output: tc.is_hidden ? undefined : tc.expected_output,
        execution_time_ms: timeMs,
        status: "error",
      });
      if (finalStatus === "accepted") finalStatus = "error";
      continue;
    }

    const actual = normalizeOutput(execResult.stdout);
    const expected = normalizeOutput(tc.expected_output);
    const passed = actual === expected;

    if (passed) {
      passedCount++;
    } else if (finalStatus === "accepted") {
      finalStatus = "wrong_answer";
    }

    results.push({
      case_index: i,
      passed,
      is_hidden: tc.is_hidden,
      actual_output: tc.is_hidden ? undefined : execResult.stdout,
      expected_output: tc.is_hidden ? undefined : tc.expected_output,
      execution_time_ms: timeMs,
      status: passed ? "passed" : "wrong_answer",
    });
  }

  if (!earlyStop && passedCount === testCases.length) {
    finalStatus = "accepted";
  }

  const score = Math.round((passedCount / testCases.length) * 100);

  await submission.update({
    status: finalStatus,
    passed_cases: passedCount,
    score,
    execution_time_ms: maxTimeMs,
  });

  return {
    submission_id: submission.id,
    status: finalStatus,
    score,
    total_cases: testCases.length,
    passed_cases: passedCount,
    execution_time_ms: maxTimeMs,
    results,
  };
}
