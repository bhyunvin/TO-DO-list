# Technology Stack

## Backend (ElysiaJS)
- **Framework**: ElysiaJS
- **Runtime**: Bun (Node.js compatible)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (stateless) with Bun.password (bcrypt algorithm)
- **Logging**: Pino with pino-pretty (unified logger for HTTP and application logs)
- **Error Handling**: Client-friendly validation error responses with field-level error messages
- **Security**: Environment variables for secure credential storage, AES-256-GCM for data encryption (including secure deterministic encryption using AES-SIV with Synthetic IVs)
- **AI Integration**: Google Gemini API with function calling
- **API Communication**: Elysia Treaty (End-to-End Type Safety)
- **File Storage**: Cloudinary cloud storage
- **Static Files**: @elysiajs/static for serving static assets
- **Mail Service**: Nodemailer (Gmail)
- **Scheduler**: cron jobs (IP anonymization, token cleanup)
- **Testing**: Bun native testing (Bun.test and fetch API)
- **Markdown Processing**: marked for markdown parsing, sanitize-html for XSS protection

## Frontend (React)
- **Framework**: React 19 with Vite
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **State Management**: Zustand for global state (auth, chat, and theme)
- **HTTP Client**: Elysia Treaty (End-to-End Type Safety)
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

# Start backend only (Elysia)
bun run start:server

# Start frontend only (React)
bun run start:client

# Build both applications
bun run build
```

### Backend Specific (from src/ directory)
```bash
# Development with hot reload
bun dev

# Production build & run
bun run build
bun start

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