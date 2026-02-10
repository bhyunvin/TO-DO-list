/**
 * @jest-environment jsdom
 */
// @bun-env happy-dom
/// <reference lib="dom" />
import { render, screen } from '../test-utils';
import { describe, test, expect } from 'bun:test';
import ChatModal from './ChatModal';

describe('ChatModal', () => {
  test('모달이 열렸을 때 렌더링되어야 함', () => {
    render(
      <ChatModal
        isOpen={true}
        onClose={() => {}}
        messages={[]}
        onSendMessage={() => {}}
        isLoading={false}
        error={null}
        onRetry={() => {}}
        onClearError={() => {}}
        onInputFocus={() => {}}
        onInputBlur={() => {}}
      />,
    );
    expect(screen.getByText(/AI/)).toBeDefined();
  });
});
