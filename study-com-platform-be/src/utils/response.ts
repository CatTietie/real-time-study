// 响应工具
export const successResponse = (data: any, message: string = "Success") => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = (message: string, error?: any) => {
  return {
    success: false,
    message,
    error,
  };
};

export const paginatedResponse = (
  data: any[],
  total: number,
  page: number,
  pageSize: number,
) => {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    },
  };
};
