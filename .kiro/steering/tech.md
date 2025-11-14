# Technology Stack

## Backend (NestJS)
- **Framework**: NestJS with Express adapter
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Express sessions with bcrypt password hashing
- **Security**: Keychain integration for secure credential storage
- **AI Integration**: Google Gemini API via @nestjs/axios with function calling
- **File Upload**: Multer for multipart form handling
- **Markdown Processing**: marked for markdown parsing, sanitize-html for XSS protection

## Frontend (React)
- **Framework**: React 19 with Create React App
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **State Management**: Zustand for global state (auth and chat)
- **HTTP Client**: Axios (configured via setupProxy.js)
- **Notifications**: SweetAlert2
- **Date Handling**: date-fns and react-datepicker
- **Security**: DOMPurify for HTML sanitization

## Development Tools
- **Package Manager**: npm with workspaces
- **Code Formatting**: Prettier (single quotes, trailing commas)
- **Process Management**: Concurrently for running multiple services
- **Node Version**: 24.0.0+ (managed via .nvmrc)

## Common Commands

**IMPORTANT**: Always run `nvm use 24` before executing any commands to ensure correct Node.js version.

### Development
```bash
# Switch to correct Node version (REQUIRED)
nvm use 24

# Start both frontend and backend
npm start

# Start backend only
npm run start:server

# Start frontend only  
npm run start:client

# Build both applications
npm run build
```

### Backend Specific (from src/ directory)
```bash
# Switch to correct Node version (REQUIRED)
nvm use 24

# Development with hot reload
npm run start:dev

# Production build
npm run build

# Run tests
npm test

# Lint and fix
npm run lint
```

### Frontend Specific (from client/ directory)
```bash
# Switch to correct Node version (REQUIRED)
nvm use 24

# Development server
npm start

# Production build
npm run build

# Run tests
npm test
```

### Testing Commands
```bash
# Switch to correct Node version (REQUIRED)
nvm use 24

# Run specific test files
npm test -- --testPathPatterns=filename.spec.ts

# Run tests with specific pattern
npm test -- --testNamePattern="test name pattern"
```

## Environment Configuration
- Backend: `.env` in `src/` directory
- Frontend: `.env` in `client/` directory  
- Database credentials stored securely in macOS Keychain

## Code Comments Guidelines
- **All code comments should be written in Korean**, except for syntax-required elements (e.g., JSDoc tags like `@param`, `@return`)
- This applies to:
  - Inline comments (`//`)
  - Block comments (`/* */`)
  - JSX comments (`{/* */}`)
  - JSDoc documentation comments
- Variable names, function names, and technical terms should remain in English
- Comment content and descriptions should be in Korean