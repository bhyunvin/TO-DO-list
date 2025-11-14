# Design Document

## Overview

This document defines the design for refactoring the frontend (React) and backend (NestJS) codebase to ES6+ syntax. The refactoring focuses on three main areas:

1. **Object Property Shorthand**: Convert identical key-value pairs to shorthand syntax and reorder to object top
2. **Commented Code Removal**: Delete unused commented-out code lines (preserve explanatory comments)
3. **ES6+ Syntax Modernization**: var → const/let, arrow functions, template literals, destructuring, method shorthand

## Architecture

### Refactoring Approach

Refactoring will proceed in a **gradual and safe manner**:

1. **File-by-file refactoring**: Refactor each file independently to limit change scope
2. **Function preservation first**: All changes must fully preserve existing functionality
3. **Test-based verification**: Run related tests after each refactoring to confirm function preservation
4. **Diagnostic tool utilization**: Use getDiagnostics tool to immediately detect syntax errors

### Refactoring Scope

#### Included Files
- **Frontend**: `client/src/**/*.js` (React components, hooks, stores)
- **Backend**: `src/src/**/*.ts` (NestJS services, controllers, entities, utilities)

#### Excluded Files
- `node_modules/` directory
- `build/`, `dist/` directories
- Configuration files (package.json, tsconfig.json, etc.)
- Test files (refactor but process last)

## Components and Interfaces

### 1. Object Property Shorthand Refactoring

#### Pattern Identification
```javascript
// Before
const user = {
  name: name,
  email: email,
  age: 25,
  id: id
};

// After
const user = {
  name,
  email,
  id,
  age: 25
};
```

#### Implementation Strategy
1. Identify `key: value` patterns in object literals
2. Check if `key` and `value` are identical identifiers
3. Convert to shorthand syntax: `key: key` → `key`
4. Move all shorthand properties to top of object definition
5. Maintain original order for remaining properties

#### Application Targets
- Function return objects
- Variable declaration objects
- Function argument objects
- API request/response objects

### 2. Commented Code Removal

#### Removal Targets
```javascript
// const oldVariable = 'test';  // ← Remove
// item.process();              // ← Remove
/* 
const unused = {
  data: 'old'
};
*/                              // ← Remove
```

#### Preservation Targets
```javascript
// Fetch user data from API      // ← Preserve
// 사용자 데이터를 가져옵니다      // ← Preserve
// TODO: Performance optimization // ← Preserve
```

#### Implementation Strategy
1. Scan comment lines
2. Determine if comment content is code or explanation
   - Code patterns: variable declarations, function calls, operators
   - Explanation patterns: natural language sentences, TODO/FIXME, Korean/English descriptions
3. Remove only code comments
4. Preserve explanatory comments

### 3. ES6+ Syntax Modernization

#### 3.1 Variable Declarations (var → const/let)

```javascript
// Before
var count = 0;
var user = getUser();

// After
let count = 0;
const user = getUser();
```

**Rules**:
- Variables not reassigned: `const`
- Variables that are reassigned: `let`
- Complete removal of `var`

#### 3.2 Arrow Functions

```javascript
// Before
function handleClick(e) {
  console.log(e);
}

const callback = function(data) {
  return data.map(function(item) {
    return item.id;
  });
};

// After
const handleClick = (e) => {
  console.log(e);
};

const callback = (data) => {
  return data.map((item) => item.id);
};
```

**Rules**:
- Anonymous functions → arrow functions
- Callback functions → arrow functions
- Single expression returns → implicit return (optional)
- Be careful when `this` binding is needed

#### 3.3 Template Literals

```javascript
// Before
const message = 'Hello, ' + name + '!';
const url = '/api/todo?date=' + formattedDate;

// After
const message = `Hello, ${name}!`;
const url = `/api/todo?date=${formattedDate}`;
```

**Rules**:
- String concatenation (`+`) → template literals
- Multi-line strings → template literals
- Strings with expressions → template literals

#### 3.4 Destructuring

```javascript
// Before
const name = user.name;
const email = user.email;
const first = array[0];
const second = array[1];

// After
const { name, email } = user;
const [first, second] = array;
```

**Rules**:
- Object property extraction → object destructuring
- Array element extraction → array destructuring
- Function parameters → destructuring parameters

#### 3.5 Method Syntax

```javascript
// Before
const obj = {
  greet: function() {
    console.log('Hello');
  },
  calculate: function(a, b) {
    return a + b;
  }
};

// After
const obj = {
  greet() {
    console.log('Hello');
  },
  calculate(a, b) {
    return a + b;
  }
};
```

**Rules**:
- Remove `function` keyword from object methods
- Use method shorthand syntax

## Data Models

### Refactoring Metadata

Structure for tracking refactoring progress for each file:

```typescript
interface RefactoringProgress {
  filePath: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  changes: {
    shorthandProperties: number;
    commentedCodeRemoved: number;
    varToConstLet: number;
    arrowFunctions: number;
    templateLiterals: number;
    destructuring: number;
    methodSyntax: number;
  };
  errors: string[];
  timestamp: Date;
}
```

