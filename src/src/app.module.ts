// src/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { z } from 'zod'; // zod import

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

// --- 유틸리티 Import (TypeORM 설정용) ---
import { CustomNamingStrategy } from './utils/customNamingStrategy';

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
    //
    UPLOAD_FILE_DIRECTORY: z.string().default('./upload'),
});

// ==================================================================
// 2. ConfigModule에 전달할 유효성 검사 함수
// ==================================================================

function validate(config: Record<string, unknown>) {
    try {
        // 1. process.env 객체를 Zod 스키마로 파싱(검증)합니다.
        const validatedConfig = envSchema.parse(config);

        // 2. 검증된 객체를 반환합니다.
        return validatedConfig;
    } catch (error) {
        // 3. 유효성 검사 실패 시
        if (error instanceof z.ZodError) {
            // Zod 에러를 더 읽기 쉽게 콘솔에 출력합니다.
            console.error('=== ❌ 환경 변수 유효성 검사 실패 ===');
            error.issues.forEach((err) => {
                // 어떤 키가 문제인지, 왜 문제인지 출력
                console.error(
                    `- [${err.path.join('.') || 'config'}]: ${err.message}`,
                );
            });
            console.error('======================================');
        }
        // NestJS 앱 시작을 중단시킵니다.
        throw new Error(
            '환경 변수 설정이 올바르지 않습니다. .env 또는 .env.example 파일을 확인하세요.',
        );
    }
}

// ==================================================================
// 3. 메인 앱 모듈 (AppModule)
// ==================================================================

@Module({
    imports: [
        // --- 1순위: ConfigModule 설정 ---
        ConfigModule.forRoot({
            isGlobal: true, // 앱 전역에서 ConfigService 사용 가능
            envFilePath: '.env', // .env 파일 사용
            validate, // Zod 유효성 검사 함수 적용
        }),

        // --- 2순위: TypeOrmModule (DB) 설정 ---
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule], // ConfigService 주입을 위해 필수
            inject: [ConfigService], // ConfigService 사용
            useFactory: (configService: ConfigService) => ({
                type: 'postgres', // (DB 타입은 postgres로 가정)

                // --- DB 정보로 연결 ---
                host: configService.get<string>('DB_DEV_SERVER'),
                port: configService.get<number>('DB_DEV_PORT'),
                username: configService.get<string>('DB_DEV_USERNAME'),
                password: configService.get<string>('DB_DEV_PASSWORD'),
                database: configService.get<string>('DB_DEV_DATABASE'),
                ssl: { rejectUnauthorized: false },

                // --- 기타 설정 ---
                entities: [TodoEntity, UserEntity, LogEntity, FileInfoEntity], // 로드할 엔티티 목록
                namingStrategy: new CustomNamingStrategy(), // 커스텀 네이밍 전략

                synchronize: false,
                logging: true,
            }),
        }),

        // --- 3순위: 나머지 비즈니스 모듈 ---
        TodoModule,
        UserModule,
        LoggingModule,
        AssistanceModule,
        FileUploadModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}