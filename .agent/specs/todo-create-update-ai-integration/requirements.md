# Requirements Document

## Introduction

This feature extends the AI assistant's capabilities to support creating and updating TODO items through natural language interactions with the Gemini API. Currently, the AI assistant can only read TODO items. This enhancement will enable users to create new TODOs and update existing ones via conversational commands while maintaining strict security controls that prevent any deletion operations.

## Glossary

- **AI Assistant**: The Gemini-powered conversational interface that helps users manage their TODO items through natural language
- **Function Call**: A Gemini API mechanism that allows the AI to invoke backend functions to perform operations
- **TODO Item**: A task entity stored in the database with properties including content, date, notes, completion status, and file attachments
- **Soft Delete**: A deletion pattern using the `del_yn` flag to mark items as deleted without physically removing them from the database
- **System Prompt**: The instruction text that defines the AI assistant's behavior, capabilities, and restrictions

## Requirements

### Requirement 1

**User Story:** As a user, I want to create new TODO items through natural language conversation with the AI assistant, so that I can quickly add tasks without navigating through forms.

#### Acceptance Criteria

1. WHEN the user requests to create a TODO item in natural language, THE AI Assistant SHALL invoke the createTodo function with the extracted task details
2. THE AI Assistant SHALL extract the TODO content, date, and optional notes from the user's natural language input
3. WHEN the createTodo function executes successfully, THE AI Assistant SHALL confirm the creation with the user including the assigned TODO ID
4. IF the user's request lacks required information (TODO content), THEN THE AI Assistant SHALL ask clarifying questions before creating the TODO
5. THE AI Assistant SHALL support creating TODOs with future dates, past dates, or today's date based on user input

### Requirement 2

**User Story:** As a user, I want to update existing TODO items through natural language conversation with the AI assistant, so that I can modify task details, mark items as complete, or add notes without manual form editing.

#### Acceptance Criteria

1. WHEN the user requests to update a TODO item by referencing it (by ID, content, or context), THE AI Assistant SHALL invoke the updateTodo function with the TODO identifier and updated fields
2. THE AI Assistant SHALL support partial updates allowing modification of content, completion status, or notes independently
3. WHEN marking a TODO as complete, THE AI Assistant SHALL set the completeDtm field to the current timestamp
4. WHEN marking a TODO as incomplete, THE AI Assistant SHALL set the completeDtm field to null
5. IF the user references a TODO that cannot be uniquely identified, THEN THE AI Assistant SHALL ask for clarification before proceeding with the update

### Requirement 3

**User Story:** As a system administrator, I want to ensure that TODO deletion is completely blocked through the AI assistant, so that users cannot accidentally or intentionally delete data through conversational commands.

#### Acceptance Criteria

1. WHEN the user requests to delete or remove a TODO item, THE AI Assistant SHALL explicitly refuse the request and inform the user that deletion is not supported
2. WHEN the user requests to modify the del_yn field directly, THE AI Assistant SHALL explicitly refuse the request and inform the user that this operation is not allowed
3. THE System Prompt SHALL contain explicit instructions prohibiting deletion operations
4. THE AI Assistant SHALL NOT have access to any delete function declarations in the Gemini API configuration
5. IF the user persists with deletion requests using alternative phrasing, THE AI Assistant SHALL consistently refuse and redirect to supported operations (create, read, update)

### Requirement 4

**User Story:** As a developer, I want the Gemini function call schemas to be properly defined for create and update operations, so that the AI can reliably invoke backend APIs with correct parameters.

#### Acceptance Criteria

1. THE createTodo function declaration SHALL define required parameters for todoContent and todoDate
2. THE createTodo function declaration SHALL define optional parameters for todoNote
3. THE updateTodo function declaration SHALL define a required parameter for todoSeq to identify the target TODO
4. THE updateTodo function declaration SHALL define optional parameters for todoContent, completeDtm, and todoNote
5. THE function declarations SHALL include clear descriptions that guide the AI in parameter extraction from natural language

### Requirement 5

**User Story:** As a user, I want the AI assistant to provide helpful feedback after create and update operations, so that I can confirm my actions were successful and understand what changed.

#### Acceptance Criteria

1. WHEN a TODO is created successfully, THE AI Assistant SHALL respond with a confirmation message including the TODO content and assigned date
2. WHEN a TODO is updated successfully, THE AI Assistant SHALL respond with a confirmation message describing what was changed
3. IF a create or update operation fails, THEN THE AI Assistant SHALL explain the error in user-friendly language
4. THE AI Assistant SHALL maintain conversational context to allow follow-up operations on recently created or updated TODOs
5. WHEN multiple TODOs match an update request, THE AI Assistant SHALL list the matching items and ask the user to specify which one to update
