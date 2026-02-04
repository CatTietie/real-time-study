import { Model } from "sequelize";
export declare class AdminLog extends Model {
    id: number;
    admin_id: number;
    action_type: string;
    target_table?: string;
    target_id?: number;
    detail?: string;
    ip_address?: string;
    createdAt: Date;
}
export default AdminLog;
//# sourceMappingURL=admin-log.model.d.ts.map