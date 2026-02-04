import Post from "../models/post.model";
export declare const createPost: (postData: any) => Promise<Post>;
export declare const getPostById: (id: number) => Promise<Post | null>;
export declare const getAllPosts: () => Promise<Post[]>;
export declare const updatePost: (id: number, data: any) => Promise<[affectedCount: number]>;
export declare const deletePost: (id: number) => Promise<number>;
export declare const getPostsByAuthor: (author: string) => Promise<Post[]>;
//# sourceMappingURL=post.service.d.ts.map