
/* eslint-disable testing-library/no-node-access */
import { render, screen, waitFor } from '@testing-library/react';
import TodoList from './TodoList';

// mock API 함수 생성
const mockApi = jest.fn();

// 의존성 모킹
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
    // 지연된 API 응답 모킹
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

    // 즉시 로딩 메시지가 표시되어야 함
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
    expect(screen.queryByText('할 일이 없습니다.')).not.toBeInTheDocument();

    // 로딩 완료 대기
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });
  });

  test('displays empty message after loading when no todos exist', async () => {
    // 빈 배열로 API 응답 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TodoList />);

    // 처음에는 로딩 표시
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();

    // 로딩 후 빈 메시지 표시
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
      expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument();
    });
  });

  test('displays todos after loading when todos exist', async () => {
    const mockTodos = [
      { todoSeq: 1, todoContent: 'Test Todo', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
    ];

    // todos와 함께 API 응답 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    });

    render(<TodoList />);

    // 처음에는 로딩 표시
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();

    // 로딩 후 todos 표시
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
      expect(screen.getByText('Test Todo')).toBeInTheDocument();
      expect(screen.queryByText('할 일이 없습니다.')).not.toBeInTheDocument();
    });
  });

  test('loading indicator has spinner', async () => {
    // 지연된 API 응답 모킹
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

    // 스피너 요소 확인
    const spinner = document.querySelector('.spinner-border');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('spinner-border-sm');

    // 로딩 완료 대기
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });
  });

  test('loading state is properly managed', async () => {
    // API 응답 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { todoSeq: 1, todoContent: 'Todo 1', completeDtm: null, todoNote: '', todoDate: '2025-11-13' },
      ],
    });

    render(<TodoList />);

    // 처음에는 로딩 표시
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();

    // 로딩 완료 후 로딩 메시지가 사라져야 함
    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    // 그리고 todos가 표시되어야 함
    expect(screen.getByText('Todo 1')).toBeInTheDocument();
  });
});
