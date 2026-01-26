import { useState, useCallback } from 'react';

/**
 * 파일 유효성 검사 상수 (백엔드와 동일)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOCUMENT_EXTENSIONS: string[] = [];
const BLOCKED_EXTENSIONS = [
  '.exe',
  '.js',
  '.msi',
  '.bat',
  '.sh',
  '.cmd',
  '.vbs',
];

const FILE_VALIDATION_ERRORS = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  BLOCKED_FILE_TYPE: 'BLOCKED_FILE_TYPE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
} as const;

const FILE_VALIDATION_MESSAGES: Record<string, string> = {
  [FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]:
    '파일 크기가 최대 제한인 10MB를 초과합니다',
  [FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]: '허용되지 않는 파일 형식입니다',
  [FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]:
    '보안상의 이유로 차단된 파일 형식입니다',
  [FILE_VALIDATION_ERRORS.TOO_MANY_FILES]: '너무 많은 파일이 선택되었습니다',
};

/**
 * 추가 컨텍스트가 포함된 사용자 친화적 오류 메시지
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  [FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]:
    '파일이 너무 큽니다. 10MB보다 작은 파일을 선택해주세요.',
  [FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]:
    '지원되지 않는 파일 형식입니다. 다른 파일을 선택해주세요.',
  [FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]:
    '보안상의 이유로 허용되지 않는 파일 형식입니다. 다른 파일을 선택해주세요.',
  [FILE_VALIDATION_ERRORS.TOO_MANY_FILES]:
    '너무 많은 파일을 선택했습니다. 파일 수를 줄여주세요.',
};

interface FileUploadConfig {
  maxSize: number;
  allowedTypes?: string[];
  blockedTypes?: string[];
  maxCount: number;
}

const FILE_UPLOAD_POLICY: Record<string, FileUploadConfig> = {
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

export interface ValidationResult {
  file?: File;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

interface ValidationSingleResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * 파일 업로드 유효성 검사를 위한 커스텀 훅
 * @returns {Object} 유효성 검사 함수 및 유틸리티
 */
