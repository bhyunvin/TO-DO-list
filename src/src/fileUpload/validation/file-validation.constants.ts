import { FileUploadPolicyConfig } from './file-validation.interfaces';

/**
 * File validation constants and configuration
 */

// 최대 파일 크기: 10MB (바이트 단위)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 프로필 이미지에 허용되는 이미지 확장자
export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];

// TODO 첨부 파일에 허용되는 문서 확장자
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.xlsx',
  '.pptx',
  '.docx',
  '.pdf',
  '.hwp',
  '.txt',
];

// 보안을 위해 차단된 실행 파일 및 스크립트 확장자
export const BLOCKED_EXTENSIONS = [
  '.exe',
  '.js',
  '.msi',
  '.bat',
  '.sh',
  '.cmd',
  '.vbs',
];

// 검증 실패에 대한 오류 코드
export const FILE_VALIDATION_ERRORS = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  BLOCKED_FILE_TYPE: 'BLOCKED_FILE_TYPE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
} as const;

// 검증 실패에 대한 오류 메시지
export const FILE_VALIDATION_MESSAGES = {
  [FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]:
    'File size exceeds the maximum limit of 10MB',
  [FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]: 'File type is not allowed',
  [FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]:
    'File type is blocked for security reasons',
  [FILE_VALIDATION_ERRORS.TOO_MANY_FILES]: 'Too many files selected',
  [FILE_VALIDATION_ERRORS.UPLOAD_FAILED]: 'File upload failed',
  [FILE_VALIDATION_ERRORS.STORAGE_ERROR]: 'File storage error occurred',
} as const;

// 파일 업로드 정책 설정
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
