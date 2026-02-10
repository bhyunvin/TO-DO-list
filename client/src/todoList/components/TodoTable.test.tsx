/**
 * @jest-environment jsdom
 */
// @bun-env happy-dom
/// <reference lib="dom" />
import { render, screen } from '../../test-utils';
import { describe, test, expect } from 'bun:test';
import TodoTable from './TodoTable';

describe('TodoTable', () => {
  test('테이블이 올바르게 렌더링되어야 함', () => {
    render(
      <TodoTable
        todos={[]}
        isLoadingTodos={false}
        onToggleComplete={() => {}}
        onDeleteTodo={() => {}}
        onEditTodo={() => {}}
        togglingTodoSeq={null}
        openActionMenu={null}
        setOpenActionMenu={() => {}}
      />,
    );
    expect(screen.getByRole('table')).toBeDefined();
  });
});
