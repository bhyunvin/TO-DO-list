# Implementation Plan

- [x] 1. Implement date-aware AI context
  - Add current KST date calculation and injection into system prompt for every Gemini API request
  - Update system prompt file with date awareness instructions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Add KST date calculation utility
  - Create getCurrentKSTDate() helper function that returns YYYY-MM-DD format
  - Calculate KST time by adding 9 hours offset to UTC
  - Add function to AssistanceService class
  - _Requirements: 1.1, 1.4_

- [x] 1.2 Inject current date into system prompt
  - Modify getGeminiResponse() to call getCurrentKSTDate()
  - Append [CURRENT_DATE] section to system prompt with current date
  - Include instructions for AI to use this date for relative date calculations
  - _Requirements: 1.2, 1.3, 1.5_

- [x] 1.3 Update system prompt file with date awareness rules
  - Add [DATE_AWARENESS] section to assistance.systemPrompt.txt
  - Include instructions for handling "오늘", "내일", ambiguous dates
  - Add guidance for resolving dates without years
  - _Requirements: 1.2, 1.3, 1.5_

- [ ]* 1.4 Test date awareness functionality
  - Test getCurrentKSTDate() returns correct format
  - Test date context injection into prompt
  - Test AI correctly interprets "today", "tomorrow", "November 14th"
  - Test ambiguous date resolution with current year
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement content-based todo updates
  - Create findTodoByContent() method for searching todos by title
  - Enhance updateTodo() to support both ID-based and content-based updates
  - Update updateTodo tool definition to include todoContentToFind parameter
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1 Create findTodoByContent() method
  - Implement case-insensitive content search using user's todos
  - Return success with todoSeq for single match
  - Return error with match count for multiple matches
  - Return error for no matches
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.2 Enhance updateTodo() method for content-based search
  - Add todoContentToFind optional parameter
  - Call findTodoByContent() when todoSeq not provided
  - Use found todoSeq for update operation
  - Return appropriate errors for search failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.3 Update updateTodo tool definition
  - Add todoContentToFind parameter to tool definition
  - Replace completeDtm parameter with isCompleted boolean parameter
  - Update description to explain both ID and content-based updates
  - Ensure todoSeq and todoContentToFind are both optional but one is required
  - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 2.4 Update system prompt with content-based update instructions
  - Add [CONTENT_BASED_UPDATES] section to assistance.systemPrompt.txt
  - Include guidance for using todoContentToFind parameter
  - Add instructions for handling multiple matches
  - _Requirements: 2.2, 2.3_

- [ ]* 2.5 Test content-based update functionality
  - Test exact content match finds correct todo
  - Test partial match (case-insensitive)
  - Test multiple matches returns error with count
  - Test no matches returns appropriate error
  - Test special characters in search query
  - Test end-to-end: "update 'Buy Milk' task"
  - Test isCompleted: true sets completeDtm to current timestamp
  - Test isCompleted: false sets completeDtm to NULL
  - Test isCompleted: undefined leaves completeDtm unchanged
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 3. Implement proactive list refresh after write operations
  - Enhance createTodo() to automatically fetch and return refreshed todo list
  - Enhance updateTodo() to automatically fetch and return refreshed todo list
  - Update system prompt to instruct AI to display refreshed lists
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 Add auto-refresh to createTodo() method
  - Call getTodos() after successful todo creation
  - Include refreshedList in return object
  - Use ±7 days range for refreshed list
  - _Requirements: 3.1, 3.5_

- [x] 3.2 Add auto-refresh to updateTodo() method
  - Call getTodos() after successful todo update
  - Include refreshedList in return object
  - Use ±7 days range for refreshed list
  - _Requirements: 3.2, 3.5_

- [x] 3.3 Update system prompt with proactive refresh instructions
  - Add [PROACTIVE_REFRESH] section to assistance.systemPrompt.txt
  - Instruct AI to display refreshedList using [FORMATTING_RULES]
  - Provide example response format with confirmation + list
  - _Requirements: 3.3, 3.4_

