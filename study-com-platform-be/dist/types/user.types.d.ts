export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    role: "user" | "admin";
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
}
export interface UpdateUserRequest {
    username?: string;
    email?: string;
}
export interface UserResponse {
    id: string;
    username: string;
    email: string;
    role: string;
}
//# sourceMappingURL=user.types.d.ts.map