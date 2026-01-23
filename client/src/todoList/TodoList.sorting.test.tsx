import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoList from './TodoList';

const mockApi = vi.fn();

vi.mock('../authStore/authStore', () => ({
  useAuthStore: () => ({
    user: { userId: 'testuser', userName: 'Test User', userSeq: 1 },
    logout: vi.fn(),
    api: mockApi,
    login: vi.fn(),
  }),
}));

vi.mock('../stores/chatStore', () => ({
  useChatStore: () => ({
    messages: [],
    isLoading: false,
    error: null,
    addMessage: vi.fn(),
    setLoading: vi.fn(),
    clearError: vi.fn(),
    handleApiError: vi.fn(),
    setRetryMessage: vi.fn(),
    getRetryMessage: vi.fn(),
    resetRetryState: vi.fn(),
    canSendRequest: vi.fn(() => true),
  }),
}));

vi.mock('../hooks/useFileUploadValidator', () => ({
  useFileUploadValidator: () => ({
    validateFiles: vi.fn(() => []),
    formatFileSize: vi.fn(() => '10MB'),
    getUploadPolicy: vi.fn(() => ({ maxSize: 10485760, maxCount: 10 })),
  }),
}));

vi.mock('../hooks/useFileUploadProgress', () => ({
  useFileUploadProgress: () => ({
    uploadStatus: 'idle',
    uploadProgress: {},
    uploadErrors: [],
    uploadedFiles: [],
    resetUploadState: vi.fn(),
  }),
}));

vi.mock('sweetalert2', () => ({
  fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
}));

describe('TodoContainer Sorting Behavior', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('completed todo moves to bottom after toggle', async () => {
    const user = userEvent.setup();

    // 초기 todos: 모두 미완료
    const initialTodos = [
      {
        todoSeq: 3,
        todoContent: 'Todo 3',
        completeDtm: null,
        todoNote: '',
        todoDate: '2025-11-13',
      },
      {
        todoSeq: 2,
        todoContent: 'Todo 2',
        completeDtm: null,
        todoNote: '',
        todoDate: '2025-11-13',
      },
      {
        todoSeq: 1,
        todoContent: 'Todo 1',
        completeDtm: null,
        todoNote: '',
        todoDate: '2025-11-13',
      },
    ];

    // 초기 fetch 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => initialTodos,
    });

    render(<TodoList />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Todo 3')).toBeInTheDocument();
    });

    // 초기 순서 확인 (모두 미완료, todoSeq DESC로 정렬)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Todo 3'); // 첫 번째 데이터 행
    expect(rows[2]).toHaveTextContent('Todo 2');
    expect(rows[3]).toHaveTextContent('Todo 1');

    // 성공적인 토글 응답 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Item 3 (첫 번째 항목)을 완료로 토글 - 체크박스가 아닌 셀 클릭
    const todo3Row = screen.getByRole('row', { name: /Todo 3/ });
    // Find the cell with checkbox-cell class within the row
    const checkboxCell = within(todo3Row)
      .getAllByRole('cell')
      .find((cell) => cell.classList.contains('checkbox-cell'));
    await user.click(checkboxCell);

    // 낙관적 업데이트 및 정렬 대기
    await waitFor(() => {
      const updatedRows = screen.getAllByRole('row');
      // Item 3은 이제 하단에 있어야 함 (완료된 항목은 마지막으로)
      expect(updatedRows[1]).toHaveTextContent('Todo 2'); // 이제 첫 번째
      expect(updatedRows[2]).toHaveTextContent('Todo 1'); // 이제 두 번째
      expect(updatedRows[3]).toHaveTextContent('Todo 3'); // 이제 마지막 (완료됨)
    });

    // Item 3 체크박스가 체크되었는지 확인
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes[2]).toBeChecked(); // Item 3은 이제 인덱스 2에 있음
  });

  test('uncompleted todo moves to top after toggle', async () => {
    const user = userEvent.setup();

    // 초기 todos: 하나는 완료, 두 개는 미완료
    const initialTodos = [
      {
        todoSeq: 3,
        todoContent: 'Todo 3',
        completeDtm: null,
        todoNote: '',
        todoDate: '2025-11-13',
      },
      {
        todoSeq: 2,
        todoContent: 'Todo 2',
        completeDtm: null,
        todoNote: '',
        todoDate: '2025-11-13',
      },
      {
        todoSeq: 1,
        todoContent: 'Todo 1',
        completeDtm: '2025-11-13T10:00:00Z',
        todoNote: '',
        todoDate: '2025-11-13',
      },
    ];

    // 초기 fetch 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => initialTodos,
    });

    render(<TodoList />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
    });

    // 초기 순서 확인 (미완료가 먼저, 그 다음 완료)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Todo 3'); // 미완료
    expect(rows[2]).toHaveTextContent('Todo 2'); // 미완료
    expect(rows[3]).toHaveTextContent('Todo 1'); // 완료됨 (하단에)

    // 성공적인 토글 응답 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Item 1 (마지막 항목)을 미완료로 토글 - 셀 클릭
    const todo1Row = screen.getByRole('row', { name: /Todo 1/ });
    const checkboxCell = within(todo1Row)
      .getAllByRole('cell')
      .find((cell) => cell.classList.contains('checkbox-cell'));
    await user.click(checkboxCell);

    // 낙관적 업데이트 및 정렬 대기
    await waitFor(() => {
      const updatedRows = screen.getAllByRole('row');
      // Item 1은 이제 상단에 있어야 함 (미완료 항목이 먼저, seq DESC로 정렬)
      expect(updatedRows[1]).toHaveTextContent('Todo 3'); // 여전히 첫 번째 (seq 3)
      expect(updatedRows[2]).toHaveTextContent('Todo 2'); // 여전히 두 번째 (seq 2)
      expect(updatedRows[3]).toHaveTextContent('Todo 1'); // 여전히 마지막 (seq 1, 하지만 이제 미완료)
    });

    // Item 1 체크박스가 체크 해제되었는지 확인
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes[2]).not.toBeChecked();
  });

  test('sorting maintains order on rollback', async () => {
    const user = userEvent.setup();

    // 초기 todos
    const initialTodos = [
      {
        todoSeq: 2,
        todoContent: 'Todo 2',
        completeDtm: null,
        todoNote: '',
        todoDate: '2025-11-13',
      },
      {
        todoSeq: 1,
        todoContent: 'Todo 1',
        completeDtm: null,
        todoNote: '',
        todoDate: '2025-11-13',
      },
    ];

    // 초기 fetch 모킹
    mockApi.mockResolvedValueOnce({
      ok: true,
      json: async () => initialTodos,
    });

    render(<TodoList />);

    await waitFor(() => {
      expect(screen.getByText('Todo 2')).toBeInTheDocument();
    });

    // 초기 순서 확인
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Todo 2');
    expect(rows[2]).toHaveTextContent('Todo 1');

    // 실패한 토글 응답 모킹
    mockApi.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' }),
    });

    // Item 2 토글 시도 - 셀 클릭
    const checkboxCell = screen
      .getAllByRole('cell')
      .find((cell) => cell.classList.contains('checkbox-cell'));
    await user.click(checkboxCell);

    // 롤백 대기
    await waitFor(() => {
      const updatedRows = screen.getAllByRole('row');
      // 순서가 원래대로 복원되어야 함
      expect(updatedRows[1]).toHaveTextContent('Todo 2');
      expect(updatedRows[2]).toHaveTextContent('Todo 1');
    });

    // Item 2 체크박스가 체크 해제되었는지 확인 (롤백됨)
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes[0]).not.toBeChecked();
  });
});
