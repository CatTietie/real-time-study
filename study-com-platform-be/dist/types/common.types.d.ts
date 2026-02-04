export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface PaginationParams {
    page: number;
    pageSize: number;
    sort?: string;
}
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        pages: number;
    };
}
export interface AuthPayload {
    userId: string;
    email: string;
    role: string;
}
//# sourceMappingURL=common.types.d.ts.map