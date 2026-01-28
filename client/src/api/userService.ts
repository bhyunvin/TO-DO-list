import { api, ApiError } from './client';

// Eden Treaty 타입 추론
const userApi = api.user;

const userService = {
  /**
   * 사용자 프로필 가져오기
   */
  async getProfile() {
    const { data, error } = await userApi.profile.get();
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '프로필 조회 실패',
        Number(error.status),
        error.value,
      );
    }
    return data;
  },

  /**
   * 사용자 상세 프로필 가져오기 (암호화 해제된 전체 정보)
   */
  async getUserProfileDetail() {
    const { data, error } = await userApi.profile.get();
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '프로필 상세 조회 실패',
        Number(error.status),
        error.value,
      );
    }
    return data;
  },

  /**
   * 사용자 프로필 업데이트
   */
  async updateProfile(formData: FormData) {
    const payload: Record<string, any> = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    const { data: result, error: err } = await userApi.update.patch(payload);
    if (err) {
      throw new ApiError(
        typeof err.value === 'string' ? err.value : '프로필 수정 실패',
        Number(err.status),
        err.value,
      );
    }
    return result;
  },

  /**
   * 비밀번호 변경
   */
  async changePassword(currentPassword, newPassword) {
    const { data, error } = await userApi['change-password'].patch({
      currentPassword,
      newPassword,
    });
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '비밀번호 변경 실패',
        Number(error.status),
        error.value,
      );
    }
    return data;
  },
};

export default userService;
