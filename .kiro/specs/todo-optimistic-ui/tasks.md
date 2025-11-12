# Implementation Plan

- [x] 1. Add optimistic update state management to TodoContainer
  - Add `optimisticUpdates` state using Map to track pending updates
  - Initialize state with `useState(new Map())`
  - _Requirements: 1.1, 1.5, 4.2_

- [x] 2. Create helper functions for state management
  - [x] 2.1 Implement `updateTodoOptimistically` function
    - Write function to immutably update a specific todo's completeDtm in the todos array
    - Use functional setState with map to find and update the target todo
    - _Requirements: 1.2, 1.3_
  
  - [x] 2.2 Implement `rollbackTodoUpdate` function
    - Write function to revert a todo's completeDtm to its original value
    - Use functional setState with map to find and restore the target todo
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 2.3 Implement `getErrorMessage` function
    - Write function to generate user-friendly error messages based on error type
    - Handle AbortError, TypeError (network), and HTTP status codes
    - Return appropriate Korean error messages for each error type
    - _Requirements: 2.4, 3.1, 3.2, 3.3_

- [x] 3. Refactor handleToggleComplete to use optimistic UI pattern
  - [x] 3.1 Add duplicate request prevention logic
    - Check if request is already in progress for the same todoSeq
    - Return early if optimisticUpdates Map contains the todoSeq
    - _Requirements: 1.5, 4.5_
  
  - [x] 3.2 Implement optimistic state update
    - Find and store the original todo item from todos array
    - Calculate new completeDtm value (null if completing, ISO string if un-completing)
    - Call updateTodoOptimistically to immediately update UI
    - Add entry to optimisticUpdates Map with original and new values
    - Set togglingTodoSeq to disable the checkbox
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 3.3 Implement background API call with timeout
    - Create AbortController for 30-second timeout
    - Send PATCH request to /api/todo/:id with completeDtm in body
    - Use try-catch block for error handling
    - Clear timeout on response
    - _Requirements: 1.4, 3.1_
  
  - [x] 3.4 Implement success handler
    - Remove entry from optimisticUpdates Map
    - Clear togglingTodoSeq state
    - Log success to console with todoSeq and timestamp
    - Do not fetch todos (UI already correct)
    - _Requirements: 2.5, 4.4_
  
  - [x] 3.5 Implement failure handler with rollback
    - Call rollbackTodoUpdate with original completeDtm
    - Remove entry from optimisticUpdates Map
    - Clear togglingTodoSeq state
    - Get appropriate error message using getErrorMessage
    - Display SweetAlert2 toast notification with error message
    - Log error details to console including todoSeq, error message, and states
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 4. Update error notification to use toast style
  - Replace existing Swal.fire error alerts with toast notifications
  - Configure toast to appear in top-end position
  - Set timer to 4000ms with progress bar
  - Use 'error' icon for failed operations
  - _Requirements: 2.4_

- [x] 5. Verify independent handling of multiple todo toggles
  - Ensure optimisticUpdates Map correctly tracks multiple pending requests
  - Verify each todo's state is updated and rolled back independently
  - Confirm togglingTodoSeq only prevents duplicate clicks on the same item
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Add console logging for debugging
  - Log optimistic update application with todoSeq and new state
  - Log successful API responses with todoSeq
  - Log rollback events with todoSeq, error, and original state
  - Include timestamps in all log messages
  - _Requirements: 3.4_
