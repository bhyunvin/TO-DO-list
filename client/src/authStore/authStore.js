import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// create 함수로 스토어를 만듭니다.
export const useAuthStore = create(
  // persist 미들웨어가 스토어의 모든 액션을 감싸줍니다.
  persist(
    (set) => ({
      // 1. 상태 (state)
      user: null,

      // 2. 상태를 변경하는 함수 (actions)
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),
    }),
    {
      // 3. 설정 객체
      name: 'auth-storage', // sessionStorage에 저장될 때 사용될 키 이름
      storage: createJSONStorage(() => sessionStorage), // localStorage 대신 sessionStorage 사용
    }
  )
);