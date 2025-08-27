import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Logger } from '@nestjs/common';
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
    const method = request.method;
    const url = request.url;
    const userSeq = Number(request.session.userSeq);
    const userId = request.session.userId;
    const ip =
      request.headers['x-forwarded-for'] ||
      request.connection.remoteAddress ||
      '';

    this.logger.log(`Incoming request: ${method} ${url}. userSeq : ${userSeq}`);

    return next.handle().pipe(
      tap(() => {
        const logEntity = new LogEntity();
        logEntity.userSeq = userSeq || null;
        logEntity.connectUrl = url;
        logEntity.auditColumns.regIp = ip;
        logEntity.auditColumns.regId = userId || null;
        logEntity.auditColumns.updIp = ip;
        logEntity.auditColumns.updId = userId || null;

        this.loggerService.log(logEntity);
      }),
    );
  }
}
