import { render, fireEvent, waitFor, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import ProfileUpdateForm from './ProfileUpdateForm';

// alertUtils 모킹
jest.mock('../utils/alertUtils', () => ({
  showErrorAlert: jest.fn(),
  showConfirmAlert: jest.fn(),
}));

// userService 모킹
jest.mock('../api/userService', () => ({
  default: {
    getUserProfileDetail: jest.fn().mockResolvedValue({
      userName: 'Test User',
      userEmail: 'test@example.com',
      userDescription: 'Test description',
    }),
  },
}));

// 파일 업로드 훅 모킹
jest.mock('../hooks/useFileUploadValidator', () => ({
  useFileUploadValidator: () => ({
    validateFiles: jest.fn(() => [
      { isValid: true, file: {}, fileName: 'test.jpg', fileSize: 1000 },
    ]),
    formatFileSize: jest.fn((size) => `${size} bytes`),
    getUploadPolicy: jest.fn(() => ({ maxSize: 10485760 })),
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

// useSecureImage 모킹
jest.mock('../hooks/useSecureImage', () => ({
  __esModule: true,
  default: jest.fn((src) => src),
}));

// FileUploadProgress 컴포넌트 모킹
jest.mock('./FileUploadProgress', () => {
  const MockFileUploadProgress = () => (
    <div data-testid="file-upload-progress">File Upload Progress</div>
  );
  return { default: MockFileUploadProgress };
});

describe('ProfileUpdateForm', () => {
  const mockUser = {
    userName: 'Test User',
    userEmail: 'test@example.com',
    userDescription: 'Test description',
  };

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 폼 로드 및 데이터 초기화 대기 헬퍼
  const waitForFormLoad = async () => {
    // 가져오기 완료를 나타내는 특정 사용자 데이터가 나타날 때까지 대기
    await screen.findByDisplayValue('Test User');
  };

  test('renders profile update form with user data', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByText('프로필 수정')).toBeInTheDocument();
  });

  test('validates required name field', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);

    // 반복적인 백스페이스를 사용하여 입력 필드 비우기 (이 환경에서 selectall은 불안정할 수 있음)
    await user.type(nameInput, '{backspace}'.repeat(20));

    // 값이 변경되었는지 확인
    expect(nameInput).toHaveValue('');

    // 유효성 검사 트리거
    fireEvent.blur(nameInput);

    await screen.findByText('이름을 입력해주세요.');
  });

  test('validates email format', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const emailInput = await screen.findByLabelText(/이메일/);

    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');

    // 값이 변경되었는지 확인
    expect(emailInput).toHaveValue('invalid-email');

    await screen.findByText('올바른 이메일 형식을 입력해주세요.');
  });

  test('validates name length limit', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', {
      name: /저장/,
    });

    expect(nameInput).toHaveAttribute('maxLength', '200');

    // userEvent respects maxLength, so it should only type 200 chars
    // 'Test User'가 이미 있나? 아니요, 의존해서는 안 됩니다.
    // 모두 선택한 다음 205자를 입력합니다.
    const longText = 'a'.repeat(205);
    await user.type(nameInput, '{backspace}'.repeat(20));
    await user.type(nameInput, longText);

    // 200자로 잘릴 것으로 예상
    expect(nameInput).toHaveValue('a'.repeat(200));

    expect(nameInput.className).not.toContain('is-invalid');
    expect(submitButton).toBeEnabled();
  });

  test('validates email length limit', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const emailInput = await screen.findByLabelText(/이메일/);
    const submitButton = await screen.findByRole('button', {
      name: /저장/,
    });

    expect(emailInput).toHaveAttribute('maxLength', '100');

    // Email length > 100. userEvent truncates.
    // 기존 값에 추가되지 않도록 먼저 지우기
    await user.clear(emailInput);
    await user.type(emailInput, 'a'.repeat(101));

    expect(emailInput).toHaveValue('a'.repeat(100));

    // 형식이 깨졌기 때문에( @ 없음) 잘못된 피드백을 표시해야 함
    await waitFor(
      () => {
        expect(emailInput.className).toContain('is-invalid');
      },
      { timeout: 2000 },
    );

    expect(submitButton).toBeDisabled();
  });

  test('handles profile image file selection', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const fileInput =
      await screen.findByLabelText<HTMLInputElement>(/프로필 이미지/);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);

    expect(fileInput.files[0]).toBe(file);
    expect(fileInput.files).toHaveLength(1);
  });

  test('shows character count for description field', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();
    expect(await screen.findByText('16/4000 자')).toBeInTheDocument();
  });

  test('updates character count when typing in description', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'New description');

    expect(screen.getByText('15/4000 자')).toBeInTheDocument();
  });

  test('calls onSave with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);
    const emailInput = await screen.findByLabelText(/이메일/);
    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    // 지우고 입력
    await user.type(nameInput, '{backspace}'.repeat(20)); // 강력한 지우기
    await user.type(nameInput, 'Updated Name');

    await user.clear(emailInput);
    await user.type(emailInput, 'updated@example.com');

    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'Updated Name',
          userEmail: 'updated@example.com',
          userDescription: 'Updated description',
          profileImageFile: null,
          formData: expect.any(FormData),
        }),
      );
    });
  });

  test('prevents submission when validation errors exist', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    // 오류를 트리거하기 위해 이름 비우기
    await user.type(nameInput, '{backspace}'.repeat(20));

    await user.click(submitButton);

    await screen.findByText('이름을 입력해주세요.');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('disables submit button when there are validation errors', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    await user.type(nameInput, '{backspace}'.repeat(20));

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  test('calls onCancel when cancel button is clicked without changes', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const cancelButton = await screen.findByRole('button', { name: /취소/ });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('trims whitespace from form inputs', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);
    const emailInput = await screen.findByLabelText(/이메일/);
    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    await user.type(nameInput, '{backspace}'.repeat(20));
    await user.type(nameInput, '  Trimmed Name  ');

    await user.clear(emailInput);
    await user.type(emailInput, '  trimmed@example.com  ');

    await user.clear(descriptionInput);
    await user.type(descriptionInput, '  Trimmed description  ');

    await user.click(submitButton);

    await waitFor(
      () => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            userName: 'Trimmed Name',
            userEmail: 'trimmed@example.com',
            userDescription: 'Trimmed description',
          }),
        );
      },
      { timeout: 3000 },
    );
  });

  test('shows confirmation alert when cancelling with dirty state', async () => {
    const user = userEvent.setup();
    const { showConfirmAlert } = require('../utils/alertUtils');
    showConfirmAlert.mockResolvedValue({ isConfirmed: true });

    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);
    const cancelButton = await screen.findByRole('button', { name: /취소/ });

    // 변경된 상태(dirty)로 만들기
    await user.type(nameInput, 'Dirty Name');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(showConfirmAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '정말 취소하시겠습니까?',
        }),
      );
    });

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  test('validates accessibility (aria-label) for critical inputs', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    await waitForFormLoad();

    const nameInput = await screen.findByLabelText(/이름/);
    expect(nameInput).toBeRequired();

    const emailInput = await screen.findByLabelText(/이메일/);
    expect(emailInput).toBeRequired();
  });
});
