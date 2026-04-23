import { useState, useCallback, useRef } from 'react';
import {
  useFileUploadValidator,
  ValidationResult,
} from './useFileUploadValidator';

interface UploadedFile {
  originalFileName?: string;
  fileName?: string;
  fileSize?: number;
  url?: string;
}

interface UploadError {
  fileName?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface UploadResponse {
  success: boolean;
  data?: Record<string, unknown>;
  uploadedFiles?: UploadedFile[];
  partialSuccess?: boolean;
  totalFiles?: number;
  successfulUploads?: number;
  errors?: UploadError[] | ValidationResult[];
  message?: string;
  cancelled?: boolean;
}

/**
 * 파일 업로드 진행 상황 및 상태를 관리하는 커스텀 훅
 */
export const useFileUploadProgress = () => {
  const [uploadStatus, setUploadStatus] = useState<string>('idle');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [uploadErrors, setUploadErrors] = useState<
    (UploadError | ValidationResult)[]
  >([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);

  const { validateFiles, parseServerErrors, formatErrorSummary } =
    useFileUploadValidator();
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  /**
   * 업로드 상태 초기화
   */
  const resetUploadState = useCallback(() => {
    setUploadStatus('idle');
    setUploadProgress({});
    setUploadErrors([]);
    setUploadedFiles([]);
    setValidationResults([]);
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  }, []);

  /**
   * 특정 파일의 진행 상황 업데이트
   */
  const updateFileProgress = useCallback(
    (fileName: string, progress: number) => {
      setUploadProgress((prev) => ({
        ...prev,
        [fileName]: Math.round(progress),
      }));
    },
    [],
  );

  /**
   * 개별 파일 진행 상황을 기반으로 전체 진행 상황 업데이트
   */
  const updateOverallProgress = useCallback(
    (files: File[] | FileList) => {
      const fileCount = files.length;
      if (fileCount === 0) return 0;

      const totalProgress = Object.values(uploadProgress).reduce(
        (sum, progress) => sum + progress,
        0,
      );

      const averageProgress = totalProgress / fileCount;
      return Math.round(averageProgress);
    },
    [uploadProgress],
  );

  /**
   * 업로드 전 파일 유효성 검사
   */
  const validateFilesForUpload = useCallback(
    (files: File[] | FileList, category: string) => {
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
      } catch (error: unknown) {
        const err = error as Error;
        const errorMessage = err.message || 'Validation failed';
        setUploadErrors([
          {
            fileName: 'Validation',
            errorCode: 'VALIDATION_ERROR',
            errorMessage,
            isValid: false,
          },
        ]);
        setUploadStatus('error');
        return { isValid: false, errors: [{ errorMessage, isValid: false }] };
      }
    },
    [validateFiles],
  );

  /**
   * 진행 상황 추적과 함께 파일 업로드
   */
  /* 업로드에 실패한 파일들을 처리하기 위한 헬퍼 함수 */
  const getFailedFilesErrors = (
    files: File[],
    uploadedFilesList: UploadedFile[],
  ) => {
    const failedFiles: File[] = [];
    for (const file of files) {
      const isUploaded = uploadedFilesList.some(
        ({ originalFileName, fileName }) =>
          originalFileName === file.name || fileName === file.name,
      );
      if (!isUploaded) {
        failedFiles.push(file);
      }
    }

    return failedFiles.map(({ name }) => ({
      fileName: name,
      errorCode: 'UPLOAD_FAILED',
      errorMessage: 'File was not uploaded successfully',
    }));
  };

  const uploadFiles = useCallback(
    async (
      files: File[],
      uploadUrl: string,
      additionalData: Record<string, string | Blob> = {},
    ): Promise<UploadResponse> => {
      if (!files || files.length === 0) {
        throw new Error('No files to upload');
      }

      setUploadStatus('uploading');
      setUploadProgress({});
      setUploadErrors([]);

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.open('POST', uploadUrl, true);

        const handleProgress = (event: ProgressEvent) => {
          if (!event.lengthComputable) return;
          const progress = (event.loaded / event.total) * 100;
          for (const file of files) {
            updateFileProgress(file.name, progress);
          }
        };

        const handleSuccessState = (uploadedFilesList: UploadedFile[]) => {
          setUploadedFiles(uploadedFilesList);
          const totalFiles = files.length;
          const successfulUploads = uploadedFilesList.length;

          if (successfulUploads === totalFiles) {
            setUploadStatus('success');
            return;
          }

          if (successfulUploads > 0) {
            setUploadStatus('partial_success');
            const failedErrors = getFailedFilesErrors(files, uploadedFilesList);
            setUploadErrors(failedErrors);
            return;
          }

          setUploadStatus('error');
        };

        const handleSuccess = (response: {
          uploadedFiles?: UploadedFile[];
        }) => {
          const { uploadedFiles: uploadedFilesList = [] } = response;
          handleSuccessState(uploadedFilesList);

          const totalFiles = files.length;
          const successfulUploads = uploadedFilesList.length;

          resolve({
            success: successfulUploads > 0,
            data: response,
            uploadedFiles: uploadedFilesList,
            partialSuccess:
              successfulUploads > 0 && successfulUploads < totalFiles,
            totalFiles,
            successfulUploads,
          });
        };

        const handleError = (status: number, responseText: string) => {
          try {
            const errorData = JSON.parse(responseText);
            const serverErrors = parseServerErrors(errorData);
            setUploadErrors(serverErrors);
            setUploadStatus('error');
            resolve({
              success: false,
              errors: serverErrors,
              message: formatErrorSummary(serverErrors),
            });
          } catch (e) {
            console.error('Error parsing server error response:', e);
            const errorMsg = `Upload failed with status ${status}`;
            setUploadErrors([{ errorMessage: errorMsg }]);
            setUploadStatus('error');
            resolve({
              success: false,
              errors: [{ errorMessage: errorMsg }],
              message: errorMsg,
            });
          }
        };

        const handleLoad = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              handleSuccess(response);
            } catch (e) {
              console.error('Error parsing success response:', e);
              const errorMsg = 'Invalid JSON response from server';
              setUploadErrors([{ errorMessage: errorMsg }]);
              setUploadStatus('error');
              resolve({
                success: false,
                errors: [{ errorMessage: errorMsg }],
                message: errorMsg,
              });
            }
          } else {
            handleError(xhr.status, xhr.responseText);
          }
          xhrRef.current = null;
        };

