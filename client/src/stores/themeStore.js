import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 테마 상태 관리를 위한 Zustand 스토어
 * localStorage를 사용하여 사용자의 테마 선호도를 영구 저장
 */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      // 현재 활성화된 테마 ('light' 또는 'dark')
      theme: 'dark',

      /**
       * 현재 테마를 토글 (light ↔ dark)
       */
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        document.documentElement.setAttribute('data-theme', newTheme);
      },

      /**
       * 특정 테마로 설정
       * @param {string} theme - 'light' 또는 'dark'
       */
      setTheme: (theme) => {
        if (theme !== 'light' && theme !== 'dark') {
          theme = 'dark';
        }
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      /**
       * 애플리케이션 시작 시 테마 초기화
       * 저장된 테마가 없으면 시스템 선호도를 확인하고, 그것도 없으면 dark 테마 사용
       */
      initializeTheme: () => {
        const { theme } = get();

        // 저장된 테마가 있으면 그것을 사용
        if (theme) {
          document.documentElement.setAttribute('data-theme', theme);
          return;
        }

        // 저장된 테마가 없으면 시스템 선호도 확인
        let initialTheme = 'dark';

        try {
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            initialTheme = 'dark';
          }
        } catch (error) {
          console.warn('System theme detection failed:', error);
          // 오류 발생 시 기본값인 'dark' 사용
        }

        set({ theme: initialTheme });
        document.documentElement.setAttribute('data-theme', initialTheme);
      },
    }),
    {
      name: 'theme-storage', // localStorage 키 이름
      storage: createJSONStorage(() => localStorage),
    }
  )
);
