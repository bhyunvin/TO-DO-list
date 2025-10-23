import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useFileUploadValidator } from './useFileUploadValidator';

/**
 * Custom hook for managing file upload progress and status
 */
export const useFileUploadProgress = () => {
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'validating', 'uploading', 'success', 'error'
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  
  const { validateFiles, parseServerErrors, formatErrorSummary } = useFileUploadValidator();
  const cancelTokenRef = useRef(null);

  /**
   * Reset upload state
   */
  const resetUploadState = useCallback(() => {
    setUploadStatus('idle');
    setUploadProgress({});
    setUploadErrors([]);
    setUploadedFiles([]);
    setValidationResults([]);
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Upload cancelled');
      cancelTokenRef.current = null;
    }
  }, []);

  /**
   * Update progress for a specific file
   */
  const updateFileProgress = useCallback((fileName, progress) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileName]: Math.round(progress),
    }));
  }, []);

  /**
   * Update overall progress based on individual file progress
   */
  const updateOverallProgress = useCallback((files) => {
    const totalProgress = Object.values(uploadProgress).reduce((sum, progress) => sum + progress, 0);
    const averageProgress = files.length > 0 ? totalProgress / files.length : 0;
    return Math.round(averageProgress);
  }, [uploadProgress]);

  /**
   * Validate files before upload
   */
  const validateFilesForUpload = useCallback((files, category) => {
    setUploadStatus('validating');
    
    try {
      const results = validateFiles(files, category);
      setValidationResults(results);
      
      const hasErrors = results.some(result => !result.isValid);
      if (hasErrors) {
        const errors = results.filter(result => !result.isValid);
        setUploadErrors(errors);
        setUploadStatus('error');
        return { isValid: false, errors };
      }
      
      setUploadErrors([]);
      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = error.message || 'Validation failed';
      setUploadErrors([{
        fileName: 'Validation',
        errorCode: 'VALIDATION_ERROR',
        errorMessage,
      }]);
      setUploadStatus('error');
      return { isValid: false, errors: [{ errorMessage }] };
    }
  }, [validateFiles]);

  /**
   * Upload files with progress tracking
   */
  const uploadFiles = useCallback(async (files, uploadUrl, additionalData = {}) => {
    if (!files || files.length === 0) {
      throw new Error('No files to upload');
    }

    setUploadStatus('uploading');
    setUploadProgress({});
    setUploadErrors([]);
    
    // Create cancel token for this upload
    cancelTokenRef.current = axios.CancelToken.source();

    try {
      const formData = new FormData();
      
      // Add files to form data
      Array.from(files).forEach((file) => {
        formData.append('files', file);
        // Initialize progress for each file
        updateFileProgress(file.name, 0);
      });

      // Add additional data
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        cancelToken: cancelTokenRef.current.token,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          // Update progress for all files equally (since we can't track individual file progress)
          Array.from(files).forEach((file) => {
            updateFileProgress(file.name, progress);
          });
        },
      });

      // Handle successful upload
      const uploadedFilesList = response.data.uploadedFiles || [];
      setUploadedFiles(uploadedFilesList);
      
      // Check for partial success (some files failed)
      const totalFiles = Array.from(files).length;
      const successfulUploads = uploadedFilesList.length;
      
      if (successfulUploads === totalFiles) {
        setUploadStatus('success');
      } else if (successfulUploads > 0) {
        setUploadStatus('partial_success');
        // Set errors for files that weren't uploaded
        const failedFiles = Array.from(files).filter(file => 
          !uploadedFilesList.some(uploaded => 
            uploaded.originalFileName === file.name || uploaded.fileName === file.name
          )
        );
        const failedErrors = failedFiles.map(file => ({
          fileName: file.name,
          errorCode: 'UPLOAD_FAILED',
          errorMessage: 'File was not uploaded successfully',
        }));
        setUploadErrors(failedErrors);
      } else {
        setUploadStatus('error');
      }
      
      return {
        success: successfulUploads > 0,
        data: response.data,
        uploadedFiles: uploadedFilesList,
        partialSuccess: successfulUploads > 0 && successfulUploads < totalFiles,
        totalFiles,
        successfulUploads,
      };

    } catch (error) {
      if (axios.isCancel(error)) {
        setUploadStatus('idle');
        return { success: false, cancelled: true };
      }

      // Parse server errors
      const serverErrors = parseServerErrors(error.response?.data || error);
      setUploadErrors(serverErrors);
      setUploadStatus('error');
      
      return {
        success: false,
        errors: serverErrors,
        message: formatErrorSummary(serverErrors),
      };
    } finally {
      cancelTokenRef.current = null;
    }
  }, [updateFileProgress, parseServerErrors, formatErrorSummary]);

  /**
   * Upload files with validation
   */
  const uploadFilesWithValidation = useCallback(async (files, uploadUrl, category, additionalData = {}) => {
    // First validate files
    const validation = validateFilesForUpload(files, category);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        message: 'File validation failed',
      };
    }

    // Then upload files
    return await uploadFiles(files, uploadUrl, additionalData);
  }, [validateFilesForUpload, uploadFiles]);

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Upload cancelled by user');
      cancelTokenRef.current = null;
    }
    setUploadStatus('idle');
    setUploadProgress({});
  }, []);

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(async (files, uploadUrl, additionalData = {}) => {
    resetUploadState();
    return await uploadFiles(files, uploadUrl, additionalData);
  }, [resetUploadState, uploadFiles]);

  /**
   * Get detailed upload summary with enhanced metrics
   */
  const getUploadSummary = useCallback(() => {
    const totalFiles = validationResults.length;
    const validFiles = validationResults.filter(r => r.isValid).length;
    const invalidFiles = totalFiles - validFiles;
    const uploadedCount = uploadedFiles.length;
    const failedCount = uploadErrors.length;
    
    // Calculate overall progress
    const overallProgress = totalFiles > 0 ? 
      Object.values(uploadProgress).reduce((sum, progress) => sum + progress, 0) / totalFiles : 0;
    
    // Calculate upload statistics
    const totalSize = validationResults.reduce((sum, result) => {
      return sum + (result.file?.size || 0);
    }, 0);
    
    const uploadedSize = uploadedFiles.reduce((sum, file) => {
      return sum + (file.fileSize || 0);
    }, 0);
    
    return {
      totalFiles,
      validFiles,
      invalidFiles,
      uploadedCount,
      failedCount,
      hasErrors: uploadErrors.length > 0,
      isComplete: uploadStatus === 'success',
      isPartialSuccess: uploadStatus === 'partial_success',
      isUploading: uploadStatus === 'uploading',
      isValidating: uploadStatus === 'validating',
      isIdle: uploadStatus === 'idle',
      successRate: totalFiles > 0 ? (uploadedCount / totalFiles) * 100 : 0,
      overallProgress: Math.round(overallProgress),
      totalSize,
      uploadedSize,
      remainingFiles: totalFiles - uploadedCount - failedCount,
      canRetry: uploadStatus === 'partial_success' || uploadStatus === 'error',
      statusMessage: getStatusMessage(),
    };
  }, [validationResults, uploadedFiles, uploadErrors, uploadStatus, uploadProgress]);

  /**
   * Get user-friendly status message with enhanced details
   */
  const getStatusMessage = useCallback(() => {
    const totalFiles = validationResults.length;
    const uploadedCount = uploadedFiles.length;
    const failedCount = uploadErrors.length;
    const overallProgress = Object.values(uploadProgress).reduce((sum, progress) => sum + progress, 0) / Math.max(totalFiles, 1);
    
    switch (uploadStatus) {
      case 'validating':
        return `${totalFiles}개 파일 보안 검사 및 유효성 검증 중...`;
      case 'uploading':
        return `${totalFiles}개 파일 업로드 중... (${Math.round(overallProgress)}% 완료)`;
      case 'success':
        return `🎉 ${uploadedCount}개 파일이 성공적으로 업로드되었습니다!`;
      case 'partial_success':
        return `⚠️ ${uploadedCount}개 파일 업로드 완료, ${failedCount}개 파일 실패`;
      case 'error':
        return `❌ 업로드 실패 (${failedCount}개 파일) - 다시 시도해주세요`;
      default:
        return '';
    }
  }, [uploadStatus, validationResults, uploadedFiles, uploadErrors, uploadProgress]);

  return {
    // State
    uploadStatus,
    uploadProgress,
    uploadErrors,
    uploadedFiles,
    validationResults,
    
    // Actions
    validateFilesForUpload,
    uploadFiles,
    uploadFilesWithValidation,
    cancelUpload,
    retryUpload,
    resetUploadState,
    updateFileProgress,
    
    // Utilities
    getUploadSummary,
    getStatusMessage,
    updateOverallProgress,
  };
};

export default useFileUploadProgress;