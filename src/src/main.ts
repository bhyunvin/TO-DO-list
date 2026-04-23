import { Elysia } from 'elysia';
import 'croner';
import 'jose';
import { corsPlugin } from './plugins/cors';
import { loggerPlugin } from './plugins/logger';
import { dbLoggingPlugin } from './plugins/db-logging';
import { configPlugin, env } from './plugins/config';
import { databasePlugin } from './plugins/database';
import { jwtPlugin } from './plugins/jwt';
import { swaggerPlugin } from './plugins/swagger';
import { errorHandler } from './plugins/error-handler';
import { schedulerPlugin } from './plugins/scheduler';

import { userRoutes } from './features/user/user.routes';
import { todoRoutes } from './features/todo/todo.routes';
import { assistanceRoutes } from './features/assistance/assistance.routes';
import { mailRoutes } from './features/mail/mail.routes';
import { fileRoutes } from './features/fileUpload/file.routes';

import { Logger } from './utils/logger';

const logger = new Logger('Main');

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
  .onError(errorHandler)
  .use(userRoutes)
  .use(todoRoutes)
  .use(assistanceRoutes)
  .use(mailRoutes)
  .use(fileRoutes)
  .use(schedulerPlugin)
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
  );

if (import.meta.main) {
  app.listen({
    port: env.PORT || 3001,
    hostname: '0.0.0.0',
  });
  logger.log(`
🦊 Elysia 서버가 실행 중입니다!
📍 주소: http://${app.server?.hostname}:${app.server?.port}
📚 Swagger 문서: http://${app.server?.hostname}:${app.server?.port}/swagger
🌍 환경: ${env.NODE_ENV}
`);
}

export type App = typeof app;
