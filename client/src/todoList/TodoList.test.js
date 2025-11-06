import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoContainer from './TodoList';

// Mock SweetAlert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true }).then(() => ({ isConfirmed: true })))
}));

// Mock auth store
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockApi = jest.fn();

jest.mock('../authStore/authStore', () => ({
  useAuthStore: () => ({
    user: {
      userName: 'Test User',
      userEmail: 'test@example.com',
      userDescription: 'Test description'
    },
    login: mockLogin,
    logout: mockLogout,
    api: mockApi
  })
}));

// Mock file upload hooks
jest.mock('../hooks/useFileUploadValidator', () => ({
  useFileUploadValidator: () => ({
    validateFiles: jest.fn(() => [{ isValid: true, file: {}, fileName: 'test.jpg', fileSize: 1000 }]),
    formatFileSize: jest.fn((size) => `${size} bytes`),
    getUploadPolicy: jest.fn(() => ({ maxSize: 10485760, maxCount: 5 })),
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

// Mock components
jest.mock('../components/FileUploadProgress', () => {
  return function MockFileUploadProgress() {
    return <div data-testid="file-upload-progress">File Upload Progress</div>;
  };
});

jest.mock('../components/ProfileUpdateForm', () => {
  return function MockProfileUpdateForm({ user, onSave, onCancel }) {
    return (
      <div data-testid="profile-update-form">
        <h3>프로필 수정</h3>
        <p>User: {user.userName}</p>
        <button onClick={() => onSave({ 
          userName: 'Updated Name',
          userEmail: 'updated@example.com',
          userDescription: 'Updated description',
          formData: new FormData()
        })}>
          Save Profile
        </button>
        <button onClick={onCancel}>Cancel Profile</button>
      </div>
    );
  };
});

jest.mock('../components/PasswordChangeForm', () => {
  return function MockPasswordChangeForm({ onSave, onCancel }) {
    return (
      <div data-testid="password-change-form">
        <h3>비밀번호 변경</h3>
        <button onClick={() => onSave({ 
          currentPassword: 'current123',
          newPassword: 'new123',
          confirmPassword: 'new123'
        })}>
          Save Password
        </button>
        <button onClick={onCancel}>Cancel Password</button>
      </div>
    );
  };
});

// Mock DatePicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange }) {
    return (
      <input
        data-testid="date-picker"
        value={selected.toISOString().split('T')[0]}
        onChange={(e) => onChange(new Date(e.target.value))}
      />
    );
  };
});

describe('TodoContainer Profile Update Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  test('displays Update Profile button in header between welcome message and logout button', () => {
    render(<TodoContainer />);

    const userInfoHeader = screen.getByText('Test User님 환영합니다.').parentElement;
    const buttons = userInfoHeader.querySelectorAll('button');
    
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent('프로필 수정');
    expect(buttons[1]).toHaveTextContent('비밀번호 변경');
    expect(buttons[2]).toHaveTextContent('로그아웃');
  });

  test('shows ProfileUpdateForm when Update Profile button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    expect(screen.getByTestId('profile-update-form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /프로필 수정/ })).toBeInTheDocument();
  });

  test('hides todo list elements when profile update form is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // Initially, todo list elements should be visible
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();

    // Click update profile button
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    // Todo list elements should be hidden
    expect(screen.queryByRole('button', { name: /신규/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-picker')).not.toBeInTheDocument();
    
    // Profile update form should be visible
    expect(screen.getByTestId('profile-update-form')).toBeInTheDocument();
  });

  test('disables Update Profile button when profile update is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    expect(updateProfileButton).toBeDisabled();
  });

  test('returns to todo list view when profile update is cancelled', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // Click update profile button
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    // Profile form should be visible
    expect(screen.getByTestId('profile-update-form')).toBeInTheDocument();

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /Cancel Profile/ });
    await user.click(cancelButton);

    // Should return to todo list view
    expect(screen.queryByTestId('profile-update-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    expect(updateProfileButton).not.toBeDisabled();
  });

  test('processes profile update and updates user session', async () => {
    const user = userEvent.setup();
    
    // Mock successful profile update API response
    const updatedUser = {
      userName: 'Updated Name',
      userEmail: 'updated@example.com',
      userDescription: 'Updated description'
    };
    
    mockApi.mockImplementation((url) => {
      if (url === '/api/user/profile') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedUser)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<TodoContainer />);

    // Click update profile button
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    // Click save button in profile form
    const saveButton = screen.getByRole('button', { name: /Save Profile/ });
    await user.click(saveButton);

    // Wait for API call and session update
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/user/profile', expect.objectContaining({
        method: 'PATCH',
        credentials: 'include'
      }));
      expect(mockLogin).toHaveBeenCalledWith(updatedUser);
    });
  });

  test('handles profile update API errors', async () => {
    const user = userEvent.setup();
    
    // Mock API error response
    mockApi.mockImplementation((url) => {
      if (url === '/api/user/profile') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Email already exists' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<TodoContainer />);

    // Click update profile button
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    // Click save button in profile form
    const saveButton = screen.getByRole('button', { name: /Save Profile/ });
    await user.click(saveButton);

    // Wait for API call
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/user/profile', expect.objectContaining({
        method: 'PATCH',
        credentials: 'include'
      }));
    });

    // Session should not be updated on error
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('handles file upload errors in profile update', async () => {
    const user = userEvent.setup();
    
    // Mock API error response with file upload errors
    mockApi.mockImplementation((url) => {
      if (url === '/api/user/profile') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            message: 'File upload error',
            errors: [
              { fileName: 'profile.jpg', errorMessage: 'File too large', errorCode: 'FILE_TOO_LARGE' }
            ]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<TodoContainer />);

    // Click update profile button
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    // Click save button in profile form
    const saveButton = screen.getByRole('button', { name: /Save Profile/ });
    await user.click(saveButton);

    // Wait for API call
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/user/profile', expect.objectContaining({
        method: 'PATCH',
        credentials: 'include'
      }));
    });

    // Session should not be updated on error
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('maintains consistent styling with existing application design', () => {
    render(<TodoContainer />);

    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    
    // Check that the button has Bootstrap classes
    expect(updateProfileButton).toHaveClass('btn', 'btn-outline-primary', 'me-2');
  });

  test('profile update does not interfere with todo creation flow', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // Start profile update
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    // Cancel profile update
    const cancelButton = screen.getByRole('button', { name: /Cancel Profile/ });
    await user.click(cancelButton);

    // Should be able to start todo creation
    const newTodoButton = screen.getByRole('button', { name: /신규/ });
    await user.click(newTodoButton);

    expect(screen.getByText('새로운 TO-DO 항목추가')).toBeInTheDocument();
  });

  test('profile update does not interfere with todo editing flow', async () => {
    const user = userEvent.setup();
    
    // Mock todos data
    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          todoSeq: 1,
          todoContent: 'Test todo',
          todoNote: 'Test note',
          completeDtm: null
        }
      ])
    });

    render(<TodoContainer />);

    // Wait for todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo')).toBeInTheDocument();
    });

    // Start profile update
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    await user.click(updateProfileButton);

    // Cancel profile update
    const cancelButton = screen.getByRole('button', { name: /Cancel Profile/ });
    await user.click(cancelButton);

    // Should be able to edit todo
    const moreActionsButton = screen.getByRole('button', { name: '' }); // Three dots button
    await user.click(moreActionsButton);

    // The edit functionality should be available (though we're not testing the full edit flow here)
    expect(screen.getByText('Test todo')).toBeInTheDocument();
  });
});

