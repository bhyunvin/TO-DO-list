import { api, ApiError } from './client';
import { useAuthStore } from '../authStore/authStore';
import { hashPassword } from '../utils/passwordUtils';

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
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      // 이미지 파일은 일반 텍스트 정보 수정 payload에서 제외
      if (key !== 'profileImage') {
        payload[key] = value;
      }
    });

    const profileImageFile = formData.get('profileImage') as File | null;
    let resultUser: any = null;

    // 1. 프로필 이미지 파일이 있는 경우 이미지 업로드 API 먼저 호출
    if (profileImageFile) {
      const { data, error: uploadErr } = await userApi[
        'upload-profile-image'
      ].post({
        file: profileImageFile,
      });

      if (uploadErr) {
        throw new ApiError(
          typeof uploadErr.value === 'string'
            ? uploadErr.value
            : '프로필 이미지 업로드 실패',
          Number(uploadErr.status),
          uploadErr.value,
        );
      }
      resultUser = data;
    }

    // 2. 다른 프로필 정보 업데이트
    const { data: result, error: err } = await userApi.update.patch(payload);
    if (err) {
      throw new ApiError(
        typeof err.value === 'string' ? err.value : '프로필 수정 실패',
        Number(err.status),
        err.value,
      );
    }
    resultUser = result;

    return resultUser;
  },

  /**
   * 비밀번호 변경
   */
  async changePassword(currentPassword: string, newPassword: string) {
    const user = useAuthStore.getState().user;
    if (!user?.userId) throw new Error('사용자 정보가 없습니다.');

    const hashedCurrent = await hashPassword(currentPassword, user.userId);
    const hashedNew = await hashPassword(newPassword, user.userId);

    const { data, error } = await userApi['change-password'].patch({
      currentPassword: hashedCurrent,
      newPassword: hashedNew,
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
