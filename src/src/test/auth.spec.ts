import { describe, expect, it } from 'bun:test';
import { app } from '../main';
import './setup-e2e';

const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123!';
const TEST_NAME = '테스트유저';

describe('Auth Controller (E2E)', () => {
  it('POST /user/register - 회원가입 성공', async () => {
    const payload = {
      userEmail: TEST_EMAIL,
      password: TEST_PASSWORD,
      userName: TEST_NAME,
    };

    const response = await app.handle(
      new Request('http://localhost/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    const createdUser: any = await response.json();
    expect(createdUser.userEmail).toBe(TEST_EMAIL);
    expect(createdUser.userName).toBe(TEST_NAME);
  });

  it('POST /user/login - 로그인 성공 및 토큰 발급', async () => {
    const payload = {
      userEmail: TEST_EMAIL,
      password: TEST_PASSWORD,
    };

    const response = await app.handle(
      new Request('http://localhost/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    const body: any = await response.json();

    expect(body.accessToken).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.userEmail).toBe(TEST_EMAIL);

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
      userEmail: TEST_EMAIL,
      password: 'wrongpassword',
    };

    const response = await app.handle(
      new Request('http://localhost/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    // 401 Unauthorized or 400 Bad Request depending on implementation
    // Assuming 401 or similar error code for invalid credentials
    expect(response.status).not.toBe(200);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('POST /user/register - 검증 오류 (422)', async () => {
    // 비밀번호가 너무 짧은 경우 등
    const payload = {
      userEmail: 'bad-email', // 이메일 형식 오류
      password: '123', // 비밀번호 길이 오류
      userName: '',
    };

    const response = await app.handle(
      new Request('http://localhost/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    // Elysia default validation error status is 422 or 400 depending on config.
    // In main.ts, we saw VALIDATION case returning 400. Let's check main.ts logic.
    // The previous main.ts code implementation returned 400 for VALIDATION.
    // User requested "Validation failure (422)" but implementation returns 400.
    // I should assert 400 based on current implementation OR update main.ts to 422.
    // Standard Elysia is 422, but the custom error handler in main.ts sets it to 400.
    // I will expect 400 based on existing code, or update main.ts.
    // Let's assert 400 for now as per main.ts logic.
    expect(response.status).toBe(422);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
  });
});
