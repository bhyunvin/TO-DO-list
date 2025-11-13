/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoContainer from './TodoList';

// Mock SweetAlert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true }))
}));

// Mock auth store
const mockApi = jest.fn();
jest.mock('../authStore/authStore', () => ({
  useAuthStore: () => ({
    user: {
      userName: 'Test User',
      userEmail: 'test@example.com',
      userDescription: 'Test description'
    },
    login: jest.fn(),
    logout: jest.fn(),
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
  return function MockProfileUpdateForm({ onCancel }) {
    return <div data-testid="profile-update-form"><button onClick={onCancel}>Cancel</button></div>;
  };
});

jest.mock('../components/PasswordChangeForm', () => {
  return function MockPasswordChangeForm({ onCancel }) {
    return <div data-testid="password-change-form"><button onClick={onCancel}>Cancel</button></div>;
  };
});

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

describe('TodoContainer Checkbox Cell Click Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const Swal = require('sweetalert2');
    Swal.fire.mockResolvedValue({ isConfirmed: true });
    
    // Mock initial todos fetch
    mockApi.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          todoSeq: 1,
          todoContent: 'Test todo 1',
          todoNote: 'Note 1',
          completeDtm: null,
          todoDate: '2024-01-01'
        }
      ])
    });
  });

  test('clicking the checkbox cell toggles the todo completion', async () => {
    const user = userEvent.setup();
    
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

    render(<TodoContainer />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');
    
    expect(checkbox).not.toBeChecked();
    expect(checkboxCell).toHaveClass('checkbox-cell');

    // Click the cell (not the checkbox)
    await user.click(checkboxCell);

    // Checkbox should be checked
    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    // API should have been called
    expect(mockApi).toHaveBeenCalledWith(
      '/api/todo/1',
      expect.objectContaining({
        method: 'PATCH'
      })
    );
  });

  test('checkbox cell has pointer cursor when not disabled', async () => {
    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // Cell should have pointer cursor
    expect(checkboxCell).toHaveStyle({ cursor: 'pointer' });
  });

  test('checkbox cell has not-allowed cursor when disabled', async () => {
    const user = userEvent.setup();
    
    // Mock slow API response
    let resolveApiCall;
    const apiPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });
    
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockReturnValueOnce(apiPromise);

    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // Click the cell
    await user.click(checkboxCell);

    // Cell should have not-allowed cursor during pending request
    expect(checkboxCell).toHaveStyle({ cursor: 'not-allowed' });

    // Resolve API call
    resolveApiCall({
      ok: true,
      json: () => Promise.resolve({})
    });

    // Cell should have pointer cursor again
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
    
    // Mock slow API response
    let resolveApiCall;
    const apiPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });
    
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockReturnValueOnce(apiPromise);

    render(<TodoContainer />);

    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // Click the cell first time
    await user.click(checkboxCell);

    // Try to click again while request is pending
    await user.click(checkboxCell);
    await user.click(checkboxCell);

    // API should only be called once (initial fetch + one toggle)
    expect(mockApi).toHaveBeenCalledTimes(2);

    // Resolve API call
    resolveApiCall({
      ok: true,
      json: () => Promise.resolve({})
    });
  });
});
