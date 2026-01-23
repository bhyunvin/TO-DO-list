import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';

/**
 * Swagger 문서화 플러그인
 * API 문서를 자동 생성하고 /swagger 경로에서 제공합니다.
 */
export const swaggerPlugin = new Elysia({ name: 'swagger' }).use(
  swagger({
    documentation: {
      info: {
        title: 'To-Do List API',
        version: '2.0.0',
        description: 'ElysiaJS 기반 To-Do List 애플리케이션 API',
      },
      tags: [
        { name: 'Auth', description: '인증 관련 API' },
        { name: 'Users', description: '사용자 관련 API' },
        { name: 'Todos', description: 'Todo 관련 API' },
        { name: 'Files', description: '파일 업로드 API' },
        { name: 'Assistance', description: 'AI 어시스턴트 API' },
      ],
    },
    path: '/swagger',
  }),
);
