import apiClient from './apiClient';

const userService = {
  /**
   * 사용자 프로필 가져오기
   * @returns {Promise<object>}
   */
  async getProfile() {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  /**
   * 사용자 상세 프로필 가져오기 (암호화 해제된 전체 정보)
   * @returns {Promise<object>}
   */
  async getUserProfileDetail() {
    const response = await apiClient.get('/user/profile/detail');
    return response.data;
  },

  /**
   * 사용자 프로필 업데이트
   * @param {FormData} formData
   * @returns {Promise<object>}
   */
  async updateProfile(formData) {
    const response = await apiClient.patch('/user/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 비밀번호 변경
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<object>}
   */
  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.post('/user/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export default userService;
