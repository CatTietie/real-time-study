import { Model } from "sequelize";
export declare class Post extends Model {
    id: number;
    user_id: number;
    title: string;
    content: string;
    status: number;
    view_count: number;
    like_count: number;
    comment_count: number;
    is_top: number;
    createdAt: Date;
    updatedAt: Date;
}
export default Post;
//# sourceMappingURL=post.model.d.ts.map