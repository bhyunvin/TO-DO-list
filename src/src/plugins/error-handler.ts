import { Elysia } from 'elysia';
import { Logger } from '../utils/logger';

const logger = new Logger('GlobalExceptionHandler');

/**
 * 검증 에러 응답 형식
 */
interface ValidationErrorDetail {
  path: string;
  message: string;
}

/**
 * 전역 에러 제어 및 검증 에러 포맷팅
 */
function formatValidationErrors(
  error: { all?: ValidationErrorDetail[] },
  message: string,
): { field: string; message: string }[] | undefined {
  if (error && 'all' in error && Array.isArray(error.all)) {
    const errors = error.all.map((err) => ({
      field: err.path?.replace(/^\//, '') || 'unknown',
      message: err.message || 'Validation error',
    }));
    logger.error(`Validation Error: ${message}`, JSON.stringify(errors));
    return errors;
  }
  logger.error(`Validation Error: ${message}`, 'No error details available');
  return undefined;
}

/**
 * 전역 에러 핸들러 플러그인
 */
export const errorHandlerPlugin = new Elysia({ name: 'error-handler' }).onError(
  ({ code, error, set, request }) => {
    let statusCode: number;
    let message: string;
    let errors: { field: string; message: string }[] | undefined = undefined;

    switch (code) {
      case 'NOT_FOUND':
        statusCode = 404;
        message = '요청하신 리소스를 찾을 수 없습니다';
        break;
      case 'VALIDATION':
        statusCode = 400;
        message = '입력 데이터 검증에 실패했습니다';
        errors = formatValidationErrors(
          error as { all?: ValidationErrorDetail[] },
          message,
        );
        break;
      case 'PARSE':
        statusCode = 400;
        message = '요청 본문을 파싱할 수 없습니다';
        break;
      default:
        statusCode = (set.status as number) || 500;
        message = error instanceof Error ? error.message : 'Unknown error';
    }

    logger.error(
      `Global Error [${code}]: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );

    return {
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errors && { errors }),
    };
  },
);
