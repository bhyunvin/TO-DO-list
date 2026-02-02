import { logger } from '@bogeychan/elysia-logger';
import { env } from './config';

/**
 * Elysia Logger Plugin
 *
 * HTTP 요청 로깅을 위한 플러그인입니다.
 *
 * 설정 동기화:
 * `@bogeychan/elysia-logger`는 자체적으로 pino 인스턴스를 생성하므로,
 * `src/utils/pino.ts`의 설정과 동일하게 구성하여 로그 형식을 통일합니다.
 *
 * 두 설정이 항상 일치하도록 유지해야 합니다:
 * - HTTP 로그: 이 플러그인에서 생성 (자동 로깅)
 * - 애플리케이션 로그: utils/pino.ts의 pinoLogger 인스턴스 사용
 */
export const loggerPlugin = logger({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  autoLogging: {
    ignore: (req) => {
      const url = new URL(req.url as string);
      return (
        req.method === 'OPTIONS' ||
        url.pathname === '/' ||
        url.pathname === '/favicon.ico'
      );
    },
  },
  level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
});
