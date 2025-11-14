# Requirements Document

## Introduction

This specification defines enhancements to the existing AI Assistant Chat Interface to improve security, user experience, and AI intelligence. The enhancements address four critical areas: date awareness for accurate temporal reasoning, content-based task updates for natural interaction, proactive list refresh for improved UX, and mandatory session-based security enforcement.

## Glossary

- **AI_Assistant_Service**: The backend NestJS service that handles communication with Google Gemini API
- **System_Prompt**: The instruction text that defines AI behavior and capabilities
- **Function_Calling**: Gemini API feature that allows the AI to call predefined functions
- **Todo_Service**: The backend service that provides todo data access methods
- **User_Session**: The authenticated session containing userSeq and user information
- **KST**: Korea Standard Time (UTC+9)
- **Content_Based_Update**: Identifying a todo by its title/content instead of ID
- **Proactive_Refresh**: Automatically displaying updated data after write operations

## Requirements

### Requirement 1: Date-Aware AI Context

**User Story:** As a user, I want the AI to correctly interpret ambiguous dates like "today," "tomorrow," or "November 14th," so that it creates and queries todos with the correct year and date.

#### Acceptance Criteria

1. WHEN the AI_Assistant_Service processes a user request, THE System SHALL provide the current server date in KST timezone formatted as YYYY-MM-DD
2. THE System_Prompt SHALL include the current date context in every request to Gemini API
3. WHEN a user provides an ambiguous date without a year, THE AI_Assistant_Service SHALL resolve it to the correct full date based on the current date context
4. THE AI_Assistant_Service SHALL use the server's system time converted to KST for date calculations
5. WHEN creating or querying todos with relative dates like "today" or "tomorrow," THE AI_Assistant_Service SHALL correctly calculate the YYYY-MM-DD value based on the current date

### Requirement 2: Content-Based Todo Updates

**User Story:** As a user, I want to update todos by referring to their title or content (e.g., "Update 'Buy Milk' task"), so that I don't need to know or specify todo IDs.

#### Acceptance Criteria

1. WHEN a user requests to update a todo by its content, THE AI_Assistant_Service SHALL search for matching todos using the provided content text
2. IF exactly one todo matches the content, THE AI_Assistant_Service SHALL proceed with the update operation using that todo's todoSeq
3. IF multiple todos match the content, THE AI_Assistant_Service SHALL ask the user to clarify which todo by providing additional context (date or other details)
4. IF no todos match the content, THE AI_Assistant_Service SHALL inform the user that no matching todo was found
5. THE updateTodo function SHALL support both todoSeq-based updates (existing) and content-based updates (new)
6. WHEN updating completion status, THE updateTodo function SHALL accept an isCompleted boolean parameter instead of a completeDtm timestamp
7. WHEN isCompleted is true, THE System SHALL set completeDtm to the current server timestamp
8. WHEN isCompleted is false, THE System SHALL set completeDtm to NULL
9. WHEN isCompleted is not provided, THE System SHALL not modify the completeDtm value

### Requirement 3: Proactive List Refresh After Write Operations

**User Story:** As a user, I want to automatically see my updated todo list after creating or modifying a task, so that I don't need to make a second request to view the changes.

#### Acceptance Criteria

