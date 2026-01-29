import { Elysia } from 'elysia';
import { cron } from '@elysiajs/cron';
import 'croner';
import 'jose';
import { corsPlugin } from './plugins/cors';
import { loggerPlugin } from './plugins/logger';
import { dbLoggingPlugin } from './plugins/db-logging';
import { configPlugin, env } from './plugins/config';
import { databasePlugin, dataSource } from './plugins/database';
import { jwtPlugin } from './plugins/jwt';
import { swaggerPlugin } from './plugins/swagger';

import { userRoutes } from './features/user/user.routes';
import { todoRoutes } from './features/todo/todo.routes';
import { assistanceRoutes } from './features/assistance/assistance.routes';
import { mailRoutes } from './features/mail/mail.routes';
import { fileRoutes } from './features/fileUpload/file.routes';
import { LoggingScheduler } from './features/logging/logging.scheduler';

import { Logger } from './utils/logger';

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
 * 메인 Elysia 애플리케이션 서버 구성
 */
export const app = new Elysia()
  .use(corsPlugin)
  .use(loggerPlugin)
  .use(configPlugin)
  .use(databasePlugin)
  .use(jwtPlugin)
  .use(dbLoggingPlugin)
  .use(swaggerPlugin)
  .onError(({ code, error, set, request }) => {
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
  })
  .use(userRoutes)
  .use(todoRoutes)
  .use(assistanceRoutes)
  .use(mailRoutes)
  .use(fileRoutes)
  .get('/', () => ({ status: 'ok' }), {
    detail: {
      tags: ['Welcome'],
      summary: '서버 상태 확인',
    },
  })
  .get(
    '/favicon.ico',
    ({ set }) => {
      set.status = 204;
    },
    {
      detail: { tags: ['Welcome'], summary: 'Favicon' },
    },
  )
  .use(
    cron({
      name: 'log-cleanup',
      pattern: '0 0 * * *',
      async run() {
        const loggingScheduler = new LoggingScheduler(dataSource);
        await loggingScheduler.cleanupOldLogsAndAnonymizeIp();
      },
    }),
  )
  .onStart(() => {
    setTimeout(() => {
      new LoggingScheduler(dataSource).cleanupOldLogsAndAnonymizeIp();
    }, 5000);
    logger.log('📅 로그 스케줄러가 등록되었습니다.');
  });

if (import.meta.main) {
  app.listen(env.PORT || 3001);
  logger.log(`
🦊 Elysia 서버가 실행 중입니다!
📍 주소: http://${app.server?.hostname}:${app.server?.port}
📚 Swagger 문서: http://${app.server?.hostname}:${app.server?.port}/swagger
🌍 환경: ${env.NODE_ENV}
`);
}

export type App = typeof app;
