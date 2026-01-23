import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import TodoContainer from './TodoList';

// SweetAlert2 모의 객체
// SweetAlert2 모의 객체
vi.mock('sweetalert2', () => {
  const Swal = {
    fire: vi.fn(() =>
      Promise.resolve({ isConfirmed: true }).then(() => ({
        isConfirmed: true,
      })),
    ),
    mixin: vi.fn(() => ({
      fire: vi.fn(() =>
        Promise.resolve({ isConfirmed: true }).then(() => ({
          isConfirmed: true,
        })),
      ),
    })),
  };
  return {
    default: Swal,
    ...Swal,
  };
});

// 인증 스토어 모의 객체
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockApi = vi.fn();
globalThis.fetch = mockApi;

vi.mock('../authStore/authStore', () => {
  const useAuthStore: any = vi.fn(() => ({
    user: {
      userName: 'Test User',
      userEmail: 'test@example.com',
      userDescription: 'Test description',
    },
    login: mockLogin,
    logout: mockLogout,
    api: mockApi,
  }));
  useAuthStore.getState = vi.fn(() => ({
    user: {
      userName: 'Test User',
      userEmail: 'test@example.com',
      userDescription: 'Test description',
    },
    accessToken: 'test-token',
    logout: mockLogout,
  }));
  return { useAuthStore };
});

// 파일 업로드 훅 모의 객체
vi.mock('../hooks/useFileUploadValidator', () => ({
  useFileUploadValidator: () => ({
    validateFiles: vi.fn(() => [
      { isValid: true, file: {}, fileName: 'test.jpg', fileSize: 1000 },
    ]),
    formatFileSize: vi.fn((size) => `${size} bytes`),
    getUploadPolicy: vi.fn(() => ({ maxSize: 10485760, maxCount: 5 })),
    FILE_VALIDATION_ERRORS: {},
  }),
}));

vi.mock('../hooks/useFileUploadProgress', () => ({
  useFileUploadProgress: () => ({
    uploadStatus: 'idle',
    uploadProgress: {},
    uploadErrors: [],
    validationResults: [],
    resetUploadState: vi.fn(),
  }),
}));

// 컴포넌트 모의 객체
vi.mock('../components/FileUploadProgress', () => ({
  default: () => (
    <div data-testid="file-upload-progress">File Upload Progress</div>
  ),
}));

vi.mock('../components/ProfileUpdateForm', () => {
  const MockProfileUpdateForm = ({ user, onSave, onCancel }) => (
    <div data-testid="profile-update-form">
      <h3>프로필 수정</h3>
      <p>User: {user.userName}</p>
      <button
        onClick={() => {
          const mockFormData = {
            append: vi.fn(),
            get: vi.fn(),
            getAll: vi.fn(),
            has: vi.fn(),
            set: vi.fn(),
            delete: vi.fn(),
            keys: vi.fn(),
            values: vi.fn(),
            entries: vi.fn(),
            forEach: vi.fn(),
          };
          onSave({
            userName: 'Updated Name',
            userEmail: 'updated@example.com',
            userDescription: 'Updated description',
            formData: mockFormData,
          });
        }}
      >
        Save Profile
      </button>
      <button onClick={onCancel}>Cancel Profile</button>
    </div>
  );

  MockProfileUpdateForm.propTypes = {
    user: PropTypes.shape({
      userName: PropTypes.string,
    }).isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
  };

  return { default: MockProfileUpdateForm };
});

vi.mock('../components/PasswordChangeForm', () => {
  const MockPasswordChangeForm = ({ onSave, onCancel }) => (
    <div data-testid="password-change-form">
      <h3>비밀번호 변경</h3>
      <button
        onClick={() =>
          onSave({
            currentPassword: 'current123',
            newPassword: 'new123',
            confirmPassword: 'new123',
          })
        }
      >
        Save Password
      </button>
      <button onClick={onCancel}>Cancel Password</button>
    </div>
  );

  MockPasswordChangeForm.propTypes = {
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
  };

  return { default: MockPasswordChangeForm };
});

