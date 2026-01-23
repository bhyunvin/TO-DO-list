import { logger } from '@bogeychan/elysia-logger';

/**
 * Elysia Logger Plugin
 * Based on pino.
 */
export const loggerPlugin = logger({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  autoLogging: true, // HTTP 요청 자동 로깅
});
