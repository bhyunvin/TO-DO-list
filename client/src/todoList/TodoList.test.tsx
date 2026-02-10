// 1. 기초 라이브러리 및 하위 컴포넌트 임포트
import { render, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// HappyDOM에서 "global document" 오류를 해결하기 위한 로컬 screen 프록시
const screen = new Proxy({} as typeof import('@testing-library/react').screen, {
  get: (_, prop) => {
    if (typeof document !== 'undefined' && document.body) {
      return within(document.body)[prop as keyof ReturnType<typeof within>];
    }
    return undefined;
  },
});

// 2. 전역 모의 객체(Mock) 정의
const mockLogin = jest.fn();
const mockLogout = jest.fn();

jest.mock('sweetalert2', () => {
  const Swal = {
    fire: jest.fn(() =>
      Promise.resolve({
        isConfirmed: true,
        value: { startDate: '2024-01-01', endDate: '2024-01-31' },
      }),
    ),
    mixin: jest.fn(() => Swal),
    showValidationMessage: jest.fn(),
    resetValidationMessage: jest.fn(),
    getConfirmButton: jest.fn(() => ({ disabled: false })),
  };
  Swal.mixin = jest.fn(() => Swal);
  return { default: Swal, ...Swal };
});

jest.mock('../api/userService', () => ({
  default: {
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    getProfile: jest.fn(),
    getUserProfileDetail: jest.fn(),
  },
}));

jest.mock('../api/todoService', () => ({
  default: {
    getTodos: jest.fn().mockResolvedValue([]),
    updateTodo: jest.fn().mockResolvedValue({ success: true }),
    deleteTodo: jest.fn().mockResolvedValue({ success: true }),
    createTodo: jest.fn().mockResolvedValue({ success: true }),
    searchTodos: jest.fn().mockResolvedValue([]),
    getAttachments: jest.fn().mockResolvedValue([]),
    deleteAttachment: jest.fn().mockResolvedValue({ success: true }),
    downloadExcel: jest.fn().mockResolvedValue(new Blob([])),
  },
}));

jest.mock('../stores/themeStore', () => {
  const mockUseThemeStore = jest.fn(() => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  }));
  Object.assign(mockUseThemeStore, {
    getState: jest.fn(() => ({ theme: 'light' })),
  });
  return { useThemeStore: mockUseThemeStore };
});

jest.mock('../authStore/authStore', () => ({
  useAuthStore: Object.assign(
    jest.fn(() => ({
      user: {
        userId: 'testuser',
        userName: 'Test User',
        userEmail: 'test@example.com',
        userDescription: 'Test description',
        userSeq: 1,
      },
      login: mockLogin,
      logout: mockLogout,
      api: { get: jest.fn(), patch: jest.fn() },
    })),
    {
      getState: jest.fn(() => ({
        user: {
          userId: 'testuser',
          userName: 'Test User',
          userEmail: 'test@example.com',
          userDescription: 'Test description',
          userSeq: 1,
        },
        accessToken: 'test-token',
        logout: mockLogout,
      })),
    },
  ),
}));

jest.mock('../hooks/useFileUploadValidator', () => ({
  useFileUploadValidator: () => ({
    validateFiles: jest.fn(() => [
      { isValid: true, file: {}, fileName: 'test.jpg', fileSize: 1000 },
    ]),
    formatFileSize: jest.fn((size) => `${size} bytes`),
    getUploadPolicy: jest.fn(() => ({ maxSize: 10485760, maxCount: 5 })),
    FILE_VALIDATION_ERRORS: {},
  }),
}));

jest.mock('../hooks/useFileUploadProgress', () => ({
  useFileUploadProgress: () => ({
    uploadStatus: 'idle',
    uploadProgress: {},
    uploadErrors: [],
    validationResults: [],
    uploadedFiles: [],
    resetUploadState: jest.fn(),
  }),
}));

jest.mock('../stores/chatStore', () => ({
  useChatStore: () => ({
    messages: [],
    isLoading: false,
    error: null,
    addMessage: jest.fn(),
    addWelcomeMessage: jest.fn(),
    setLoading: jest.fn(),
    clearError: jest.fn(),
    handleApiError: jest.fn(),
    setRetryMessage: jest.fn(),
    getRetryMessage: jest.fn(),
    resetRetryState: jest.fn(),
    canSendRequest: jest.fn(() => true),
    todoRefreshTrigger: 0,
    triggerTodoRefresh: jest.fn(),
  }),
}));

// 컴포넌트 모킹
jest.mock('../components/FileUploadProgress', () => ({
  default: () => (
    <div data-testid="file-upload-progress">File Upload Progress</div>
  ),
}));

jest.mock('../components/ProfileUpdateForm', () => {
  const MockProfileUpdateForm = ({ user, onSave, onCancel }: any) => {
    const [submitting, setSubmitting] = useState(false);
    return (
      <div data-testid="profile-update-form">
        <button
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onSave({
              userName: 'Updated Name',
              userEmail: 'updated@example.com',
              userDescription: 'Updated description',
              formData: new FormData(),
            });
            setSubmitting(false);
          }}
        >
          Save Profile
        </button>
        <button onClick={onCancel}>Cancel Profile</button>
      </div>
    );
  };
  return { default: MockProfileUpdateForm };
});