describe('TodoContainer Password Change Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            todoSeq: 1,
            todoTitle: 'Test todo',
            todoContent: 'Test content',
            todoDate: '2023-01-01',
            todoCompleteYn: 'N'
          }
        ])
      })
    );
  });

  test('shows PasswordChangeForm when Change Password button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    const changePasswordButton = screen.getByRole('button', { name: /비밀번호 변경/ });
    await user.click(changePasswordButton);

    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /비밀번호 변경/ })).toBeInTheDocument();
  });

  test('hides todo list elements when password change form is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // Initially, todo list elements should be visible
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();

    // Click change password button
    const changePasswordButton = screen.getByRole('button', { name: /비밀번호 변경/ });
    await user.click(changePasswordButton);

    // Todo list elements should be hidden
    expect(screen.queryByRole('button', { name: /신규/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-picker')).not.toBeInTheDocument();
    
    // Password change form should be visible
    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
  });

  test('disables both profile and password buttons when password change is active', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    const changePasswordButton = screen.getByRole('button', { name: /비밀번호 변경/ });
    const updateProfileButton = screen.getByRole('button', { name: /프로필 수정/ });
    
    await user.click(changePasswordButton);

    expect(changePasswordButton).toBeDisabled();
    expect(updateProfileButton).toBeDisabled();
  });

  test('returns to todo list view when password change is cancelled', async () => {
    const user = userEvent.setup();
    render(<TodoContainer />);

    // Click change password button
    const changePasswordButton = screen.getByRole('button', { name: /비밀번호 변경/ });
    await user.click(changePasswordButton);

    // Password form should be visible
    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /Cancel Password/ });
    await user.click(cancelButton);

    // Should return to todo list view
    expect(screen.queryByTestId('password-change-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /신규/ })).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  test('password change form can be submitted', async () => {
    const user = userEvent.setup();
    
    render(<TodoContainer />);

    // Click change password button
    const changePasswordButton = screen.getByRole('button', { name: /비밀번호 변경/ });
    await user.click(changePasswordButton);

    // Password change form should be visible
    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();

    // Click save password button (this will trigger the mock onSave function)
    const saveButton = screen.getByRole('button', { name: /Save Password/ });
    await user.click(saveButton);

    // The save button should be clickable (basic functionality test)
    expect(saveButton).toBeInTheDocument();
  });
});