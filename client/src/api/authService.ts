import { api } from './client';

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

    if (!data) throw new Error('No data received');

    const { accessToken, user } = data as { accessToken: string; user: any };

    useAuthStore.getState().login(user, accessToken);

    return data;
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
  async signup(formData: FormData | Record<string, any>) {
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
