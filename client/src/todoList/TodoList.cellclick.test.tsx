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

// SweetAlert2 모의 객체(Mock)
jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
}));

// 인증 스토어 모의 객체(Mock)
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

// 서비스 모의 객체(Mock)
import todoService from '../api/todoService';
jest.mock('../api/todoService', () => ({
  default: {
    getTodos: jest.fn(),
    updateTodo: jest.fn(),
  },
}));

// 파일 업로드 훅 모의 객체(Mock)
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

// 컴포넌트 모의 객체(Mock)
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

describe('TodoContainer 체크박스 셀 클릭 기능', () => {
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
    ]);
  });

  test('체크박스 셀을 클릭하면 할 일 완료 상태가 토글되어야 함', async () => {
    const user = userEvent.setup();

    (todoService.getTodos as jest.Mock).mockResolvedValueOnce([
      {
        todoSeq: 1,
        todoContent: 'Test todo 1',
        todoNote: 'Note 1',
        completeDtm: null,
        todoDate: '2024-01-01',
      },
    ]);

    (todoService.updateTodo as jest.Mock).mockResolvedValue({ success: true });

    render(<TodoContainer />);

    // 초기 todos 로드 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    expect(checkbox).not.toBeChecked();
    expect(checkboxCell).toHaveClass('checkbox-cell');

    // 셀 클릭 (체크박스가 아님)
    await user.click(checkboxCell);

    // 체크박스가 체크되어야 함
    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    // API가 호출되어야 함
    expect(todoService.updateTodo).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        completeDtm: expect.any(String),
      }),
    );
  });

  test('비활성화되지 않은 경우 체크박스 셀에 포인터 커서가 표시되어야 함', async () => {
    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 셀은 pointer 커서를 가져야 함
    expect(checkboxCell).toHaveStyle({ cursor: 'pointer' });
  });

  test('비활성화된 경우 체크박스 셀에 not-allowed 커서가 표시되어야 함', async () => {
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
    (todoService.updateTodo as jest.Mock).mockReturnValue(apiPromise);

    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 셀 클릭
    await user.click(checkboxCell);

    // 대기 중인 요청 동안 셀은 not-allowed 커서를 가져야 함
    expect(checkboxCell).toHaveStyle({ cursor: 'not-allowed' });

    // API 호출 해결
    resolveApiCall({ success: true });

    // 셀은 다시 pointer 커서를 가져야 함
    await waitFor(() => {
      expect(checkboxCell).toHaveStyle({ cursor: 'pointer' });
    });
  });

  test('직접 클릭을 방지하기 위해 체크박스에 pointer-events: none이 설정되어 있어여 함', async () => {
    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];

    // 체크박스에 pointer-events: none이 설정되어 있어야 함
    expect(checkbox).toHaveStyle({ pointerEvents: 'none' });
  });

  test('할 일이 토글 중일 때는 셀 클릭이 트리거되지 않아야 함', async () => {
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
    (todoService.updateTodo as jest.Mock).mockReturnValue(apiPromise);

    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 첫 번째 셀 클릭
    await user.click(checkboxCell);

    // 요청이 대기 중일 때 다시 클릭 시도
    await user.click(checkboxCell);
    await user.click(checkboxCell);

    // API는 한 번만 호출되어야 함 (초기 fetch는 beforeEach에서, 토글은 여기서 한 번)
    expect(todoService.updateTodo).toHaveBeenCalledTimes(1);

    // API 호출 해결
    resolveApiCall({ success: true });
  });
});
