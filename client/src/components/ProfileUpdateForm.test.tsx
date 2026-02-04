import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    getUserProfileDetail: jest.fn().mockResolvedValue(null),
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
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/이름/);
    await user.clear(nameInput);
    await user.tab();

    await waitFor(
      () => {
        expect(screen.getByText('이름을 입력해주세요.')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
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

    const emailInput = await screen.findByLabelText(/이메일/);

    await user.type(emailInput, '{selectall}invalid-email');
    await user.tab();

    await waitFor(
      () => {
        expect(
          screen.getByText('올바른 이메일 형식을 입력해주세요.'),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
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

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    // user-event respects maxLength, so it truncates the input.
    // We expect the value to be truncated to 200 chars and no error to be shown for "too long"
    // (since it's physically impossible to type more)
    await user.type(nameInput, 'a'.repeat(201));
    await user.tab();

    expect(nameInput).toHaveValue('a'.repeat(200));
    expect(
      screen.queryByText('이름은 200자 이내로 입력해주세요.'),
    ).not.toBeInTheDocument();
    expect(submitButton).toBeDisabled();
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

    const emailInput = await screen.findByLabelText(/이메일/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    // user-event respects maxLength
    await user.type(emailInput, 'a'.repeat(95) + '@test.com');
    await user.tab();

    // Max length is 100. 'a'*95 (95 chars) + '@test.com' (9 chars) = 104 chars.
    // It should truncate to 100 chars.
    const expectedValue = ('a'.repeat(95) + '@test.com').slice(0, 100);
    expect(emailInput).toHaveValue(expectedValue);

    expect(
      screen.queryByText('이메일은 100자 이내로 입력해주세요.'),
    ).not.toBeInTheDocument();
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

    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    await user.type(descriptionInput, '{selectall}New description');

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

    const nameInput = await screen.findByLabelText(/이름/);
    const emailInput = await screen.findByLabelText(/이메일/);
    const descriptionInput = await screen.findByLabelText(/추가 설명/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    await user.clear(nameInput);
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

    const nameInput = await screen.findByLabelText(/이름/);
    const submitButton = await screen.findByRole('button', { name: /저장/ });

    await user.clear(nameInput);
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText('이름을 입력해주세요.')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

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
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDirtyChange={jest.fn()}
      />,
    );

    const cancelButton = await screen.findByRole('button', { name: /취소/ });
    await user.click(cancelButton);

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
    const user = userEvent.setup();
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

    await user.clear(nameInput);
    await user.type(nameInput, '  Trimmed Name  ');
    await user.clear(emailInput);
    await user.type(emailInput, '  trimmed@example.com  ');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, '  Trimmed description  ');

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'Trimmed Name',
          userEmail: 'trimmed@example.com',
          userDescription: 'Trimmed description',
        }),
      );
    });
  });
});
