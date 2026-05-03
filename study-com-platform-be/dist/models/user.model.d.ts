import { Model, Optional } from 'sequelize';
interface UserAttributes {
    id: number;
    username: string;
    password: string;
    nickname: string;
    avatar?: string;
    role: 'admin' | 'student' | 'super_admin';
    points: number;
    status: number;
    last_login?: Date;
    study_duration?: number;
    failed_login_attempts: number;
    lock_until?: Date;
    created_at: Date;
    updated_at: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts' | 'lock_until'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: number;
    username: string;
    password: string;
    nickname: string;
    avatar?: string;
    role: 'admin' | 'student' | 'super_admin';
    points: number;
    status: number;
    last_login?: Date;
    study_duration?: number;
    failed_login_attempts: number;
    lock_until?: Date;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default User;
//# sourceMappingURL=user.model.d.ts.map