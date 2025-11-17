# Product Overview

This is a full-stack TO-DO List application built with modern web technologies. The application provides user authentication, todo management with date-based organization, file upload capabilities, and AI assistance features.

## Key Features

- User registration and authentication with session management
- Date-based todo organization and management
- File upload functionality with progress tracking
- AI chat assistant using Google Gemini with function calling (can read, create, and update todos)
- User profile management with profile image support
- Password change functionality
- Dark mode theme toggle with persistent user preference
- Comprehensive audit logging for all operations
- Secure password encryption and keychain integration
- Markdown rendering with XSS protection

## Target Users

Individual users who need a personal task management system with advanced features like AI assistance and file attachments.

## Architecture

The application follows a monorepo structure with separate frontend and backend applications that communicate via REST API with session-based authentication.