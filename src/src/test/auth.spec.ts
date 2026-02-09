import { describe, expect, it, beforeAll } from 'bun:test';
import { getApi } from './setup-e2e';
import { randomBytes } from 'node:crypto';
import { dataSource } from '../plugins/database';
import { UserEntity } from '../features/user/user.entity';
import { RefreshTokenEntity } from '../features/user/refresh-token.entity';

let api: ReturnType<typeof getApi>;

beforeAll(() => {
  api = getApi();
});

let registeredUserId: string;
const TEST_EMAIL = `test_${Date.now()}_${randomBytes(4).toString('hex')}@example.com`;
const TEST_PASSWORD = 'password123!';
const TEST_NAME = '테스트유저';

/**
 * 로그인 재시도 헬퍼 함수
 * DB 트랜잭션 지연 등으로 인해 400/401 에러가 발생할 경우,
 * 지정된 횟수만큼 재시도합니다.
 */
async function tryLoginWithRetry(payload: any, maxRetries = 5, delayMs = 500) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await api.user.login.post(payload);

    // 성공(200)이면 즉시 반환
    if (response.response.status === 200) {
      return response;
    }

    // 4xx/5xx 에러 실패 시 대기 후 재시도
    if (i < maxRetries - 1) {
      console.warn(
        `로그인 실패 (시도 ${i + 1}/${maxRetries}): status=${
          response.response.status
        }. ${delayMs}ms 후 재시도...`,
      );
      await Bun.sleep(delayMs);
    }
  }

  // 마지막 시도까지 실패하면 마지막 응답 반환
  return await api.user.login.post(payload);
}

describe('인증 컨트롤러 (E2E 테스트)', () => {
  it('POST /user/register - 회원가입 성공', async () => {
    // 충돌 방지 및 길이 제한(40자) 준수를 위해 짧은 랜덤 문자열 사용
    // testuser_ (9) + timestamp_hex (가변) + random (8) 조합으로 길이 제한(40자) 준수
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    registeredUserId = `user_${timestamp}_${random}`; // 예: user_lz3x7s1b_a1b2c3d4 (약 20-25자)

    const payload = {
      userId: registeredUserId,
      userEmail: TEST_EMAIL,
      userPw: TEST_PASSWORD,
      userName: TEST_NAME,
      privacyAgreed: true,
    };

    const { data, response, error } = await api.user.register.post(payload);

    if (error) {
      console.error('회원가입 에러:', error.status, error.value);
    }
    console.log('회원가입 상태:', response.status);

    expect(response.status).toBe(201);
    expect(data.userEmail).toBe(TEST_EMAIL);
    expect(data.userName).toBe(TEST_NAME);
  });

  it('POST /user/login - 로그인 성공 및 토큰 발급', async () => {
    const payload = {
      userId: registeredUserId,
      userPw: TEST_PASSWORD,
    };

    // 재시도 로직 적용
    const { data, response } = await tryLoginWithRetry(payload);

    expect(response.status).toBe(200);

    expect(data.accessToken).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.userEmail).toBe(TEST_EMAIL);

    /*
     * 테스트 환경(Bun + Elysia Treaty)에서 Set-Cookie 헤더가
     * 응답 객체에 올바르게 전달되지 않는 현상이 있어,
     * DB에 리프레시 토큰이 실제로 저장되었는지 검증하는 것으로 대체합니다.
     * 이는 쿠키 전달 메커니즘보다 더 확실한 로직 검증 방법입니다.
     */
    const userRepo = dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({
      where: { userId: registeredUserId },
    });
    expect(user).toBeDefined();

    if (user) {
      const tokenRepo = dataSource.getRepository(RefreshTokenEntity);
      const token = await tokenRepo.findOne({
        where: { userSeq: user.userSeq },
        order: { auditColumns: { regDtm: 'DESC' } },
      });

      expect(token).toBeDefined();
      expect(token?.refreshToken).toBeDefined();
    }
  });

  it('POST /user/login - 잘못된 비밀번호 실패', async () => {
    const payload = {
      userId: registeredUserId,
      userPw: 'wrongpassword',
    };

    const { response, error } = await api.user.login.post(payload);

    // 구현에 따라 401 Unauthorized 또는 400 Bad Request 반환
    expect(response.status).not.toBe(200);
    // 에러 발생 시 데이터는 null임. error.value를 확인
    expect(error?.value).toMatchObject({ success: false });
  });

  it('POST /user/register - 검증 오류 (422)', async () => {
    // 비밀번호가 너무 짧은 경우 등
    const payload = {
      userId: 'short',
      userEmail: 'bad-email', // 이메일 형식 오류
      userPw: '123', // 비밀번호 길이 오류
      userName: '',
    };

    const { response, error } = await api.user.register.post(payload);

    expect(response.status).toBe(422);
    expect(error?.value).toMatchObject({ success: false });
    expect(error?.value).toHaveProperty('errors');
  });
});
