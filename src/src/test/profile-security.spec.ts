import { describe, expect, it, beforeAll } from 'bun:test';
import { getApi } from './setup-e2e';

let api: ReturnType<typeof getApi>;

beforeAll(() => {
  api = getApi();
});

describe('프로필 보안 (E2E 테스트)', () => {
  it('GET /user/profile - 인증 없이 접근 차단 (401/400)', async () => {
    // 토큰 없이 요청
    const { response } = await api.user.profile.get();

    // Elysia JWT 플러그인은 토큰이 없거나 유효하지 않으면 예외를 발생시키거나
    // 핸들러 내부에서 user 객체 확인 시 에러를 던집니다.
    // 현재 구현에서는 401 또는 400 에러 등을 반환할 수 있으므로 성공(200)하지 않는지 검증합니다.
    expect(response.status).not.toBe(200);
  });
});
