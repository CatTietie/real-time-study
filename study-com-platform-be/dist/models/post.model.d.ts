import { Model } from "sequelize";
export declare class Post extends Model {
    id: number;
    user_id: number;
    title: string;
    category?: string;
    tags?: string;
    content: string;
    status: number;
    publish_status: number;
    audit_admin_id?: number;
    audit_reason?: string;
    audit_at?: Date;
    view_count: number;
    like_count: number;
    comment_count: number;
    is_top: number;
    edit_count: number;
    last_edited_at?: Date;
    images?: string;
    deleted_at?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export default Post;
//# sourceMappingURL=post.model.d.ts.map