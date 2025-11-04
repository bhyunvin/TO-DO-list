# Implementation Plan

- [x] 1. Enhance backend AssistanceService with function calling
  - Modify AssistanceService to support Gemini function calling with getTodos tool
  - Add TodoService injection and implement getTodos method for AI queries
  - Update system prompt handling and error management for function calls
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.4_

- [x] 1.1 Update AssistanceService for function calling
  - Add TodoService dependency injection to AssistanceService constructor
  - Implement getTodos tool definition with proper parameters (status, days)
  - Modify getGeminiResponse method to handle function calling workflow
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 1.2 Add TodoService getTodos method for AI queries
  - Create getTodos method in TodoService that accepts status and days parameters
  - Implement flexible todo querying logic for different status filters (completed, incomplete, overdue)
  - Return structured todo data suitable for AI context processing
  - _Requirements: 3.2, 3.4_

- [ ]* 1.3 Write unit tests for enhanced AssistanceService
  - Test function calling workflow with mock TodoService
  - Test error handling for failed function calls
  - Test system prompt loading and fallback behavior
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Create chat API endpoint and DTOs
  - Create ChatController with POST /api/assistance/chat endpoint
  - Implement ChatRequestDto and ChatResponseDto for API communication
  - Add session authentication guard and user context handling
  - _Requirements: 2.1, 2.2, 4.4_

- [x] 2.1 Create chat DTOs and interfaces
  - Define ChatRequestDto with prompt validation
  - Define ChatResponseDto with response, timestamp, and error fields
  - Create TodoSummaryDto for structured AI responses
  - _Requirements: 2.1, 2.2_

- [x] 2.2 Implement ChatController
  - Create ChatController with proper dependency injection
  - Implement POST /api/assistance/chat endpoint with authentication
  - Add request validation and error handling middleware
  - _Requirements: 2.1, 2.2, 4.4_

- [ ]* 2.3 Write integration tests for chat API
  - Test authenticated chat requests with valid prompts
  - Test error responses for invalid requests and authentication failures
  - Test function calling integration through API endpoint
  - _Requirements: 2.1, 2.2, 4.4_

- [x] 3. Create frontend chat components
  - Build FloatingActionButton component with proper positioning and icons
  - Create ChatModal component with message display and input handling
  - Implement ChatMessage component for user and AI message rendering
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 2.4, 5.1, 5.2_

- [x] 3.1 Create FloatingActionButton component
  - Build fixed-position button component with chat/close icon states
  - Implement proper z-index and responsive positioning
  - Add click handler and accessibility attributes
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3.2 Build ChatModal component
  - Create modal overlay with proper backdrop and positioning
  - Implement message thread display with auto-scrolling
  - Add input field with send button and Enter key handling
  - _Requirements: 2.3, 2.4, 5.1, 5.2, 5.3, 5.4_

- [x] 3.3 Implement ChatMessage component
  - Create message component with user/AI styling differentiation
  - Add HTML rendering support for AI responses with sanitization
  - Implement timestamp display and message wrapping
  - _Requirements: 2.5, 5.1, 5.2, 5.5_

- [ ]* 3.4 Write component unit tests
  - Test FloatingActionButton click handling and icon states
  - Test ChatModal message display and input functionality
  - Test ChatMessage rendering for both user and AI messages
  - Test Zustand store actions and persistence behavior
  - _Requirements: 1.1, 1.2, 2.3, 2.4, 5.1, 5.2, 5.4_

- [x] 4. Integrate chat interface with TodoContainer
  - Add chat state management to TodoContainer component
  - Integrate FloatingActionButton and ChatModal into existing layout
  - Implement API communication with error handling and loading states
  - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.4, 5.4_

- [x] 4.1 Create Zustand chat store with persistence
  - Create chatStore.js using Zustand with persist middleware
  - Configure sessionStorage for message history persistence
  - Implement actions for adding messages, loading states, and error handling
  - _Requirements: 5.1, 5.4_

- [x] 4.2 Add chat state to TodoContainer
  - Add isChatOpen state and chat-related state management
  - Integrate Zustand chat store into TodoContainer component
  - Implement chat toggle handlers and modal control logic
  - _Requirements: 1.1, 1.4, 5.4_

- [x] 4.3 Implement chat API integration
  - Create API service function for chat requests with proper error handling
  - Integrate with Zustand store for state management during API calls
  - Implement message sending and response handling logic using store actions
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4.4 Add accessibility and keyboard support
  - Implement proper focus management for modal open/close
  - Add keyboard navigation support (Tab, Enter, Escape)
  - Include ARIA labels and screen reader support
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ]* 4.5 Write integration tests for chat functionality
  - Test complete chat flow from button click to response display
  - Test Zustand store persistence and state management
  - Test error handling, loading states, and accessibility features
  - _Requirements: 1.1, 2.1, 2.2, 5.4, 6.2, 6.3, 6.4_

- [x] 5. Add responsive design and styling
  - Create CSS styles for chat components with mobile responsiveness
  - Implement proper z-index layering and modal backdrop
  - Add loading indicators and error message styling
  - _Requirements: 1.1, 1.3, 2.4, 6.1_

- [x] 5.1 Style FloatingActionButton and ChatModal
  - Create responsive CSS for floating button positioning
  - Style chat modal with proper dimensions and responsive behavior
  - Add smooth transitions and hover effects
  - _Requirements: 1.1, 1.3, 6.1_

- [x] 5.2 Style chat messages and input
  - Create distinct styling for user vs AI messages
  - Style input field with send button and loading states
  - Add proper spacing and typography for message readability
  - _Requirements: 2.4, 5.1, 5.2, 5.5_

- [x] 5.3 Test responsive design across devices
  - Test chat interface on mobile and desktop screen sizes
  - Verify touch interactions and button sizing on mobile
  - Test modal behavior and scrolling on different devices
  - _Requirements: 6.1_

- [x] 6. Implement error handling and user feedback
  - Add comprehensive error handling for API failures and network issues
  - Implement user-friendly Korean error messages
  - Add loading indicators and request throttling
  - _Requirements: 2.4, 4.4, 4.5_

- [x] 6.1 Add frontend error handling
  - Implement error state management and display
  - Add Korean error messages for different failure scenarios
  - Create error recovery mechanisms and retry functionality
  - _Requirements: 2.4, 4.5_

- [x] 6.2 Add loading states and feedback
  - Implement loading indicators during API requests
  - Add typing indicators and message sending feedback
  - Prevent multiple simultaneous requests with proper state management
  - _Requirements: 2.4_

- [ ]* 6.3 Test error scenarios and edge cases
  - Test network failure handling and error message display
  - Test API timeout scenarios and recovery mechanisms
  - Test edge cases like empty responses and malformed data
  - _Requirements: 2.4, 4.4, 4.5_