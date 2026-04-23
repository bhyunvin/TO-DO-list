import { Elysia } from 'elysia';
import { Logger } from '../utils/logger';

const logger = new Logger('GlobalExceptionHandler');

/**
 * 전역 에러 핸들러 함수
 */
export const errorHandler = ({
  code,
  error,
  set,
  request,
}: {
  code: string | number;
  error: any;
  set: any;
  request: Request;
}) => {
  // 1. VALIDATION 처리
  if (code === 'VALIDATION') {
    set.status = 422;
    const allErrors = error.all || error.errors || [];
    const validationErrors = Array.isArray(allErrors)
      ? allErrors.map((err: any) => ({
          field: err.path?.replace(/^\//, '') || 'unknown',
          message: err.message || 'Validation error',
        }))
      : [];

    logger.error(
      `Validation Error: ${request.url}`,
      JSON.stringify(validationErrors),
    );

    return {
      success: false,
      message: '입력값 검증에 실패했습니다.',
      errors: validationErrors,
      statusCode: 422,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  // 2. 기타 에러 처리
  let statusCode =
    typeof set.status === 'number' && set.status !== 200 ? set.status : 500;

  if (code === 'NOT_FOUND') statusCode = 404;
  if (code === 'PARSE') statusCode = 400;

  set.status = statusCode;

  const message =
    error instanceof Error ? error.message : '서버 내부 오류가 발생했습니다.';

  logger.error(
    `Global Error [${code}]: ${message}`,
    error instanceof Error ? error.stack : undefined,
  );

  return {
    success: false,
    message:
      statusCode === 500 &&
      (message === 'Internal Server Error' || !error.message)
        ? '서버 내부 오류가 발생했습니다.'
        : message,
    data: null,
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url,
  };
};

/**
 * 전역 에러 핸들러 플러그인
 */
export const errorHandlerPlugin = new Elysia({ name: 'error-handler' }).onError(
  errorHandler,
);
