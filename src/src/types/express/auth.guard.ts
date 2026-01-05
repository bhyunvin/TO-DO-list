import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthenticatedGuard extends AuthGuard('jwt') {
  handleRequest(err, user, _info) {
    if (err || !user) {
      throw err || new UnauthorizedException('로그인이 필요합니다.');
    }
    return user;
  }
}
