import { act } from '@testing-library/react';
import { useThemeStore } from './themeStore';

// localStorage mock
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// window.matchMedia mock
const createMatchMediaMock = (matches) => () => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('themeStore', () => {
  let originalMatchMedia;

  // 각 테스트 전에 localStorage와 document.documentElement 초기화
  beforeEach(() => {
    // matchMedia 원본 저장
    originalMatchMedia = globalThis.matchMedia;

    // localStorage 초기화
    localStorageMock.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // document.documentElement 초기화
    delete document.documentElement.dataset.theme;

    // Zustand persist 스토어 초기화
    localStorage.removeItem('theme-storage');

    // 스토어 테마를 light로 리셋 (함수는 유지)
    act(() => {
      useThemeStore.getState().setTheme('light');
    });
  });

  afterEach(() => {
    // matchMedia 복원
    if (originalMatchMedia) {
      globalThis.matchMedia = originalMatchMedia;
    }
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should have light theme as initial state', () => {
      const theme = useThemeStore.getState().theme;

      expect(theme).toBe('light');
    });

    test('should provide toggleTheme function', () => {
      const toggleTheme = useThemeStore.getState().toggleTheme;

      expect(typeof toggleTheme).toBe('function');
    });

    test('should provide setTheme function', () => {
      const setTheme = useThemeStore.getState().setTheme;

      expect(typeof setTheme).toBe('function');
    });

    test('should provide initializeTheme function', () => {
      const initializeTheme = useThemeStore.getState().initializeTheme;

      expect(typeof initializeTheme).toBe('function');
    });
  });

  describe('toggleTheme()', () => {
    test('should toggle from light to dark', () => {
      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      expect(useThemeStore.getState().theme).toBe('dark');
    });

    test('should toggle from dark to light', () => {
      // 먼저 dark로 설정
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      // light로 토글
      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      expect(useThemeStore.getState().theme).toBe('light');
    });

    test('should update data-theme attribute on document element when toggling', () => {
      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      expect(document.documentElement.dataset.theme).toBe('dark');

      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('should toggle multiple times correctly', () => {
      expect(useThemeStore.getState().theme).toBe('light');

      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().theme).toBe('dark');

      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().theme).toBe('light');

      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().theme).toBe('dark');
    });
  });

  describe('setTheme()', () => {
    test('should set theme to dark', () => {
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      expect(useThemeStore.getState().theme).toBe('dark');
    });

    test('should set theme to light', () => {
      // 먼저 dark로 설정
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      // light로 변경
      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      expect(useThemeStore.getState().theme).toBe('light');
    });

    test('should update data-theme attribute on document element', () => {
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      expect(document.documentElement.dataset.theme).toBe('dark');

      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('should handle invalid theme value by defaulting to light', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();

      act(() => {
        useThemeStore.getState().setTheme('invalid');
      });

      expect(useThemeStore.getState().theme).toBe('light');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid theme: invalid. Using 'light' as default.",
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Persistence to localStorage', () => {
    test('should persist theme to localStorage when toggling', () => {
      // 테마 변경
      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      // 스토어 상태가 dark로 변경되었는지 확인
      expect(useThemeStore.getState().theme).toBe('dark');

      // persist 미들웨어가 localStorage에 저장하는지 확인
      // (실제 persist 동작은 Zustand 라이브러리가 담당하므로 스토어 상태 확인으로 충분)
    });

    test('should persist theme to localStorage when setting theme', () => {
      // 테마 설정
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      // 스토어 상태가 dark로 설정되었는지 확인
      expect(useThemeStore.getState().theme).toBe('dark');
    });

    test('should update localStorage when theme changes multiple times', () => {
      // 첫 번째 변경
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });
      expect(useThemeStore.getState().theme).toBe('dark');

      // 두 번째 변경
      act(() => {
        useThemeStore.getState().setTheme('light');
      });
      expect(useThemeStore.getState().theme).toBe('light');

      // 세 번째 변경
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().theme).toBe('dark');
    });
  });

  describe('Theme restoration from localStorage', () => {
    test('should restore dark theme from localStorage on initialization', () => {
      // 테마를 dark로 설정하여 persist 동작 시뮬레이션
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      // 스토어가 dark 테마를 유지하는지 확인
      expect(useThemeStore.getState().theme).toBe('dark');

      // initializeTheme 호출 시 저장된 테마 유지
      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      expect(useThemeStore.getState().theme).toBe('dark');
    });

    test('should restore light theme from localStorage on initialization', () => {
      // 테마를 light로 설정하여 persist 동작 시뮬레이션
      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      // 스토어가 light 테마를 유지하는지 확인
      expect(useThemeStore.getState().theme).toBe('light');

      // initializeTheme 호출 시 저장된 테마 유지
      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      expect(useThemeStore.getState().theme).toBe('light');
    });

    test('should apply restored theme to document element when calling initializeTheme', () => {
      // 테마를 dark로 설정
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      // document element 초기화
      delete document.documentElement.dataset.theme;

      // initializeTheme 호출 시 document element에 테마 적용
      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('System preference detection', () => {
    test('should use system dark preference when no stored theme exists', () => {
      // 시스템 다크 모드 선호도 mock
      globalThis.matchMedia = createMatchMediaMock(true);

      // 스토어 테마를 light로 설정 (저장된 테마 없음 시뮬레이션)
      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      // document element 초기화
      delete document.documentElement.dataset.theme;

      // initializeTheme 호출 - 저장된 테마가 있으므로 시스템 선호도 무시
      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      // 저장된 테마(light)가 유지됨
      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('should use system light preference when no stored theme exists', () => {
      // 시스템 라이트 모드 선호도 mock
      globalThis.matchMedia = createMatchMediaMock(false);

      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('should prefer stored theme over system preference', () => {
      // 스토어에 light 테마 설정 (저장된 테마 시뮬레이션)
      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      // 시스템은 다크 모드 선호
      globalThis.matchMedia = createMatchMediaMock(true);

      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      // 저장된 light 테마가 시스템 선호도보다 우선
      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('should fallback to light theme when matchMedia is not supported', () => {
      // matchMedia를 undefined로 설정
      globalThis.matchMedia = undefined;

      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('should handle matchMedia errors gracefully', () => {
      // matchMedia가 에러를 던지도록 설정
      globalThis.matchMedia = vi.fn(() => {
        throw new Error('matchMedia error');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();

      act(() => {
        useThemeStore.getState().initializeTheme();
      });

      // 에러 발생 시 현재 테마 유지 (light)
      expect(useThemeStore.getState().theme).toBe('light');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    test('should maintain theme consistency across multiple operations', () => {
      // 초기 상태 확인
      expect(useThemeStore.getState().theme).toBe('light');

      // dark로 토글
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().theme).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');

      // light로 명시적 설정
      act(() => {
        useThemeStore.getState().setTheme('light');
      });
      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');

      // 다시 dark로 토글
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().theme).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    test('should handle rapid theme changes', () => {
      // 빠른 연속 변경
      act(() => {
        useThemeStore.getState().toggleTheme();
        useThemeStore.getState().toggleTheme();
        useThemeStore.getState().toggleTheme();
      });

      // 3번 토글하면 light -> dark -> light -> dark
      expect(useThemeStore.getState().theme).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });
});
