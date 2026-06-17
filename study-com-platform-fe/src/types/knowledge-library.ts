export interface KnowledgeCategory {
  id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  sort_order: number;
  icon: string | null;
  status: number;
  created_at: string;
  updated_at: string;
  children?: KnowledgeCategory[];
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  category_id: number | null;
  uploader_id: number;
  file_type: "pdf" | "word" | "ppt" | "image" | "other";
  original_url: string;
  original_filename: string;
  preview_url: string | null;
  file_size: number;
  content_text: string | null;
  tags: string | null;
  status: "pending_review" | "approved" | "rejected" | "archived";
  download_count: number;
  view_count: number;
  current_version: number;
  created_at: string;
  updated_at: string;
  Uploader?: {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
  };
  Category?: {
    id: number;
    name: string;
  } | null;
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  original_url: string;
  preview_url: string | null;
  file_size: number;
  content_text: string | null;
  change_summary: string | null;
  creator_id: number;
  created_at: string;
  Creator?: {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
  };
}

export interface DocumentAnnotation {
  id: number;
  document_id: number;
  user_id: number;
  content: string;
  page_number: number;
  position_x: number;
  position_y: number;
  highlight_rects: string | null;
  quoted_text: string | null;
  parent_id: number | null;
  status: "active" | "resolved";
  created_at: string;
  updated_at: string;
  Author?: {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
  };
  Replies?: DocumentAnnotation[];
}

export interface DocumentViewer {
  userId: number;
  username: string;
  nickname: string;
  avatar: string;
}

export interface CreateAnnotationPayload {
  content: string;
  page_number: number;
  position_x: number;
  position_y: number;
  highlight_rects?: number[][];
  quoted_text?: string;
  parent_id?: number;
}

export interface KnowledgeStats {
  totalDocuments: number;
  pendingReview: number;
  approved: number;
  totalCategories: number;
  byFileType: Array<{ file_type: string; count: number }>;
}

// ===== 文档权限 =====

export type DocumentPermissionLevel = "view" | "comment" | "edit" | "manage";

export interface DocumentPermissionRecord {
  id: number;
  document_id: number;
  target_type: "all" | "role" | "user";
  target_id: number | null;
  permission_level: DocumentPermissionLevel;
  granted_by: number;
  created_at: string;
  GrantedByUser?: {
    id: number;
    username: string;
    nickname: string;
  };
  TargetUser?: {
    id: number;
    username: string;
    nickname: string;
  } | null;
}
