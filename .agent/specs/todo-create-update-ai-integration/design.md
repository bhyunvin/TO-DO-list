# Design Document

## Overview

This design extends the existing AI assistance service to support TODO creation and update operations through Gemini function calls. The backend APIs already exist (POST /todo and PATCH /todo/:id), so the primary work involves:

1. Adding two new function declarations (`createTodo` and `updateTodo`) to the Gemini API configuration
2. Implementing function call handlers in the AssistanceService
3. Updating the system prompt to explicitly block deletion requests
4. Ensuring proper error handling and user feedback

The design leverages the existing function call pattern established by `getTodos` and maintains consistency with the current architecture.

## Architecture

### Component Interaction Flow

```
User Input (Natural Language)
    ↓
ChatController (/assistance/chat)
    ↓
AssistanceService.getGeminiResponse()
    ↓
Gemini API (with function declarations)
    ↓
[Function Call Decision]
    ↓
├─→ createTodo() → TodoService.create()
├─→ updateTodo() → TodoService.update()
└─→ getTodos() → TodoService.findAll()
    ↓
Function Response back to Gemini
    ↓
Final AI Response to User
```

### Key Design Decisions

1. **Reuse Existing Backend APIs**: The TodoController and TodoService already implement create and update operations. We will call these existing service methods rather than duplicating logic.

2. **Function Call Pattern**: Follow the same pattern as `getTodos` - define function declarations, detect function calls in Gemini response, execute the function, append results to conversation, and get final response.

3. **Security-First Approach**: The system prompt will be the first line of defense against deletion requests. No delete function declaration will be provided to Gemini.

4. **Partial Updates**: The `updateTodo` function will support partial updates, allowing users to modify only specific fields without affecting others.

## Components and Interfaces

### 1. Gemini Function Declarations

#### createTodo Function Declaration

```typescript
{
  name: 'createTodo',
  description: '사용자의 새로운 할 일을 생성합니다. 할 일 내용과 날짜는 필수입니다.',
  parameters: {
    type: 'OBJECT',
    properties: {
      todoContent: {
        type: 'STRING',
        description: '할 일의 내용 (필수). 사용자가 수행해야 할 작업을 명확하게 설명합니다.',
      },
      todoDate: {
        type: 'STRING',
        description: '할 일의 목표 날짜 (필수). YYYY-MM-DD 형식. 사용자가 날짜를 명시하지 않으면 오늘 날짜를 사용합니다.',
      },
      todoNote: {
        type: 'STRING',
        description: '할 일에 대한 추가 메모나 설명 (선택 사항).',
      },
    },
    required: ['todoContent', 'todoDate'],
  },
}
```

#### updateTodo Function Declaration

```typescript
{
  name: 'updateTodo',
  description: '기존 할 일을 수정합니다. 할 일 ID는 필수이며, 수정할 필드만 포함합니다.',
  parameters: {
    type: 'OBJECT',
    properties: {
      todoSeq: {
        type: 'NUMBER',
        description: '수정할 할 일의 고유 ID (필수). 사용자가 참조한 할 일의 ID를 사용합니다.',
      },
      todoContent: {
        type: 'STRING',
        description: '수정할 할 일의 내용 (선택 사항).',
      },
      completeDtm: {
        type: 'STRING',
        description: '완료 일시 (선택 사항). 완료 처리 시 현재 시각의 ISO 8601 형식 문자열, 미완료 처리 시 null.',
      },
      todoNote: {
        type: 'STRING',
        description: '수정할 메모 내용 (선택 사항).',
      },
    },
    required: ['todoSeq'],
  },
}
```

### 2. AssistanceService Methods

#### createTodo Method

```typescript
private async createTodo(
  userSeq: number,
  ip: string,
  todoContent: string,
  todoDate: string,
  todoNote?: string,
): Promise<any>
```

**Purpose**: Execute TODO creation by calling TodoService.create()

**Parameters**:
- `userSeq`: User identifier from session
- `ip`: Client IP address for audit logging
- `todoContent`: The TODO task description
- `todoDate`: Target date in YYYY-MM-DD format
- `todoNote`: Optional additional notes