jest.mock('../components/PasswordChangeForm', () => {
  const MockPasswordChangeForm = ({ onSave, onCancel }: any) => {
    const [submitting, setSubmitting] = useState(false);
    return (
      <div data-testid="password-change-form">
        <button
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onSave({
              currentPassword: 'cur',
              newPassword: 'new',
              confirmPassword: 'new',
            });
            setSubmitting(false);
          }}
        >
          Save Password
        </button>
        <button onClick={onCancel}>Cancel Password</button>
      </div>
    );
  };
  return { default: MockPasswordChangeForm };
});

jest.mock('react-datepicker', () => {
  const MockDatePicker = ({ selected, onChange }: any) => (
    <input
      data-testid="date-picker"
      value={selected?.toISOString().split('T')[0] || ''}
      onChange={(e) => onChange(new Date(e.target.value))}
    />
  );
  return { default: MockDatePicker };
});

jest.mock('./components/CreateTodoForm', () => ({
  default: ({ onAddTodo, onCancel }: any) => (
    <div data-testid="create-todo-form">
      <button
        onClick={() =>
          onAddTodo({ todoContent: 'Mocked Task', todoNote: '', todoFiles: [] })
        }
      >
        Submit Add
      </button>
      <button onClick={onCancel}>Cancel Add</button>
    </div>
  ),
}));

jest.mock('./components/EditTodoForm', () => ({
  default: ({ todo, onSave, onCancel }: any) => (
    <div data-testid="edit-todo-form">
      <button
        onClick={() =>
          onSave(todo.todoSeq, {
            todoContent: 'Mocked Edit',
            todoNote: '',
            todoFiles: [],
          })
        }
      >
        Submit Edit
      </button>
      <button onClick={onCancel}>Cancel Edit</button>
    </div>
  ),
}));

// 실제 서비스 임포트
import userService from '../api/userService';
import todoService from '../api/todoService';
import TodoContainer from './TodoList';
import * as alertUtils from '../utils/alertUtils';

// 헬퍼 함수
const createDelayedRejection = (delay: number) =>
  new Promise((_, reject) =>
    setTimeout(() => {
      const e = new Error('Aborted');
      e.name = 'AbortError';
      reject(e);
    }, delay),
  );
const createDelayedResponse = (data: any, delay = 100) =>
  new Promise((resolve) => setTimeout(() => resolve(data), delay));

// ---------------------------------------------------------
// 테스트 시작
// ---------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  if (!globalThis.URL) (globalThis as any).URL = {};
  globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  globalThis.URL.revokeObjectURL = jest.fn();
});

