import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import TodoContainer from './TodoList';

// HappyDOM에서 "global document" 에러를 해결하기 위한 로컬 screen 프록시
const screen = new Proxy({} as typeof import('@testing-library/react').screen, {
  get: (_, prop) => {
    if (typeof document !== 'undefined' && document.body) {
      return within(document.body)[prop as keyof ReturnType<typeof within>];
    }
    return undefined;
  },
});

// SweetAlert2 모킹
// SweetAlert2 모킹
jest.mock('sweetalert2', () => {
  const Swal = {
    fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
    mixin: jest.fn(() => ({
      fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
    })),
    showValidationMessage: jest.fn(),
    resetValidationMessage: jest.fn(),
    getConfirmButton: jest.fn(() => ({ disabled: false })),
  };
  // Mixin이 자기 자신을 반환
  Swal.mixin = jest.fn(() => Swal);
  return {
    default: Swal,
    ...Swal,
  };
});

// auth store 모킹
jest.mock('../authStore/authStore', () => ({
  useAuthStore: () => ({
    user: {
      userName: 'Test User',
      userEmail: 'test@example.com',
      userDescription: 'Test description',
    },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

import todoService from '../api/todoService';
jest.mock('../api/todoService', () => ({
  default: {
    getTodos: jest.fn(),
    updateTodo: jest.fn(),
  },
}));

// 파일 업로드 hooks 모킹
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
    resetUploadState: jest.fn(),
  }),
}));

// 컴포넌트 모킹
jest.mock('../components/FileUploadProgress', () => {
  const MockFileUploadProgress = () => (
    <div data-testid="file-upload-progress">File Upload Progress</div>
  );
  return MockFileUploadProgress;
});

jest.mock('../components/ProfileUpdateForm', () => {
  const MockProfileUpdateForm = ({ onCancel }) => (
    <div data-testid="profile-update-form">
      <button onClick={onCancel}>Cancel</button>
    </div>
  );

  MockProfileUpdateForm.propTypes = {
    onCancel: PropTypes.func.isRequired,
  };

  return MockProfileUpdateForm;
});

jest.mock('../components/PasswordChangeForm', () => {
  const MockPasswordChangeForm = ({ onCancel }) => (
    <div data-testid="password-change-form">
      <button onClick={onCancel}>Cancel</button>
    </div>
  );

  MockPasswordChangeForm.propTypes = {
    onCancel: PropTypes.func.isRequired,
  };

  return MockPasswordChangeForm;
});

jest.mock('react-datepicker', () => {
  const MockDatePicker = ({ selected, onChange }) => (
    <input
      data-testid="date-picker"
      value={selected.toISOString().split('T')[0]}
      onChange={(e) => onChange(new Date(e.target.value))}
    />
  );

  MockDatePicker.propTypes = {
    selected: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]).isRequired,
    onChange: PropTypes.func.isRequired,
  };

  return MockDatePicker;
});

const createDelayedRejection = (delay) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      reject(abortError);
    }, delay);
  });
};

