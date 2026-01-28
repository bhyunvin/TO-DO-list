// Testing Library를 위한 DOM 환경 설정
import { Window as HappyWindow } from 'happy-dom';

// Happy-DOM을 사용하여 DOM 환경 생성
const happyWindow = new HappyWindow();
const happyDocument = happyWindow.document;

// TypeScript global 타입 확장 - 타입 안전하게 처리
declare global {
  var window: Window & typeof globalThis;
  var document: Document;
  var navigator: Navigator;
  var HTMLElement: typeof HTMLElement;
  var HTMLInputElement: typeof HTMLInputElement;
  var HTMLTextAreaElement: typeof HTMLTextAreaElement;
  var HTMLSelectElement: typeof HTMLSelectElement;
  var HTMLButtonElement: typeof HTMLButtonElement;
  var Element: typeof Element;
  var localStorage: Storage;
}

// 전역 객체에 DOM 인터페이스를 추가 - 타입 확장으로 안전하게 처리
Object.assign(globalThis, {
  window: happyWindow,
  document: happyDocument,
  navigator: happyWindow.navigator,
  HTMLElement: happyWindow.HTMLElement,
  HTMLInputElement: happyWindow.HTMLInputElement,
  HTMLTextAreaElement: happyWindow.HTMLTextAreaElement,
  HTMLSelectElement: happyWindow.HTMLSelectElement,
  HTMLButtonElement: happyWindow.HTMLButtonElement,
  Element: happyWindow.Element,
});

// localStorage mock - 타입 안정성을 위한 별도 저장소
interface LocalStorageData {
  [key: string]: string;
}

const storageData: LocalStorageData = {};

const localStorageMock: Storage = {
  getItem: (key: string) => {
    return storageData[key] || null;
  },
  setItem: (key: string, value: string) => {
    storageData[key] = value;
  },
  removeItem: (key: string) => {
    delete storageData[key];
  },
  clear: () => {
    Object.keys(storageData).forEach((key) => {
      delete storageData[key];
    });
  },
  length: 0,
  key: () => null,
};

globalThis.localStorage = localStorageMock;

// jest-dom의 커스텀 매처 추가
import '@testing-library/jest-dom';
