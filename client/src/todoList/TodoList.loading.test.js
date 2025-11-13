import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('TodoContainer Loading State', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('displays loading message while fetching todos', async () => {
    // Mock a delayed API response
    mockApi.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => [],
          });
        }, 100);
      })
    );

    render(<TodoList />);

    // Should show loading message immediately
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
    expect(screen.queryByText('할 일이 없습니다.')).not.toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });
  });

  test('displays empty message after loading when no todos exist', async () => {
    // Mock API response with empty array
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TodoList />);

    // Initially shows loading
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();

    // After loading, shows empty message
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
      expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument();
    });
  });

  test('displays todos after loading when todos exist', async () => {
    const mockTodos = [
      { todoSeq: 1, todoContent: 'Test Todo', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
    ];

    // Mock API response with todos
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    });

    render(<TodoList />);

    // Initially shows loading
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();

    // After loading, shows todos
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
      expect(screen.getByText('Test Todo')).toBeInTheDocument();
      expect(screen.queryByText('할 일이 없습니다.')).not.toBeInTheDocument();
    });
  });

  test('loading indicator has spinner', async () => {
    // Mock a delayed API response
    mockApi.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => [],
          });
        }, 100);
      })
    );

    render(<TodoList />);

    // Check for spinner element
    const spinner = document.querySelector('.spinner-border');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('spinner-border-sm');

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });
  });

  test('loading state is properly managed', async () => {
    // Mock API response
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { todoSeq: 1, todoContent: 'Todo 1', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
      ],
    });

    render(<TodoList />);

    // Initially shows loading
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();

    // After loading completes, loading message should be gone
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    // And todos should be visible
    expect(screen.getByText('Todo 1')).toBeInTheDocument();
  });
});