describe('TodoContainer Optimistic UI Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const Swal = require('sweetalert2');
    Swal.fire.mockResolvedValue({ isConfirmed: true });

    // 초기 todos fetch 모킹
    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
      {
        todoSeq: 2,
        todoContent: 'Test todo 2',
        todoNote: 'Note 2',
        completeDtm: '2024-01-01T10:00:00.000Z',
        todoDate: '2024-01-01',
      },
    ]);
  });

  test('checkbox updates immediately when clicked (optimistic update)', async () => {
    const user = userEvent.setup();

    // 느린 API 응답 모킹
    let resolveApiCall;
    const apiPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });

    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockImplementation(() => apiPromise);

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox).not.toBeChecked();

    // 체크박스 셀 클릭 (체크박스 자체가 아님, pointer-events: none이므로)
    const checkboxCell = checkbox.closest('td');
    await user.click(checkboxCell);

    // 체크박스가 즉시 체크되어야 함 (낙관적 업데이트)
    expect(checkbox).toBeChecked();

    // API 호출이 진행 중이어야 함
    // API 호출이 진행 중이어야 함
    expect(todoService.updateTodo as jest.Mock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        completeDtm: expect.any(String),
      }),
    );

    // API 호출 해결
    // API 호출 해결
    resolveApiCall({ success: true });

    // API 성공 후 체크박스가 체크된 상태로 유지되어야 함
    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
  });

  test('checkbox reverts to original state on API failure (rollback)', async () => {
    const user = userEvent.setup();

    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockRejectedValue(
      new Error('API Error'),
    );

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    // 체크박스에 대한 새로운 참조 가져오기
    let checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox).not.toBeChecked();

    // 체크박스 셀 클릭
    const checkboxCell = checkbox.closest('td');

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await user.click(checkboxCell);

    // API 실패 및 롤백 대기 - 체크박스가 체크 해제되어야 함
    await waitFor(
      () => {
        checkbox = screen.getAllByRole('checkbox')[0];
        expect(checkbox).not.toBeChecked();
        expect(checkbox).not.toBeDisabled();
      },
      { timeout: 2000 },
    );

    // 오류 토스트가 표시되어야 함
    await waitFor(() => {
      const Swal = require('sweetalert2');
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          toast: true,
          icon: 'error',
          position: 'top-end',
        }),
      );
    });

    consoleSpy.mockRestore();
  });

  test('prevents duplicate clicks on same todo while request is pending', async () => {
    const user = userEvent.setup();

    // 느린 API 응답 모킹
    let resolveApiCall;
    const apiPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });

    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockImplementation(() => apiPromise);

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 첫 번째 체크박스 셀 클릭
    // 첫 번째 체크박스 셀 클릭
    await user.click(checkboxCell);

    // 즉시 다시 클릭 시도
    await user.click(checkboxCell);
    await user.click(checkboxCell);

    // API는 한 번만 호출되어야 함
    expect(todoService.updateTodo as jest.Mock).toHaveBeenCalledTimes(1);

    // API 호출 해결
    resolveApiCall({ success: true });
  });

  test('allows toggling different todos independently', async () => {
    const user = userEvent.setup();

    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
      {
        todoSeq: 2,
        todoContent: 'Test todo 2',
        todoNote: 'Note 2',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockResolvedValue({ success: true });

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
      expect(screen.getByText('Test todo 2')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const checkboxCell1 = checkboxes[0].closest('td');
    const checkboxCell2 = checkboxes[1].closest('td');

    // 두 체크박스 셀을 빠르게 클릭
    // 두 체크박스 셀을 빠르게 클릭
    await user.click(checkboxCell1);
    await user.click(checkboxCell2);

    // 둘 다 즉시 체크되어야 함
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();

    // 두 API 호출이 모두 이루어져야 함
    await waitFor(() => {
      expect(todoService.updateTodo as jest.Mock).toHaveBeenCalledWith(
        1,
        expect.anything(),
      );
    });
    expect(todoService.updateTodo as jest.Mock).toHaveBeenCalledWith(
      2,
      expect.anything(),
    );
  });

  test('displays toast notification on network error', async () => {
    const user = userEvent.setup();

    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    );

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 체크박스 셀 클릭
    // 체크박스 셀 클릭
    // 체크박스 셀 클릭
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await user.click(checkboxCell);

    // 오류 토스트 대기
    await waitFor(
      () => {
        const Swal = require('sweetalert2');
        // Mixin이 Swal 자체를 반환하므로 main fire가 호출됨
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({
            toast: true,
          }),
        );
      },
      { timeout: 4000 },
    );

    // 체크박스가 롤백되어야 함
    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });

    consoleSpy.mockRestore();
  });

  test('handles timeout error with AbortController', async () => {
    const user = userEvent.setup();

    // 해결되지 않는 API 모킹 (타임아웃 시뮬레이션)
    // 해결되지 않는 API 모킹 (타임아웃 시뮬레이션)
    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockImplementationOnce(() => {
      return createDelayedRejection(100);
    });

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 체크박스 셀 클릭
    // 체크박스 셀 클릭
    // 체크박스 셀 클릭
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await user.click(checkboxCell);

    // 타임아웃 오류 대기
    await waitFor(
      () => {
        const Swal = require('sweetalert2');
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({
            toast: true,
            icon: 'error',
            title: expect.stringContaining('시간이 초과'),
          }),
        );
      },
      { timeout: 3000 },
    );

    // 체크박스가 롤백되어야 함
    expect(checkbox).not.toBeChecked();

    consoleSpy.mockRestore();
  });

  test('maintains correct state when multiple todos fail independently', async () => {
    const user = userEvent.setup();

    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
      {
        todoSeq: 2,
        todoContent: 'Test todo 2',
        todoNote: 'Note 2',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock)
      .mockResolvedValueOnce({ success: true }) // Item 1 성공
      .mockRejectedValueOnce(new Error('API Error')); // Item 2 실패

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
      expect(screen.getByText('Test todo 2')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const checkboxCell1 = checkboxes[0].closest('td');
    const checkboxCell2 = checkboxes[1].closest('td');

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // 두 체크박스 셀 클릭
    await user.click(checkboxCell1);
    await user.click(checkboxCell2);

    // API 호출 완료 대기
    await waitFor(() => {
      // Item 1은 체크된 상태로 유지되어야 함 (성공)
      expect(checkboxes[0]).toBeChecked();
      // Item 2는 체크 해제되어야 함 (롤백)
      expect(checkboxes[1]).not.toBeChecked();
    });

    consoleSpy.mockRestore();
  });

  test('checkbox is disabled during pending request', async () => {
    const user = userEvent.setup();

    // 느린 API 응답 모킹
    let resolveApiCall;
    const apiPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });

    (todoService.getTodos as jest.Mock).mockResolvedValue([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockImplementation(() => apiPromise);

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 체크박스 셀 클릭
    // 체크박스 셀 클릭
    await user.click(checkboxCell);

    // 요청 중에는 체크박스가 비활성화되어야 함
    expect(checkbox).toBeDisabled();

    // API 호출 해결
    // API 호출 해결
    resolveApiCall({ success: true });

    // 체크박스가 다시 활성화되어야 함
    await waitFor(() => {
      expect(checkbox).not.toBeDisabled();
    });
  });
});
