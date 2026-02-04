// Testing Library를 위한 DOM 환경 설정
import '@testing-library/jest-dom';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
// Manually register happy-dom environment
GlobalRegistrator.register();

// TypeScript global 타입 확장
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
}

// sessionStorage Mock (GlobalRegistrator should provide it, but ensuring it exists)
if (!globalThis.sessionStorage) {
  const storageMock = (() => {
    let store: { [key: string]: string } = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();
  Object.defineProperty(globalThis, 'sessionStorage', { value: storageMock });
}
