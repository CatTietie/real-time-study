export interface Post {
    id: string;
    title: string;
    content: string;
    author: string;
    likes: number;
    comments: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreatePostRequest {
    title: string;
    content: string;
}
export interface UpdatePostRequest {
    title?: string;
    content?: string;
}
export interface PostResponse {
    id: string;
    title: string;
    content: string;
    author: string;
    likes: number;
    comments: number;
    createdAt: Date;
}
//# sourceMappingURL=post.types.d.ts.map