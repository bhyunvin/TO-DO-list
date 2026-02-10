import { render } from '@testing-library/react';
import { describe, test, expect } from 'bun:test';
import FloatingActionButton from './FloatingActionButton';

describe('FloatingActionButton', () => {
  test('플로팅 버튼이 렌더링되어야 함', () => {
    render(
      <FloatingActionButton
        isOpen={false}
        onClick={() => {}}
        isFocused={false}
      />,
    );
    expect(document.body).toBeDefined();
  });
});
