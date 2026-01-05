import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEntity } from '../../user/refresh-token.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthenticatedGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          process.env.JWT_SECRET ||
          'defaultSecret',
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [AuthenticatedGuard, AuthService, JwtStrategy],
  exports: [AuthenticatedGuard, AuthService, JwtModule],
})
export class AuthModule {}
