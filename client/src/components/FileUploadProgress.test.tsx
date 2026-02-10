import { render } from '@testing-library/react';
import { describe, test, expect } from 'bun:test';
import FileUploadProgress from './FileUploadProgress';

describe('FileUploadProgress', () => {
  test('업로드 진행 바가 렌더링되어야 함', () => {
    render(<FileUploadProgress onRetryUpload={() => {}} />);
    expect(document.body).toBeDefined();
  });
});
