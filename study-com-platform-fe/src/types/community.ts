export interface Post {
  id: number;
  title: string;
  content: string;
  user_id: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}
