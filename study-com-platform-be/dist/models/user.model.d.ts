import { Model } from "sequelize";
export declare class User extends Model {
    id: number;
    username: string;
    password: string;
    nickname: string;
    avatar?: string;
    role: "admin" | "student";
    points: number;
    status: number;
    last_login?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export default User;
//# sourceMappingURL=user.model.d.ts.map