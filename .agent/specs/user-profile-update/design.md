# Design Document

## Overview

The user profile update feature enables authenticated users to modify their personal information including name, email, description, and profile image. The design leverages the existing user authentication system, file upload infrastructure, and validation patterns established in the application.

The feature integrates seamlessly with the current TodoList interface by adding an "Update Profile" button in the header area. The update form reuses the design patterns and validation logic from the existing SignupForm component while adapting them for profile modification scenarios.

## Architecture

### Component Architecture

```
TodoContainer (Modified)
├── User Info Header (Modified)
│   ├── Welcome Message
│   ├── Update Profile Button (NEW)
│   └── Logout Button
├── ProfileUpdateForm (NEW)
│   ├── Form Fields
│   ├── Profile Image Upload
│   ├── File Upload Progress
│   └── Form Actions
└── Existing Todo Components
```

### Backend Architecture

```
UserController (Extended)
├── Existing endpoints
└── PATCH /user/profile (NEW)

UserService (Extended)
├── Existing methods
└── updateProfile() (NEW)

UserDto (Extended)
├── Existing fields
└── UpdateUserDto (NEW)
```

## Components and Interfaces

### Frontend Components

#### 1. ProfileUpdateForm Component
**Location**: `client/src/components/ProfileUpdateForm.js`

**Props Interface**:
```javascript
{
  user: UserEntity,           // Current user data
  onSave: Function,          // Profile save handler
  onCancel: Function,        // Cancel handler
  isSubmitting: boolean      // Loading state
}
```

**State Management**:
- Form field states (userName, userEmail, userDescription)
- Profile image upload state
- Validation error states
- File upload progress tracking

**Key Features**:
- Pre-populated form fields with current user data
- Profile image upload with preview
- Real-time validation feedback
- File upload progress indication
- Form submission with loading states

#### 2. TodoContainer Modifications
**Location**: `client/src/todoList/TodoList.js`

**New State**:
```javascript
const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
```

**New Handler**:
```javascript
const handleUpdateProfile = async (profileData) => {
  // Profile update logic with API call
};
```

### Backend Components

#### 1. UpdateUserDto
**Location**: `src/src/user/user.dto.ts`

```typescript
export class UpdateUserDto {
  userName?: string;
  userEmail?: string;
  userDescription?: string;
  // userPassword excluded for security
  // userId excluded as it shouldn't be changeable
}
```

#### 2. UserController Extension
**Location**: `src/src/user/user.controller.ts`

**New Endpoint**:
```typescript
@UseGuards(AuthenticatedGuard)
@Patch('profile')
@UseInterceptors(
  FileInterceptor('profileImage', profileImageMulterOptions),
  ProfileImageValidationInterceptor,
)
async updateProfile(
  @Session() session: SessionInterface & SessionData,
  @Body() updateUserDto: UpdateUserDto,
  @UploadedFile() profileImageFile: Express.Multer.File,
  @Ip() ip: string,
): Promise<Omit<UserEntity, 'userPassword'>>
```

#### 3. UserService Extension
**Location**: `src/src/user/user.service.ts`

**New Method**:
```typescript
async updateProfile(
  userSeq: number,
  updateUserDto: UpdateUserDto,
  profileImageFile: Express.Multer.File,
  ip: string,
): Promise<Omit<UserEntity, 'userPassword'>>
```

## Data Models

### Request/Response Models

#### Profile Update Request
```typescript
{
  userName: string,           // Updated user name
  userEmail: string,          // Updated email address
  userDescription: string,    // Updated description
  profileImage?: File         // Optional new profile image
}
```

#### Profile Update Response
```typescript
{
  userSeq: number,
  userId: string,
  userName: string,
  userEmail: string,
  userDescription: string,
  userProfileImageFileGroupNo: number,
  adminYn: string
  // userPassword excluded for security
}
```

### Validation Rules

#### Field Validation
- **userName**: Required, max 200 characters
- **userEmail**: Required, valid email format, max 100 characters, unique across users
- **userDescription**: Optional, max 4000 characters
- **profileImage**: Optional, follows existing profile image upload policies

#### Business Rules
- Email uniqueness check (excluding current user)
- Profile image validation using existing file upload policies
- Session-based authentication required
- Audit trail logging for all updates

## Error Handling

### Frontend Error Handling

#### Validation Errors
```javascript
// Field-level validation errors
{
  nameError: string,
  emailError: string,
  profileImageError: string
}

// File upload errors
{
  uploadErrors: Array<{
    fileName: string,
    errorMessage: string,
    errorCode: string
  }>
}
```

#### User Feedback
- Real-time validation feedback during form input
- File upload progress and error indication
- Success/failure notifications using SweetAlert2
- Loading states during form submission

### Backend Error Handling

#### HTTP Status Codes
- **200**: Successful profile update
- **400**: Validation errors (duplicate email, invalid file, etc.)
- **401**: Unauthorized (session expired)
- **500**: Internal server error

#### Error Response Format
```typescript
{
  message: string,
  error?: string,
  errorCode?: string,
  errors?: Array<{
    fileName: string,
    errorMessage: string,
    errorCode: string
  }>
}
```

## Testing Strategy

### Frontend Testing
- **Component Testing**: ProfileUpdateForm component with various user data scenarios
- **Integration Testing**: Profile update flow from TodoContainer
- **File Upload Testing**: Profile image upload with validation scenarios
- **Error Handling Testing**: Network failures and validation errors

### Backend Testing
- **Unit Testing**: UserService.updateProfile method with various input scenarios
- **Integration Testing**: Profile update endpoint with authentication
- **File Upload Testing**: Profile image validation and storage
- **Database Testing**: User data updates and email uniqueness constraints

### Test Scenarios

#### Happy Path
1. User updates name and email successfully
2. User uploads new profile image successfully
3. User updates description only
4. User cancels profile update without changes

#### Error Scenarios
1. Duplicate email address validation
2. Invalid profile image file upload
3. Network failure during form submission
4. Session expiration during update
5. File upload size/type violations

## Security Considerations

### Authentication & Authorization
- Session-based authentication required for all profile operations
- User can only update their own profile data
- Password updates excluded from this feature (separate security flow)

### Input Validation
- Server-side validation for all user inputs
- File upload validation using existing security policies
- SQL injection prevention through TypeORM parameterized queries
- XSS prevention through input sanitization

### Data Protection
- Password field excluded from update operations
- Sensitive user data logged appropriately in audit trails
- Profile image files stored securely using existing file management system

## Performance Considerations

### Frontend Optimization
- Form validation debouncing to reduce server calls
- Image preview generation without server round-trips
- Progressive file upload with cancellation support
- Efficient re-rendering through proper state management

### Backend Optimization
- Database transaction management for profile updates
- Efficient file upload handling using existing infrastructure
- Proper indexing on email field for uniqueness checks
- Audit logging optimization

## Integration Points

### Existing Systems Integration
- **File Upload System**: Reuses existing profile image upload policies and validation
- **Authentication System**: Integrates with current session management
- **Audit System**: Leverages existing audit column infrastructure
- **Validation System**: Uses established file validation services

### UI/UX Integration
- **Design Consistency**: Follows existing form styling and layout patterns
- **Navigation Flow**: Seamless integration with TodoList interface
- **Error Handling**: Consistent with existing error presentation patterns
- **Loading States**: Matches existing loading indicator styles