**Returns**: Created TODO entity with todoSeq, todoContent, todoDate, todoNote, and audit information

**Error Handling**: Catch and log errors, return structured error response for AI to communicate to user

#### updateTodo Method

```typescript
private async updateTodo(
  userSeq: number,
  ip: string,
  todoSeq: number,
  updateData: {
    todoContent?: string;
    completeDtm?: string | null;
    todoNote?: string;
  },
): Promise<any>
```

**Purpose**: Execute TODO update by calling TodoService.update()

**Parameters**:
- `userSeq`: User identifier from session
- `ip`: Client IP address for audit logging
- `todoSeq`: TODO identifier to update
- `updateData`: Object containing fields to update (partial update support)

**Returns**: Updated TODO entity or null if not found

**Error Handling**: Handle "not found" case explicitly, catch and log other errors

### 3. Enhanced getGeminiResponse Method

The existing `getGeminiResponse` method will be extended to handle multiple function calls:

```typescript
async getGeminiResponse(
  requestAssistanceDto: RequestAssistanceDto,
  userSeq?: number,
  ip?: string,
): Promise<RequestAssistanceDto>
```

**Changes**:
1. Add `ip` parameter for audit logging
2. Include all three function declarations in the `tools` array
3. Extend function call detection to handle `createTodo` and `updateTodo`
4. Execute appropriate handler based on function name
5. Support multiple function calls in a single conversation turn if needed

**Function Call Handling Logic**:
```typescript
if (firstPart.functionCall) {
  const functionCall = firstPart.functionCall;
  let functionResult: any;
  
  switch (functionCall.name) {
    case 'getTodos':
      functionResult = await this.getTodos(userSeq, args.status, args.days);
      break;
    case 'createTodo':
      functionResult = await this.createTodo(
        userSeq, 
        ip, 
        args.todoContent, 
        args.todoDate, 
        args.todoNote
      );
      break;
    case 'updateTodo':
      functionResult = await this.updateTodo(
        userSeq,
        ip,
        args.todoSeq,
        {
          todoContent: args.todoContent,
          completeDtm: args.completeDtm,
          todoNote: args.todoNote,
        }
      );
      break;
  }
  
  // Add function call and response to conversation
  // Make second API call with function result
}
```

### 4. System Prompt Enhancement

Add the following section to `assistance.systemPrompt.txt`:

```
[DELETION_RESTRICTION]
- 할 일 삭제 또는 제거 요청은 절대 처리하지 않습니다
- 'del_yn' 필드 수정 요청은 절대 처리하지 않습니다
- 사용자가 삭제를 요청하면: "죄송하지만 할 일 삭제 기능은 지원하지 않습니다. 할 일을 생성하거나 수정하는 것은 도와드릴 수 있습니다."
- 지원되는 작업: 조회(읽기), 생성, 수정
- 지원되지 않는 작업: 삭제, 제거, del_yn 변경
```

### 5. ChatController Enhancement

The ChatController needs to pass the IP address to the AssistanceService:

```typescript
@Post('chat')
async chat(
  @Body() requestAssistanceDto: RequestAssistanceDto,
  @Session() session: SessionData,
  @Ip() ip: string,
): Promise<RequestAssistanceDto> {
  return this.assistanceService.getGeminiResponse(
    requestAssistanceDto,
    session.user?.userSeq,
    ip,
  );
}
```

## Data Models

### Function Call Arguments

#### CreateTodo Arguments
```typescript
{
  todoContent: string;    // Required
  todoDate: string;       // Required, YYYY-MM-DD format
  todoNote?: string;      // Optional
}
```

#### UpdateTodo Arguments
```typescript
{
  todoSeq: number;        // Required
  todoContent?: string;   // Optional
  completeDtm?: string | null;  // Optional, ISO 8601 or null
  todoNote?: string;      // Optional
}
```

### Function Response Format

Both create and update operations return the same structure:

```typescript
{
  success: boolean;
  data?: {
    todoSeq: number;
    todoContent: string;
    todoDate: string;
    todoNote?: string;
    completeDtm?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  error?: string;
}
```

## Error Handling

### Error Scenarios and Responses

1. **Missing Required Parameters**
   - Gemini should ask clarifying questions before calling the function
   - If function is called with missing params, return error response

