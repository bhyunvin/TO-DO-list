import { treaty } from '@elysiajs/eden';
import type { App } from '@todo/backend/src/main';
import { useAuthStore } from '../authStore/authStore';
import { showErrorAlert } from '../utils/alertUtils';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * 커스텀 Fetch 래퍼
 * - Authorization 헤더 주입
 * - 401 Unauthorized 글로벌 처리
 */
const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const { accessToken, logout } = useAuthStore.getState();

  const headers = new Headers(init?.headers);

  // 토큰 주입
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // 401 Unauthorized 처리
  if (response.status === 401) {
    const urlString = input instanceof Request ? input.url : input.toString();
    // 로그인 엔드포인트 실패 시 로그아웃 처리 스킵
    if (!urlString.includes('/user/login')) {
      console.error('인증 실패: 로그인이 필요합니다.');
      logout();
      showErrorAlert(
        '세션 만료',
        '세션이 만료되었습니다. 다시 로그인해주세요.',
      );
    }
  }

  return response;
};

export const API_URL = BASE_URL;

export class ApiError extends Error {
  response: {
    status: number;
    data: unknown;
  };

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.response = { status, data };
  }
}

export const api = treaty<App>(BASE_URL, {
  fetcher: customFetch as typeof fetch,
});
