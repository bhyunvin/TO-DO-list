# Technology Stack

## Backend (NestJS)
- **Framework**: NestJS with Express adapter
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Express sessions with bcrypt password hashing
- **Security**: Keychain integration for secure credential storage
- **AI Integration**: Google Gemini via @langchain/google-genai
- **File Upload**: Multer for multipart form handling

## Frontend (React)
- **Framework**: React 19 with Create React App
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **State Management**: Zustand for global state
- **HTTP Client**: Axios (configured via setupProxy.js)
- **Notifications**: SweetAlert2
- **Date Handling**: date-fns and react-datepicker

## Development Tools
- **Package Manager**: npm with workspaces
- **Code Formatting**: Prettier (single quotes, trailing commas)
- **Process Management**: Concurrently for running multiple services
- **Node Version**: 24.0.0+ (managed via .nvmrc)

## Common Commands

### Development
```bash
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
# Development server
npm start

# Production build
npm run build

# Run tests
npm test
```

## Environment Configuration
- Backend: `.env` in `src/` directory
- Frontend: `.env` in `client/` directory  
- Database credentials stored securely in macOS Keychain