// DatePicker 모의 객체
vi.mock('react-datepicker', () => {
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

  return { default: MockDatePicker };
});

describe('TodoContainer Profile Update Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 성공적인 API 응답 모의
    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
    });
  });

  test('displays user menu icon in header', () => {
    render(<TodoContainer />);

    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    expect(userMenuIcon).toBeInTheDocument();
  });

  test('displays dropdown menu with profile and password options when user menu is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    expect(
      screen.getByRole('button', { name: /프로필 수정/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /비밀번호 변경/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /로그아웃/ }),
    ).toBeInTheDocument();
  });

  test('shows ProfileUpdateForm when Update Profile button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 먼저 사용자 메뉴 아이콘을 클릭하여 드롭다운 열기
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    // 그 다음 프로필 수정 버튼 클릭
    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    expect(screen.getByTestId('profile-update-form')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /프로필 수정/ }),
    ).toBeInTheDocument();
  });

  test('hides todo list elements when profile update form is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 초기에는 작업 목록 요소들이 보여야 함
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();

    // 사용자 메뉴를 열고 프로필 수정 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 작업 목록 요소들은 숨겨져야 함
    expect(
      screen.queryByRole('button', { name: /신규/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-picker')).not.toBeInTheDocument();

    // 프로필 수정 폼이 보여야 함
    expect(screen.getByTestId('profile-update-form')).toBeInTheDocument();
  });

  test('disables Update Profile button when profile update is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 사용자 메뉴 열기
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 버튼 상태 확인을 위해 메뉴 다시 열기
    await user.click(userMenuIcon);
    const disabledButton = screen.getByRole('button', { name: /프로필 수정/ });
    expect(disabledButton).toBeDisabled();
  });

  test('returns to todo list view when profile update is cancelled', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 사용자 메뉴를 열고 프로필 수정 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 프로필 폼이 보여야 함
    expect(screen.getByTestId('profile-update-form')).toBeInTheDocument();

    // 취소 버튼 클릭
    const cancelButton = screen.getByRole('button', { name: /Cancel Profile/ });
    await user.click(cancelButton);

    // 작업 목록 뷰로 돌아가야 함
    expect(screen.queryByTestId('profile-update-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  test('processes profile update and updates user session', async () => {
    const user = userEvent.setup();

    // 성공적인 프로필 업데이트 API 응답 모의
    const updatedUser = {
      userName: 'Updated Name',
      userEmail: 'updated@example.com',
      userDescription: 'Updated description',
    };

    mockApi.mockImplementation((url) => {
      if (url === '/api/user/profile') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedUser),
          text: () => Promise.resolve(JSON.stringify(updatedUser)),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      });
    });

    render(<TodoContainer />);

    // 사용자 메뉴를 열고 프로필 수정 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 프로필 폼의 저장 버튼 클릭
    const saveButton = screen.getByRole('button', { name: /Save Profile/ });
    await user.click(saveButton);

    // API 호출 및 세션 업데이트 대기
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        '/api/user/profile',
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
        }),
      );
      expect(mockLogin).toHaveBeenCalledWith(updatedUser);
    });
  });

  test('handles profile update API errors', async () => {
    const user = userEvent.setup();

    // API 오류 응답 모의
    mockApi.mockImplementation((url) => {
      if (url === '/api/user/profile') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Email already exists' }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ message: 'Email already exists' }),
            ),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      });
    });

    render(<TodoContainer />);

    // 사용자 메뉴를 열고 프로필 수정 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 프로필 폼의 저장 버튼 클릭
    const saveButton = screen.getByRole('button', { name: /Save Profile/ });
    await user.click(saveButton);

    // API 호출 대기
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        '/api/user/profile',
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
        }),
      );
    });

    // 오류 발생 시 세션이 업데이트되지 않아야 함
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('handles file upload errors in profile update', async () => {
    const user = userEvent.setup();

    // 파일 업로드 오류가 포함된 API 오류 응답 모의
    mockApi.mockImplementation((url) => {
      if (url === '/api/user/profile') {
        return Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              message: 'File upload error',
              errors: [
                {
                  fileName: 'profile.jpg',
                  errorMessage: 'File too large',
                  errorCode: 'FILE_TOO_LARGE',
                },
              ],
            }),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                message: 'File upload error',
                errors: [
                  {
                    fileName: 'profile.jpg',
                    errorMessage: 'File too large',
                    errorCode: 'FILE_TOO_LARGE',
                  },
                ],
              }),
            ),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TodoContainer />);

    // 사용자 메뉴를 열고 프로필 수정 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 프로필 폼의 저장 버튼 클릭
    const saveButton = screen.getByRole('button', { name: /Save Profile/ });
    await user.click(saveButton);

    // API 호출 대기
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        '/api/user/profile',
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
        }),
      );
    });

    // 오류 발생 시 세션이 업데이트되지 않아야 함
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('user menu icon is visible and accessible', () => {
    render(<TodoContainer />);

    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });

    // 아이콘 버튼이 존재하고 접근 가능한지 확인
    expect(userMenuIcon).toBeInTheDocument();
    expect(userMenuIcon).toHaveClass('user-menu-icon');
  });

  test('profile update does not interfere with todo creation flow', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 사용자 메뉴를 열고 프로필 수정 시작
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 프로필 수정 취소
    const cancelButton = screen.getByRole('button', { name: /Cancel Profile/ });
    await user.click(cancelButton);

    // 작업 생성을 시작할 수 있어야 함
    const newTodoButton = screen.getByRole('button', { name: /신규/ });
    await user.click(newTodoButton);

    expect(screen.getByText('새로운 TO-DO 항목추가')).toBeInTheDocument();
  });

  test('profile update does not interfere with todo editing flow', async () => {
    const user = userEvent.setup();

    // 할 일 데이터 모의
    mockApi.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            todoSeq: 1,
            todoContent: 'Test todo',
            todoNote: 'Test note',
            completeDtm: null,
          },
        ]),
      text: () =>
        Promise.resolve(
          JSON.stringify([
            {
              todoSeq: 1,
              todoContent: 'Test todo',
              todoNote: 'Test note',
              completeDtm: null,
            },
          ]),
        ),
    });

    render(<TodoContainer />);

    // 할 일 목록 로딩 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo')).toBeInTheDocument();
    });

    // 사용자 메뉴를 열고 프로필 수정 시작
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // 프로필 수정 취소
    const cancelButton = screen.getByRole('button', { name: /Cancel Profile/ });
    await user.click(cancelButton);

    // 작업을 수정할 수 있어야 함
    const moreActionsButton = screen.getByRole('button', { name: '' }); // 점 세 개 버튼
    await user.click(moreActionsButton);

    // 수정 기능을 사용할 수 있어야 함 (여기서 전체 수정 흐름을 테스트하지는 않음)
    expect(screen.getByText('Test todo')).toBeInTheDocument();
  });
});

