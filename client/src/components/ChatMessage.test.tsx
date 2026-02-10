/**
 * @jest-environment jsdom
 */
// @bun-env happy-dom
/// <reference lib="dom" />
import { render, screen } from '../test-utils';
import { describe, test, expect } from 'bun:test';
import ChatMessage from './ChatMessage';

describe('ChatMessage', () => {
  const mockMessage = {
    content: '안녕하세요',
    timestamp: new Date().toISOString(),
  };

  test('사용자 메시지가 올바르게 렌더링되어야 함', () => {
    render(<ChatMessage message={mockMessage} isUser={true} />);
    expect(screen.getByText('안녕하세요')).toBeDefined();
  });

  test('AI 메시지가 올바르게 렌더링되어야 함', () => {
    render(<ChatMessage message={mockMessage} isUser={false} />);
    expect(screen.getByText('안녕하세요')).toBeDefined();
  });
});
