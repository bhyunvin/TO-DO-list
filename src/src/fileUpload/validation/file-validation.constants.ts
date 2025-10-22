import { FileUploadPolicyConfig } from './file-validation.interfaces';

/**
 * File validation constants and configuration
 */

// Maximum file size: 10MB in bytes
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed image extensions for profile images
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Allowed document extensions for TODO attachments
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.xlsx', '.pptx', '.docx', '.pdf', '.hwp', '.txt'];

// Blocked executable and script extensions for security
export const BLOCKED_EXTENSIONS = ['.exe', '.js', '.msi', '.bat', '.sh', '.cmd', '.vbs'];

// Error codes for validation failures
export const FILE_VALIDATION_ERRORS = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  BLOCKED_FILE_TYPE: 'BLOCKED_FILE_TYPE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
} as const;

// Error messages for validation failures
export const FILE_VALIDATION_MESSAGES = {
  [FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]: 'File size exceeds the maximum limit of 10MB',
  [FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]: 'File type is not allowed',
  [FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]: 'File type is blocked for security reasons',
  [FILE_VALIDATION_ERRORS.TOO_MANY_FILES]: 'Too many files selected',
  [FILE_VALIDATION_ERRORS.UPLOAD_FAILED]: 'File upload failed',
  [FILE_VALIDATION_ERRORS.STORAGE_ERROR]: 'File storage error occurred',
} as const;

// File upload policy configuration
export const FILE_UPLOAD_POLICY: FileUploadPolicyConfig = {
  profileImage: {
    maxSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_IMAGE_EXTENSIONS,
    maxCount: 1,
  },
  todoAttachment: {
    maxSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_DOCUMENT_EXTENSIONS,
    blockedTypes: BLOCKED_EXTENSIONS,
    maxCount: 10,
  },
};