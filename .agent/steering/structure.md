# Project Structure

## Monorepo Organization

```
myTodoApp/
├── client/              # React frontend application
├── src/                 # ElysiaJS backend application  
├── node_modules/        # Root dependencies
├── package.json         # Workspace configuration
└── .nvmrc              # Node version specification
```

## Backend Structure (`src/`)

### core Application
- `src/main.ts` - Application entry point (App configuration, plugin registration)
- `src/plugins/` - Common plugins (Db, CORS, JWT, Swagger)

### Feature Modules (Domain-Driven)
- `src/features/user/` - User authentication and management
- `src/features/todo/` - Todo CRUD operations
- `src/features/assistance/` - AI assistance integration
- `src/features/fileUpload/` - File upload handling
- `src/features/mail/` - Email service
- `src/features/logging/` - Logging service

### Infrastructure
- `src/utils/` - Shared utilities
- `src/test/` - Tests

### Configuration
- `src/plugins/config.ts` - Environment configuration

## Frontend Structure (`client/`)

### Core Application
- `src/App.tsx` - Main application component with auth routing
- `src/index.tsx` - React application entry point

### Feature Components
- `src/loginForm/` - Authentication forms (login/signup)
- `src/todoList/` - Todo management interface
- `src/components/` - Reusable UI components (chat, file upload, profile, floating action button, theme toggle)
- `src/authStore/` - Zustand authentication state management
- `src/stores/` - Additional Zustand stores (chat, theme)
- `src/hooks/` - Custom React hooks (scroll lock, file upload)

### Configuration
- `vite.config.ts` - Vite configuration
- `public/` - Static assets and HTML template

## Naming Conventions

### Backend
- **Entities**: PascalCase with `Entity` suffix (`UserEntity`)
- **Routes**: PascalCase with `Routes` suffix (`UserRoutes`)
- **Services**: PascalCase with `Service` suffix (`UserService`)
- **DTOs**: PascalCase with `Dto` suffix (`CreateTodoDto`)
- **Database Tables**: Snake case with `nj_` prefix (`nj_user_info`)
- **Database Columns**: Snake case (`user_seq`, `reg_dtm`)

### Frontend
- **Components**: PascalCase (`LoginForm`, `TodoList`)
- **Files**: PascalCase for components, camelCase for utilities
- **CSS**: camelCase for class names, kebab-case for files

## Architecture Patterns

### Backend Patterns
- **Plugin-based architecture** - Each feature is an Elysia plugin
- **Repository pattern** - TypeORM entities with service layer abstraction
- **Derive pattern** - Context extension for auth and state
- **Audit pattern** - Standardized audit columns for all entities

### Frontend Patterns
- **Component composition** - Small, focused React components
- **Global state management** - Zustand for authentication, chat, and theme state
- **Type Safety** - End-to-End type safety via Elysia Treaty
- **Conditional rendering** - Auth-based component switching
- **CSS Custom Properties** - Dynamic theming with CSS variables

## File Organization Rules
- Group related files in feature directories
- Keep shared utilities in dedicated `utils/` directories
- Separate configuration files at appropriate levels
- Use consistent file extensions (`.ts` for backend, `.tsx`/`.ts` for frontend)

## Code Comments Guidelines
- **All code comments should be written in Korean**, except for syntax-required elements
- This includes inline comments, block comments, JSX comments, and JSDoc documentation
- Variable names, function names, and technical terms remain in English
- Only the descriptive content of comments should be in Korean