import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

/**
 * CORS 플러그인
 * 프론트엔드에서의 요청을 허용하기 위한 CORS 설정
 */
export const corsPlugin = new Elysia({ name: 'cors' }).use(
  cors({
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL?.replace(/\/$/, '') || '',
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);
