import { render, screen } from '../test-utils';
import { describe, test, expect } from 'bun:test';
import PasswordChangeForm from './PasswordChangeForm';

describe('PasswordChangeForm', () => {
  test('비밀번호 변경 폼이 렌더링되어야 함', () => {
    render(
      <PasswordChangeForm
        onSave={() => {}}
        onCancel={() => {}}
        onDirtyChange={() => {}}
      />,
    );
    expect(screen.getByLabelText(/현재 비밀번호/)).toBeDefined();
  });
});
