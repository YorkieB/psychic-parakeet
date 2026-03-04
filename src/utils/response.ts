/**
 * Standard response utilities for consistent API responses
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

/**
 * Create a success response
 */
export const successResponse = <T = any>(data: T, message?: string): SuccessResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
});

/**
 * Create an error response
 */
export const errorResponse = (error: string, code?: string): ErrorResponse => ({
  success: false,
  error,
  code,
  timestamp: new Date().toISOString(),
});

/**
 * Create a paginated response
 */
export const paginatedResponse = <T = any>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
  timestamp: new Date().toISOString(),
});
