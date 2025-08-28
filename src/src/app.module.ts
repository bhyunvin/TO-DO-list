import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

//DB
import { TypeOrmModule } from '@nestjs/typeorm';

//interceptor
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptor/logging.interceptor';

//filter
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filter/http-exception.filter';

//logging
import { LoggingModule } from './logging/logging.module';

//로그인
import { UserModule } from './user/user.module';

//session
import session from 'express-session';

//file upload
import { FileUploadModule } from './fileUpload/fileUpload.module';

// ai assistance
import { AssistanceModule } from './assistance/assistance.module';

// keychain
import { KeychainModule } from './utils/keychain.module';
import { KeychainUtil } from './utils/keychainUtil';

// DB 관련
import { CustomNamingStrategy } from './utils/customNamingStrategy';
import { decrypt } from './utils/cryptUtil';

@Module({
  imports: [
    // 1. TypeORM 비동기 설정
    TypeOrmModule.forRootAsync({
      imports: [KeychainModule], // KeychainService를 사용하기 위해 KeychainModule 임포트
      inject: [KeychainUtil], // useFactory에 KeychainService 주입
      useFactory: async (keychainUtil: KeychainUtil) => {
        const encryptedDbPassword = await keychainUtil.getPassword(
          'encrypt-db-password',
        );
        if (!encryptedDbPassword) {
          throw new Error(
            '데이터베이스 비밀번호를 키체인에서 찾을 수 없습니다.',
          );
        }
        const dbPassword = await decrypt(encryptedDbPassword);

        const decryptApiKey = await decrypt(
          await keychainUtil.getPassword('encrypt-google-api-key'),
        );

        return {
          type: 'postgres',
          host: process.env.DB_DEV_SERVER,
          port: Number(process.env.DB_DEV_PORT),
          username: process.env.DB_DEV_USERNAME,
          password: dbPassword,
          database: process.env.DB_DEV_DATABASE,
          entities: ['dist/**/*.entity{.ts,.js}'],
          synchronize: false,
          namingStrategy: new CustomNamingStrategy(),
          ssl: false,
        };
      },
    }),
    // --- Other Application Modules ---
    AssistanceModule,
    UserModule,
    LoggingModule,
    FileUploadModule,
    KeychainModule, // AppModule에서도 KeychainService를 주입받아 사용하므로 필요합니다.
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
  // 생성자에서 KeychainService를 주입받습니다.
  constructor(private readonly keychainService: KeychainUtil) {}

  // 2. 세션 미들웨어 비동기 설정
  async configure(consumer: MiddlewareConsumer) {
    const sessionSecret = await this.keychainService.getPassword(
      'encrypt-session-key',
    );

    if (!sessionSecret) {
      throw new Error(
        '세션 비밀 키를 키체인에서 찾을 수 없습니다! 애플리케이션을 시작할 수 없습니다.',
      );
    }

    consumer
      .apply(
        session({
          secret: sessionSecret,
          resave: false,
          saveUninitialized: true,
          cookie: { secure: false }, // HTTPS에서 secure: true로 설정
        }),
      )
      .forRoutes('*'); // 모든 라우트에 세션 미들웨어 적용
  }
}
