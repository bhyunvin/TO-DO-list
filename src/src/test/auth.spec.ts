import { describe, expect, it } from 'bun:test';
import { getApi } from './setup-e2e';
const api = getApi();

let registeredUserId: string; // 가입된 사용자 ID를 저장학 위한 변수
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123!';
const TEST_NAME = '테스트유저';

describe('Auth Controller (E2E)', () => {
  it('POST /user/register - 회원가입 성공', async () => {
    registeredUserId = `testuser_${Date.now()}`; // 여기서 사용자 ID 할당
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

    const { data, response } = await api.user.login.post(payload);

    expect(response.status).toBe(200);

    expect(data.accessToken).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.userEmail).toBe(TEST_EMAIL);

    // 리프레시 토큰은 Set-Cookie 헤더로 전달됨
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('refresh_token=');

    // 쿠키 파싱하여 저장 (이후 테스트용)
    if (setCookie) {
      const match = /refresh_token=([^;]+)/.exec(setCookie);
      if (match) {
        const refreshToken = match[1];
        expect(refreshToken).toBeDefined();
      }
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
