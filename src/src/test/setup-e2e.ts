import { afterAll, beforeAll } from 'bun:test';
import { config } from 'dotenv';
import path from 'node:path';

// .env.test 로드 (가장 먼저 실행되어야 함)
config({ path: path.join(import.meta.dir, '../../.env.test') });

import { dataSource } from '../plugins/database';

/**
 * 테스트 환경 설정
 *
 * 모든 E2E 테스트에서 공통적으로 사용되는 설정입니다.
 * - 데이터베이스 연결 초기화 및 종료
 * - 앱 인스턴스 준비
 */

beforeAll(async () => {
  // 데이터베이스 연결이 초기화되지 않았다면 초기화
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
});

afterAll(async () => {
  // 테스트 종료 후 연결 정리
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
});

/**
 * 테스트용 요청 헬퍼
 *
 * 매번 new Request(...)를 작성하는 번거로움을 줄이기 위함이 목적입니다.
 * 다만, Phase 2 요구사항인 `"supertest 대신 app.handle(new Request(...)) 전면 교체"`를 준수하기 위해
 * 실제 테스트 코드에서는 app.handle(new Request(...)) 패턴을 명시적으로 사용할 예정입니다.
 * 필요 시 공통 헤더(Content-Type 등)를 주입하는 용도로 확장 가능합니다.
 */
export const TEST_BASE_URL = 'http://localhost';
