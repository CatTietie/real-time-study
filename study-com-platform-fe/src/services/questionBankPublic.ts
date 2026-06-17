import api from "./api";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface ProfessionalItem {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
}

export interface CategoryTreeNode {
  id: number;
  professional_id: number;
  parent_id: number | null;
  name: string;
  description?: string;
  sort_order: number;
  children: CategoryTreeNode[];
}

export interface QuestionBankItem {
  id: number;
  name: string;
  category_id: number;
  description?: string;
  question_count: number;
  difficulty: number;
  rating: number;
}

export interface QuestionForPractice {
  id: number;
  type: number;
  content: string;
  options?: { label: string; text: string }[] | Record<string, any>;
  score: number;
  difficulty: number;
  resource_url?: string;
  reason?: string;
}

export interface PracticeQuestionsData {
  questions: QuestionForPractice[];
  bankName: string;
  questionCount: number;
  totalScore: number;
}

export interface AnswerItem {
  questionId: number;
  answer: string;
}

export interface SubmitExercisePayload {
  bankId: number;
  mode: "sequential" | "random" | "simulation" | "intelligent";
  startTime: string;
  answers: AnswerItem[];
  source?: "wrong-book";
}

export interface SubmitResultData {
  recordId: number;
  score: number;
  totalScore: number;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  communityPointsEarned?: number;
  bonusPointsEarned?: number;
}

export interface ExerciseResultDetail {
  questionId: number;
  type: number;
  content: string;
  options?: { label: string; text: string }[];
  userAnswer: string;
  correctAnswer: string;
  analysis: string;
  isCorrect: number;
  earnedPoints: number;
  score: number;
  difficulty: number;
  resourceUrl?: string;
  reviewStatus?: number;
  reviewScore?: number | null;
  reviewComment?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
}

export interface ExerciseResultData {
  record: {
    id: number;
    score: number;
    totalScore: number;
    mode: string;
    startTime: string;
    submitTime: string;
    status: number;
  };
  details: ExerciseResultDetail[];
}

export const fetchProfessionals = async () => {
  const response = await api.get("/question-bank/professionals");
  return response.data;
};

export const fetchCategories = async (professionalId: number) => {
  const response = await api.get("/question-bank/categories", { params: { professionalId } });
  return response.data;
};

export const fetchBanks = async (params?: QueryParams) => {
  const response = await api.get("/question-bank/banks", { params });
  return response.data;
};

export const fetchQuestionsForPractice = async (
  bankId: number,
  mode: string,
  count?: number,
) => {
  const params: QueryParams = { mode };
  if (count) params.count = count;
  const response = await api.get(`/question-bank/banks/${bankId}/questions`, { params });
  return response.data;
};

export const submitExercise = async (payload: SubmitExercisePayload) => {
  const response = await api.post("/question-bank/exercise/submit", payload);
  return response.data;
};

export const fetchExerciseResult = async (recordId: number) => {
  const response = await api.get(`/question-bank/exercise/${recordId}`);
  return response.data;
};

// --- Tag Analysis ---

export interface TagAnalysisItem {
  tag: string;
  totalCount: number;
  correctCount: number;
  accuracy: number;
}

export const fetchTagAnalysis = async (recordId: number) => {
  const response = await api.get(`/question-bank/exercise/${recordId}/tag-analysis`);
  return response.data;
};

// --- Wrong Book ---

export interface WrongBookQuestion {
  type: number;
  content: string;
  options?: { label: string; text: string }[];
  answer: string;
  score: number;
  difficulty: number;
  tags: string;
  analysis: string;
  bankId: number;
  bankName: string;
}

export interface WrongBookItem {
  id: number;
  questionId: number;
  wrongCount: number;
  lastWrongTime: string;
  question: WrongBookQuestion;
}

export interface WrongBookListData {
  items: WrongBookItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export const fetchWrongBook = async (params?: { page?: number; pageSize?: number; bankId?: number }) => {
  const response = await api.get("/question-bank/wrong-book", { params });
  return response.data;
};

export const removeFromWrongBook = async (id: number) => {
  const response = await api.delete(`/question-bank/wrong-book/${id}`);
  return response.data;
};

export const fetchWrongQuestionsForPractice = async (params: {
  bankId?: number;
  questionIds?: number[];
  count?: number;
}) => {
  const response = await api.post("/question-bank/wrong-book/practice", params);
  return response.data;
};

// --- 题目质量反馈 ---

export type FeedbackType = "like" | "dislike";

export interface FeedbackStatus {
  feedbackType: FeedbackType | null;
  likeCount: number;
  dislikeCount: number;
}

export const submitQuestionFeedback = async (questionId: number, feedbackType: FeedbackType) => {
  const response = await api.post(`/question-bank/question/${questionId}/feedback`, { feedbackType });
  return response.data;
};

export const fetchQuestionFeedback = async (questionId: number) => {
  const response = await api.get(`/question-bank/question/${questionId}/feedback`);
  return response.data;
};

// --- Exercise History ---

export interface ExerciseHistoryItem {
  id: number;
  bankId: number;
  bankName: string;
  score: number;
  totalScore: number;
  mode: string;
  status: number;
  startTime: string;
  submitTime: string;
  pendingReviewCount: number;
}

export interface ExerciseHistoryData {
  items: ExerciseHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export const fetchExerciseHistory = async (params?: { page?: number; pageSize?: number }) => {
  const response = await api.get("/question-bank/exercise/history", { params });
  return response.data;
};

// --- Intelligent Exercise (智能组卷) ---

export interface TagMasteryItem {
  tag: string;
  totalCount: number;
  correctCount: number;
  masteryRate: number;
  effectiveMasteryRate: number;
  lastPracticeTime: string;
}

export interface TagMasteryData {
  tags: TagMasteryItem[];
  overallMastery: number;
}

export interface IntelligentGeneratePayload {
  bankId: number;
  questionCount: number;
}

export interface IntelligentPaperData {
  questions: QuestionForPractice[];
  bankName: string;
  questionCount: number;
  totalScore: number;
  distribution: {
    weaknessReinforce: number;
    wrongBookConsolidate: number;
    expansion: number;
  };
  targetTags: string[];
  coldStart: boolean;
}

export const fetchTagMastery = async (bankId: number) => {
  const response = await api.get("/question-bank/tag-mastery", { params: { bankId } });
  return response.data;
};

export const generateIntelligentPaper = async (payload: IntelligentGeneratePayload) => {
  const response = await api.post("/question-bank/intelligent/generate", payload);
  return response.data;
};

// --- Code Execution (代码执行) ---

export interface CodeExecutePayload {
  questionId: number;
  language: "python" | "javascript";
  code: string;
}

export const executeCode = async (payload: CodeExecutePayload) => {
  const response = await api.post("/question-bank/code/execute", payload);
  return response.data;
};

export const submitCode = async (payload: CodeExecutePayload) => {
  const response = await api.post("/question-bank/code/submit", payload);
  return response.data;
};

export const fetchCodeHistory = async (questionId: number) => {
  const response = await api.get(`/question-bank/code/history/${questionId}`);
  return response.data;
};
