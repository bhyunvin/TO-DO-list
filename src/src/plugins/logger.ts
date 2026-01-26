import { logger } from '@bogeychan/elysia-logger';

/**
 * Elysia Logger Plugin
 * 
 * HTTP 요청 로깅을 위한 플러그인입니다.
 * utils/pino.ts와 동일한 형식으로 로그를 출력합니다.
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
    autoLogging: true, // HTTP 요청 자동 로깅
});
