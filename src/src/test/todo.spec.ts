import { describe, expect, it, beforeAll } from 'bun:test';
import { getApi } from './setup-e2e';
const api = getApi();

interface TodoResponse {
  todoSeq: number;
  todoContent?: string;
  todoDate?: string;
  todoNote?: string;
  completeDtm?: string;
  attachments: {
    fileNo: number;
    originalFileName: string;
    fileSize: number;
    fileExt: string;
    uploadDate: Date;
  }[];
  createdAt: string;
}

const TEST_EMAIL = `todo_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123!';
const TEST_NAME = '할일테스트';

describe('Todo 컨트롤러 (E2E 테스트)', () => {
  let accessToken: string;
  let createdTodoId: number;

  beforeAll(async () => {
    const TEST_USER_ID = `todo_user_${Date.now()}`;
    await api.user.register.post({
      userId: TEST_USER_ID,
      userEmail: TEST_EMAIL,
      userPw: TEST_PASSWORD,
      userName: TEST_NAME,
      privacyAgreed: true,
    });

    const { data, error } = await api.user.login.post({
      userId: TEST_USER_ID,
      userPw: TEST_PASSWORD,
    });

    if (error || !data) {
      throw new Error(`로그인 실패: ${JSON.stringify(error)}`);
    }

    accessToken = data.accessToken;
  });

  it('POST /todo - 할 일 생성', async () => {
    const payload = {
      todoContent: 'E2E 테스트 투두',
      todoDate: new Date().toISOString().split('T')[0],
    };

    const { data, response } = await api.todo.post(payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(201);
    expect(data).toBeTruthy();
    if (data && 'todoSeq' in data) {
      createdTodoId = data.todoSeq;
    }
  });

  it('GET /todo - 할 일 목록 조회', async () => {
    const { data, response } = await api.todo.get({
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    const todos = data as TodoResponse[];
    expect(todos.some((t) => t.todoSeq === createdTodoId)).toBe(true);
  });

  it('PATCH /todo/:id - 할 일 수정', async () => {
    const payload = {
      todoContent: '수정된 투두',
      completeDtm: new Date().toISOString(),
    };

    const { data, response } = await api
      .todo({ id: createdTodoId })
      .patch(payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

    expect(response.status).toBe(200);
    if (data && 'todoContent' in data) {
      expect(data.todoContent).toBe(payload.todoContent);
    }
  });

  it('DELETE /todo - 할 일 삭제', async () => {
    const { response } = await api.todo.delete(
      { todoIds: [createdTodoId] },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    expect(response.status).toBe(200);
  });

  it('POST /todo - 제목 누락 시 검증 오류 (422)', async () => {
    const payload = {
      todoContent: undefined as unknown as string,
    };

    const { response } = await api.todo.post(payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(422);
  });
});
