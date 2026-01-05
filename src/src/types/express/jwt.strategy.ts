import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ||
        configService.get<string>('JWT_SECRET') ||
        'defaultSecret', // Fallback for dev if env missing
    });
  }

  async validate(payload: any) {
    // payload: { userSeq: number, userId: string, iat: number, exp: number }
    if (!payload.userSeq || !payload.userId) {
      throw new UnauthorizedException();
    }
    return { userSeq: payload.userSeq, userId: payload.userId };
  }
}
