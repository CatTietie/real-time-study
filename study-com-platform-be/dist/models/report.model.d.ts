import { Model } from "sequelize";
export declare class Report extends Model {
    id: number;
    reporter_id: number;
    target_type: "post" | "comment";
    target_id: number;
    reason: string;
    status: number;
    handle_result?: string;
    handler_admin_id?: number;
    handled_at?: Date;
    createdAt: Date;
}
export default Report;
//# sourceMappingURL=report.model.d.ts.map