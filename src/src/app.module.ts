import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { z } from 'zod';

import { TodoModule } from './todo/todo.module';
import { UserModule } from './user/user.module';
import { LoggingModule } from './logging/logging.module';
import { AssistanceModule } from './assistance/assistance.module';
import { FileUploadModule } from './fileUpload/fileUpload.module';
import { MailModule } from './mail/mail.module';

import { TodoEntity } from './todo/todo.entity';
import { UserEntity } from './user/user.entity';
import { LogEntity } from './logging/logging.entity';
import { FileInfoEntity } from './fileUpload/file.entity';
import { RefreshTokenEntity } from './user/refresh-token.entity';

import { CustomNamingStrategy } from './utils/customNamingStrategy';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggingInterceptor } from './interceptor/logging.interceptor';
import { HttpExceptionFilter } from './filter/http-exception.filter';
import { WelcomeController } from './welcome.controller';

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

  // --- Gmail 설정 ---
  GMAIL_USER: z.email({ message: 'GMAIL_USER는 유효한 이메일이어야 합니다.' }),
  GMAIL_APP_PASSWORD: z.string().min(1, 'GMAIL_APP_PASSWORD는 필수입니다.'),
});

const validate = (config: Record<string, unknown>) => {
  try {
    const validatedConfig = envSchema.parse(config);
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const logger = new Logger('ConfigValidation');
      logger.error('=== ❌ 환경 변수 유효성 검사 실패 ===');
      error.issues.forEach((err) => {
        logger.error(`- [${err.path.join('.') || 'config'}]: ${err.message}`);
      });
      logger.error('======================================');
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
        entities: [
          TodoEntity,
          UserEntity,
          LogEntity,
          FileInfoEntity,
          RefreshTokenEntity,
        ],
        namingStrategy: new CustomNamingStrategy(),
        synchronize: false,
        logging: true,
      }),
    }),

    ScheduleModule.forRoot(), // Add ScheduleModule

    TodoModule,
    UserModule,
    LoggingModule,
    AssistanceModule,
    FileUploadModule,
    MailModule,
  ],
  controllers: [WelcomeController],
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

  configure(_consumer: MiddlewareConsumer) {
    // Session middleware removed
  }
}
