import apiClient from './apiClient';

const authService = {
  /**
   * 로그인
   * @param {string} userId
   * @param {string} userPassword
   * @returns {Promise<object>}
   */
  async login(userId, userPassword) {
    const response = await apiClient.post('/user/login', {
      userId,
      userPassword,
    });
    return response.data;
  },

  /**
   * 로그아웃
   * @returns {Promise<void>}
   */
  async logout() {
    await apiClient.post('/user/logout');
  },

  /**
   * 세션 상태 확인 / 사용자 정보 조회
   * (기존에 로딩 시 사용자 정보를 가져오는 API가 있다면 여기에 구현)
   * @returns {Promise<object>}
   */
  async checkSession() {
    // 세션 확인을 위해 프로필 정보를 조회
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  /**
   * 회원가입
   * @param {FormData} formData
   * @returns {Promise<object>}
   */
  async signup(formData) {
    // FormData 전송 시 Content-Type 헤더가 필요 없으므로 apiClient에서 처리됨
    const response = await apiClient.post('/user/signup', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 아이디 중복 체크
   * @param {string} userId
   * @returns {Promise<boolean>} 중복 여부 (true/false)
   */
  async checkDuplicateId(userId) {
    const response = await apiClient.get(`/user/duplicate/${userId}`);
    // 기존 로직: 중복이면 true, 아니면 false 반환
    return response.data;
  },
};

export default authService;
