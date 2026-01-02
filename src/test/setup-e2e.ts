import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * E2E 테스트 환경 설정
 * 테스트 실행 전에 환경 변수를 로드
 */

// .env.test 파일이 있으면 로드, 없으면 .env 파일 사용
const envPath = resolve(__dirname, '../.env.test');
const fallbackEnvPath = resolve(__dirname, '../.env');

try {
  config({ path: envPath });
  console.log('✓ Loaded .env.test file for E2E tests');
} catch {
  console.log('⚠ .env.test not found, falling back to .env');
  config({ path: fallbackEnvPath });
}

// 테스트 환경 변수 기본값 설정
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test_password';
process.env.TEST_SESSION_SECRET =
  process.env.TEST_SESSION_SECRET || 'test_session_secret_key_for_e2e_testing';
