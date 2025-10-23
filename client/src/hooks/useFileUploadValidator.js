import { useState, useCallback } from 'react';

/**
 * File validation constants (mirrored from backend)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOCUMENT_EXTENSIONS = ['.xlsx', '.pptx', '.docx', '.pdf', '.hwp', '.txt'];
const BLOCKED_EXTENSIONS = ['.exe', '.js', '.msi', '.bat', '.sh', '.cmd', '.vbs'];

const FILE_VALIDATION_ERRORS = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  BLOCKED_FILE_TYPE: 'BLOCKED_FILE_TYPE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
};

const FILE_VALIDATION_MESSAGES = {
  [FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]: 'File size exceeds the maximum limit of 10MB',
  [FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]: 'File type is not allowed',
  [FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]: 'File type is blocked for security reasons',
  [FILE_VALIDATION_ERRORS.TOO_MANY_FILES]: 'Too many files selected',
};

/**
 * User-friendly error messages with additional context
 */
const USER_FRIENDLY_MESSAGES = {
  [FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]: 'This file is too large. Please choose a file smaller than 10MB.',
  [FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]: 'This file type is not supported. Please choose a different file.',
  [FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]: 'This file type is not allowed for security reasons. Please choose a different file.',
  [FILE_VALIDATION_ERRORS.TOO_MANY_FILES]: 'You have selected too many files. Please reduce the number of files.',
};

