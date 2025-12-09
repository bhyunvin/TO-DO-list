import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useFileUploadValidator } from './useFileUploadValidator';

/**
 * 파일 업로드 진행 상황 및 상태를 관리하는 커스텀 훅
 */
export const useFileUploadProgress = () => {
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [validationResults, setValidationResults] = useState([]);

  const { validateFiles, parseServerErrors, formatErrorSummary } =
    useFileUploadValidator();
  const cancelTokenRef = useRef(null);

  /**
   * 업로드 상태 초기화
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
   * 특정 파일의 진행 상황 업데이트
   */
  const updateFileProgress = useCallback((fileName, progress) => {
    setUploadProgress((prev) => ({
      ...prev,
      [fileName]: Math.round(progress),
    }));
  }, []);

  /**
   * 개별 파일 진행 상황을 기반으로 전체 진행 상황 업데이트
   */
  const updateOverallProgress = useCallback(
    (files) => {
      const totalProgress = Object.values(uploadProgress).reduce(
        (sum, progress) => sum + progress,
        0,
      );
      const averageProgress =
        files.length > 0 ? totalProgress / files.length : 0;
      return Math.round(averageProgress);
    },
    [uploadProgress],
  );

  /**
   * 업로드 전 파일 유효성 검사
   */
  const validateFilesForUpload = useCallback(
    (files, category) => {
      setUploadStatus('validating');

      try {
        const results = validateFiles(files, category);
        setValidationResults(results);

        const hasErrors = results.some((result) => !result.isValid);
        if (hasErrors) {
          const errors = results.filter((result) => !result.isValid);
          setUploadErrors(errors);
          setUploadStatus('error');
          return { isValid: false, errors };
        }

        setUploadErrors([]);
        return { isValid: true, errors: [] };
      } catch (error) {
        const errorMessage = error.message || 'Validation failed';
        setUploadErrors([
          {
            fileName: 'Validation',
            errorCode: 'VALIDATION_ERROR',
            errorMessage,
          },
        ]);
        setUploadStatus('error');
        return { isValid: false, errors: [{ errorMessage }] };
      }
    },
    [validateFiles],
  );

  /**
   * 진행 상황 추적과 함께 파일 업로드
   */
  const uploadFiles = useCallback(
    async (files, uploadUrl, additionalData = {}) => {
      if (!files || files.length === 0) {
        throw new Error('No files to upload');
      }

      setUploadStatus('uploading');
      setUploadProgress({});
      setUploadErrors([]);

      cancelTokenRef.current = axios.CancelToken.source();

      try {
        const formData = new FormData();

        Array.from(files).forEach((file) => {
          const { name } = file;
          formData.append('files', file);
          updateFileProgress(name, 0);
        });

        Object.keys(additionalData).forEach((key) => {
          formData.append(key, additionalData[key]);
        });

        const response = await axios.post(uploadUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          cancelToken: cancelTokenRef.current.token,
          onUploadProgress: (progressEvent) => {
            const { loaded, total } = progressEvent;
            const progress = Math.round((loaded * 100) / total);

            Array.from(files).forEach(({ name }) => {
              updateFileProgress(name, progress);
            });
          },
        });

        const { uploadedFiles: uploadedFilesList = [] } = response.data;
        setUploadedFiles(uploadedFilesList);

        const totalFiles = Array.from(files).length;
        const successfulUploads = uploadedFilesList.length;

        if (successfulUploads === totalFiles) {
          setUploadStatus('success');
        } else if (successfulUploads > 0) {
          setUploadStatus('partial_success');
          const failedFiles = Array.from(files).filter(
            ({ name }) =>
              !uploadedFilesList.some(
                ({ originalFileName, fileName }) =>
                  originalFileName === name || fileName === name,
              ),
          );
          const failedErrors = failedFiles.map(({ name }) => ({
            fileName: name,
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
          partialSuccess:
            successfulUploads > 0 && successfulUploads < totalFiles,
          totalFiles,
          successfulUploads,
        };
      } catch (error) {
        if (axios.isCancel(error)) {
          setUploadStatus('idle');
          return { success: false, cancelled: true };
        }

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
    },
    [updateFileProgress, parseServerErrors, formatErrorSummary],
  );

  /**
   * 유효성 검사와 함께 파일 업로드
   */
  const uploadFilesWithValidation = useCallback(
    async (files, uploadUrl, category, additionalData = {}) => {
      const validation = validateFilesForUpload(files, category);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          message: 'File validation failed',
        };
      }

      return await uploadFiles(files, uploadUrl, additionalData);
    },
    [validateFilesForUpload, uploadFiles],
  );

  /**
   * 진행 중인 업로드 취소
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
   * 실패한 업로드 재시도
   */
  const retryUpload = useCallback(
    async (files, uploadUrl, additionalData = {}) => {
      resetUploadState();
      return await uploadFiles(files, uploadUrl, additionalData);
    },
    [resetUploadState, uploadFiles],
  );

  /**
   * 향상된 세부 정보가 포함된 사용자 친화적 상태 메시지 가져오기
   */
  const getStatusMessage = useCallback(() => {
    const totalFiles = validationResults.length;
    const uploadedCount = uploadedFiles.length;
    const failedCount = uploadErrors.length;
    const overallProgress =
      Object.values(uploadProgress).reduce(
        (sum, progress) => sum + progress,
        0,
      ) / Math.max(totalFiles, 1);

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
  }, [
    uploadStatus,
    validationResults,
    uploadedFiles,
    uploadErrors,
    uploadProgress,
  ]);

  /**
   * 향상된 메트릭이 포함된 상세 업로드 요약 가져오기
   */
  const getUploadSummary = useCallback(() => {
    const totalFiles = validationResults.length;
    const validFiles = validationResults.filter(
      ({ isValid }) => isValid,
    ).length;
    const invalidFiles = totalFiles - validFiles;
    const uploadedCount = uploadedFiles.length;
    const failedCount = uploadErrors.length;

    const overallProgress =
      totalFiles > 0
        ? Object.values(uploadProgress).reduce(
            (sum, progress) => sum + progress,
            0,
          ) / totalFiles
        : 0;

    const totalSize = validationResults.reduce((sum, { file }) => {
      return sum + (file?.size || 0);
    }, 0);

    const uploadedSize = uploadedFiles.reduce((sum, { fileSize = 0 }) => {
      return sum + fileSize;
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
  }, [
    validationResults,
    uploadedFiles,
    uploadErrors,
    uploadStatus,
    uploadProgress,
    getStatusMessage,
  ]);

  return {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    uploadedFiles,
    validationResults,

    validateFilesForUpload,
    uploadFiles,
    uploadFilesWithValidation,
    cancelUpload,
    retryUpload,
    resetUploadState,
    updateFileProgress,

    getUploadSummary,
    getStatusMessage,
    updateOverallProgress,
  };
};

export default useFileUploadProgress;
