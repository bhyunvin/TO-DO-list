import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggerService } from '../logging/logging.service';
import { LogEntity } from 'src/logging/logging.entity';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly loggerService: LoggerService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, url, session, body, connection, headers } = request;
    const { user } = session;
    const userSeq = user ? Number(user.userSeq) : undefined;
    const userId = user ? user.userId : undefined;
    const ip = connection.remoteAddress || headers['x-forwarded-for'] || '';

    this.logger.log(
      `Incoming request: ${method} ${url}. userSeq : ${Number.isNaN(userSeq) ? 'anonymous user' : userSeq}`,
    );

    return next.handle().pipe(
      tap(() => {
        const logEntity = new LogEntity();
        logEntity.userSeq = Number.isNaN(userSeq) ? null : userSeq;
        logEntity.connectUrl = url;
        logEntity.method = method;

        // bodyToLog를 request.body로 우선 기본 할당합니다.
        let bodyToLog = body;
        // request.body가 객체인 경우에만 분해 할당을 통해 userPassword를 제외하고 덮어씁니다.
        if (bodyToLog && typeof bodyToLog === 'object') {
          const { userPassword: _, ...rest } = bodyToLog;
          bodyToLog = rest;
        }
        logEntity.requestBody = JSON.stringify(bodyToLog);

        logEntity.auditColumns.regIp = ip;
        logEntity.auditColumns.regId = userId || null;

        this.loggerService.log(logEntity);
      }),
    );
  }
}
