import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptor/logging.interceptor';

import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filter/http-exception.filter';

import { LoggingModule } from './logging/logging.module';

import { UserModule } from './user/user.module';

import session from 'express-session';

import { FileUploadModule } from './fileUpload/fileUpload.module';

import { AssistanceModule } from './assistance/assistance.module';

import { TodoModule } from './todo/todo.module';

import { KeychainModule } from './utils/keychain.module';
import { KeychainUtil } from './utils/keychainUtil';

import { AuthModule } from '../types/express/auth.module';

import { CustomNamingStrategy } from './utils/customNamingStrategy';
import { decrypt } from './utils/cryptUtil';

import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // .env 파일 경로 지정
    }),
    AuthModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, KeychainModule],
      inject: [ConfigService, KeychainUtil],
      useFactory: async (
        configService: ConfigService,
        keychainUtil: KeychainUtil,
      ) => {
        const encryptedDbPassword = await keychainUtil.getPassword(
          'encrypt-db-password',
        );
        if (!encryptedDbPassword) {
          throw new Error(
            '데이터베이스 비밀번호를 키체인에서 찾을 수 없습니다.',
          );
        }
        const dbPassword = await decrypt(encryptedDbPassword);

        return {
          type: 'postgres',
          host: configService.get<string>('DB_DEV_SERVER'),
          port: Number(configService.get<string>('DB_DEV_PORT')),
          username: configService.get<string>('DB_DEV_USERNAME'),
          password: dbPassword,
          database: configService.get<string>('DB_DEV_DATABASE'),
          entities: ['dist/**/*.entity{.ts,.js}'],
          synchronize: false,
          namingStrategy: new CustomNamingStrategy(),
          ssl: { rejectUnauthorized: false },
        };
      },
    }),
    AssistanceModule,
    UserModule,
    LoggingModule,
    TodoModule,
    FileUploadModule,
    KeychainModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly keychainService: KeychainUtil) {}

  async configure(consumer: MiddlewareConsumer) {
    const sessionSecret = await this.keychainService.getPassword(
      'encrypt-session-key',
    );

    if (!sessionSecret) {
      this.logger.error(
        '세션 비밀 키를 키체인에서 찾을 수 없습니다! 애플리케이션을 시작할 수 없습니다.',
      );
      throw new Error('Session secret key not found.');
    }

    this.logger.log('Session middleware configured with a valid secret key.');
    consumer
      .apply(
        session({
          name: 'todo-session-id',
          secret: sessionSecret,
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: false,
            httpOnly: true,
          },
        }),
      )
      .forRoutes('*');
  }
}
