import { dataSource } from './database';
import { LogEntity } from '../features/logging/log.entity';
import { LoggingService } from '../features/logging/logging.service';

const loggingService = new LoggingService(dataSource.getRepository(LogEntity));

/**
 * DB Logging Plugin
 * 모든 요청에 대해 nj_user_log 테이블에 로그를 남깁니다.
 */
export const dbLoggingPlugin = (app: any) =>
  app.onResponse(async ({ request, set, user }: any) => {
    // 1. 기본 정보 추출
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // 2. Status Code
    const statusCode = set.status ? Number(set.status) : 200;

    // 3. Error Message
    const errorMsg = statusCode >= 400 ? 'Client/Server Error' : undefined;

    // 4. User ID 추출 (JWT 플러그인에 의해 설정됨)
    // user 타입: { id: string | number, username: string, email: string } | null
    const userId = user?.id ? String(user.id) : null;

    await loggingService.log({
      userId,
      clientIp,
      method,
      url: path,
      statusCode,
      errorMsg,
    });
    
    // 중요: app을 반환해야 체이닝 가능
    return app;
  });
