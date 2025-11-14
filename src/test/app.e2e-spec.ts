import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../src/user/user.module';
import { TodoModule } from '../src/todo/todo.module';
import { LoggingModule } from '../src/logging/logging.module';
import { FileUploadModule } from '../src/fileUpload/fileUpload.module';
import { AssistanceModule } from '../src/assistance/assistance.module';
import { AuthModule } from '../types/express/auth.module';
import { KeychainModule } from '../src/utils/keychain.module';
import { KeychainUtil } from '../src/utils/keychainUtil';
import { createTestTypeOrmConfig, MockKeychainUtil } from './test-helpers';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggingInterceptor } from '../src/interceptor/logging.interceptor';
import { HttpExceptionFilter } from '../src/filter/http-exception.filter';
import session from 'express-session';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mockKeychainUtil: MockKeychainUtil;

  beforeEach(async () => {
    mockKeychainUtil = new MockKeychainUtil();
    const typeOrmConfig = await createTestTypeOrmConfig();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        TypeOrmModule.forRoot(typeOrmConfig),
        AuthModule,
        UserModule,
        TodoModule,
        LoggingModule,
        FileUploadModule,
        AssistanceModule,
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
      .overrideProvider(KeychainUtil)
      .useValue(mockKeychainUtil)
      .compile();

    app = moduleFixture.createNestApplication();

    // 세션 미들웨어 설정
    const sessionSecret = await mockKeychainUtil.getPassword(
      'encrypt-session-key',
    );
    app.use(
      session({
        name: 'todo-session-id',
        secret: sessionSecret || 'test_session_secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: false,
          httpOnly: true,
        },
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should initialize application successfully', () => {
    expect(app).toBeDefined();
    expect(app.getHttpServer()).toBeDefined();
  });

  it('should allow access to public routes', () =>
    request(app.getHttpServer()).get('/user/duplicate/testuser').expect(200));
});
