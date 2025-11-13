/* eslint-disable testing-library/no-wait-for-multiple-assertions */
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

describe('TodoContainer Optimistic UI Pattern', () => {
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
        },
        {
          todoSeq: 2,
          todoContent: 'Test todo 2',
          todoNote: 'Note 2',
          completeDtm: '2024-01-01T10:00:00.000Z',
          todoDate: '2024-01-01'
        }
      ])
    });
  });

  test('checkbox updates immediately when clicked (optimistic update)', async () => {
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

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox).not.toBeChecked();

    // Click checkbox cell (not the checkbox itself, as it has pointer-events: none)
    const checkboxCell = checkbox.closest('td');
    await user.click(checkboxCell);

    // Checkbox should be checked immediately (optimistic update)
    expect(checkbox).toBeChecked();

    // API call should be in progress
    expect(mockApi).toHaveBeenCalledWith(
      '/api/todo/1',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('completeDtm')
      })
    );

    // Resolve API call
    resolveApiCall({
      ok: true,
      json: () => Promise.resolve({})
    });

    // Checkbox should remain checked after API success
    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
  });

  test('checkbox reverts to original state on API failure (rollback)', async () => {
    const user = userEvent.setup();
    
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({})
      });

    render(<TodoContainer />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    // Get fresh reference to checkbox
    let checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox).not.toBeChecked();

    // Click checkbox cell
    const checkboxCell = checkbox.closest('td');
    await user.click(checkboxCell);

    // Wait for API failure and rollback - checkbox should end up unchecked
    await waitFor(() => {
      checkbox = screen.getAllByRole('checkbox')[0];
      expect(checkbox).not.toBeChecked();
      expect(checkbox).not.toBeDisabled();
    }, { timeout: 2000 });

    // Error toast should be displayed
    await waitFor(() => {
      const Swal = require('sweetalert2');
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          toast: true,
          icon: 'error',
          position: 'top-end'
        })
      );
    });
  });

  test('prevents duplicate clicks on same todo while request is pending', async () => {
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

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // Click checkbox cell first time
    await user.click(checkboxCell);

    // Try to click again immediately
    await user.click(checkboxCell);
    await user.click(checkboxCell);

    // API should only be called once
    expect(mockApi).toHaveBeenCalledTimes(2); // 1 for initial fetch, 1 for toggle

    // Resolve API call
    resolveApiCall({
      ok: true,
      json: () => Promise.resolve({})
    });
  });

  test('allows toggling different todos independently', async () => {
    const user = userEvent.setup();
    
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' },
          { todoSeq: 2, todoContent: 'Test todo 2', todoNote: 'Note 2', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

    render(<TodoContainer />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
      expect(screen.getByText('Test todo 2')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const checkboxCell1 = checkboxes[0].closest('td');
    const checkboxCell2 = checkboxes[1].closest('td');

    // Click both checkbox cells rapidly
    await user.click(checkboxCell1);
    await user.click(checkboxCell2);

    // Both should be checked immediately
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();

    // Both API calls should be made
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/todo/1', expect.anything());
      expect(mockApi).toHaveBeenCalledWith('/api/todo/2', expect.anything());
    });
  });

  test('displays toast notification on network error', async () => {
    const user = userEvent.setup();
    
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(<TodoContainer />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // Click checkbox cell
    await user.click(checkboxCell);

    // Wait for error toast
    await waitFor(() => {
      const Swal = require('sweetalert2');
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          toast: true,
          icon: 'error',
          title: expect.stringContaining('네트워크'),
          timer: 4000,
          timerProgressBar: true
        })
      );
    });

    // Checkbox should be rolled back
    expect(checkbox).not.toBeChecked();
  });

  test('handles timeout error with AbortController', async () => {
    const user = userEvent.setup();
    
    // Mock API that never resolves (simulating timeout)
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          // Simulate abort after timeout
          setTimeout(() => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          }, 100);
        });
      });

    render(<TodoContainer />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // Click checkbox cell
    await user.click(checkboxCell);

    // Wait for timeout error
    await waitFor(() => {
      const Swal = require('sweetalert2');
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          toast: true,
          icon: 'error',
          title: expect.stringContaining('시간이 초과')
        })
      );
    }, { timeout: 3000 });

    // Checkbox should be rolled back
    expect(checkbox).not.toBeChecked();
  });

  test('maintains correct state when multiple todos fail independently', async () => {
    const user = userEvent.setup();
    
    mockApi
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { todoSeq: 1, todoContent: 'Test todo 1', todoNote: 'Note 1', completeDtm: null, todoDate: '2024-01-01' },
          { todoSeq: 2, todoContent: 'Test todo 2', todoNote: 'Note 2', completeDtm: null, todoDate: '2024-01-01' }
        ])
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // Todo 1 succeeds
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) }); // Todo 2 fails

    render(<TodoContainer />);

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
      expect(screen.getByText('Test todo 2')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const checkboxCell1 = checkboxes[0].closest('td');
    const checkboxCell2 = checkboxes[1].closest('td');

    // Click both checkbox cells
    await user.click(checkboxCell1);
    await user.click(checkboxCell2);

    // Wait for API calls to complete
    await waitFor(() => {
      // Todo 1 should remain checked (success)
      expect(checkboxes[0]).toBeChecked();
      // Todo 2 should be unchecked (rollback)
      expect(checkboxes[1]).not.toBeChecked();
    });
  });

  test('checkbox is disabled during pending request', async () => {
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

    // Wait for initial todos to load
    await waitFor(() => {
      expect(screen.getByText('Test todo 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    const checkboxCell = checkbox.closest('td');

    // Click checkbox cell
    await user.click(checkboxCell);

    // Checkbox should be disabled during request
    expect(checkbox).toBeDisabled();

    // Resolve API call
    resolveApiCall({
      ok: true,
      json: () => Promise.resolve({})
    });

    // Checkbox should be enabled again
    await waitFor(() => {
      expect(checkbox).not.toBeDisabled();
    });
  });
});
