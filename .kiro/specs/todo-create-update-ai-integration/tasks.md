# Implementation Plan

- [x] 1. Update system prompt to block deletion requests
  - Add [DELETION_RESTRICTION] section to assistance.systemPrompt.txt with explicit rules against deletion
  - Include Korean language refusal message for deletion requests
  - Specify supported operations (create, read, update) and unsupported operations (delete, del_yn modification)
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 2. Add Gemini function declarations for create and update operations
  - [x] 2.1 Create createTodo function declaration in AssistanceService
    - Define function name, description in Korean
    - Add todoContent parameter (STRING, required) with clear description
    - Add todoDate parameter (STRING, required) with YYYY-MM-DD format specification
    - Add todoNote parameter (STRING, optional) for additional notes
    - Set required fields array to ['todoContent', 'todoDate']
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [x] 2.2 Create updateTodo function declaration in AssistanceService
    - Define function name, description in Korean
    - Add todoSeq parameter (NUMBER, required) for TODO identification
    - Add todoContent parameter (STRING, optional) for content updates
    - Add completeDtm parameter (STRING, optional) for completion status
    - Add todoNote parameter (STRING, optional) for note updates
    - Set required fields array to ['todoSeq']
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [x] 2.3 Update tools array in getGeminiResponse to include all three function declarations
    - Combine getTodosTool, createTodoTool, and updateTodoTool in tools array
    - _Requirements: 1.1, 2.1_

- [x] 3. Implement createTodo handler method in AssistanceService
  - [x] 3.1 Create private createTodo method with parameters (userSeq, ip, todoContent, todoDate, todoNote)
    - Add method signature with proper TypeScript types
    - Add JSDoc comments explaining purpose and parameters
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.2 Implement date validation and formatting
    - Validate todoDate is in YYYY-MM-DD format
    - Return error response if date format is invalid
    - _Requirements: 1.5_
  
  - [x] 3.3 Call TodoService.create with user object and DTO
    - Construct user object with userSeq (userId can be empty string for function calls)
    - Create CreateTodoDto with todoContent, todoDate, and optional todoNote
    - Call this.todoService.create(user, ip, createTodoDto)
    - _Requirements: 1.1, 1.3_
  
  - [x] 3.4 Format success response with created TODO data
    - Return structured response with success: true and TODO data
    - Include todoSeq, todoContent, todoDate, todoNote, and creation timestamp
    - _Requirements: 1.3, 5.1_
  
  - [x] 3.5 Implement error handling and logging
    - Wrap in try-catch block
    - Log errors with this.logger.error
    - Return structured error response with success: false and user-friendly message
    - _Requirements: 1.4, 5.3_

- [x] 4. Implement updateTodo handler method in AssistanceService
  - [x] 4.1 Create private updateTodo method with parameters (userSeq, ip, todoSeq, updateData)
    - Add method signature with proper TypeScript types
    - Define updateData interface with optional fields
    - Add JSDoc comments explaining purpose and parameters
    - _Requirements: 2.1, 2.2_
  
  - [x] 4.2 Call TodoService.update with TODO ID and update DTO
    - Construct user object with userSeq
    - Create UpdateTodoDto with only provided fields (partial update)
    - Call this.todoService.update(todoSeq, user, ip, updateTodoDto)
    - _Requirements: 2.1, 2.2_
  
  - [x] 4.3 Handle "not found" case explicitly
    - Check if TodoService.update returns null
    - Return structured error response: { success: false, error: 'TODO item not found or access denied' }
    - _Requirements: 2.5, 5.3_
  
  - [x] 4.4 Format success response with updated TODO data
    - Return structured response with success: true and updated TODO data
    - Include all TODO fields in response
    - _Requirements: 2.1, 5.2_
  
  - [x] 4.5 Implement error handling and logging
    - Wrap in try-catch block
    - Log errors with this.logger.error
    - Return structured error response with user-friendly message
    - _Requirements: 5.3_

- [x] 5. Enhance getGeminiResponse method to handle new function calls
  - [x] 5.1 Add ip parameter to getGeminiResponse method signature
    - Update method signature: getGeminiResponse(requestAssistanceDto, userSeq?, ip?)
    - Update JSDoc comments
    - _Requirements: 1.1, 2.1_
  
  - [x] 5.2 Extend function call detection logic with switch statement
    - Replace if statement with switch on functionCall.name
    - Add case for 'getTodos' (existing logic)
    - Add case for 'createTodo' calling this.createTodo()
    - Add case for 'updateTodo' calling this.updateTodo()
    - Extract function arguments properly for each case
    - _Requirements: 1.1, 2.1_
  
  - [x] 5.3 Ensure function response is properly formatted for Gemini
    - Maintain existing functionResponse structure
    - Pass function result as content in response
    - _Requirements: 1.3, 2.1_

- [x] 6. Update ChatController to pass IP address to AssistanceService
  - Add @Ip() decorator to chat method parameters
  - Pass ip parameter to this.assistanceService.getGeminiResponse()
  - _Requirements: 1.1, 2.1_

- [ ]* 7. Verify deletion prevention through manual testing
  - Start the development server
  - Test deletion request in Korean: "할 일 삭제해줘"
  - Test deletion request with ID: "TODO 5번 지워줘"
  - Test del_yn modification request
  - Verify AI refuses all deletion attempts with consistent message
  - Verify no function calls are made for deletion requests
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ]* 8. Verify create functionality through manual testing
  - Test creating TODO with content and date: "내일 회의 준비 할 일 추가해줘"
  - Test creating TODO with notes: "다음 주 월요일 보고서 작성, 초안 먼저 작성하기"
  - Test creating TODO for today without explicit date
  - Verify AI confirms creation with TODO details
  - Verify TODO appears in database with correct data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.4_

- [ ]* 9. Verify update functionality through manual testing
  - Create a TODO first
  - Test marking as complete: "할 일 [ID] 완료 처리해줘"
  - Test updating content: "할 일 [ID]의 내용을 '새로운 내용'으로 바꿔줘"
  - Test adding notes: "할 일 [ID]에 메모 추가해줘"
  - Test marking as incomplete after completion
  - Verify AI confirms updates with changed details
  - Verify updates are reflected in database
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.4, 5.5_
