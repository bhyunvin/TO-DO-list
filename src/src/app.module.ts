// src/src/app.module.ts
import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common'; // NestModule, MiddlewareConsumer, Logger 추가
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { z } from 'zod';
import session from 'express-session'; // express-session import 추가

import { TodoModule } from './todo/todo.module';
import { UserModule } from './user/user.module';
import { LoggingModule } from './logging/logging.module';
import { AssistanceModule } from './assistance/assistance.module';
import { FileUploadModule } from './fileUpload/fileUpload.module';

import { TodoEntity } from './todo/todo.entity';
import { UserEntity } from './user/user.entity';
import { LogEntity } from './logging/logging.entity';
import { FileInfoEntity } from './fileUpload/file.entity';

import { CustomNamingStrategy } from './utils/customNamingStrategy';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggingInterceptor } from './interceptor/logging.interceptor';
import { HttpExceptionFilter } from './filter/http-exception.filter';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),

  DB_DEV_SERVER: z.string().default('localhost'),
  DB_DEV_PORT: z.coerce.number().default(5432),
  DB_DEV_USERNAME: z.string().min(1, 'DB_DEV_USERNAME은 필수입니다.'),
  DB_DEV_PASSWORD: z.string().min(1, 'DB_DEV_PASSWORD는 필수입니다.'),
  DB_DEV_DATABASE: z.string().min(1, 'DB_DEV_DATABASE는 필수입니다.'),

  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET는 최소 32자 이상이어야 합니다.'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY는 필수입니다.'),
  SYSTEM_PROMPT_PATH: z
    .string()
    .default('./src/assistance/assistance.systemPrompt.txt'),

  // --- Cloudinary 설정 ---
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, 'CLOUDINARY_CLOUD_NAME은 필수입니다.'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY는 필수입니다.'),
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, 'CLOUDINARY_API_SECRET는 필수입니다.'),

  // --- 암호화 (Encryption) ---
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY는 32byte hex string이어야 합니다 (64자).'),
  DETERMINISTIC_IV: z
    .string()
    .length(32, 'DETERMINISTIC_IV는 16byte hex string이어야 합니다 (32자).'),
});

const validate = (config: Record<string, unknown>) => {
  try {
    const validatedConfig = envSchema.parse(config);
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('=== ❌ 환경 변수 유효성 검사 실패 ===');
      error.issues.forEach((err) => {
        console.error(`- [${err.path.join('.') || 'config'}]: ${err.message}`);
      });
      console.error('======================================');
    }
    throw new Error(
      '환경 변수 설정이 올바르지 않습니다. .env 또는 .env.example 파일을 확인하세요.',
    );
  }
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_DEV_SERVER'),
        port: configService.get<number>('DB_DEV_PORT'),
        username: configService.get<string>('DB_DEV_USERNAME'),
        password: configService.get<string>('DB_DEV_PASSWORD'),
        database: configService.get<string>('DB_DEV_DATABASE'),
        ssl: { rejectUnauthorized: false },
        entities: [TodoEntity, UserEntity, LogEntity, FileInfoEntity],
        namingStrategy: new CustomNamingStrategy(),
        synchronize: false,
        logging: true,
      }),
    }),

    TodoModule,
    UserModule,
    LoggingModule,
    AssistanceModule,
    FileUploadModule,
  ],
  controllers: [],
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

  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    const sessionSecret = this.configService.get<string>('SESSION_SECRET');

    if (!sessionSecret) {
      this.logger.error(
        '세션 비밀 키를 찾을 수 없습니다! (Zod 검증은 통과했으나 ConfigService에서 값을 못 가져옴)',
      );
      throw new Error('Session secret key not found.');
    }

    this.logger.log('세션 미들웨어 설정 완료.');
    consumer
      .apply(
        session({
          name: 'todo-session-id', // 이전 버전과 동일하게 설정
          secret: sessionSecret,
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: false, // (참고: 프로덕션에서는 true 권장)
            httpOnly: true,
          },
        }),
      )
      .forRoutes('*');
  }
}
