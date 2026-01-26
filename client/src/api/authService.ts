import { api } from './client';

// User 타입 정의
export interface User {
  userNo: number;
  userEmail: string;
  userName: string;
  userDescription?: string;
}

/**
 * Treaty API 타입 제약 관련:
 *
 * Elysia의 Treaty 클라이언트는 복잡한 동적 라우팅 구조에서 TypeScript 타입 추론에 한계가 있습니다.
 * 백엔드의 App 타입을 제대로 import하고 treaty<App>()로 명시해도,
 * 실제 API 호출 시점에 타입이 올바르게 추론되지 않는 Treaty의 알려진 제약사항입니다.
 *
 * 런타임에는 정상 작동하지만, TypeScript 컴파일 타임에 타입 에러가 발생합니다.
 * 따라서 불가피하게 any 타입을 사용하되, 실제 반환값은 백엔드 응답 타입과 일치합니다.
 *
 * @see https://github.com/elysiajs/eden/issues - Treaty type inference limitations
 */

const userApi = api.user as any;

import { useAuthStore } from '../authStore/authStore';

const authService = {
  /**
   * 로그인
   */
  async login(userId: string, userPassword: string) {
    const { data, error } = await userApi.login.post({
      userEmail: userId,
      userPw: userPassword,
    });

    if (error) {
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
      );
    }

    // Elysia Eden 타입 추론 활용
    const responseData = data;
    if (!responseData) throw new Error('No data received');

    const { accessToken, user } = responseData;

    useAuthStore.getState().login(user, accessToken);

    return responseData;
  },

  /**
   * 로그아웃
   */
  async logout() {
    await userApi.logout.post();
    useAuthStore.getState().logout();
  },

  /**
   * 회원가입
   */
  async signup(formData: FormData | Record<string, unknown>) {
    let payload = formData;
    if (formData instanceof FormData) {
      payload = Object.fromEntries(formData.entries());
      if (payload.userPhone === '') delete payload.userPhone;
    }

    const { data, error } = await userApi.register.post(payload);

    if (error) {
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
      );
    }

    return data;
  },

  /**
   * 아이디 중복 체크
   */
  async checkDuplicateId(userId: string): Promise<boolean> {
    const { data, error } = await userApi.duplicate({ userId }).get();

    if (error) {
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
      );
    }

    return data?.isDuplicated ?? false;
  },
};

export default authService;
