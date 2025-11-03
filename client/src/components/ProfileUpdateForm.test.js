import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileUpdateForm from './ProfileUpdateForm';

// Mock SweetAlert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true }))
}));

// Mock file upload hooks
jest.mock('../hooks/useFileUploadValidator', () => ({
  useFileUploadValidator: () => ({
    validateFiles: jest.fn(() => [{ isValid: true, file: {}, fileName: 'test.jpg', fileSize: 1000 }]),
    formatFileSize: jest.fn((size) => `${size} bytes`),
    getUploadPolicy: jest.fn(() => ({ maxSize: 10485760 })),
    FILE_VALIDATION_ERRORS: {}
  })
}));

jest.mock('../hooks/useFileUploadProgress', () => ({
  useFileUploadProgress: () => ({
    uploadStatus: 'idle',
    uploadProgress: {},
    uploadErrors: [],
    validationResults: [],
    resetUploadState: jest.fn()
  })
}));

// Mock FileUploadProgress component
jest.mock('./FileUploadProgress', () => {
  return function MockFileUploadProgress() {
    return <div data-testid="file-upload-progress">File Upload Progress</div>;
  };
});

describe('ProfileUpdateForm', () => {
  const mockUser = {
    userName: 'Test User',
    userEmail: 'test@example.com',
    userDescription: 'Test description'
  };

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders profile update form with user data', () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
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
      />
    );

    const nameInput = screen.getByLabelText(/이름/);
    await user.clear(nameInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('이름을 입력해주세요.')).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const emailInput = screen.getByLabelText(/이메일/);
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('올바른 이메일 형식을 입력해주세요.')).toBeInTheDocument();
    });
  });

  test('validates name length limit', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/이름/);
    const submitButton = screen.getByRole('button', { name: /저장/ });
    
    // Clear and add a very long name that exceeds maxLength
    await user.clear(nameInput);
    // Since maxLength prevents typing more than 200 chars, we'll test the validation logic
    // by manually setting a long value and triggering validation
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(201) } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText('이름은 200자 이내로 입력해주세요.')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  test('validates email length limit', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const emailInput = screen.getByLabelText(/이메일/);
    const submitButton = screen.getByRole('button', { name: /저장/ });
    
    // Clear and add a very long email that exceeds maxLength
    await user.clear(emailInput);
    // Since maxLength prevents typing more than 100 chars, we'll test the validation logic
    // by manually setting a long value and triggering validation
    fireEvent.change(emailInput, { target: { value: 'a'.repeat(95) + '@test.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('이메일은 100자 이내로 입력해주세요.')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  test('handles profile image file selection', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const fileInput = screen.getByLabelText(/프로필 이미지/);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);

    expect(fileInput.files[0]).toBe(file);
    expect(fileInput.files).toHaveLength(1);
  });

  test('shows character count for description field', () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('16/4000 자')).toBeInTheDocument();
  });

  test('updates character count when typing in description', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const descriptionInput = screen.getByLabelText(/추가 설명/);
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
      />
    );

    const nameInput = screen.getByLabelText(/이름/);
    const emailInput = screen.getByLabelText(/이메일/);
    const descriptionInput = screen.getByLabelText(/추가 설명/);
    const submitButton = screen.getByRole('button', { name: /저장/ });

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
          formData: expect.any(FormData)
        })
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
      />
    );

    const nameInput = screen.getByLabelText(/이름/);
    const submitButton = screen.getByRole('button', { name: /저장/ });

    await user.clear(nameInput);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('이름을 입력해주세요.')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('disables submit button when there are validation errors', async () => {
    const user = userEvent.setup();
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/이름/);
    const submitButton = screen.getByRole('button', { name: /저장/ });

    await user.clear(nameInput);
    await user.tab();

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
      />
    );

    const cancelButton = screen.getByRole('button', { name: /취소/ });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('shows loading state when submitting', () => {
    render(
      <ProfileUpdateForm
        user={mockUser}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /저장 중.../ });
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
      />
    );

    const nameInput = screen.getByLabelText(/이름/);
    const emailInput = screen.getByLabelText(/이메일/);
    const descriptionInput = screen.getByLabelText(/추가 설명/);
    const submitButton = screen.getByRole('button', { name: /저장/ });

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
          userDescription: 'Trimmed description'
        })
      );
    });
  });
});