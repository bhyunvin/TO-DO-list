// Testing Library를 위한 DOM 환경 설정
import { Window } from 'happy-dom';

// Happy-DOM을 사용하여 DOM 환경 생성
const window = new Window();
const document = window.document;

// 전역 객체에 DOM 인터페이스를 추가
globalThis.window = window as any;
globalThis.document = document as any;
globalThis.navigator = window.navigator as any;
globalThis.HTMLElement = window.HTMLElement as any;
globalThis.HTMLInputElement = window.HTMLInputElement as any;
globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement as any;
globalThis.HTMLSelectElement = window.HTMLSelectElement as any;
globalThis.HTMLButtonElement = window.HTMLButtonElement as any;
globalThis.Element = window.Element as any;

// localStorage mock
const localStorageMock = {
  getItem: (key: string) => {
    return (localStorageMock as any)[key] || null;
  },
  setItem: (key: string, value: string) => {
    (localStorageMock as any)[key] = value;
  },
  removeItem: (key: string) => {
    delete (localStorageMock as any)[key];
  },
  clear: () => {
    const keys = Object.keys(localStorageMock);
    keys.forEach((key) => {
      if (key !== 'getItem' && key !== 'setItem' && key !== 'removeItem' && key !== 'clear') {
        delete (localStorageMock as any)[key];
      }
    });
  },
};

globalThis.localStorage = localStorageMock as any;

// jest-dom의 커스텀 매처 추가
import '@testing-library/jest-dom';
