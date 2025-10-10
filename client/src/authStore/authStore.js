import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// create 함수로 스토어를 만듭니다.
export const useAuthStore = create(
  // persist 미들웨어가 스토어의 모든 액션을 감싸줍니다.
  persist(
    (set) => ({
      // 상태 (state)
      user: null,

      // 상태를 변경하는 함수 (actions)
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),

      // API 호출을 위한 공통 fetch 함수
      api: async (url, options) => {
        const response = await fetch(url, options);

        // 401(인증 실패) 또는 504(게이트웨이 타임아웃) 에러 발생 시 자동 로그아웃 처리
        if (response.status === 401 || response.status === 504) {
          set({ user: null }); // user 상태를 null로 변경하여 로그인 페이지로 리디렉션
          // 필요하다면 사용자에게 상황을 알리는 로직을 추가할 수 있습니다.
          // throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }

        return response;
      },
    }),
    {
      // 3. 설정 객체
      name: 'auth-storage', // sessionStorage에 저장될 때 사용될 키 이름
      storage: createJSONStorage(() => sessionStorage), // localStorage 대신 sessionStorage 사용
    }
  )
);