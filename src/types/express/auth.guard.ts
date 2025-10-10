import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticatedGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.session?.user) {
      this.logger.warn(`Authentication failed. 'user' not found in session.`);
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    return true;
  }
}