export const useFileUploadValidator = () => {
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);

  /**
   * 파일명에서 파일 확장자 가져오기
   * @param {string} fileName - 파일명
   * @returns {string} 소문자 파일 확장자
   */
  const getFileExtension = useCallback((fileName: string) => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot).toLowerCase();
  }, []);

  /**
   * 사람이 읽을 수 있는 형식으로 파일 크기 포맷
   * @param {number} bytes - 바이트 단위 파일 크기
   * @returns {string} 포맷된 파일 크기
   */
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  }, []);

  /**
   * 파일 크기 유효성 검사
   * @param {File} file - 검사할 파일
   * @param {number} maxSize - 바이트 단위 최대 허용 크기
   * @returns {Object} 유효성 검사 결과
   */
  const validateFileSize = useCallback(
    (file: File, maxSize: number): ValidationSingleResult => {
      if (file.size > maxSize) {
        return {
          isValid: false,
          errorCode: FILE_VALIDATION_ERRORS.FILE_TOO_LARGE,
          errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]} (${formatFileSize(file.size)})`,
        };
      }
      return { isValid: true };
    },
    [formatFileSize],
  );

  /**
   * 파일 유형 유효성 검사
   * @param {File} file - 검사할 파일
   * @param {string[]} allowedTypes - 허용된 파일 확장자 배열
   * @param {string[]} blockedTypes - 차단된 파일 확장자 배열
   * @returns {Object} 유효성 검사 결과
   */
  const validateFileType = useCallback(
    (
      file: File,
      allowedTypes: string[] = [],
      blockedTypes: string[] = [],
    ): ValidationSingleResult => {
      const fileExtension = getFileExtension(file.name);

      if (blockedTypes.length > 0 && blockedTypes.includes(fileExtension)) {
        return {
          isValid: false,
          errorCode: FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
          errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]} (${fileExtension})`,
        };
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension)) {
        return {
          isValid: false,
          errorCode: FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE,
          errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]} (${fileExtension})`,
        };
      }

      return { isValid: true };
    },
    [getFileExtension],
  );

  /**
   * 파일 개수 유효성 검사
   * @param {FileList|File[]} files - 검사할 파일들
   * @param {number} maxCount - 최대 허용 파일 개수
   * @returns {Object} 유효성 검사 결과
   */
  const validateFileCount = useCallback(
    (files: File[] | FileList, maxCount: number): ValidationSingleResult => {
      const fileCount = files.length;
      if (fileCount > maxCount) {
        return {
          isValid: false,
          errorCode: FILE_VALIDATION_ERRORS.TOO_MANY_FILES,
          errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.TOO_MANY_FILES]} (${fileCount}/${maxCount})`,
        };
      }
      return { isValid: true };
    },
    [],
  );

  /**
   * 구성에 따라 단일 파일 유효성 검사
   * @param {File} file - 검사할 파일
   * @param {Object} config - 유효성 검사 구성
   * @returns {Object} 파일 정보가 포함된 유효성 검사 결과
   */
  const validateSingleFile = useCallback(
    (file: File, config: FileUploadConfig): ValidationResult => {
      const { maxSize, allowedTypes = [], blockedTypes = [] } = config;
      const { name, size } = file;
      const fileType = getFileExtension(name);

      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.isValid) {
        return {
          file,
          fileName: name,
          fileSize: size,
          fileType,
          isValid: false,
          errorCode: sizeValidation.errorCode,
          errorMessage: sizeValidation.errorMessage,
        };
      }

      const typeValidation = validateFileType(file, allowedTypes, blockedTypes);
      if (!typeValidation.isValid) {
        return {
          file,
          fileName: name,
          fileSize: size,
          fileType,
          isValid: false,
          errorCode: typeValidation.errorCode,
          errorMessage: typeValidation.errorMessage,
        };
      }

      return {
        file,
        fileName: name,
        fileSize: size,
        fileType,
        isValid: true,
      };
    },
    [validateFileSize, validateFileType, getFileExtension],
  );

  /**
   * 구성에 따라 여러 파일 유효성 검사
   * @param {FileList|File[]} files - 검사할 파일들
   * @param {string} category - 파일 카테고리 ('profileImage' 또는 'todoAttachment')
   * @returns {Object[]} 유효성 검사 결과 배열
   */
  const validateFiles = useCallback(
    (files: File[] | FileList, category: string): ValidationResult[] => {
      const config = FILE_UPLOAD_POLICY[category];
      if (!config) {
        throw new Error(`Invalid file category: ${category}`);
      }

      const fileArray = Array.from(files);
      const { maxCount } = config;

      const countValidation = validateFileCount(fileArray, maxCount);
      if (!countValidation.isValid) {
        return fileArray.map((file) => {
          const { name, size } = file;
          return {
            file,
            fileName: name,
            fileSize: size,
            fileType: getFileExtension(name),
            isValid: false,
            errorCode: countValidation.errorCode,
            errorMessage: countValidation.errorMessage,
          };
        });
      }

      const results = fileArray.map((file) => validateSingleFile(file, config));
      setValidationResults(results);

      return results;
    },
    [validateFileCount, validateSingleFile, getFileExtension],
  );

  /**
   * 유효성 검사 결과에서 유효한 파일만 가져오기
   * @param {FileList|File[]} files - 검사할 파일들
   * @param {string} category - 파일 카테고리
   * @returns {File[]} 유효한 파일 배열
   */
  const getValidFiles = useCallback(
    (files: File[] | FileList, category: string) => {
      const results = validateFiles(files, category);
      return results
        .filter((result) => result.isValid)
        .map((result) => result.file);
    },
    [validateFiles],
  );

  /**
   * 카테고리에 대해 파일 유형이 유효한지 확인
   * @param {string} fileName - 확인할 파일명
   * @param {string} category - 파일 카테고리
   * @returns {boolean} 파일 유형이 유효하면 true
   */
  const isValidFileType = useCallback(
    (fileName: string, category: string) => {
      const config = FILE_UPLOAD_POLICY[category];
      if (!config) return false;

      const fileExtension = getFileExtension(fileName);

      if (config.blockedTypes?.includes(fileExtension)) {
        return false;
      }

      if (config.allowedTypes && !config.allowedTypes.includes(fileExtension)) {
        return false;
      }

      return true;
    },
    [getFileExtension],
  );

  /**
   * 카테고리에 대한 파일 업로드 정책 가져오기
   * @param {string} category - 파일 카테고리
   * @returns {Object} 정책 구성
   */
  const getUploadPolicy = useCallback((category: string) => {
    return FILE_UPLOAD_POLICY[category] || null;
  }, []);

  /**
   * 표시를 위한 사용자 친화적 오류 메시지 가져오기
   * @param {Object} error - 유효성 검사 오류 객체
   * @returns {string} 사용자 친화적 오류 메시지
   */
  const getUserFriendlyMessage = useCallback(
    (error: ValidationResult) => {
      const {
        errorCode,
        errorMessage,
        fileSize = 0,
        fileType = 'unknown',
      } = error;
      const baseMessage =
        (errorCode && USER_FRIENDLY_MESSAGES[errorCode]) ||
        errorMessage ||
        'Unknown error';

      switch (errorCode) {
        case FILE_VALIDATION_ERRORS.FILE_TOO_LARGE:
          return `${baseMessage} (현재 크기: ${formatFileSize(fileSize)})`;

        case FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE:
        case FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE:
          return `${baseMessage} (파일 형식: ${fileType})`;

        default:
          return baseMessage;
      }
    },
    [formatFileSize],
  );

  /**
   * 여러 유효성 검사 오류를 요약 메시지로 포맷
   * @param {Object[]} errors - 유효성 검사 오류 배열
   * @returns {string} 포맷된 오류 요약
   */
  const formatErrorSummary = useCallback(
    (errors: ValidationResult[]) => {
      if (errors.length === 0) {
        return '';
      }

      if (errors.length === 1) {
        const { fileName } = errors[0];
        return `"${fileName}": ${getUserFriendlyMessage(errors[0])}`;
      }

      const errorGroups = errors.reduce<Record<string, ValidationResult[]>>(
        (groups, error) => {
          const errorCode = error.errorCode || 'UNKNOWN';
          if (!groups[errorCode]) {
            groups[errorCode] = [];
          }
          groups[errorCode].push(error);
          return groups;
        },
        {},
      );

      const messages: string[] = [];
      for (const [, fileErrors] of Object.entries(errorGroups)) {
        if (fileErrors.length === 1) {
          const { fileName } = fileErrors[0];
          messages.push(
            `"${fileName}": ${getUserFriendlyMessage(fileErrors[0])}`,
          );
        } else {
          const fileNames = fileErrors
            .map(({ fileName }) => `"${fileName}"`)
            .join(', ');
          messages.push(
            `${fileNames}: ${getUserFriendlyMessage(fileErrors[0])}`,
          );
        }
      }

      return messages.join('; ');
    },
    [getUserFriendlyMessage],
  );

  /**
   * 서버 오류 응답을 파싱하고 유효성 검사 오류 추출
   * @param {Object} errorResponse - 서버 오류 응답
   * @returns {Object[]} 유효성 검사 오류 배열
   */
  const parseServerErrors = useCallback(
    (errorResponse: {
      errors?: ValidationResult[];
      response?: { data?: { errors?: ValidationResult[] } };
      message?: string;
    }): ValidationResult[] => {
      if (errorResponse?.errors && Array.isArray(errorResponse.errors)) {
        return errorResponse.errors;
      }

      if (errorResponse?.response?.data?.errors) {
        return errorResponse.response.data.errors;
      }

      if (errorResponse?.message) {
        return [
          {
            fileName: 'Unknown',
            errorCode: 'UPLOAD_FAILED',
            errorMessage: errorResponse.message,
            isValid: false,
          },
        ];
      }

      return [
        {
          fileName: 'Unknown',
          errorCode: 'UPLOAD_FAILED',
          errorMessage: '파일 업로드 중 예기치 않은 오류가 발생했습니다',
          isValid: false,
        },
      ];
    },
    [],
  );

  /**
   * 유효성 검사 결과 초기화
   */
  const clearValidationResults = useCallback(() => {
    setValidationResults([]);
  }, []);

  return {
    validateFiles,
    validateSingleFile,
    getValidFiles,
    isValidFileType,

    formatFileSize,
    getFileExtension,
    getUploadPolicy,
    getUserFriendlyMessage,
    formatErrorSummary,
    parseServerErrors,

    validationResults,
    clearValidationResults,

    FILE_VALIDATION_ERRORS,
    FILE_VALIDATION_MESSAGES,
    USER_FRIENDLY_MESSAGES,
    FILE_UPLOAD_POLICY,
  };
};

export default useFileUploadValidator;
