import 'reflect-metadata';
import { beforeAll } from 'bun:test';
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

// 테스트 종료 후 연결 정리 (데이터소스 정리 로직은 필요한 경우 추가)

/**
 * 테스트용 요청 헬퍼
 *
 * 매번 new Request(...)를 작성하는 번거로움을 줄이기 위함이 목적입니다.
 * app.handle(new Request(...)) 대신 edenTreaty를 사용합니다.
 * 이를 위해 custom fetcher를 사용하여 app.handle을 호출하도록 설정합니다.
 */
export const TEST_BASE_URL = 'http://localhost';

import { treaty } from '@elysiajs/eden';
import { app, type App } from '../main';

const testFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const req = new Request(input, init);
  return app.handle(req);
};

// 테스트 기간 중 Temporal Dead Zone (TDZ) 초기화 문제를 피하기 위해 함수로 내보냄
export const getApi = () =>
  treaty<App>(TEST_BASE_URL, {
    fetcher: testFetch as typeof fetch,
  });
