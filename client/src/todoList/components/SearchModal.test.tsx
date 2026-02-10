/**
 * @jest-environment jsdom
 */
// @bun-env happy-dom
/// <reference lib="dom" />
import { render, screen } from '../../test-utils';
import { describe, test, expect } from 'bun:test';
import SearchModal from './SearchModal';

describe('SearchModal', () => {
  test('검색 모달이 렌더링되어야 함', () => {
    render(
      <SearchModal show={true} onHide={() => {}} onMoveToDate={() => {}} />,
    );
    expect(
      screen.getByPlaceholderText(/내용 또는 비고를 입력하세요/),
    ).toBeDefined();
  });
});
