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
import { AuthModule } from '../src/types/express/auth.module';
import { createTestTypeOrmConfig } from './test-helpers';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggingInterceptor } from '../src/interceptor/logging.interceptor';
import { HttpExceptionFilter } from '../src/filter/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
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
    }).compile();

    app = moduleFixture.createNestApplication();

    // 세션 미들웨어 제거됨 (JWT 사용)

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
