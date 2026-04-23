/**
 * 전역 에러 응답 인터페이스
 */
export interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  data?: null;
  statusCode: number;
  timestamp: string;
  path: string;
}

/**
 * 전역 성공 응답 인터페이스 (제네릭)
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  statusCode?: number;
  timestamp?: string;
}
