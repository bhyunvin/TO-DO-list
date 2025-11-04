# Requirements Document

## Introduction

This specification defines the requirements for implementing an AI Assistant Chat Interface for the Todo List application. The feature will provide users with a conversational interface to interact with their todo data using natural language queries in Korean, leveraging the existing Google Gemini AI integration with function calling capabilities.

## Glossary

- **AI_Assistant_Service**: The backend NestJS service that handles communication with Google Gemini API
- **Chat_Interface**: The frontend React modal component that provides conversational UI
- **Floating_Action_Button**: A fixed-position button that triggers the chat interface
- **Function_Calling**: Gemini API feature that allows the AI to call predefined functions to query database
- **Todo_Service**: The backend service that provides todo data access methods
- **Chat_Modal**: The popup window containing the conversation interface
- **Message_Thread**: The sequence of user and AI messages in a conversation

## Requirements

### Requirement 1

**User Story:** As a user, I want to access an AI assistant through a floating button, so that I can quickly ask questions about my todos without navigating away from the current view.

#### Acceptance Criteria

1. THE Chat_Interface SHALL display a Floating_Action_Button fixed to the bottom-right corner of the screen
2. WHEN the user clicks the Floating_Action_Button, THE Chat_Interface SHALL open a Chat_Modal overlay
3. THE Floating_Action_Button SHALL display an appropriate AI or chat icon
4. WHILE the Chat_Modal is open, THE Floating_Action_Button SHALL change to a close icon
5. WHEN the user clicks the close icon or outside the modal, THE Chat_Modal SHALL close

### Requirement 2

**User Story:** As a user, I want to type natural language questions in Korean about my todos, so that I can get intelligent responses about my task management.

#### Acceptance Criteria

1. THE Chat_Modal SHALL contain a text input field for user messages
2. WHEN the user types a message and presses Enter or clicks send, THE Chat_Interface SHALL send the message to AI_Assistant_Service
3. THE Chat_Interface SHALL display user messages in the Message_Thread with appropriate styling
4. THE Chat_Interface SHALL show a loading indicator while waiting for AI responses
5. WHEN the AI_Assistant_Service returns a response, THE Chat_Interface SHALL display the HTML-formatted response in the Message_Thread

### Requirement 3

**User Story:** As a user, I want the AI to access my actual todo data when answering questions, so that I receive accurate and personalized responses about my tasks.

#### Acceptance Criteria

1. WHEN the AI determines a user query requires todo data, THE AI_Assistant_Service SHALL use Function_Calling to request todo information
2. THE AI_Assistant_Service SHALL execute the getTodos function with appropriate parameters (status, days)
3. THE AI_Assistant_Service SHALL send the todo data back to Gemini API for natural language response generation
4. THE AI_Assistant_Service SHALL return the final Korean response formatted as sanitized HTML
5. THE Chat_Interface SHALL render the HTML response preserving formatting and styling

### Requirement 4

**User Story:** As a user, I want the AI to only respond to todo-related questions in polite Korean, so that the assistant stays focused and maintains appropriate communication style.

#### Acceptance Criteria

1. THE AI_Assistant_Service SHALL use the system prompt to enforce Korean honorifics (존댓말)
2. WHEN a user asks non-todo related questions, THE AI_Assistant_Service SHALL respond with the refusal message "죄송하지만 할 일 관리와 관련된 요청만 도와드릴 수 있습니다."
3. THE AI_Assistant_Service SHALL provide concise and clear answers about todo management
4. THE AI_Assistant_Service SHALL maintain consistent polite tone throughout conversations
5. THE AI_Assistant_Service SHALL handle errors gracefully with appropriate Korean error messages

### Requirement 5

**User Story:** As a user, I want to see a conversation history in the chat interface, so that I can reference previous questions and answers during my session.

#### Acceptance Criteria

1. THE Chat_Interface SHALL maintain a Message_Thread showing all user and AI messages in chronological order
2. THE Chat_Interface SHALL distinguish between user messages and AI responses with different styling
3. THE Chat_Interface SHALL automatically scroll to the newest message when new messages are added
4. THE Chat_Interface SHALL persist the conversation history using session storage, even when the modal is closed and reopened or the page is refreshed
5. THE Chat_Interface SHALL handle long messages with appropriate text wrapping and scrolling

### Requirement 6

**User Story:** As a user, I want the chat interface to be responsive and accessible, so that I can use it effectively on different devices and with assistive technologies.

#### Acceptance Criteria

1. THE Chat_Interface SHALL be responsive and work properly on mobile and desktop screen sizes
2. THE Chat_Interface SHALL support keyboard navigation for accessibility
3. THE Chat_Interface SHALL provide appropriate ARIA labels and roles for screen readers
4. THE Chat_Interface SHALL maintain focus management when opening and closing the modal
5. THE Chat_Interface SHALL escape key functionality to close the modal