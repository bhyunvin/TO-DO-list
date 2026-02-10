/**
 * @jest-environment jsdom
 */
// @bun-env happy-dom
/// <reference lib="dom" />
import { render, screen } from '../test-utils';
import { describe, test, expect } from 'bun:test';
import ContactDeveloperModal from './ContactDeveloperModal';

describe('ContactDeveloperModal', () => {
  test('모달이 나타날 때 렌더링되어야 함', () => {
    render(<ContactDeveloperModal show={true} onHide={() => {}} />);
    expect(screen.getByText(/개발자/)).toBeDefined();
  });
});
