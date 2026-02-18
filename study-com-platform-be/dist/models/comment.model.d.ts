import { Model } from "sequelize";
export declare class Comment extends Model {
    id: number;
    post_id: number;
    user_id: number;
    parent_id?: number;
    content: string;
    status: number;
    like_count: number;
    is_deleted: number;
    deleted_at?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export default Comment;
//# sourceMappingURL=comment.model.d.ts.map