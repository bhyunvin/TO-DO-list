import { Elysia } from 'elysia';
import 'jose';

import { corsPlugin } from './plugins/cors';
import { configPlugin, env } from './plugins/config';
import { databasePlugin } from './plugins/database';
import { jwtPlugin } from './plugins/jwt';
import { swaggerPlugin } from './plugins/swagger';

import { userRoutes } from './features/user/user.routes';
import { todoRoutes } from './features/todo/todo.routes';
import { assistanceRoutes } from './features/assistance/assistance.routes';
import { mailRoutes } from './features/mail/mail.routes';
import { fileRoutes } from './features/fileUpload/file.routes';

/**
 * 메인 Elysia 애플리케이션
 *
 * 모든 플러그인과 라우트를 통합하여 서버를 구성합니다.
 */
const app = new Elysia()
  // 플러그인 등록
  .use(corsPlugin)
  .use(configPlugin)
  .use(databasePlugin)
  .use(jwtPlugin)
  .use(swaggerPlugin)

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

console.log(`
🦊 Elysia 서버가 실행 중입니다!
📍 주소: http://${app.server?.hostname}:${app.server?.port}
📚 Swagger 문서: http://${app.server?.hostname}:${app.server?.port}/swagger
🌍 환경: ${env.NODE_ENV}
`);

// 타입 내보내기 (Eden Treaty용)
export type App = typeof app;
