import { Elysia } from 'elysia';
import { dataSource } from './database';
import { LogEntity } from '../features/logging/log.entity';
import { LoggingService } from '../features/logging/logging.service';
import { getClientIp } from '../utils/ip.util';

/**
 * DB Logging Plugin
 * 모든 요청에 대해 nj_user_log 테이블에 로그를 남깁니다.
 */
export const dbLoggingPlugin = new Elysia({
  name: 'db-logging',
}).onAfterResponse(async ({ request, set }) => {
  // 1. 기본 정보 추출
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const clientIp = getClientIp(request);

  // 2. 상태 코드 (Status Code)
  const statusCode = set.status ? Number(set.status) : 200;

  // 3. 에러 메시지 (Error Message)
  const errorMsg = statusCode >= 400 ? 'Client/Server Error' : undefined;

  // 4. User ID는 context에서 가져올 수 없으므로 null로 설정
  const userSeq = null;
  const userId = null;

  if (dataSource.isInitialized) {
    const loggingService = new LoggingService(
      dataSource.getRepository(LogEntity),
    );
    await loggingService.log({
      userSeq: userSeq ? Number(userSeq) : undefined,
      connectUrl: path,
      method,
      errorContent: errorMsg,
      auditColumns: {
        regIp: clientIp,
        regId: userId || 'ANONYMOUS',
        regDtm: new Date(),
      },
    });
  }
});
