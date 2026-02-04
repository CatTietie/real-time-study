import User from "../models/user.model";
export declare const getUserById: (id: number) => Promise<User | null>;
export declare const updateUserById: (id: number, data: any) => Promise<[affectedCount: number]>;
export declare const createUser: (userData: any) => Promise<User>;
export declare const getUserByEmail: (email: string) => Promise<User | null>;
export declare const getUserByUsername: (username: string) => Promise<User | null>;
export declare const getAllUsers: () => Promise<User[]>;
//# sourceMappingURL=user.service.d.ts.map