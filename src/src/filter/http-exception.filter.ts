import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  Injectable,
} from '@nestjs/common';

import { LoggerService } from '../logging/logging.service';
import { LogEntity } from '../logging/logging.entity';

@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly loggingService: LoggerService) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const { url, method, body, headers, connection } = request;
    const status = exception.getStatus();
    const message = exception.message || 'Internal server error';

    // JWT 인증을 사용하는 경우 request.user에 사용자 정보가 있음
    const user = request.user;
    const userSeq = user ? Number(user.userSeq) : null;
    const userId = user ? user.userId : null;
    const xForwardedFor = headers['x-forwarded-for'];
    let ip = connection.remoteAddress || '';
    if (Array.isArray(xForwardedFor)) {
      ip = xForwardedFor[0];
    } else if (xForwardedFor) {
      ip = xForwardedFor.split(',')[0].trim();
    }

    this.logger.error(`HTTP \uc608\uc678: ${message}`, exception.stack);

    const logEntity = new LogEntity();
    logEntity.userSeq = userSeq || null;
    logEntity.connectUrl = url;
    logEntity.errorContent = exception.stack;
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

    await this.loggingService.log(logEntity);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: url,
      message,
    });
  }
}
