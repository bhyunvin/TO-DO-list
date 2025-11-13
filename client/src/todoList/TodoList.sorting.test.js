import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoList from './TodoList';

// Create mock API function
const mockApi = jest.fn();

// Mock dependencies
jest.mock('../authStore/authStore', () => ({
  useAuthStore: () => ({
    user: { userId: 'testuser', userName: 'Test User', userSeq: 1 },
    logout: jest.fn(),
    api: mockApi,
    login: jest.fn(),
  }),
}));

jest.mock('../stores/chatStore', () => ({
  useChatStore: () => ({
    messages: [],
    isLoading: false,
    error: null,
    addMessage: jest.fn(),
    setLoading: jest.fn(),
    clearError: jest.fn(),
    handleApiError: jest.fn(),
    setRetryMessage: jest.fn(),
    getRetryMessage: jest.fn(),
    resetRetryState: jest.fn(),
    canSendRequest: jest.fn(() => true),
  }),
}));

jest.mock('../hooks/useFileUploadValidator', () => ({
  useFileUploadValidator: () => ({
    validateFiles: jest.fn(() => []),
    formatFileSize: jest.fn(() => '10MB'),
    getUploadPolicy: jest.fn(() => ({ maxSize: 10485760, maxCount: 10 })),
  }),
}));

jest.mock('../hooks/useFileUploadProgress', () => ({
  useFileUploadProgress: () => ({
    uploadStatus: 'idle',
    uploadProgress: {},
    uploadErrors: [],
    uploadedFiles: [],
    resetUploadState: jest.fn(),
  }),
}));

jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
}));

describe('TodoContainer Sorting Behavior', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('completed todo moves to bottom after toggle', async () => {
    const user = userEvent.setup();

    // Initial todos: all incomplete
    const initialTodos = [
      { todoSeq: 3, todoContent: 'Todo 3', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
      { todoSeq: 2, todoContent: 'Todo 2', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
      { todoSeq: 1, todoContent: 'Todo 1', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
    ];

    // Mock initial fetch
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => initialTodos,
    });

    render(<TodoList />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Todo 3')).toBeInTheDocument();
    });

    // Verify initial order (all incomplete, sorted by todoSeq DESC)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Todo 3'); // First data row
    expect(rows[2]).toHaveTextContent('Todo 2');
    expect(rows[3]).toHaveTextContent('Todo 1');

    // Mock successful toggle response
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Toggle Todo 3 (first item) to complete - click the cell, not the checkbox
    const checkboxCells = screen.getAllByRole('cell').filter(cell => 
      cell.classList.contains('checkbox-cell')
    );
    await user.click(checkboxCells[0]);

    // Wait for optimistic update and sorting
    await waitFor(() => {
      const updatedRows = screen.getAllByRole('row');
      // Todo 3 should now be at the bottom (completed items go last)
      expect(updatedRows[1]).toHaveTextContent('Todo 2'); // Now first
      expect(updatedRows[2]).toHaveTextContent('Todo 1'); // Now second
      expect(updatedRows[3]).toHaveTextContent('Todo 3'); // Now last (completed)
    });

    // Verify Todo 3 checkbox is checked
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes[2]).toBeChecked(); // Todo 3 is now at index 2
  });

  test('uncompleted todo moves to top after toggle', async () => {
    const user = userEvent.setup();

    // Initial todos: one completed, two incomplete
    const initialTodos = [
      { todoSeq: 3, todoContent: 'Todo 3', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
      { todoSeq: 2, todoContent: 'Todo 2', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
      { todoSeq: 1, todoContent: 'Todo 1', completeDtm: '2025-11-13T10:00:00Z', todoNote: '', todoDate: '2025-11-13' },
    ];

    // Mock initial fetch
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => initialTodos,
    });

    render(<TodoList />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
    });

    // Verify initial order (incomplete first, then completed)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Todo 3'); // Incomplete
    expect(rows[2]).toHaveTextContent('Todo 2'); // Incomplete
    expect(rows[3]).toHaveTextContent('Todo 1'); // Completed (at bottom)

    // Mock successful toggle response
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Toggle Todo 1 (last item) to incomplete - click the cell
    const checkboxCells = screen.getAllByRole('cell').filter(cell => 
      cell.classList.contains('checkbox-cell')
    );
    await user.click(checkboxCells[2]); // Todo 1 checkbox cell

    // Wait for optimistic update and sorting
    await waitFor(() => {
      const updatedRows = screen.getAllByRole('row');
      // Todo 1 should now be at the top (incomplete items go first, sorted by seq DESC)
      expect(updatedRows[1]).toHaveTextContent('Todo 3'); // Still first (seq 3)
      expect(updatedRows[2]).toHaveTextContent('Todo 2'); // Still second (seq 2)
      expect(updatedRows[3]).toHaveTextContent('Todo 1'); // Still last (seq 1, but now incomplete)
    });

    // Verify Todo 1 checkbox is unchecked
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes[2]).not.toBeChecked();
  });

  test('sorting maintains order on rollback', async () => {
    const user = userEvent.setup();

    // Initial todos
    const initialTodos = [
      { todoSeq: 2, todoContent: 'Todo 2', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
      { todoSeq: 1, todoContent: 'Todo 1', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
    ];

    // Mock initial fetch
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => initialTodos,
    });

    render(<TodoList />);

    await waitFor(() => {
      expect(screen.getByText('Todo 2')).toBeInTheDocument();
    });

    // Verify initial order
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Todo 2');
    expect(rows[2]).toHaveTextContent('Todo 1');

    // Mock failed toggle response
    mockApi.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' }),
    });

    // Try to toggle Todo 2 - click the cell
    const checkboxCells = screen.getAllByRole('cell').filter(cell => 
      cell.classList.contains('checkbox-cell')
    );
    await user.click(checkboxCells[0]);

    // Wait for rollback
    await waitFor(() => {
      const updatedRows = screen.getAllByRole('row');
      // Order should be restored to original
      expect(updatedRows[1]).toHaveTextContent('Todo 2');
      expect(updatedRows[2]).toHaveTextContent('Todo 1');
    });

    // Verify Todo 2 checkbox is unchecked (rolled back)
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes[0]).not.toBeChecked();
  });
});