## Error Handling

### Error Handling During Refactoring

1. **Syntax Error Detection**
   - Run `getDiagnostics` after refactoring each file
   - Review and fix changes if errors found
   - Report to user after 2 failed attempts

2. **Function Breakage Prevention**
   - Backup files before refactoring (use Git)
   - Verify changes don't affect functionality
   - Consider rollback if tests fail

3. **Special Case Handling**
   - Don't convert functions requiring `this` binding to arrow functions
   - Can't apply shorthand syntax to dynamic property names
   - Don't remove code examples in comments

## Testing Strategy

### Refactoring Verification Process

1. **File-level Verification**
   ```bash
   # Check syntax errors
   getDiagnostics([filePath])
   ```

2. **Module-level Testing**
   ```bash
   # Frontend tests
   npm test -- --testPathPattern=TodoList
   
   # Backend tests
   npm test -- --testPathPattern=user.service
   ```

3. **Full Test Suite**
   ```bash
   # Frontend full tests
   cd client && npm test -- --watchAll=false
   
   # Backend full tests
   cd src && npm test
   ```

### Response to Test Failures

- **1st attempt**: Review and fix refactored code
- **2nd attempt**: Rollback specific changes and retry
- **Failure report**: Present failure cause and options to user

## Implementation Phases

### Phase 1: Frontend Core Files
- `client/src/App.js`
- `client/src/authStore/authStore.js`
- `client/src/stores/chatStore.js`

### Phase 2: Frontend Components
- `client/src/components/*.js`
- `client/src/loginForm/*.js`

### Phase 3: Frontend TodoList
- `client/src/todoList/TodoList.js`
- `client/src/hooks/*.js`

### Phase 4: Backend Services
- `src/src/user/user.service.ts`
- `src/src/todo/todo.service.ts`
- `src/src/assistance/assistance.service.ts`

### Phase 5: Backend Controllers and Others
- `src/src/user/user.controller.ts`
- `src/src/todo/todo.controller.ts`
- `src/src/utils/*.ts`

### Phase 6: Test Files
- `client/src/**/*.test.js`
- `src/src/**/*.spec.ts`
- `src/test/**/*.e2e-spec.ts`

## Design Decisions and Rationales

### 1. Gradual Refactoring
**Decision**: Refactor sequentially file by file
**Rationale**: 
- Limit change scope for easy error tracking
- Verifiable at each step
- Minimize rollback scope if problems occur

### 2. Function Preservation First
**Decision**: All refactoring must fully preserve functionality
**Rationale**:
- Purpose of refactoring is code improvement, not feature changes
- No impact on user experience
- Verifiable through passing tests

### 3. Shorthand Property Reordering
**Decision**: Move shorthand properties to object top
**Rationale**:
- Consistent code style
- Improved readability
- Clear distinction of property types

### 4. Careful Arrow Function Application
**Decision**: Don't use arrow functions when `this` binding is needed
**Rationale**:
- Arrow functions don't have their own `this`
- React class component methods need caution
- Prevent function breakage

### 5. Comment Preservation Policy
**Decision**: Preserve explanatory comments, remove only code comments
**Rationale**:
- Comments that aid code understanding are valuable
- Korean comments are project standard
- TODO/FIXME needed for tracking future work

## Risk Mitigation

### Potential Risks and Mitigation Strategies

1. **`this` Binding Issues**
   - **Risk**: Loss of `this` context when converting to arrow functions
   - **Mitigation**: Don't convert React class component methods

2. **Template Literal Escaping**
   - **Risk**: Special character handling errors in backticks
   - **Mitigation**: Check and handle characters requiring escaping

3. **Destructuring Side Effects**
   - **Risk**: Undefined errors when destructuring nested objects
   - **Mitigation**: Apply only in safe cases, consider default values

4. **Test Failures**
   - **Risk**: Unexpected test failures due to refactoring
   - **Mitigation**: Run tests at each step, consider rollback on failure

5. **Large File Handling**
   - **Risk**: Increased error possibility when refactoring large files
   - **Mitigation**: Process files in logical sections

## Performance Considerations

Refactoring itself doesn't significantly impact runtime performance, but consider:

1. **Arrow functions**: Negligible performance difference from regular functions
2. **Template literals**: Similar performance to string concatenation
3. **Destructuring**: Slight overhead but negligible level
4. **Shorthand properties**: No performance impact

## Accessibility and Security

### Accessibility
- Refactoring doesn't affect UI/UX, so accessibility is maintained

### Security
- Only code structure changes, no security impact
- Don't change input validation or authentication logic

## Future Enhancements

Additional improvements to consider after refactoring completion:

1. **Optional Chaining**: `obj?.prop?.nested`
2. **Nullish Coalescing**: `value ?? defaultValue`
3. **Async/Await Expansion**: Convert Promise chains to async/await
4. **Spread Operator Expansion**: Object/array copying and merging
5. **ESLint Rules Addition**: Automatic formatting and style enforcement