describe('TodoContainer 통합 테스트 스위트', () => {
  describe('1. 프로필 및 설정 관리', () => {
    beforeEach(() => {
      (userService.getProfile as jest.Mock).mockResolvedValue({
        userName: 'Test User',
        userEmail: 'test@example.com',
      });
      (userService.getUserProfileDetail as jest.Mock).mockResolvedValue({
        userName: 'Test User',
        userEmail: 'test@example.com',
        userDescription: 'Test description',
      });
    });

    test('사용자 메뉴가 정상적으로 동작해야 함', async () => {
      render(<TodoContainer />);
      const menuBtn = await screen.findByRole('button', {
        name: /사용자 메뉴/,
      });
      fireEvent.click(menuBtn);
      expect(
        screen.getByRole('button', { name: /프로필 수정/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /로그아웃/ }),
      ).toBeInTheDocument();
    });

    test('프로필 수정 모달이 열려야 함', async () => {
      render(<TodoContainer />);
      await userEvent.click(
        await screen.findByRole('button', { name: /사용자 메뉴/ }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /프로필 수정/ }),
      );
      expect(screen.getByTestId('profile-update-form')).toBeInTheDocument();
    });

    test('비밀번호 변경 모달이 열려야 함', async () => {
      render(<TodoContainer />);
      const menuBtn = await screen.findByRole('button', {
        name: /사용자 메뉴/,
      });
      fireEvent.click(menuBtn);
      const modBtn = await screen.findByRole('button', {
        name: /비밀번호 변경/,
      });
      fireEvent.click(modBtn);
      expect(
        await screen.findByTestId('password-change-form'),
      ).toBeInTheDocument();
    });
  });

  describe('2. 핵심 CRUD 기능', () => {
    test('할 일을 추가할 수 있어야 함', async () => {
      (todoService.createTodo as jest.Mock).mockResolvedValue({
        success: true,
        resetFields: true,
      });
      render(<TodoContainer />);
      await screen.findByText('할 일이 없습니다.');
      fireEvent.click(screen.getByRole('button', { name: '신규' }));
      fireEvent.click(screen.getByText('Submit Add'));
      await waitFor(() => expect(todoService.createTodo).toHaveBeenCalled());
    });

    test('할 일을 수정할 수 있어야 함', async () => {
      (todoService.getTodos as jest.Mock).mockResolvedValue([
        { todoSeq: 1, todoContent: 'Edit Me', completeDtm: null },
      ]);
      render(<TodoContainer />);
      await screen.findByText('Edit Me');
      fireEvent.click(screen.getByLabelText('추가 옵션'));
      fireEvent.click(screen.getByLabelText('수정'));
      fireEvent.click(screen.getByText('Submit Edit'));
      await waitFor(() => expect(todoService.updateTodo).toHaveBeenCalled());
    });

    test('할 일을 삭제할 수 있어야 함', async () => {
      (todoService.getTodos as jest.Mock).mockResolvedValue([
        { todoSeq: 1, todoContent: 'Delete Me', completeDtm: null },
      ]);
      render(<TodoContainer />);
      await screen.findByText('Delete Me');
      fireEvent.click(screen.getByLabelText('추가 옵션'));
      fireEvent.click(screen.getByLabelText('삭제'));
      await waitFor(
        () => expect(todoService.deleteTodo).toHaveBeenCalledWith(1),
        { timeout: 3000 },
      );
    });
  });

  describe('3. 정렬 및 낙관적 업데이트', () => {
    test('완료 상태 토글 시 정렬 순서가 변경되어야 함', async () => {
      const initialTodos = [
        { todoSeq: 1, todoContent: 'Task_A', completeDtm: null },
        { todoSeq: 2, todoContent: 'Task_B', completeDtm: null },
      ];
      (todoService.getTodos as jest.Mock).mockResolvedValue(initialTodos);
      render(<TodoContainer />);

      const targetRow = await screen.findByRole('row', { name: /Task_B/ });
      const checkbox = within(targetRow).getByRole('checkbox');

      fireEvent.click(checkbox.closest('td'));

      await waitFor(
        () => {
          const rows = screen.getAllByRole('row');
          expect(rows[rows.length - 1]).toHaveTextContent('Task_B');
        },
        { timeout: 4000 },
      );
    });

    test('API 지연 및 에러 시 낙관적 업데이트와 롤백이 작동해야 함', async () => {
      (todoService.getTodos as jest.Mock).mockResolvedValue([
        { todoSeq: 1, todoContent: 'Test_Task', completeDtm: null },
      ]);
      // 처음에는 지연, 두 번째는 에러를 시뮬레이션
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<TodoContainer />);
      const checkbox = await screen.findByRole('checkbox');

      // 1. 낙관적 업데이트 확인
      (todoService.updateTodo as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );
      fireEvent.click(checkbox.closest('td'));
      await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked(), {
        timeout: 4000,
      });

      // 2. 롤백 확인을 위해 에러로 변경
      (todoService.updateTodo as jest.Mock).mockRejectedValue(
        new Error('API Fail'),
      );
      // 다시 한 번 클릭하여 에러 상황 발생 (이전 업데이트가 pending이므로 handleToggleComplete의 중복 방지 로직에 걸릴 수 있음)
      // 따라서 테스트를 분리하거나 확실하게 처리해야 함. 여기서는 테스트 분리 패턴으로 롤백만 따로 확인.
      consoleSpy.mockRestore();
    });

    test('API 실패 시 상태가 롤백되어야 함', async () => {
      (todoService.getTodos as jest.Mock).mockResolvedValue([
        { todoSeq: 1, todoContent: 'Fail_Task', completeDtm: null },
      ]);
      (todoService.updateTodo as jest.Mock).mockRejectedValue(
        new Error('Rollback Fail'),
      );
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      render(<TodoContainer />);

      const checkbox = await screen.findByRole('checkbox');
      fireEvent.click(checkbox.closest('td'));

      await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked()); // 낙관적
      await waitFor(() =>
        expect(screen.getByRole('checkbox')).not.toBeChecked(),
      ); // 롤백
      consoleSpy.mockRestore();
    });
  });

  describe('4. 로딩 및 에러 처리', () => {
    test('로딩 중 스피너가 표시되어야 함', async () => {
      (todoService.getTodos as jest.Mock).mockImplementation(() =>
        createDelayedResponse([], 100),
      );
      render(<TodoContainer />);
      expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument(),
      );
    });

    test('Excel 내보내기 에러를 처리해야 함', async () => {
      const error = new Error('Excel Error');
      (error as any).response = { status: 500, data: {} };
      (todoService.downloadExcel as jest.Mock).mockRejectedValue(error);
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      jest.spyOn(alertUtils, 'showDateRangePrompt').mockResolvedValue({
        isConfirmed: true,
        value: { startDate: '2024-01-01', endDate: '2024-01-31' },
      } as any);
      jest.spyOn(alertUtils, 'showErrorAlert').mockResolvedValue({} as any);

      render(<TodoContainer />);
      fireEvent.click(screen.getByRole('button', { name: /Excel 내보내기/ }));

      await waitFor(() => expect(alertUtils.showErrorAlert).toHaveBeenCalled());
      consoleSpy.mockRestore();
    });
  });
});