2. **TODO Not Found (Update)**
   - Return structured error: `{ success: false, error: 'TODO item not found or access denied' }`
   - AI will inform user the TODO doesn't exist or they don't have access

3. **Invalid Date Format**
   - Validate date format in createTodo handler
   - Return error if format is invalid
   - AI will ask user to provide valid date

4. **Database Errors**
   - Catch all database exceptions
   - Log error details for debugging
   - Return generic error to AI: `{ success: false, error: 'Failed to create/update TODO' }`

5. **Deletion Attempts**
   - System prompt prevents function calls
   - If user persists, AI responds with refusal message
   - No function call is made

### Error Response Structure

```typescript
{
  success: false,
  error: string,  // User-friendly error message
  details?: any,  // Optional technical details for logging
}
```

## Testing Strategy

### Unit Tests

1. **AssistanceService.createTodo()**
   - Test successful TODO creation
   - Test with optional todoNote
   - Test error handling when TodoService.create() fails
   - Test date format validation

2. **AssistanceService.updateTodo()**
   - Test successful partial update (single field)
   - Test successful complete update (all fields)
   - Test marking TODO as complete
   - Test marking TODO as incomplete
   - Test "not found" scenario
   - Test error handling

3. **Function Call Detection**
   - Test that createTodo function call is detected and executed
   - Test that updateTodo function call is detected and executed
   - Test that multiple function calls in sequence work correctly

### Integration Tests

1. **End-to-End Create Flow**
   - Send natural language request to create TODO
   - Verify Gemini calls createTodo function
   - Verify TODO is created in database
   - Verify AI response confirms creation

2. **End-to-End Update Flow**
   - Create a TODO
   - Send natural language request to update it
   - Verify Gemini calls updateTodo function
   - Verify TODO is updated in database
   - Verify AI response confirms update

3. **Deletion Prevention**
   - Send natural language deletion request
   - Verify no function call is made
   - Verify AI refuses the request
   - Verify TODO remains in database unchanged

### Manual Testing Scenarios

1. **Create TODO with various phrasings**
   - "내일 회의 준비하기 할 일 추가해줘"
   - "다음 주 월요일에 보고서 작성 TODO 만들어줘"
   - "오늘 장보기 추가"

2. **Update TODO with various operations**
   - "할 일 3번 완료 처리해줘"
   - "회의 준비 할 일의 내용을 '팀 회의 준비'로 바꿔줘"
   - "보고서 작성에 '초안 먼저 작성' 메모 추가해줘"

3. **Deletion attempts with various phrasings**
   - "할 일 5번 삭제해줘"
   - "장보기 TODO 지워줘"
   - "완료된 할 일들 모두 제거해줘"
   - All should be refused consistently

## Security Considerations

1. **User Authorization**: All operations verify userSeq from session to ensure users can only modify their own TODOs

2. **Input Sanitization**: TodoService already handles input sanitization through DTOs and TypeORM

3. **Audit Logging**: All create and update operations log user ID, IP address, and timestamp through AuditColumns

4. **Deletion Prevention**: Multi-layered approach:
   - System prompt explicitly forbids deletion
   - No delete function declaration provided to Gemini
   - Backend delete endpoint remains but is not exposed to AI

5. **SQL Injection Prevention**: TypeORM parameterized queries prevent SQL injection

## Performance Considerations

1. **Function Call Overhead**: Each function call requires two Gemini API calls (initial + with function result). This is acceptable for the user experience benefit.

2. **Database Queries**: Reusing existing TodoService methods ensures consistent performance with direct API calls.

3. **Error Recovery**: Failed function calls don't break the conversation - AI can explain the error and ask user to retry.

## Future Enhancements

1. **Batch Operations**: Support creating or updating multiple TODOs in a single conversation turn

2. **File Attachment Support**: Extend createTodo to support file uploads through the AI interface

3. **Smart Date Parsing**: Enhance date extraction to handle relative dates ("tomorrow", "next week") more reliably

4. **TODO Search**: Add a searchTodos function for finding TODOs by content or date range

5. **Undo Functionality**: Allow users to undo recent create/update operations through conversation