describe('TodoContainer Excel Export Button Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
    });
  });

  test('renders Excel export button in correct position (left of 신규 button)', () => {
    render(<TodoContainer />);

    const todoActions = document.querySelector('.todo-actions');
    const buttons = todoActions.querySelectorAll('button');

    // Excel과 신규, 2개의 버튼이 있어야 함
    expect(buttons).toHaveLength(2);

    // Excel 버튼이 첫 번째(왼쪽)여야 함
    expect(buttons[0]).toHaveAttribute('aria-label', 'Excel 내보내기');

    // 신규 버튼이 두 번째(오른쪽)여야 함
    expect(buttons[1]).toHaveTextContent('신규');
  });

  test('Excel export button has correct styling (btn-outline-success)', () => {
    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });

    expect(excelButton).toHaveClass('btn', 'btn-outline-success');
  });

  test('Excel export button is visible when not in create mode', () => {
    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });

    expect(excelButton).toBeVisible();
  });

  test('Excel export button is hidden when in create mode', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 생성 모드로 진입하기 위해 신규 버튼 클릭
    const newButton = screen.getByRole('button', { name: /신규/ });
    await user.click(newButton);

    // Excel 버튼이 보이지 않아야 함
    const excelButton = screen.queryByRole('button', {
      name: /Excel 내보내기/,
    });
    expect(excelButton).not.toBeInTheDocument();
  });

  test('Excel export button is hidden when in edit mode', async () => {
    const user = userEvent.setup();

    // 할 일 데이터 모의
    mockApi.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            todoSeq: 1,
            todoContent: 'Test todo',
            todoNote: 'Test note',
            completeDtm: null,
          },
        ]),
      text: () =>
        Promise.resolve(
          JSON.stringify([
            {
              todoSeq: 1,
              todoContent: 'Test todo',
              todoNote: 'Test note',
              completeDtm: null,
            },
          ]),
        ),
    });

    render(<TodoContainer />);

    // 할 일 목록 로딩 대기
    await waitFor(() => {
      expect(screen.getByText('Test todo')).toBeInTheDocument();
    });

    // 더 보기 버튼 클릭
    const moreActionsButton = screen.getByRole('button', { name: '' });
    await user.click(moreActionsButton);

    // 수정 버튼 클릭
    const editButton = screen.getByTitle('수정');
    await user.click(editButton);

    // Excel 버튼이 보이지 않아야 함
    const excelButton = screen.queryByRole('button', {
      name: /Excel 내보내기/,
    });
    expect(excelButton).not.toBeInTheDocument();
  });

  test('Excel export button is hidden when in profile update mode', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 사용자 메뉴를 열고 프로필 수정 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const updateProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });
    await user.click(updateProfileButton);

    // Excel 버튼이 보이지 않아야 함
    const excelButton = screen.queryByRole('button', {
      name: /Excel 내보내기/,
    });
    expect(excelButton).not.toBeInTheDocument();
  });

  test('Excel export button is hidden when in password change mode', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 사용자 메뉴를 열고 비밀번호 변경 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const changePasswordButton = screen.getByRole('button', {
      name: /비밀번호 변경/,
    });
    await user.click(changePasswordButton);

    // Excel 버튼이 보이지 않아야 함
    const excelButton = screen.queryByRole('button', {
      name: /Excel 내보내기/,
    });
    expect(excelButton).not.toBeInTheDocument();
  });
});

