import { render as rtlRender, within } from '@testing-library/react';
import { TestProviders } from './test-providers';
import React from 'react';

// HappyDOM에서 "global document" 에러를 해결하기 위한 로컬 screen 프록시
// testing-library의 screen을 직접 사용하면 document.body가 없을 때 에러가 발생하므로,
// 런타임에 쿼리 함수들을 document.body에 바인딩하는 방식으로 대우합니다.
export const screen = new Proxy(
  {} as typeof import('@testing-library/react').screen,
  {
    get: (_, prop) => {
      if (typeof document !== 'undefined' && document.body) {
        const queries = within(document.body);
        return queries[prop as keyof typeof queries];
      }
      return undefined;
    },
  },
);

/**
 * 프로젝트 전역 Provider들이 포함된 커스텀 Render 함수
 */
function render(ui: React.ReactElement, options = {}) {
  return rtlRender(ui, { wrapper: TestProviders, ...options });
}

// @testing-library/react의 모든 기능을 다시 내보냅니다.
export * from '@testing-library/react';
// 기본 render 함수를 커스텀 render 함수로 덮어씁니다.
export { render };
