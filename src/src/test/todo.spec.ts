import { describe, expect, it, beforeAll } from 'bun:test';
import { api } from './setup-e2e';

interface TodoResponse {
  todoSeq: number;
  todoContent?: string;
  todoDate?: string;
  todoNote?: string;
  completeDtm?: string;
  attachments: any[];
  createdAt: string;
  isCompleted?: boolean;
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
    await api.user.register.post({
      userEmail: TEST_EMAIL,
      userPw: TEST_PASSWORD,
      userName: TEST_NAME,
    });

    // Login
    const { data: loginRes, error } = await api.user.login.post({
      userEmail: TEST_EMAIL,
      userPw: TEST_PASSWORD,
    });

    // ERROR HANDLING IN TEST: if login fails, data is null.
    if (error) {
      throw new Error(`Login failed: ${JSON.stringify(error)}`);
    }

    accessToken = loginRes.accessToken;
  });

  it('POST /todo - 할 일 생성', async () => {
    const payload = {
      todoContent: 'E2E 테스트 투두',
    };

    const { data, response } = await api.todo.post(payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(201);
    expect(data).toBeTruthy();
    expect(data.todoContent).toBe(payload.todoContent); // Eden ensures type safety
    createdTodoId = data.todoSeq;
  });

  it('GET /todo - 할 일 목록 조회', async () => {
    const { data, response } = await api.todo.get({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    // Explicit casting not strictly needed if Eden types work, but good for safety
    expect((data as any[]).some((t) => t.todoSeq === createdTodoId)).toBe(true);
  });

  it('PATCH /todo/:id - 할 일 수정', async () => {
    const payload = {
      todoContent: '수정된 투두',
      completeDtm: new Date().toISOString(),
    };

    // Cast to any to bypass type mismatch while keeping the logic correct
    const { data, response } = await (
      api.todo({ id: createdTodoId } as any) as any
    ).patch(payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(data!.todoContent).toBe(payload.todoContent);
    expect(data!.completeDtm).toBeDefined();
  });

  it('DELETE /todo - 할 일 삭제', async () => {
    const { response } = await api.todo.delete(
      { todoIds: [createdTodoId] },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status).toBe(200);
  });

  it('POST /todo - 제목 누락 시 검증 오류 (422/400)', async () => {
    const payload = {
      // content: '내용만 있음', // Original test used 'content' which caused validation error likely because 'todoContent' is required
      todoContent: undefined as any, // Force validation error
    };

    const { response } = await api.todo.post(payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Original test expected 422. Eden/Elysia validation usually returns 422 default used by treaty?
    // Response status check is enough.
    expect(response.status).toBe(422);
  });
});
