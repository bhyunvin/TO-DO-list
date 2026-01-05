import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../../user/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(user: Partial<UserEntity>) {
    const payload = { userSeq: user.userSeq, userId: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
