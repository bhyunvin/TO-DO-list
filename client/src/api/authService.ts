import { api, ApiError } from './client';

import { useAuthStore } from '../authStore/authStore';
import { hashPassword } from '../utils/passwordUtils';

const userApi = api.user;

const authService = {
  /**
   * 로그인
   */
  async login(userId: string, userPassword: string) {
    const hashedPw = await hashPassword(userPassword, userId);
    const { data, error } = await userApi.login.post({
      userId: userId,
      userPw: hashedPw,
    });

    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '로그인 실패',
        Number(error.status),
        error.value,
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
    const rawObj =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;
    const payload: Record<string, unknown> = { ...rawObj };

    if (
      typeof payload.userPw === 'string' &&
      typeof payload.userId === 'string'
    ) {
      const hashedPw = await hashPassword(payload.userPw, payload.userId);
      payload.userPw = hashedPw;
    }

    const { data, error } = await userApi.register.post(
      payload as Parameters<typeof userApi.register.post>[0],
    );

    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '회원가입 실패',
        Number(error.status),
        error.value,
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
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '중복 체크 실패',
        Number(error.status),
        error.value,
      );
    }

    return data?.isDuplicated ?? false;
  },
};

export default authService;
