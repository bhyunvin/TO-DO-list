# Product Overview

This is a full-stack TO-DO List application built with modern web technologies. The application provides user authentication, todo management with date-based organization, file upload capabilities, and AI assistance features.

## Key Features

- User registration and authentication with JWT-based stateless authentication
- Privacy policy consent requirement for user registration
- Date-based todo organization and management
- File upload functionality with Cloudinary cloud storage
  - Progress tracking
  - Server-side file validation (size, format, security)
  - Profile image and todo attachment support
- AI chat assistant using Google Gemini with function calling (can read, create, and update todos)
- User profile management with profile image support
- Password change functionality
- Contact Developer feature (send inquiry emails to administrator)
- Dark mode theme toggle with persistent user preference
- Comprehensive audit logging for all operations with IP anonymization scheduler
- Secure password encryption using Bun.password (bcrypt algorithm) and data encryption (AES-256-GCM)
- Environment-based credential management
- Markdown rendering with XSS protection

## Target Users

Individual users who need a personal task management system with advanced features like AI assistance and file attachments.

## Architecture

The application follows a monorepo structure with separate frontend and backend applications that communicate via REST API with JWT-based stateless authentication.