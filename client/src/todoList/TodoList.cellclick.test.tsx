import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import TodoContainer from './TodoList';

// Mock SweetAlert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
}));

// Mock auth store
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

// Mock services
import todoService from '../api/todoService';
jest.mock('../api/todoService', () => ({
  default: {
    getTodos: jest.fn(),
    updateTodo: jest.fn(),
  },
}));

// Mock file upload hooks
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

// Mock components
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

describe('TodoContainer Checkbox Cell Click Functionality', () => {
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

  test('clicking the checkbox cell toggles the todo completion', async () => {
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

  test('checkbox cell has pointer cursor when not disabled', async () => {
    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // 셀은 pointer 커서를 가져야 함
    expect(checkboxCell).toHaveStyle({ cursor: 'pointer' });
  });

  test('checkbox cell has not-allowed cursor when disabled', async () => {
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

  test('checkbox has pointer-events: none to prevent direct clicks', async () => {
    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];

    // Checkbox should have pointer-events: none
    expect(checkbox).toHaveStyle({ pointerEvents: 'none' });
  });

  test('cell click does not trigger when todo is being toggled', async () => {
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
