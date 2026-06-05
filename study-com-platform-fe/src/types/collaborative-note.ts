export interface CollaborativeNote {
  id: number;
  title: string;
  content_html: string | null;
  creator_id: number;
  room_id: number | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface NoteCollaborator {
  userId: number;
  username: string;
  nickname: string;
  avatar: string | null;
  color: string;
  isOnline: boolean;
}

export interface NoteVersion {
  id: number;
  note_id: number;
  version_number: number;
  creator_id: number;
  created_at: string;
  content_html?: string;
  User?: {
    id: number;
    username: string;
    nickname: string;
    avatar: string | null;
  };
}

export interface NoteComment {
  id: number;
  note_id: number;
  user_id: number;
  content: string;
  position_start: string;
  position_end: string;
  quoted_text: string | null;
  parent_id: number | null;
  status: "active" | "resolved";
  created_at: string;
  updated_at: string;
  User?: {
    id: number;
    username: string;
    nickname: string;
    avatar: string | null;
  };
  Replies?: NoteComment[];
}