- [ ]* 3.4 Test proactive refresh functionality
  - Test createTodo returns refreshedList
  - Test updateTodo returns refreshedList
  - Test refreshedList contains relevant todos (±7 days)
  - Test refreshedList format matches getTodos format
  - Test end-to-end: create task → see confirmation + list
  - Test end-to-end: complete task → see confirmation + list
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Verify and enforce session-based security
  - Audit all function methods to ensure userSeq comes from session
  - Verify tool definitions do not include userSeq parameters
  - Ensure TodoService methods filter by userSeq
  - Add ownership verification to update operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 4.1 Audit getGeminiResponse() for session userSeq usage
  - Verify userSeq parameter comes from ChatController session
  - Verify userSeq is passed to all function calls (getTodos, createTodo, updateTodo)
  - Ensure no code path allows AI to specify userSeq
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4.2 Verify tool definitions exclude userSeq
  - Review getTodosTool definition - ensure no userSeq parameter
  - Review createTodoTool definition - ensure no userSeq parameter
  - Review updateTodoTool definition - ensure no userSeq parameter
  - _Requirements: 4.7_

- [x] 4.3 Verify TodoService methods filter by userSeq
  - Review TodoService.findAll() - ensure userSeq filter
  - Review TodoService.create() - ensure userSeq is set from session user
  - Review TodoService.update() - ensure ownership verification
  - Add explicit ownership check if not present
  - _Requirements: 4.5, 4.6_

- [ ]* 4.4 Test security enforcement
  - Test userSeq is always from session, never from AI
  - Test tool definitions have no userSeq parameters
  - Test TodoService methods filter by userSeq
  - Test update operations verify ownership
  - Test cross-user access attempts are blocked
  - Test unauthorized access returns 404 (not 403)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5. Fix database audit column population
  - Ensure reg_id, upd_id, and upd_ip are correctly populated on create and update operations
  - Pass userId from ChatController through AssistanceService to TodoService
  - Update setAuditColumn utility to initialize upd_* columns on creation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13_

- [x] 5.1 Pass userId from ChatController to AssistanceService
  - Update ChatController.chat() to pass session.user.userId to getGeminiResponse()
  - Add userId parameter to getGeminiResponse() method signature
  - _Requirements: 5.1_

- [x] 5.2 Pass userId from AssistanceService to createTodo
  - Add userId parameter to createTodo() method signature
  - Update createTodo function call in getGeminiResponse() to pass userId
  - Update user object construction in createTodo() to use actual userId
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 5.3 Pass userId from AssistanceService to updateTodo
  - Add userId parameter to updateTodo() method signature
  - Update updateTodo function call in getGeminiResponse() to pass userId
  - Update user object construction in updateTodo() to use actual userId
  - _Requirements: 5.2, 5.9, 5.10, 5.11_

- [x] 5.4 Fix setAuditColumn to initialize upd_* columns on creation
  - Update setAuditColumn() function in auditColumns.ts
  - On create operations (isUpdate=false), set both reg_* and upd_* columns
  - On update operations (isUpdate=true), only set upd_* columns
  - _Requirements: 5.12, 5.13_

- [x] 6. Implement frontend auto-refresh after AI operations
  - Add refresh trigger to Zustand chatStore
  - Update TodoContainer to listen for refresh events
  - Trigger refresh on successful AI chat responses
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 6.1 Add refresh trigger to chatStore
  - Add todoRefreshTrigger state (counter) to chatStore
  - Add triggerTodoRefresh() action to increment the counter
  - _Requirements: 6.1, 6.4_

- [x] 6.2 Update TodoContainer to listen for refresh events
  - Import todoRefreshTrigger and triggerTodoRefresh from chatStore
  - Add useEffect to watch todoRefreshTrigger changes
  - Call fetchTodos() when trigger changes
  - _Requirements: 6.2, 6.3, 6.6_

