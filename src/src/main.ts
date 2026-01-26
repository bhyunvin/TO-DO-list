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
    .onError(({ code, error, set, request }) => {
        // Elysia 에러 코드별 분기 처리
        let statusCode: number;
        let message: string;

        switch (code) {
            case 'NOT_FOUND':
                // 404: 요청한 리소스를 찾을 수 없음
                statusCode = 404;
                message = '요청하신 리소스를 찾을 수 없습니다';
                break;

            case 'VALIDATION':
                // 400: 입력 데이터 검증 실패
                statusCode = 400;
                message = '입력 데이터 검증에 실패했습니다';
                // VALIDATION 에러 시 error.all 상세 정보 포함
                logger.error(`Validation Error: ${message}`, JSON.stringify('all' in error ? error.all : {}));
                break;

            case 'PARSE':
                // 400: 요청 본문 파싱 실패
                statusCode = 400;
                message = '요청 본문을 파싱할 수 없습니다';
                break;

            case 'INTERNAL_SERVER_ERROR':
            default:
                // 500: 서버 내부 오류 및 기타 에러
                statusCode = set.status ? Number(set.status) : 500;
                if (code === 'INTERNAL_SERVER_ERROR') {
                    message = '서버 내부 오류가 발생했습니다';
                } else {
                    message = error instanceof Error ? error.message : 'Unknown error';
                }
        }

        // 에러 상세 로깅 (Stack Trace 포함)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`Global Error [${code}]: ${errorMessage}`, errorStack);

        // 응답 반환
        return {
            success: false,
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            // VALIDATION 에러인 경우 상세 정보 추가
            errors: code === 'VALIDATION' && 'all' in error ? error.all : undefined,
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

    // 서버 생명주기 훅: 시작 시 스케줄러 등록
    .onStart(({ decorator }) => {
        /**
         * 로그 스케줄러 초기화 및 등록
         * 
         * 데이터베이스 플러그인이 실행된 후 스케줄러를 시작하여
         * DB 연결이 완료된 상태에서 스케줄링 작업을 수행합니다.
         */
        const loggingScheduler = new LoggingScheduler(decorator.db);

        // 매일 자정에 실행 (24시간 = 24 * 60 * 60 * 1000ms)
        setInterval(
            () => {
                loggingScheduler.cleanupOldLogsAndAnonymizeIp();
            },
            24 * 60 * 60 * 1000,
        );

        // 서버 시작 5초 후 한 번 실행 (백그라운드)
        setTimeout(() => {
            loggingScheduler.cleanupOldLogsAndAnonymizeIp();
        }, 5000);

        logger.log('📅 로그 스케줄러가 등록되었습니다. (매일 자정 실행)');
    })

    // 서버 시작
    .listen(env.PORT || 3001);

logger.log(`
🦊 Elysia 서버가 실행 중입니다!
📍 주소: http://${app.server?.hostname}:${app.server?.port}
📚 Swagger 문서: http://${app.server?.hostname}:${app.server?.port}/swagger
🌍 환경: ${env.NODE_ENV}
`);

// 타입 내보내기 (Eden Treaty용)
export type App = typeof app;