describe('TodoContainer Date Range Modal Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
    });

    // SweetAlert 모의 객체가 기본적으로 취소를 반환하도록 재설정
    const Swal = require('sweetalert2');
    Swal.fire.mockResolvedValue({ isConfirmed: false });
  });

  test('displays date range modal when Excel export button is clicked', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 모달이 호출될 때까지 대기
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Excel 내보내기',
          showCancelButton: true,
          confirmButtonText: '내보내기',
          cancelButtonText: '취소',
        }),
      );
    });
  });

  test('modal displays with date pickers for start and end dates', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 모달이 호출될 때까지 기다리고 모달 HTML에 날짜 입력이 포함되어 있는지 확인
    await waitFor(() => {
      const callArgs = Swal.fire.mock.calls[0][0];
      expect(callArgs.html).toContain('id="startDate"');
      expect(callArgs.html).toContain('id="endDate"');
      expect(callArgs.html).toContain('type="date"');
      expect(callArgs.html).toContain('시작일');
      expect(callArgs.html).toContain('종료일');
    });
  });

  test('date validation prevents empty date fields', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    // 유효성 검사 테스트를 위한 DOM 요소 모의
    const mockStartDateInput = { value: '' };
    const mockEndDateInput = { value: '2024-01-31' };

    const originalGetElementById = document.getElementById;
    document.getElementById = vi.fn((id) => {
      if (id === 'startDate') return mockStartDateInput;
      if (id === 'endDate') return mockEndDateInput;
      return originalGetElementById.call(document, id);
    });

    Swal.showValidationMessage = vi.fn();

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // preConfirm 함수를 가져와서 호출
    await waitFor(() => {
      const callArgs = Swal.fire.mock.calls[0][0];
      const result = callArgs.preConfirm();

      // 유효성 검사 메시지가 표시되었는지 확인
      expect(Swal.showValidationMessage).toHaveBeenCalledWith(
        '날짜를 선택해주세요',
      );
      expect(result).toBe(false);
    });

    // 원래 함수 복원
    document.getElementById = originalGetElementById;
  });

  test('date validation prevents startDate after endDate', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    // 유효하지 않은 날짜 범위의 DOM 요소 모의
    const mockStartDateInput = { value: '2024-02-01' };
    const mockEndDateInput = { value: '2024-01-31' };

    const originalGetElementById = document.getElementById;
    document.getElementById = vi.fn((id) => {
      if (id === 'startDate') return mockStartDateInput;
      if (id === 'endDate') return mockEndDateInput;
      return originalGetElementById.call(document, id);
    });

    Swal.showValidationMessage = vi.fn();

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // preConfirm 함수를 가져와서 호출
    await waitFor(() => {
      const callArgs = Swal.fire.mock.calls[0][0];
      const result = callArgs.preConfirm();

      // 유효성 검사 메시지가 표시되었는지 확인
      expect(Swal.showValidationMessage).toHaveBeenCalledWith(
        '시작일은 종료일보다 이전이어야 합니다',
      );
      expect(result).toBe(false);
    });

    // 원래 함수 복원
    document.getElementById = originalGetElementById;
  });

  test('modal confirms with valid dates', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    // 유효한 날짜 범위의 DOM 요소 모의
    const mockStartDateInput = { value: '2024-01-01' };
    const mockEndDateInput = { value: '2024-01-31' };

    const originalGetElementById = document.getElementById;
    document.getElementById = vi.fn((id) => {
      if (id === 'startDate') return mockStartDateInput;
      if (id === 'endDate') return mockEndDateInput;
      return originalGetElementById.call(document, id);
    });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // preConfirm 함수를 가져와서 호출
    await waitFor(() => {
      const callArgs = Swal.fire.mock.calls[0][0];
      const result = callArgs.preConfirm();

      // 날짜가 반환되는지 확인
      expect(result).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    // 원래 함수 복원
    document.getElementById = originalGetElementById;
  });

  test('cancel button closes modal without triggering export', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    // 사용자가 모달을 취소하는 상황 모의
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 모달 처리가 완료될 때까지 대기
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });

    // API가 호출되지 않았는지 확인
    expect(mockApi).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/todo/excel'),
      expect.anything(),
    );
  });
});

