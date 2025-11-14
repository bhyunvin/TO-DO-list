# Implementation Plan

- [ ] 1. Implement date-aware AI context
  - Add current KST date calculation and injection into system prompt for every Gemini API request
  - Update system prompt file with date awareness instructions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.1 Add KST date calculation utility
  - Create getCurrentKSTDate() helper function that returns YYYY-MM-DD format
  - Calculate KST time by adding 9 hours offset to UTC
  - Add function to AssistanceService class
  - _Requirements: 1.1, 1.4_

- [ ] 1.2 Inject current date into system prompt
  - Modify getGeminiResponse() to call getCurrentKSTDate()
  - Append [CURRENT_DATE] section to system prompt with current date
  - Include instructions for AI to use this date for relative date calculations
  - _Requirements: 1.2, 1.3, 1.5_

- [ ] 1.3 Update system prompt file with date awareness rules
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

- [ ] 2. Implement content-based todo updates
  - Create findTodoByContent() method for searching todos by title
  - Enhance updateTodo() to support both ID-based and content-based updates
  - Update updateTodo tool definition to include todoContentToFind parameter
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 Create findTodoByContent() method
  - Implement case-insensitive content search using user's todos
  - Return success with todoSeq for single match
  - Return error with match count for multiple matches
  - Return error for no matches
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2.2 Enhance updateTodo() method for content-based search
  - Add todoContentToFind optional parameter
  - Call findTodoByContent() when todoSeq not provided
  - Use found todoSeq for update operation
  - Return appropriate errors for search failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.3 Update updateTodo tool definition
  - Add todoContentToFind parameter to tool definition
  - Replace completeDtm parameter with isCompleted boolean parameter
  - Update description to explain both ID and content-based updates
  - Ensure todoSeq and todoContentToFind are both optional but one is required
  - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 2.9_

- [ ] 2.4 Update system prompt with content-based update instructions
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

- [ ] 3. Implement proactive list refresh after write operations
  - Enhance createTodo() to automatically fetch and return refreshed todo list
  - Enhance updateTodo() to automatically fetch and return refreshed todo list
  - Update system prompt to instruct AI to display refreshed lists
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.1 Add auto-refresh to createTodo() method
  - Call getTodos() after successful todo creation
  - Include refreshedList in return object
  - Use ±7 days range for refreshed list
  - _Requirements: 3.1, 3.5_

- [ ] 3.2 Add auto-refresh to updateTodo() method
  - Call getTodos() after successful todo update
  - Include refreshedList in return object
  - Use ±7 days range for refreshed list
  - _Requirements: 3.2, 3.5_

- [ ] 3.3 Update system prompt with proactive refresh instructions
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

- [ ] 4. Verify and enforce session-based security
  - Audit all function methods to ensure userSeq comes from session
  - Verify tool definitions do not include userSeq parameters
  - Ensure TodoService methods filter by userSeq
  - Add ownership verification to update operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 4.1 Audit getGeminiResponse() for session userSeq usage
  - Verify userSeq parameter comes from ChatController session
  - Verify userSeq is passed to all function calls (getTodos, createTodo, updateTodo)
  - Ensure no code path allows AI to specify userSeq
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.2 Verify tool definitions exclude userSeq
  - Review getTodosTool definition - ensure no userSeq parameter
  - Review createTodoTool definition - ensure no userSeq parameter
  - Review updateTodoTool definition - ensure no userSeq parameter
  - _Requirements: 4.7_

- [ ] 4.3 Verify TodoService methods filter by userSeq
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

- [ ] 5. Integration testing and validation
  - Test all four enhancements working together
  - Verify no regressions in existing AI assistant functionality
  - Test error handling and edge cases
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.7_

- [ ]* 5.1 End-to-end integration tests
  - Test: "create task for tomorrow" → correct date + refreshed list
  - Test: "update 'Buy Milk' and mark complete" → content search + update + list
  - Test: "show me overdue tasks" → date-aware query
  - Test: ambiguous content match → AI asks for clarification
  - Test: multiple write operations in sequence
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5_

- [ ]* 5.2 Error handling and edge case tests
  - Test: invalid date formats
  - Test: content search with special characters
  - Test: empty todo list refresh
  - Test: session expiration during operation
  - Test: concurrent write operations
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.7_

- [ ]* 5.3 Regression testing
  - Test: existing ID-based updates still work
  - Test: existing getTodos functionality unchanged
  - Test: AI still refuses non-todo requests
  - Test: formatting rules still applied correctly
  - Test: error messages still in Korean
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.7_