- [x] 6.3 Trigger refresh on successful AI responses
  - Update handleSendMessage to call triggerTodoRefresh() on success
  - Ensure refresh happens for all successful AI responses
  - _Requirements: 6.1, 6.5, 6.7_

- [x] 7. Integration testing and validation
  - Test all six enhancements working together
  - Verify no regressions in existing AI assistant functionality
  - Test error handling and edge cases
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.7, 5.1-5.13, 6.1-6.7_

- [ ]* 7.1 End-to-end integration tests
  - Test: "create task for tomorrow" → correct date + refreshed list in chat AND main UI
  - Test: "update 'Buy Milk' and mark complete" → content search + update + list + main UI refresh
  - Test: "show me overdue tasks" → date-aware query
  - Test: ambiguous content match → AI asks for clarification
  - Test: multiple write operations in sequence → main UI refreshes each time
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 6.1-6.7_

- [ ]* 7.2 Frontend auto-refresh tests
  - Test: AI creates todo → main todo list automatically refreshes
  - Test: AI updates todo → main todo list automatically refreshes
  - Test: AI completes todo → main todo list automatically refreshes
  - Test: refresh preserves selected date
  - Test: refresh works with different date selections
  - _Requirements: 6.1-6.7_

- [ ]* 7.3 Audit column verification tests
  - Test: create todo → verify reg_id, reg_ip, reg_dtm, upd_id, upd_ip, upd_dtm are all populated
  - Test: update todo → verify upd_id, upd_ip, upd_dtm are updated, reg_* unchanged
  - Test: audit columns contain correct userId from session
  - _Requirements: 5.1-5.13_

- [ ]* 7.4 Error handling and edge case tests
  - Test: invalid date formats
  - Test: content search with special characters
  - Test: empty todo list refresh
  - Test: session expiration during operation
  - Test: concurrent write operations
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.7_

- [ ]* 7.5 Regression testing
  - Test: existing ID-based updates still work
  - Test: existing getTodos functionality unchanged
  - Test: AI still refuses non-todo requests
  - Test: formatting rules still applied correctly
  - Test: error messages still in Korean
  - Test: manual todo create/update still works
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.7, 5.1-5.13, 6.1-6.7_


- [x] 8. Implement automatic welcome message for new chat sessions
  - Add welcome message injection when chat session initializes
  - Display predefined Korean guidance message with usage examples
  - Ensure message persists in chat history
  - Suppress message if chat already contains messages
  - _New Feature: User Onboarding Enhancement_

- [x] 8.1 Add welcome message action to chatStore
  - Create addWelcomeMessage() function in chatStore
  - Check if messages array is empty before injection
  - Format welcome content as HTML with proper structure
  - Include usage examples for adding, viewing, and updating todos
  - _Implementation: client/src/stores/chatStore.js_

- [x] 8.2 Integrate welcome message with chat modal
  - Update handleChatToggle() to call addWelcomeMessage() on open
  - Add addWelcomeMessage to useChatStore destructuring
  - Ensure welcome message only appears when messages.length === 0
  - _Implementation: client/src/todoList/TodoList.js_

- [x] 8.3 Remove old static welcome placeholder
  - Remove conditional rendering of old welcome message
  - Simplify ChatModal to always render messages from store
  - Ensure proper HTML rendering via ChatMessage component
  - _Implementation: client/src/components/ChatModal.js_

- [x] 8.4 Handle welcome message on clear messages
  - Update clearMessages() to re-inject welcome message after clearing
  - Ensure users always see guidance when starting fresh
  - Maintain consistency with initial chat open behavior
  - _Implementation: client/src/stores/chatStore.js_

- [ ]* 8.5 Test welcome message functionality
  - Test: new user login → welcome message appears on first chat open
  - Test: clear chat → welcome message reappears
  - Test: existing chat → welcome message does not duplicate
  - Test: page refresh → welcome message persists in sessionStorage
  - Test: logout/login → new welcome message on first chat open
  - Test: HTML rendering → proper formatting with emojis and lists
  - _Verification: Manual testing and user acceptance_
  