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
    
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('프로필 수정');
    expect(buttons[1]).toHaveTextContent('로그아웃');
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