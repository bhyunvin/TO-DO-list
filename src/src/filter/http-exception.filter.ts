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
    const url = request.url;
    const status = exception.getStatus();
    const message = exception.message || 'Internal server error';
    const userSeq = Number(request.session.userSeq);
    const userId = request.session.userId;
    const ip =
      request.headers['x-forwarded-for'] ||
      request.connection.remoteAddress ||
      '';

    this.logger.error(`HTTP Exception: ${message}`, exception.stack);

    const logEntity = new LogEntity();
    logEntity.userSeq = userSeq || null;
    logEntity.connectUrl = url;
    logEntity.errorContent = exception.stack;
    logEntity.method = request.method;
    logEntity.request = JSON.stringify(request.body);
    logEntity.auditColumns.regIp = ip;
    logEntity.auditColumns.regId = userId || null;
    logEntity.auditColumns.updIp = ip;
    logEntity.auditColumns.updId = userId || null;

    await this.loggingService.log(logEntity);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: url,
      message,
    });
  }
}
