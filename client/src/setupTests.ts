import { Window } from 'happy-dom';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, jest } from 'bun:test';

// Happy DOM Window 생성
const window = new Window();

// 전역 객체 설정 (명시적으로 globalThis에 주입)
// Happy DOM의 타입을 globalThis의 타입과 맞추기 위해 unknown을 거쳐 캐스팅합니다.
Object.assign(globalThis, {
  window: window as unknown as typeof globalThis.window,
  document: window.document as unknown as Document,
  navigator: window.navigator as unknown as Navigator,
  HTMLElement: window.HTMLElement as unknown as typeof HTMLElement,
  HTMLInputElement:
    window.HTMLInputElement as unknown as typeof HTMLInputElement,
  HTMLTextAreaElement:
    window.HTMLTextAreaElement as unknown as typeof HTMLTextAreaElement,
  MouseEvent: window.MouseEvent as unknown as typeof MouseEvent,
  KeyboardEvent: window.KeyboardEvent as unknown as typeof KeyboardEvent,
  FocusEvent: window.FocusEvent as unknown as typeof FocusEvent,
  Event: window.Event as unknown as typeof Event,
  CustomEvent: window.CustomEvent as unknown as typeof CustomEvent,
  Node: window.Node as unknown as typeof Node,
  Element: window.Element as unknown as typeof Element,
  CharacterData: window.CharacterData as unknown as typeof CharacterData,
  DocumentFragment:
    window.DocumentFragment as unknown as typeof DocumentFragment,
  Text: window.Text as unknown as typeof Text,
  localStorage: window.localStorage as unknown as Storage,
  sessionStorage: window.sessionStorage as unknown as Storage,
});

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
} as unknown as typeof IntersectionObserver;

// FileReader Mock (이미지 업로드 테스트용)
class MockFileReader {
  onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
  readAsDataURL() {
    setTimeout(() => {
      if (this.onload) {
        this.onload({
          target: { result: 'data:image/png;base64,mock' },
        } as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
  }
}
globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  // Zustand persistence 등에서 사용하는 저장소 초기화
  globalThis.sessionStorage?.clear();
  globalThis.localStorage?.clear();
});
