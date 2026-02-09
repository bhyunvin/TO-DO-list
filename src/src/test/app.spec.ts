import { describe, expect, it } from 'bun:test';
import { app } from '../main';
import './setup-e2e'; // setup hooks 등록

describe('App 컨트롤러 (E2E 테스트)', () => {
  it('GET / (Welcome) - 서버 상태 확인', async () => {
    const response = await app.handle(new Request('http://localhost/'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('GET /favicon.ico - Favicon 요청 처리', async () => {
    const response = await app.handle(
      new Request('http://localhost/favicon.ico'),
    );
    expect(response.status).toBe(204); // 내용 없음 (No Content)
  });
});
