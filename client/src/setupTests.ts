import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register();

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

import { afterEach, jest } from 'bun:test';

console.log('!!! SETUP TESTS LOADING !!!');
console.log('Global document available:', !!globalThis.document);

// Load Mocks
import './mocks';

// Run cleanup after each test
afterEach(() => {
  cleanup();
  // Restore mocks
  jest.clearAllMocks();
});

// Add jest.mocked compatibility for Bun
if (!(jest as any).mocked) {
  (jest as any).mocked = (v: any) => v;
}

// Setup global fetch mock for Eden Treaty compatibility
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

// TypeScript global 타입 확장
declare global {
  var window: Window & typeof globalThis;
}

// sessionStorage Mock
if (!globalThis.sessionStorage) {
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as Storage;
}

// localStorage Mock
if (!globalThis.localStorage) {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as Storage;
}

// Mocks handled in ./mocks.ts
