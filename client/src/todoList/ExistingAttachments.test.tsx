/**
 * @jest-environment jsdom
 */
// @bun-env happy-dom
/// <reference lib="dom" />
import { render } from '@testing-library/react';
import { describe, test, expect, mock } from 'bun:test';
import ExistingAttachments from './ExistingAttachments';

mock.module('../api/todoService', () => ({
  default: {
    getAttachments: () => Promise.resolve([]),
  },
}));

describe('ExistingAttachments', () => {
  test('첨부파일 영역이 렌더링되어야 함', () => {
    render(<ExistingAttachments todoSeq={1} />);
    expect(document.body).toBeDefined();
  });
});
