// src/src/app.module.ts
import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common'; // NestModule, MiddlewareConsumer, Logger 추가
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { z } from 'zod';
import session from 'express-session'; // express-session import 추가

// --- 프로젝트 모듈 Import ---
import { TodoModule } from './todo/todo.module';
import { UserModule } from './user/user.module';
import { LoggingModule } from './logging/logging.module';
import { AssistanceModule } from './assistance/assistance.module';
import { FileUploadModule } from './fileUpload/fileUpload.module';

// --- 엔티티 Import (TypeORM 설정용) ---
import { TodoEntity } from './todo/todo.entity';
import { UserEntity } from './user/user.entity';
import { LogEntity } from './logging/logging.entity';
import { FileInfoEntity } from './fileUpload/file.entity';

// --- 유틸리티, 인터셉터, 필터 Import ---
import { CustomNamingStrategy } from './utils/customNamingStrategy';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'; // APP_INTERCEPTOR, APP_FILTER 추가
import { LoggingInterceptor } from './interceptor/logging.interceptor'; // 경로 확인 필요
import { HttpExceptionFilter } from './filter/http-exception.filter'; // 경로 확인 필요

// ==================================================================
// 1. Zod 환경 변수 스키마 정의
// ==================================================================

const envSchema = z.object({
  // --- 기본 설정 (NestJS 포트 등) ---
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),

  // --- 데이터베이스 (TypeORM) ---
  DB_DEV_SERVER: z.string().default('localhost'),
  DB_DEV_PORT: z.coerce.number().default(5432),
  DB_DEV_USERNAME: z.string().min(1, 'DB_DEV_USERNAME은 필수입니다.'),
  DB_DEV_PASSWORD: z.string().min(1, 'DB_DEV_PASSWORD는 필수입니다.'),
  DB_DEV_DATABASE: z.string().min(1, 'DB_DEV_DATABASE는 필수입니다.'),

  // --- 보안 (세션) ---
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET는 최소 32자 이상이어야 합니다.'),

  // --- Google AI (Assistance) ---
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY는 필수입니다.'),
  SYSTEM_PROMPT_PATH: z
    .string()
    .default('./src/assistance/assistance.systemPrompt.txt'),

  // --- 파일 업로드 ---
  UPLOAD_FILE_DIRECTORY: z.string().default('./upload'),

  // --- 암호화 (Encryption) ---
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY는 32byte hex string이어야 합니다 (64자).'),
  DETERMINISTIC_IV: z
    .string()
    .length(32, 'DETERMINISTIC_IV는 16byte hex string이어야 합니다 (32자).'),
});

// ==================================================================
// 2. ConfigModule에 전달할 유효성 검사 함수
// ==================================================================

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

// ==================================================================
// 3. 메인 앱 모듈 (AppModule)
// ==================================================================

@Module({
  imports: [
    // --- 1순위: ConfigModule 설정 ---
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    // --- 2순위: TypeOrmModule (DB) 설정 ---
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

    // --- 3순위: 나머지 비즈니스 모듈 ---
    // AuthModule, // (이전 버전에 있었음. 필요시 주석 해제)
    TodoModule,
    UserModule,
    LoggingModule,
    AssistanceModule,
    FileUploadModule,
  ],
  controllers: [],
  // --- 4. 전역 필터 및 인터셉터 (복원) ---
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
// --- 5. NestModule 구현 (복원) ---
export class AppModule implements NestModule {
  // --- 6. Logger 및 ConfigService 주입 (복원) ---
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly configService: ConfigService) {}

  // --- 7. configure 메서드 (세션 미들웨어 적용) (복원) ---
  configure(consumer: MiddlewareConsumer) {
    // Zod가 이미 시작 시점에 검증했지만, ConfigService에서 값을 가져오는지
    // 이중으로 확인합니다.
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
      .forRoutes('*'); // 모든 라우트에 세션 적용
  }
}