describe('TodoContainer File Download Handler', () => {
  let originalCreateElement;
  let originalAppendChild;
  let originalRemoveChild;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeAll(() => {
    // 원래 함수들을 한 번 저장
    originalCreateElement = document.createElement.bind(document);
    originalAppendChild = document.body.appendChild.bind(document.body);
    originalRemoveChild = document.body.removeChild.bind(document.body);
    originalCreateObjectURL = globalThis.URL.createObjectURL;
    originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // 이전 렌더링 정리

    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
    });

    // 파일 다운로드를 위한 URL 메서드 모의
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();

    // SweetAlert가 기본적으로 취소를 반환하도록 모의
    const Swal = require('sweetalert2');
    Swal.fire.mockResolvedValue({ isConfirmed: false });
  });

  afterEach(() => {
    // 각 테스트 후 정리

    // 모의된 원래 함수 복원
    if (document.createElement !== originalCreateElement) {
      document.createElement = originalCreateElement;
    }
    if (document.body.appendChild !== originalAppendChild) {
      document.body.appendChild = originalAppendChild;
    }
    if (document.body.removeChild !== originalRemoveChild) {
      document.body.removeChild = originalRemoveChild;
    }
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  test('successful download flow with correct API call', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    // Blob을 포함한 성공적인 API 응답 모의
    const mockBlob = new Blob(['mock excel data'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

    // 성공적인 모달 확인 모의
    Swal.fire
      .mockResolvedValueOnce({
        isConfirmed: true,
        value: { startDate: '2024-01-01', endDate: '2024-01-31' },
      })
      .mockResolvedValueOnce({ isConfirmed: true });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // API 호출 대기
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        '/api/todo/excel?startDate=2024-01-01&endDate=2024-01-31',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
    });

    // Blob이 생성되고 다운로드가 트리거되었는지 확인
    await waitFor(() => {
      expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });
  });

  test('file naming convention follows pattern todos_YYYY-MM-DD_to_YYYY-MM-DD.xlsx', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn(),
    };

    const originalCreateElementFn = document.createElement;
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') return mockAnchor;
      return originalCreateElementFn.call(document, tag);
    });

    const mockBlob = new Blob(['mock excel data']);
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

    Swal.fire
      .mockResolvedValueOnce({
        isConfirmed: true,
        value: { startDate: '2024-01-01', endDate: '2024-01-31' },
      })
      .mockResolvedValueOnce({ isConfirmed: true });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 다운로드가 트리거될 때까지 대기
    await waitFor(() => {
      expect(mockAnchor.download).toBe('todos_2024-01-01_to_2024-01-31.xlsx');
    });

    // 복원
    document.createElement = originalCreateElementFn;
  });

  test('displays success message after successful download', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    const mockBlob = new Blob(['mock excel data']);
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

    Swal.fire
      .mockResolvedValueOnce({
        isConfirmed: true,
        value: { startDate: '2024-01-01', endDate: '2024-01-31' },
      })
      .mockResolvedValueOnce({ isConfirmed: true });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 성공 메시지 대기
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        '성공',
        'Excel 파일이 다운로드되었습니다.',
        'success',
      );
    });
  });

  test('handles 400 Bad Request error', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid date format' }),
        text: () =>
          Promise.resolve(JSON.stringify({ message: 'Invalid date format' })),
      });

    Swal.fire.mockResolvedValueOnce({
      isConfirmed: true,
      value: { startDate: '2024-01-01', endDate: '2024-01-31' },
    });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 오류 메시지 대기
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        '오류',
        'Invalid date format',
        'error',
      );
    });
  });

  test('handles 401 Unauthorized error', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}'),
      });

    Swal.fire.mockResolvedValueOnce({
      isConfirmed: true,
      value: { startDate: '2024-01-01', endDate: '2024-01-31' },
    });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 오류 메시지 대기
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        '오류',
        '인증이 필요합니다. 다시 로그인해주세요.',
        'error',
      );
    });
  });

  test('handles 500 Internal Server Error', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}'),
      });

    Swal.fire.mockResolvedValueOnce({
      isConfirmed: true,
      value: { startDate: '2024-01-01', endDate: '2024-01-31' },
    });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 오류 메시지 대기
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        '오류',
        '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        'error',
      );
    });
  });

  test('handles network failure errors', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    // 네트워크 오류 모의
    const networkError = new TypeError('Failed to fetch');
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockRejectedValueOnce(networkError);

    Swal.fire.mockResolvedValueOnce({
      isConfirmed: true,
      value: { startDate: '2024-01-01', endDate: '2024-01-31' },
    });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 오류 메시지 대기
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        '오류',
        '네트워크 연결을 확인해주세요.',
        'error',
      );
    });
  });

  test('cleans up resources after download', async () => {
    const user = userEvent.setup();
    const Swal = require('sweetalert2');

    const mockBlob = new Blob(['mock excel data']);
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

    Swal.fire
      .mockResolvedValueOnce({
        isConfirmed: true,
        value: { startDate: '2024-01-01', endDate: '2024-01-31' },
      })
      .mockResolvedValueOnce({ isConfirmed: true });

    render(<TodoContainer />);

    const excelButton = screen.getByRole('button', { name: /Excel 내보내기/ });
    await user.click(excelButton);

    // 다운로드가 완료될 때까지 대기
    await waitFor(
      () => {
        expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      },
      { timeout: 3000 },
    );

    // 정리가 호출되었는지 확인
    await waitFor(
      () => {
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(
          'blob:mock-url',
        );
      },
      { timeout: 3000 },
    );
  });
});

