import { Window } from 'happy-dom';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, jest } from 'bun:test';

// Happy DOM Window 생성
const window = new Window();

// 전역 객체 설정 (명시적으로 globalThis에 주입)
globalThis.window = window as any;
globalThis.document = window.document as any;
globalThis.navigator = window.navigator as any;
globalThis.HTMLElement = window.HTMLElement as any;
globalThis.HTMLInputElement = window.HTMLInputElement as any;
globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement as any;
globalThis.MouseEvent = window.MouseEvent as any;
globalThis.KeyboardEvent = window.KeyboardEvent as any;
globalThis.FocusEvent = window.FocusEvent as any;
globalThis.Event = window.Event as any;
globalThis.CustomEvent = window.CustomEvent as any;
globalThis.Node = window.Node as any;
globalThis.Element = window.Element as any;
globalThis.CharacterData = window.CharacterData as any;
globalThis.DocumentFragment = window.DocumentFragment as any;
globalThis.Text = window.Text as any;

// Storage API 주입
globalThis.localStorage = window.localStorage as any;
globalThis.sessionStorage = window.sessionStorage as any;

// ResizeObserver 모드
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    /* 의도적 빈 함수 */
  }
  unobserve() {
    /* 의도적 빈 함수 */
  }
  disconnect() {
    /* 의도적 빈 함수 */
  }
};

// matchMedia 모의 객체
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// IntersectionObserver 모킹
globalThis.IntersectionObserver = class {
  observe() {
    /* 의도적 빈 함수 */
  }
  unobserve() {
    /* 의도적 빈 함수 */
  }
  disconnect() {
    /* 의도적 빈 함수 */
  }
} as any;

// FileReader Mock (이미지 업로드 테스트용)
class MockFileReader {
  onload: ((ev: any) => any) | null = null;
  readAsDataURL() {
    setTimeout(() => {
      this.onload?.({ target: { result: 'data:image/png;base64,mock' } });
    }, 0);
  }
}
globalThis.FileReader = MockFileReader as any;

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  // Zustand persistence 등에서 사용하는 저장소 초기화
  globalThis.sessionStorage?.clear();
  globalThis.localStorage?.clear();
});
