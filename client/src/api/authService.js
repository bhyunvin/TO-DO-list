import apiClient from './apiClient';
import { useAuthStore } from '../authStore/authStore';

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
    // 백엔드에서 { access_token, user } 반환
    const { access_token, user } = response.data;

    // 스토어에 저장 (구독된 컴포넌트 자동 업데이트)
    useAuthStore.getState().login(user, access_token);

    return response.data;
  },

  /**
   * 로그아웃
   * @returns {Promise<void>}
   */
  async logout() {
    // API 호출 (선택 사항)
    try {
      await apiClient.post('/user/logout');
    } catch (error) {
      // 서버 로그아웃 실패해도 클라이언트 로그아웃은 진행
      console.warn(
        'Server logout failed (stateless logic safe to ignore)',
        error,
      );
    }
    // 클라이언트 상태 초기화
    useAuthStore.getState().logout();
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