        const handleNetworkError = () => {
          const errorMessage = 'Network error occurred during upload';
          setUploadErrors([{ errorMessage }]);
          setUploadStatus('error');
          resolve({
            success: false,
            errors: [{ errorMessage }],
            message: errorMessage,
          });
          xhrRef.current = null;
        };

        const handleAbort = () => {
          setUploadStatus('idle');
          resolve({ success: false, cancelled: true });
        };

        xhr.upload.onprogress = handleProgress;
        xhr.onload = handleLoad;
        xhr.onerror = handleNetworkError;
        xhr.onabort = handleAbort;

        const formData = new FormData();
        for (const file of files) {
          formData.append('files', file);
          updateFileProgress(file.name, 0);
        }

        Object.keys(additionalData).forEach((key) => {
          formData.append(key, additionalData[key]);
        });

        xhr.send(formData);
      });
    },
    [updateFileProgress, parseServerErrors, formatErrorSummary],
  );

  /**
   * 유효성 검사와 함께 파일 업로드
   */
  const uploadFilesWithValidation = useCallback(
    async (
      files: File[] | FileList,
      uploadUrl: string,
      category: string,
      additionalData: Record<string, string | Blob> = {},
    ) => {
      const validationFiles = Array.from(files);
      const validation = validateFilesForUpload(validationFiles, category);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          message: 'File validation failed',
        };
      }

      return await uploadFiles(validationFiles, uploadUrl, additionalData);
    },
    [validateFilesForUpload, uploadFiles],
  );

  /**
   * 진행 중인 업로드 취소
   */
  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort(); // xhr.abort() 호출 시 onabort 이벤트가 트리거됨
      xhrRef.current = null;
    }
    // onabort가 상태 초기화를 처리하거나, 여기서 직접 초기화 로직을 보장함
    setUploadStatus('idle');
    setUploadProgress({});
  }, []);

  /**
   * 실패한 업로드 재시도
   */
  const retryUpload = useCallback(
    async (
      files: File[],
      uploadUrl: string,
      additionalData: Record<string, string | Blob> = {},
    ) => {
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

    const totalSize = validationResults.reduce((sum, { fileSize = 0 }) => {
      return sum + fileSize;
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
