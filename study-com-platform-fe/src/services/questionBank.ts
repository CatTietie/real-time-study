import api from "./api";

export const fetchProfessionals = async () => {
  const response = await api.get("/admin/professionals");
  return response.data;
};

export const fetchCategories = async (professional_id: number) => {
  const response = await api.get("/admin/categories", { params: { professional_id } });
  return response.data;
};

export const fetchBanks = async (params?: { keyword?: string; category_id?: number }) => {
  const response = await api.get("/admin/banks", { params });
  return response.data;
};

export const createBank = async (payload: { name: string; category_id: number; description?: string }) => {
  const response = await api.post("/admin/bank", payload);
  return response.data;
};

export const fetchBankQuestions = async (bankId: number, params?: Record<string, any>) => {
  const response = await api.get(`/admin/bank/${bankId}/questions`, { params });
  return response.data;
};

export const createQuestion = async (payload: any) => {
  const response = await api.post("/admin/question", payload);
  return response.data;
};

export const batchImportQuestions = async (questions: any[]) => {
  const response = await api.post("/admin/question/batch", questions);
  return response.data;
};

export const updateQuestion = async (id: number, payload: any) => {
  const response = await api.put(`/admin/question/${id}`, payload);
  return response.data;
};

export const deleteQuestion = async (id: number) => {
  const response = await api.delete(`/admin/question/${id}`);
  return response.data;
};

export const fetchQuestionFeedbackStats = async (params?: { page?: number; pageSize?: number; bankId?: number }) => {
  const response = await api.get("/admin/questions/feedback-stats", { params });
  return response.data;
};

// --- 主观题批改 ---

export interface ReviewListParams {
  page?: number;
  pageSize?: number;
  bankId?: number;
  status?: number;
}

export interface ReviewItem {
  detailId: number;
  recordId: number;
  studentName: string;
  studentId: number;
  questionId: number;
  questionContent: string;
  questionOptions?: { label: string; text: string }[];
  questionType: number;
  userAnswer: string;
  referenceAnswer: string;
  analysis: string;
  maxScore: number;
  bankName: string;
  bankId: number;
  submittedAt: string;
  reviewStatus: number;
  reviewScore?: number | null;
  reviewComment?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
}

export interface ReviewStatsData {
  pendingCount: number;
  reviewedTodayCount: number;
}

export const fetchExerciseReviews = async (params?: ReviewListParams) => {
  const response = await api.get("/admin/exercise/reviews", { params });
  return response.data;
};

export const fetchExerciseReviewStats = async () => {
  const response = await api.get("/admin/exercise/reviews/stats");
  return response.data;
};

export const gradeExerciseAnswer = async (detailId: number, payload: { score: number; comment?: string }) => {
  const response = await api.put(`/admin/exercise/review/${detailId}`, payload);
  return response.data;
};

export const batchGradeExerciseAnswers = async (items: Array<{ detailId: number; score: number; comment?: string }>) => {
  const response = await api.post("/admin/exercise/review/batch", { items });
  return response.data;
};
