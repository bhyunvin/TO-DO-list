import { api, ApiError } from './client';

const userApi = api.user;

import { useAuthStore } from '../authStore/authStore';

const authService = {
  /**
   * 로그인
   */
  async login(userId: string, userPassword: string) {
    const { data, error } = await userApi.login.post({
      userId: userId,
      userPw: userPassword,
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
    let payload = formData;
    if (formData instanceof FormData) {
      payload = Object.fromEntries(formData.entries());
    }

    const { data, error } = await userApi.register.post(payload);

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
