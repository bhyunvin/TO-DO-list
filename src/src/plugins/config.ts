import { Elysia } from 'elysia';
import { z } from 'zod';
import { Logger } from '../utils/logger';

const logger = new Logger('Config');

/**
 * 환경 변수 스키마 정의
 */
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

  // --- Gmail 설정 ---
  GMAIL_USER: z.email({ message: 'GMAIL_USER는 유효한 이메일이어야 합니다.' }),
  GMAIL_APP_PASSWORD: z.string().min(1, 'GMAIL_APP_PASSWORD는 필수입니다.'),

  // --- JWT 설정 ---
  JWT_SECRET: z.string().default('fallback-secret-key'),
  JWT_REFRESH_SECRET: z.string().default('fallback-refresh-secret-key'),

  // --- 프론트엔드 URL ---
  FRONTEND_URL: z.string().optional(),
});

/**
 * 환경 변수 검증 및 로딩
 */
const validateEnv = (): z.infer<typeof envSchema> => {
  try {
    const validatedEnv = envSchema.parse(process.env);
    logger.log('✅ 환경 변수 유효성 검사 완료');
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      if (error instanceof z.ZodError) {
        logger.error('=== ❌ 환경 변수 유효성 검사 실패 ===');
        error.issues.forEach((err) => {
          logger.error(
            `  - [${err.path.join('.') || 'config'}]: ${err.message}`,
          );
        });
        logger.error('======================================');
      }
    }
    throw new Error(
      '환경 변수 설정이 올바르지 않습니다. .env 파일을 확인하세요.',
    );
  }
};

// 환경 변수 검증 실행
export const env = validateEnv();

/**
 * 환경 설정 플러그인
 * 검증된 환경 변수를 Elysia 컨텍스트에 주입합니다.
 */
export const configPlugin = new Elysia({ name: 'config' }).decorate('env', env);
