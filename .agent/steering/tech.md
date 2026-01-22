# Technology Stack

## Backend (NestJS)
- **Framework**: NestJS with Express adapter
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (stateless) with Bun.password (bcrypt algorithm)
- **Security**: Environment variables for secure credential storage, AES-256-GCM for data encryption
- **AI Integration**: Google Gemini API with function calling
- **File Storage**: Cloudinary cloud storage
- **File Upload**: Multer for multipart form handling
- **Mail Service**: Nodemailer (Gmail)
- **Scheduler**: @nestjs/schedule for cron jobs (IP anonymization, token cleanup)
- **Markdown Processing**: marked for markdown parsing, sanitize-html for XSS protection

## Frontend (React)
- **Framework**: React 19 with Create React App
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **State Management**: Zustand for global state (auth, chat, and theme)
- **HTTP Client**: Axios (configured via setupProxy.js)
- **Notifications**: SweetAlert2
- **Date Handling**: date-fns and react-datepicker
- **Security**: DOMPurify for HTML sanitization, PropTypes for type checking
- **Accessibility**: WCAG 2.1 AA compliant (High contrast mode support)
- **Theming**: CSS Custom Properties for dynamic light/dark mode

## Development Tools
- **Runtime**: Bun 1.0.0+
- **Package Manager**: Bun (npm workspaces compatible)
- **Code Formatting**: Prettier (single quotes, trailing commas)
- **Process Management**: Concurrently for running multiple services

## Common Commands

### Development
```bash
# Start both frontend and backend
bun start

# Start backend only
bun run start:server

# Start frontend only  
bun run start:client

# Build both applications
bun run build
```

### Backend Specific (from src/ directory)
```bash
# Development with hot reload
bun run start:dev

# Production build
bun run build

# Run tests
bun test

# Lint and fix
bun run lint
```

### Frontend Specific (from client/ directory)
```bash
# Development server
bun run dev

# Production build
bun run build

# Run tests
bun test
```

### Testing Commands
```bash
# Run specific test files
bun test -- --testPathPatterns=filename.spec.ts

# Run tests with specific pattern
bun test -- --testNamePattern="test name pattern"
```

## Environment Configuration
- Backend: `.env` in `src/` directory
- Frontend: `.env` in `client/` directory  
- All credentials stored in environment variables (not committed to git)

## Code Comments Guidelines
- **All code comments should be written in Korean**, except for syntax-required elements (e.g., JSDoc tags like `@param`, `@return`)
- This applies to:
  - Inline comments (`//`)
  - Block comments (`/* */`)
  - JSX comments (`{/* */}`)
  - JSDoc documentation comments
- Variable names, function names, and technical terms should remain in English
- Comment content and descriptions should be in Korean