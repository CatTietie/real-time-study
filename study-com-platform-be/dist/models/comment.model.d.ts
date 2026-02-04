import { Model } from "sequelize";
export declare class Comment extends Model {
    id: number;
    post_id: number;
    user_id: number;
    content: string;
    status: number;
    createdAt: Date;
}
export default Comment;
//# sourceMappingURL=comment.model.d.ts.map