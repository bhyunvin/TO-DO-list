import { describe, expect, it, beforeAll } from 'bun:test';
import { app } from '../main';
import { TEST_BASE_URL } from './setup-e2e';

interface TodoResponse {
  todoSeq: number;
  todoContent?: string;
  todoDate?: string;
  todoNote?: string;
  completeDtm?: string;
  attachments: any[];
  createdAt: string;
  isCompleted?: boolean;
  title?: string; // Payload에서 사용된 필드 대응 (스키마 상에는 없지만 테스트 코드에서 사용됨)
}

const TEST_EMAIL = `todo_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123!';
const TEST_NAME = '할일테스트';

describe('Todo Controller (E2E)', () => {
  let accessToken: string;
  let createdTodoId: number;

  // 1. 회원가입 및 로그인하여 토큰 획득
  beforeAll(async () => {
    // Register
    await app.handle(
      new Request(`${TEST_BASE_URL}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: TEST_EMAIL,
          password: TEST_PASSWORD,
          userName: TEST_NAME,
        }),
      }),
    );

    // Login
    const loginRes = await app.handle(
      new Request(`${TEST_BASE_URL}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      }),
    );
    const body = await loginRes.json();
    accessToken = body.accessToken;
  });

  it('POST /todo - 할 일 생성', async () => {
    const payload = {
      todoContent: 'E2E 테스트 투두',
      // title: 'E2E 테스트 투두', // Schema uses todoContent, not title
    };

    const response = await app.handle(
      new Request(`${TEST_BASE_URL}/todo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as TodoResponse;
    expect(body.todoContent).toBe(payload.todoContent);
    createdTodoId = body.todoSeq;
  });

  it('GET /todo - 할 일 목록 조회', async () => {
    const response = await app.handle(
      new Request(`${TEST_BASE_URL}/todo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as TodoResponse[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((t) => t.todoSeq === createdTodoId)).toBe(true);
  });

  it('PATCH /todo/:id - 할 일 수정', async () => {
    const payload = {
      todoContent: '수정된 투두',
      completeDtm: new Date().toISOString(), // isCompleted logic might be different, schema uses completeDtm string
    };

    const response = await app.handle(
      new Request(`${TEST_BASE_URL}/todo/${createdTodoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as TodoResponse;
    expect(body.todoContent).toBe(payload.todoContent);
    expect(body.completeDtm).toBeDefined();
  });

  it('DELETE /todo/:id - 할 일 삭제', async () => {
    const response = await app.handle(
      new Request(`${TEST_BASE_URL}/todo/${createdTodoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    expect(response.status).toBe(200);
  });

  it('GET /todo/:id - 삭제된 할 일 조회 실패', async () => {
    const response = await app.handle(
      new Request(`${TEST_BASE_URL}/todo/${createdTodoId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    // 404 or empty? Depends on logic. Assuming 404 for not found resource.
    expect(response.status).toBe(404);
  });

  it('POST /todo - 제목 누락 시 검증 오류 (422/400)', async () => {
    const payload = {
      content: '내용만 있음',
    };

    const response = await app.handle(
      new Request(`${TEST_BASE_URL}/todo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(422); // Main.ts maps validation to 400 but Elysia default is 422
  });
});
