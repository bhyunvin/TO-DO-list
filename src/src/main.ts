import { Elysia } from 'elysia';
import 'jose';

import { corsPlugin } from './plugins/cors';
import { loggerPlugin } from './plugins/logger';
import { dbLoggingPlugin } from './plugins/db-logging';
import { configPlugin, env } from './plugins/config';
import { databasePlugin } from './plugins/database';
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
 * 메인 Elysia 애플리케이션
 *
 * 모든 플러그인과 라우트를 통합하여 서버를 구성합니다.
 */
const app = new Elysia()
  // 플러그인 등록
  .use(corsPlugin)
  .use(loggerPlugin)
  .use(configPlugin)
  .use(databasePlugin)
  .use(jwtPlugin)
  .use(dbLoggingPlugin)
  .use(swaggerPlugin)

  // 전역 에러 핸들링 (HttpExceptionFilter 대체)
  .onError(({ code: _code, error, set, request }) => {
    const statusCode = set.status ? Number(set.status) : 500;

    // 에러 상세 로깅 (Stack Trace 포함)
    logger.error(`Global Error: ${error.message}`, error.stack);

    return {
      success: false,
      statusCode,
      message: error.message || 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      // code가 'VALIDATION' 등인 경우 상세 정보 추가 가능
      errors: 'all' in error ? error.all : undefined,
    };
  })

  // 모듈 라우트 등록
  .use(userRoutes)
  .use(todoRoutes)
  .use(assistanceRoutes)
  .use(mailRoutes)
  .use(fileRoutes)

  // Welcome 엔드포인트
  .get('/', () => ({ status: 'ok' }), {
    detail: {
      tags: ['Welcome'],
      summary: '서버 상태 확인',
      description: '서버가 정상적으로 실행 중인지 확인합니다.',
    },
  })

  .get('/favicon.ico', () => {}, {
    detail: {
      tags: ['Welcome'],
      summary: 'Favicon 요청 처리',
      description: 'Favicon 요청에 대해 204 No Content를 반환합니다.',
    },
  })

  // 서버 시작
  .listen(env.PORT || 3001);

logger.log(`
🦊 Elysia 서버가 실행 중입니다!
📍 주소: http://${app.server?.hostname}:${app.server?.port}
📚 Swagger 문서: http://${app.server?.hostname}:${app.server?.port}/swagger
🌍 환경: ${env.NODE_ENV}
`);

// 로그 스케줄러 초기화 및 등록
const loggingScheduler = new LoggingScheduler(app.decorator.db);

// 매일 자정에 실행 (24시간 = 24 * 60 * 60 * 1000ms)
setInterval(
  () => {
    loggingScheduler.cleanupOldLogsAndAnonymizeIp();
  },
  24 * 60 * 60 * 1000,
);

// 서버 시작 시 한 번 실행 (백그라운드)
setTimeout(() => {
  loggingScheduler.cleanupOldLogsAndAnonymizeIp();
}, 5000); // 5초 후 시작 (서버 초기화 완료 대기)

logger.log('📅 로그 스케줄러가 등록되었습니다. (매일 자정 실행)');

// 타입 내보내기 (Eden Treaty용)
export type App = typeof app;