1. WHEN a createTodo operation succeeds, THE AI_Assistant_Service SHALL automatically fetch and display the updated todo list for the relevant date range
2. WHEN an updateTodo operation succeeds, THE AI_Assistant_Service SHALL automatically fetch and display the updated todo list for the relevant date range
3. THE System_Prompt SHALL instruct the AI to use the FORMATTING_RULES for displaying the refreshed todo list
4. THE AI_Assistant_Service SHALL include both the success confirmation message and the formatted todo list in the response
5. THE refreshed todo list SHALL show todos relevant to the operation (e.g., today's list for a task created "for today")

### Requirement 4: Mandatory Session-Based Security

**User Story:** As a system administrator, I want all todo operations to be securely scoped to the authenticated user's session, so that users cannot access or modify other users' data.

#### Acceptance Criteria

1. THE AI_Assistant_Service SHALL receive userSeq from the authenticated user session for all requests
2. THE getTodos function SHALL use the session userSeq internally and SHALL NOT accept userSeq as an AI-controllable parameter
3. THE createTodo function SHALL use the session userSeq internally and SHALL NOT accept userSeq as an AI-controllable parameter
4. THE updateTodo function SHALL use the session userSeq internally and SHALL NOT accept userSeq as an AI-controllable parameter
5. THE Todo_Service methods SHALL verify that the requested todo belongs to the session userSeq before performing any operation
6. IF a todo does not belong to the session userSeq, THE Todo_Service SHALL return an error or empty result without exposing other users' data
7. THE function tool definitions SHALL NOT include userSeq as a parameter that Gemini can specify

### Requirement 5: Complete Audit Trail for Database Operations

**User Story:** As a system administrator, I want all todo create and update operations to populate complete audit columns (reg_id, reg_ip, reg_dtm, upd_id, upd_ip, upd_dtm), so that I can track who created and modified each record for compliance and debugging purposes.

#### Acceptance Criteria

1. THE ChatController SHALL pass the authenticated user's userId from the session to the AI_Assistant_Service
2. THE AI_Assistant_Service SHALL pass the userId parameter to createTodo and updateTodo functions
3. WHEN creating a new todo, THE System SHALL populate reg_id with the session userId
4. WHEN creating a new todo, THE System SHALL populate reg_ip with the client IP address
5. WHEN creating a new todo, THE System SHALL populate reg_dtm with the current server timestamp
6. WHEN creating a new todo, THE System SHALL also populate upd_id with the session userId
7. WHEN creating a new todo, THE System SHALL also populate upd_ip with the client IP address
8. WHEN creating a new todo, THE System SHALL also populate upd_dtm with the current server timestamp
9. WHEN updating an existing todo, THE System SHALL populate upd_id with the session userId
10. WHEN updating an existing todo, THE System SHALL populate upd_ip with the client IP address
11. WHEN updating an existing todo, THE System SHALL populate upd_dtm with the current server timestamp
12. THE setAuditColumn utility function SHALL initialize both reg_* and upd_* columns on create operations
13. THE setAuditColumn utility function SHALL only update upd_* columns on update operations

### Requirement 6: Frontend Auto-Refresh After AI Operations

**User Story:** As a user, I want the main todo list UI to automatically refresh when I create or update a task via the AI chat, so that I can see my changes immediately without manually refreshing the page.

#### Acceptance Criteria

1. WHEN the ChatModal receives a successful API response from the AI assistant, THE System SHALL trigger a refresh event
2. THE TodoListComponent SHALL listen for the refresh event
3. WHEN the TodoListComponent receives the refresh event, THE System SHALL call its data-fetching function to reload the todo list
4. THE refresh mechanism SHALL use the existing Zustand state management architecture
5. THE refresh SHALL occur automatically without requiring user interaction
6. THE refresh SHALL not interfere with the current selected date in the todo list
7. THE System SHALL trigger refresh for all successful AI chat responses to ensure consistency

### Requirement 7: Automatic Welcome Message for New Chat Sessions

**User Story:** As a user, I want to see a helpful welcome message with usage examples when I start a new chat session, so that I understand how to interact with the AI assistant.

#### Acceptance Criteria

1. WHEN a user opens the chat modal for the first time in a session, THE System SHALL display a welcome message as the first message
2. THE welcome message SHALL include a greeting and introduction to the AI assistant
3. THE welcome message SHALL provide concrete usage examples for adding, viewing, and updating todos
4. THE welcome message SHALL be formatted in Korean with proper HTML structure including emojis, headings, and lists
5. THE welcome message SHALL be stored in chat history like a regular assistant message
6. THE welcome message SHALL persist in sessionStorage across page refreshes within the same session
7. WHEN a user clears the chat history, THE System SHALL automatically re-inject the welcome message
8. THE welcome message SHALL NOT appear if the chat session already contains messages from previous interactions

## Security Considerations

### Session Enforcement
- All todo operations must use the userSeq from the authenticated session
- The AI cannot specify or override the userSeq parameter
- Database queries must filter by userSeq to prevent data leakage

### Input Validation
- Content-based search must sanitize user input to prevent injection attacks
- Date parsing must validate format and range to prevent invalid dates
- All user inputs must be validated before being used in database queries

## Performance Considerations

### Content-Based Search
- Content matching should use efficient database queries with proper indexing
- Fuzzy matching should be limited to prevent performance degradation
- Search should be case-insensitive for better user experience

### Proactive Refresh
- Automatic list refresh should only fetch relevant todos (not entire database)
- Date range for refresh should be intelligent (e.g., ±7 days from operation date)
- Response size should be reasonable to prevent slow API responses
