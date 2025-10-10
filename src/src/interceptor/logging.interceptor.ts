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
    const user = request.session.user;
    const userSeq = user ? Number(user.userSeq) : undefined;
    const userId = user ? user.userId : undefined;
    const ip =
      request.connection.remoteAddress ||
      request.headers['x-forwarded-for'] ||
      '';

    this.logger.log(
      `Incoming request: ${method} ${url}. userSeq : ${isNaN(userSeq) ? 'anonymous user' : userSeq}`,
    );

    return next.handle().pipe(
      tap(() => {
        const logEntity = new LogEntity();
        logEntity.userSeq = isNaN(userSeq) ? null : userSeq;
        logEntity.connectUrl = url;
        logEntity.method = method;
        logEntity.requestBody = JSON.stringify(request.body);
        logEntity.auditColumns.regIp = ip;
        logEntity.auditColumns.regId = userId || null;

        this.loggerService.log(logEntity);
      }),
    );
  }
}
