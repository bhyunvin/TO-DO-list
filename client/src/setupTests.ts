import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register();

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

import { afterEach, jest } from 'bun:test';

console.log('!!! SETUP TESTS LOADING !!!');
console.log('Global document available:', !!globalThis.document);

// 모킹 로드
import './mocks';

// 각 테스트 후 정리 작업 실행
afterEach(() => {
  cleanup();
  // 모킹 복원
  jest.clearAllMocks();
});

// Bun을 위한 jest.mocked 호환성 추가
if (!(jest as any).mocked) {
  (jest as any).mocked = (v: any) => v;
}

// Eden Treaty 호환성을 위한 전역 fetch 모킹 설정
const constantMock = {
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob([]),
  clone: function () {
    return this;
  },
} as unknown as Response;

const mockFetch = (async (url: string | URL | Request) => {
  const urlStr =
    typeof url === 'object' && 'url' in url ? url.url : String(url);
  console.log(`[MockFetch] Request to: ${urlStr}`);
  return constantMock;
}) as unknown as typeof fetch;

globalThis.fetch = mockFetch;
if (globalThis.window !== undefined) {
  globalThis.window.fetch = mockFetch;
}

// URL.createObjectURL 폴리필 (Excel/Blob 테스트용)
if (globalThis.URL.createObjectURL === undefined) {
  globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  globalThis.URL.revokeObjectURL = jest.fn();
}

// TypeScript global 타입 확장
declare global {
  var window: Window & typeof globalThis;
}

// sessionStorage 모킹
if (!globalThis.sessionStorage) {
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
    // Storage 인터페이스를 충족하기 위해 누락된 속성 추가
    [Symbol.iterator]: function* () {},
  } as unknown as Storage;
}

// localStorage 모킹
if (!globalThis.localStorage) {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
    // Storage 인터페이스를 충족하기 위해 누락된 속성 추가
    [Symbol.iterator]: function* () {},
  } as unknown as Storage;
}

// matchMedia 모킹
if (!globalThis.matchMedia) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // 권장되지 않음(deprecated)
      removeListener: jest.fn(), // 권장되지 않음(deprecated)
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// ResizeObserver 모킹
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      // 아무 작업도 하지 않음
    }
    unobserve() {
      // 아무 작업도 하지 않음
    }
    disconnect() {
      // 아무 작업도 하지 않음
    }
  };
}

// IntersectionObserver 모킹
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    observe() {
      // 아무 작업도 하지 않음
    }
    unobserve() {
      // 아무 작업도 하지 않음
    }
    disconnect() {
      // 아무 작업도 하지 않음
    }
    takeRecords() {
      return [];
    }
  };
}

// 모킹은 ./mocks.ts에서 처리됨