const FILE_UPLOAD_POLICY = {
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

/**
 * Custom hook for file upload validation
 * @returns {Object} Validation functions and utilities
 */
export const useFileUploadValidator = () => {
  const [validationResults, setValidationResults] = useState([]);

  /**
   * Get file extension from filename
   * @param {string} fileName - The file name
   * @returns {string} File extension in lowercase
   */
  const getFileExtension = useCallback((fileName) => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(lastDot).toLowerCase() : '';
  }, []);

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Validate file size
   * @param {File} file - The file to validate
   * @param {number} maxSize - Maximum allowed size in bytes
   * @returns {Object} Validation result
   */
  const validateFileSize = useCallback((file, maxSize) => {
    if (file.size > maxSize) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.FILE_TOO_LARGE,
        errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.FILE_TOO_LARGE]} (${formatFileSize(file.size)})`,
      };
    }
    return { isValid: true };
  }, [formatFileSize]);

  /**
   * Validate file type
   * @param {File} file - The file to validate
   * @param {string[]} allowedTypes - Array of allowed file extensions
   * @param {string[]} blockedTypes - Array of blocked file extensions
   * @returns {Object} Validation result
   */
  const validateFileType = useCallback((file, allowedTypes = [], blockedTypes = []) => {
    const fileExtension = getFileExtension(file.name);
    
    // Check if file type is blocked
    if (blockedTypes.length > 0 && blockedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
        errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE]} (${fileExtension})`,
      };
    }
    
    // Check if file type is allowed
    if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE,
        errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE]} (${fileExtension})`,
      };
    }
    
    return { isValid: true };
  }, [getFileExtension]);

  /**
   * Validate file count
   * @param {FileList|File[]} files - Files to validate
   * @param {number} maxCount - Maximum allowed file count
   * @returns {Object} Validation result
   */
  const validateFileCount = useCallback((files, maxCount) => {
    const fileCount = files.length || files.length;
    if (fileCount > maxCount) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.TOO_MANY_FILES,
        errorMessage: `${FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.TOO_MANY_FILES]} (${fileCount}/${maxCount})`,
      };
    }
    return { isValid: true };
  }, []);

  /**
   * Validate a single file against configuration
   * @param {File} file - The file to validate
   * @param {Object} config - Validation configuration
   * @returns {Object} Validation result with file info
   */
  const validateSingleFile = useCallback((file, config) => {
    const sizeValidation = validateFileSize(file, config.maxSize);
    if (!sizeValidation.isValid) {
      return {
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: getFileExtension(file.name),
        ...sizeValidation,
      };
    }

    const typeValidation = validateFileType(
      file,
      config.allowedTypes || [],
      config.blockedTypes || []
    );
    if (!typeValidation.isValid) {
      return {
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: getFileExtension(file.name),
        ...typeValidation,
      };
    }

    return {
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: getFileExtension(file.name),
      isValid: true,
    };
  }, [validateFileSize, validateFileType, getFileExtension]);

  /**
   * Validate multiple files against configuration
   * @param {FileList|File[]} files - Files to validate
   * @param {string} category - File category ('profileImage' or 'todoAttachment')
   * @returns {Object[]} Array of validation results
   */
  const validateFiles = useCallback((files, category) => {
    const config = FILE_UPLOAD_POLICY[category];
    if (!config) {
      throw new Error(`Invalid file category: ${category}`);
    }

    const fileArray = Array.from(files);
    
    // Validate file count first
    const countValidation = validateFileCount(fileArray, config.maxCount);
    if (!countValidation.isValid) {
      // Return count error for all files
      return fileArray.map(file => ({
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: getFileExtension(file.name),
        ...countValidation,
      }));
    }

    // Validate each file individually
    const results = fileArray.map(file => validateSingleFile(file, config));
    setValidationResults(results);
    
    return results;
  }, [validateFileCount, validateSingleFile, getFileExtension]);

  /**
   * Get only valid files from validation results
   * @param {FileList|File[]} files - Files to validate
   * @param {string} category - File category
   * @returns {File[]} Array of valid files
   */
  const getValidFiles = useCallback((files, category) => {
    const results = validateFiles(files, category);
    return results.filter(result => result.isValid).map(result => result.file);
  }, [validateFiles]);

  /**
   * Check if a file type is valid for a category
   * @param {string} fileName - File name to check
   * @param {string} category - File category
   * @returns {boolean} True if file type is valid
   */
  const isValidFileType = useCallback((fileName, category) => {
    const config = FILE_UPLOAD_POLICY[category];
    if (!config) return false;

    const fileExtension = getFileExtension(fileName);
    
    // Check if blocked
    if (config.blockedTypes && config.blockedTypes.includes(fileExtension)) {
      return false;
    }
    
    // Check if allowed
    if (config.allowedTypes && !config.allowedTypes.includes(fileExtension)) {
      return false;
    }
    
    return true;
  }, [getFileExtension]);

  /**
   * Get file upload policy for a category
   * @param {string} category - File category
   * @returns {Object} Policy configuration
   */
  const getUploadPolicy = useCallback((category) => {
    return FILE_UPLOAD_POLICY[category] || null;
  }, []);

  /**
   * Get user-friendly error message for display
   * @param {Object} error - Validation error object
   * @returns {string} User-friendly error message
   */
  const getUserFriendlyMessage = useCallback((error) => {
    const baseMessage = USER_FRIENDLY_MESSAGES[error.errorCode] || error.errorMessage;
    
    switch (error.errorCode) {
      case FILE_VALIDATION_ERRORS.FILE_TOO_LARGE:
        return `${baseMessage} (Current size: ${formatFileSize(error.fileSize || 0)})`;
      
      case FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE:
      case FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE:
        return `${baseMessage} (File type: ${error.fileType || 'unknown'})`;
      
      default:
        return baseMessage;
    }
  }, [formatFileSize]);

  /**
   * Format multiple validation errors into a summary message
   * @param {Object[]} errors - Array of validation errors
   * @returns {string} Formatted error summary
   */
  const formatErrorSummary = useCallback((errors) => {
    if (errors.length === 0) {
      return '';
    }

    if (errors.length === 1) {
      return `"${errors[0].fileName}": ${getUserFriendlyMessage(errors[0])}`;
    }

    // Group errors by type
    const errorGroups = errors.reduce((groups, error) => {
      const key = error.errorCode;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(error);
      return groups;
    }, {});

    const messages = [];
    for (const [errorCode, fileErrors] of Object.entries(errorGroups)) {
      if (fileErrors.length === 1) {
        messages.push(`"${fileErrors[0].fileName}": ${getUserFriendlyMessage(fileErrors[0])}`);
      } else {
        const fileNames = fileErrors.map(e => `"${e.fileName}"`).join(', ');
        messages.push(`${fileNames}: ${getUserFriendlyMessage(fileErrors[0])}`);
      }
    }

    return messages.join('; ');
  }, [getUserFriendlyMessage]);

  /**
   * Parse server error response and extract validation errors
   * @param {Object} errorResponse - Server error response
   * @returns {Object[]} Array of validation errors
   */
  const parseServerErrors = useCallback((errorResponse) => {
    if (errorResponse?.errors && Array.isArray(errorResponse.errors)) {
      return errorResponse.errors;
    }

    // Handle different error response formats
    if (errorResponse?.response?.data?.errors) {
      return errorResponse.response.data.errors;
    }

    if (errorResponse?.message) {
      return [{
        fileName: 'Unknown',
        errorCode: 'UPLOAD_FAILED',
        errorMessage: errorResponse.message,
      }];
    }

    return [{
      fileName: 'Unknown',
      errorCode: 'UPLOAD_FAILED',
      errorMessage: 'An unexpected error occurred during file upload',
    }];
  }, []);

  /**
   * Clear validation results
   */
  const clearValidationResults = useCallback(() => {
    setValidationResults([]);
  }, []);

  return {
    // Validation functions
    validateFiles,
    validateSingleFile,
    getValidFiles,
    isValidFileType,
    
    // Utility functions
    formatFileSize,
    getFileExtension,
    getUploadPolicy,
    getUserFriendlyMessage,
    formatErrorSummary,
    parseServerErrors,
    
    // State and actions
    validationResults,
    clearValidationResults,
    
    // Constants
    FILE_VALIDATION_ERRORS,
    FILE_VALIDATION_MESSAGES,
    USER_FRIENDLY_MESSAGES,
    FILE_UPLOAD_POLICY,
  };
};

export default useFileUploadValidator;