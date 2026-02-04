export declare const successResponse: (data: any, message?: string) => {
    success: boolean;
    message: string;
    data: any;
};
export declare const errorResponse: (message: string, error?: any) => {
    success: boolean;
    message: string;
    error: any;
};
export declare const paginatedResponse: (data: any[], total: number, page: number, pageSize: number) => {
    success: boolean;
    data: any[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        pages: number;
    };
};
//# sourceMappingURL=response.d.ts.map