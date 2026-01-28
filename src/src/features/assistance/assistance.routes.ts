import { Elysia } from 'elysia';
import { jwtPlugin } from '../../plugins/jwt';
import { databasePlugin } from '../../plugins/database';
import { AssistanceService } from './assistance.service';
import { TodoService } from '../todo/todo.service';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';
import {
  ChatRequestSchema,
  ChatRequestDto,
  ChatResponseSchema,
} from './assistance.schema';

import { getClientIp } from '../../utils/ip.util';

export const assistanceRoutes = new Elysia({ prefix: '/assistance' })
  .use(databasePlugin)
  .use(jwtPlugin)
  .derive(({ db }) => {
    // 의존성 수동 주입 (TodoService 등)
    const cloudinaryService = new CloudinaryService();
    const todoService = new TodoService(db, cloudinaryService);
    return {
      assistanceService: new AssistanceService(db, todoService),
    };
  })
  .onBeforeHandle(({ user }) => {
    if (!user) throw new Error('Unauthorized');
  })

  .post(
    '/chat',
    async ({ user, body, request, assistanceService }) => {
      const clientIp = getClientIp(request);
      const result = await assistanceService.chatWithRetry(
        Number(user.id),
        user.username || '',
        String(user.id),
        clientIp,
        body as ChatRequestDto,
      );
      return result;
    },
    {
      body: ChatRequestSchema,
      response: ChatResponseSchema,
      detail: {
        tags: ['Assistance'],
        summary: 'AI 채팅 요청',
        description: 'Gemini AI와 대화하고 도구를 실행합니다.',
      },
    },
  );