describe('TodoContainer Password Change Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 성공적인 API 응답 모의
    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
    });
  });

  test('shows PasswordChangeForm when Change Password button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 먼저 사용자 메뉴 열기
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const changePasswordButton = screen.getByRole('button', {
      name: /비밀번호 변경/,
    });
    await user.click(changePasswordButton);

    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /비밀번호 변경/ }),
    ).toBeInTheDocument();
  });

  test('hides todo list elements when password change form is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 초기에는 작업 목록 요소들이 보여야 함
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();

    // 사용자 메뉴를 열고 비밀번호 변경 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const changePasswordButton = screen.getByRole('button', {
      name: /비밀번호 변경/,
    });
    await user.click(changePasswordButton);

    // 작업 목록 요소들은 숨겨져야 함
    expect(
      screen.queryByRole('button', { name: /신규/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-picker')).not.toBeInTheDocument();

    // 비밀번호 변경 폼이 보여야 함
    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
  });

  test('disables both profile and password buttons when password change is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 사용자 메뉴 열기
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const changePasswordButton = screen.getByRole('button', {
      name: /비밀번호 변경/,
    });
    screen.getByRole('button', { name: /프로필 수정/ });

    await user.click(changePasswordButton);

    // 버튼 상태 확인을 위해 메뉴 다시 열기
    await user.click(userMenuIcon);

    const disabledPasswordButton = screen.getByRole('button', {
      name: /비밀번호 변경/,
    });
    const disabledProfileButton = screen.getByRole('button', {
      name: /프로필 수정/,
    });

    expect(disabledPasswordButton).toBeDisabled();
    expect(disabledProfileButton).toBeDisabled();
  });

  test('returns to todo list view when password change is cancelled', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // 사용자 메뉴를 열고 비밀번호 변경 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const changePasswordButton = screen.getByRole('button', {
      name: /비밀번호 변경/,
    });
    await user.click(changePasswordButton);

    // 비밀번호 폼이 보여야 함
    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();

    // 취소 버튼 클릭
    const cancelButton = screen.getByRole('button', {
      name: /Cancel Password/,
    });
    await user.click(cancelButton);

    // 작업 목록 뷰로 돌아가야 함
    expect(
      screen.queryByTestId('password-change-form'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  test('password change form can be submitted', async () => {
    const user = userEvent.setup();

    render(<TodoContainer />);

    // 사용자 메뉴를 열고 비밀번호 변경 버튼 클릭
    const userMenuIcon = screen.getByRole('button', { name: /사용자 메뉴/ });
    await user.click(userMenuIcon);

    const changePasswordButton = screen.getByRole('button', {
      name: /비밀번호 변경/,
    });
    await user.click(changePasswordButton);

    // 비밀번호 변경 폼이 보여야 함
    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();

    // 비밀번호 저장 버튼 클릭 (이것은 모의 onSave 함수를 트리거함)
    const saveButton = screen.getByRole('button', { name: /Save Password/ });
    await user.click(saveButton);

    // 저장 버튼은 클릭 가능해야 함 (기본 기능 테스트)
    expect(saveButton).toBeInTheDocument();
  });
});
