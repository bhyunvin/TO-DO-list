# Project Structure

## Monorepo Organization

```
myTodoApp/
├── client/              # React frontend application
├── src/                 # NestJS backend application  
├── node_modules/        # Root dependencies
├── package.json         # Workspace configuration
└── .nvmrc              # Node version specification
```

## Backend Structure (`src/`)

### Core Application
- `src/main.ts` - Application bootstrap with CORS configuration
- `src/app.module.ts` - Root module with database, session, and global providers

### Feature Modules (Domain-Driven)
- `src/user/` - User authentication and management
- `src/todo/` - Todo CRUD operations and date-based queries
- `src/assistance/` - AI assistance integration with Gemini
- `src/fileUpload/` - File upload handling and storage
- `src/logging/` - Application logging and audit trails

### Infrastructure
- `src/utils/` - Shared utilities (crypto, keychain, audit columns, naming strategy)
- `src/filter/` - Global exception filters
- `src/interceptor/` - Global interceptors (logging)
- `src/types/express/` - TypeScript type extensions and auth guards

### Configuration
- `src/.env` - Environment variables
- `src/nest-cli.json` - NestJS CLI configuration
- `src/tsconfig.json` - TypeScript configuration

## Frontend Structure (`client/`)

### Core Application
- `src/App.js` - Main application component with auth routing
- `src/index.js` - React application entry point

### Feature Components
- `src/loginForm/` - Authentication forms (login/signup)
- `src/todoList/` - Todo management interface
- `src/authStore/` - Zustand authentication state management

### Configuration
- `src/setupProxy.js` - Development proxy configuration for API calls
- `public/` - Static assets and HTML template

## Naming Conventions

### Backend
- **Entities**: PascalCase with `Entity` suffix (`UserEntity`)
- **Controllers**: PascalCase with `Controller` suffix (`TodoController`)
- **Services**: PascalCase with `Service` suffix (`TodoService`)
- **DTOs**: PascalCase with `Dto` suffix (`CreateTodoDto`)
- **Database Tables**: Snake case with `nj_` prefix (`nj_user_info`)
- **Database Columns**: Snake case (`user_seq`, `reg_dtm`)

### Frontend
- **Components**: PascalCase (`LoginForm`, `TodoList`)
- **Files**: PascalCase for components, camelCase for utilities
- **CSS**: camelCase for class names, kebab-case for files

## Architecture Patterns

### Backend Patterns
- **Module-based architecture** - Each feature is a self-contained NestJS module
- **Repository pattern** - TypeORM entities with service layer abstraction
- **Guard pattern** - Authentication guards for route protection
- **Interceptor pattern** - Cross-cutting concerns (logging, error handling)
- **Audit pattern** - Standardized audit columns for all entities

### Frontend Patterns
- **Component composition** - Small, focused React components
- **Global state management** - Zustand for authentication state
- **Proxy pattern** - Development API proxy via setupProxy.js
- **Conditional rendering** - Auth-based component switching

## File Organization Rules
- Group related files in feature directories
- Keep shared utilities in dedicated `utils/` directories
- Separate configuration files at appropriate levels
- Use consistent file extensions (`.ts` for backend, `.js` for frontend)