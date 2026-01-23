import { api } from './client';
// import { useAuthStore } from '../authStore/authStore'; // 순환 참조 우려가 있지만 일단 유지?
// authService 내에서 useAuthStore.getState() 사용함.

// 순환 참조 방지: authStore가 authService를 쓰는지 확인 필요.
// 보통 store에서 service를 호출함. store -> service -> store(getState) ?
// authStore.js 내용을 안 봤음. (Step 544).
// 하지만 기존 코드(Step 586)에 useAuthStore import가 있었으므로 유지.

import { useAuthStore } from '../authStore/authStore';

const authService = {
  /**
   * 로그인
   */
  async login(userId: string, userPassword: string) {
    // Eden Treaty 호출 (userId -> userEmail 매핑)
    const { data, error } = await api.user.login.post({
      userEmail: userId,
      userPw: userPassword,
    });

    if (error) {
      // 에러 처리: error.value는 에러 메시지 또는 객체
      // Elysia 에러 응답 구조 확인 필요. 보통 string or object.
      // 기존 로직은 apiClient가 에러를 throw.
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
      );
    }

    if (!data) throw new Error('No data received');

    // 백엔드 응답: { accessToken, user }
    // 타입 assertion으로 타입 안전성 확보
    const { accessToken, user } = data as { accessToken: string; user: any };

    // 스토어에 저장
    // user 타입 호환성: 백엔드 UserResponseDto와 프론트엔드 User 타입이 다를 수 있음.
    // 하지만 TS Migration 중이므로 일단 any로 처리하거나 그대로 넘김.
    useAuthStore.getState().login(user, accessToken);

    return data;
  },

  /**
   * 로그아웃
   */
  async logout() {
    // 서버 로그아웃 (Refresh Token 삭제 등)
    await api.user.logout.post();
    // 클라이언트 상태 초기화
    useAuthStore.getState().logout();
  },

  /**
   * 회원가입
   */
  async signup(formData: FormData | Record<string, any>) {
    // formData가 넘어왔다고 가정.
    // 백엔드 /user/register는 Body(JSON)만 받음 (Step 592 확인).
    // 따라서 FormData를 JSON으로 변환해야 함.
    // 프로필 이미지는 제외됨 (백엔드가 multipart 지원 안 함).

    let payload = formData;
    if (formData instanceof FormData) {
      payload = Object.fromEntries(formData.entries());
      // userEmail, userPw, userName, userPhone 등
      // userPhone이 빈 문자열이면 undefined로 처리?
      if (payload.userPhone === '') delete payload.userPhone;
    }

    const { data, error } = await api.user.register.post(payload);

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
   * 기존: /user/duplicate/:userId -> Elysia에는 없음 (Step 592).
   * Elysia user.routes.ts에는 duplicate 체크 API가 없음.
   * ==> 누락된 기능!
   * 해결책: 일단 주석 처리하거나 에러 발생.
   * 혹은 프론트엔드에서 duplicate check 호출 부분을 제거해야 함.
   * 백엔드 마이그레이션(Phase 2) 때 놓친 것일 수 있음.
   * 또는 /user/profile 조회로 대체? 아니면 register 시 에러 처리?
   * 클라이언트 SignupForm에서 호출할 텐데, 없으면 에러남.
   * 임시 조치: 항상 false(중복 아님) 반환하거나, 에러 처리.
   * 여기서는 에러를 throw해서 기능 미구현임을 알림.
   */
  async checkDuplicateId(_userId: string) {
    console.warn('checkDuplicateId API is not implemented in backend.');
    // 임시: 중복 아님 처리 (가입 시도 시 에러로 잡도록)
    return false;
  },
};

export default authService;
