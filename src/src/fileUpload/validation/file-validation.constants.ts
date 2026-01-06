import { FileUploadPolicyConfig } from './file-validation.interfaces';

/**
 * 파일 검증 상수 및 설정
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

// 할 일 첨부 파일에 허용되는 문서 확장자
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
    '파일 크기가 최대 제한인 10MB를 초과합니다',
  [FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]: '허용되지 않는 파일 형식입니다',
  [FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]:
    '보안상의 이유로 차단된 파일 형식입니다',
  [FILE_VALIDATION_ERRORS.TOO_MANY_FILES]: '선택한 파일이 너무 많습니다',
  [FILE_VALIDATION_ERRORS.UPLOAD_FAILED]: '파일 업로드에 실패했습니다',
  [FILE_VALIDATION_ERRORS.STORAGE_ERROR]: '파일 저장 중 오류가 발생했습니다',
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
    allowedTypes: [], // 빈 배열: 모든 파일 허용 (blockedTypes 제외)
    blockedTypes: BLOCKED_EXTENSIONS,
    maxCount: 10,
  },
};
