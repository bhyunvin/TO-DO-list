import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  test('renders profile update form with user data', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    expect(await screen.findByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByText('프로필 수정')).toBeInTheDocument();
  });

  test('validates required name field', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    await screen.findByText('이름을 입력해주세요.');
  });

  test('validates email format', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const emailInput = await screen.findByLabelText(/이메일/);

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await screen.findByText('올바른 이메일 형식을 입력해주세요.');
  });

  test('validates name length limit', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = (await screen.findByLabelText(
      /이름/,
    )) as HTMLInputElement;
    const submitButton = (await screen.findByRole('button', {
      name: /저장/,
    })) as HTMLButtonElement;

    // FAST-PATH: 직접 입력 시뮬레이션 (205자)
    fireEvent.input(nameInput, { target: { value: 'a'.repeat(205) } });

    // truncation 검증 (200자 제한)
    await waitFor(() => {
      expect(nameInput.value.length).toBe(200);
    });

    // 200자는 유효 범위 내이므로 에러가 없어야 하며, dirty 하므로 버튼은 활성화되어야 함
    expect(nameInput.className).not.toContain('is-invalid');
    expect(submitButton.disabled).toBe(false);
  });

  test('validates email length limit', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const emailInput = (await screen.findByLabelText(
      /이메일/,
    )) as HTMLInputElement;
    const submitButton = (await screen.findByRole('button', {
      name: /저장/,
    })) as HTMLButtonElement;

    // FAST-PATH: 이메일은 100자 제한. 104자 입력 시 잘리면서 형식이 깨지게 구성.
    fireEvent.input(emailInput, {
      target: { value: 'a'.repeat(94) + '@test.com' },
    });

    await waitFor(() => {
      expect(emailInput.value.length).toBe(100);
    });

    // '@test.co' 등으로 형식이 깨지면 에러 클래스가 붙어야 함
    expect(emailInput.className).toContain('is-invalid');
    expect(submitButton.disabled).toBe(true);
  });

  test('handles profile image file selection', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const fileInput =
      await screen.findByLabelText<HTMLInputElement>(/프로필 이미지/);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

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

    expect(await screen.findByText('16/4000 자')).toBeInTheDocument();
  });

  test('updates character count when typing in description', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    fireEvent.change(descriptionInput, {
      target: { value: 'New description' },
    });

    expect(screen.getByText('15/4000 자')).toBeInTheDocument();
  });

  test('calls onSave with correct data when form is submitted', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    const emailInput = await screen.findByLabelText(/이메일/);
    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Updated description' },
    });

    fireEvent.click(submitButton);

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
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await screen.findByText('이름을 입력해주세요.');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('disables submit button when there are validation errors', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  test('calls onCancel when cancel button is clicked without changes', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const cancelButton = await screen.findByRole('button', { name: /취소/ });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('shows loading state when submitting', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
        isSubmitting={true}
      />,
    );

    const submitButton = await screen.findByRole('button', {
      name: /저장 중.../,
    });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('저장 중...')).toBeInTheDocument();
    expect(submitButton.querySelector('.spinner-border')).toBeInTheDocument();
  });

  test('trims whitespace from form inputs', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    const emailInput = await screen.findByLabelText(/이메일/);
    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    fireEvent.change(nameInput, { target: { value: '  Trimmed Name  ' } });
    fireEvent.change(emailInput, {
      target: { value: '  trimmed@example.com  ' },
    });
    fireEvent.change(descriptionInput, {
      target: { value: '  Trimmed description  ' },
    });

    fireEvent.click(submitButton);

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

  test('handles API error during save', async () => {
    const mockOnSaveError = jest
      .fn()
      .mockRejectedValue(new Error('API Failure'));

    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSaveError}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.click(submitButton);

    await waitFor(
      () => {
        expect(mockOnSaveError).toHaveBeenCalled();
      },
      { timeout: 4000 },
    );
  }, 10000);

  test('shows confirmation alert when cancelling with dirty state', async () => {
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

    const nameInput = await screen.findByLabelText(/이름/);
    const cancelButton = await screen.findByRole('button', { name: /취소/ });

    // Make it dirty
    fireEvent.change(nameInput, { target: { value: 'Dirty Name' } });
    fireEvent.click(cancelButton);

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
  }, 5000);

  test('validates accessibility (aria-label) for critical inputs', async () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    expect(nameInput).toBeRequired();

    const emailInput = await screen.findByLabelText(/이메일/);
    expect(emailInput).toBeRequired();
  });
});
