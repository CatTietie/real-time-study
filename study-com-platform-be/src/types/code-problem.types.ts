export interface CreateCodeProblemDto {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit?: number;
  memory_limit?: number;
  languages: ("python" | "javascript")[];
  template_code?: { python?: string; javascript?: string };
  sample_input?: string;
  sample_output?: string;
  hint?: string;
  status?: "draft" | "published";
}

export interface CreateTestCaseDto {
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  sort_order?: number;
}

export interface JudgeResult {
  case_index: number;
  passed: boolean;
  is_hidden: boolean;
  actual_output?: string;
  expected_output?: string;
  execution_time_ms: number;
  status: "passed" | "wrong_answer" | "error" | "timeout" | "oom";
}

export interface SubmissionResult {
  submission_id: number;
  status: "accepted" | "wrong_answer" | "error" | "timeout";
  score: number;
  total_cases: number;
  passed_cases: number;
  execution_time_ms: number;
  results: JudgeResult[];
}
