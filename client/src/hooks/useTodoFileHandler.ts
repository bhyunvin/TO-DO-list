import { useState } from 'react';
import {
  useFileUploadValidator,
  ValidationResult,
} from './useFileUploadValidator';

export const useTodoFileHandler = () => {
  const { validateFiles } = useFileUploadValidator();
  const [todoFiles, setTodoFiles] = useState<File[]>([]);
  const [fileValidationResults, setFileValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [fileError, setFileError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    // 이전 상태 초기화
    setTodoFiles([]);
    setFileValidationResults([]);
    setFileError('');

    if (selectedFiles.length > 0) {
      // 파일 유효성 검사
      const validationResults = validateFiles(selectedFiles, 'todoAttachment');
      setFileValidationResults(validationResults);

      // 모든 파일이 유효한지 확인
      const invalidFiles = validationResults.filter(({ isValid }) => !isValid);
      if (invalidFiles.length > 0) {
        setFileError(`${invalidFiles.length}개 파일에 문제가 있습니다.`);
        // 파일 입력 초기화
        e.target.value = '';
      } else {
        setTodoFiles(selectedFiles);
        setFileError('');
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = todoFiles.filter((_, i) => i !== index);
    const newValidationResults = fileValidationResults.filter(
      (_, i) => i !== index,
    );

    setTodoFiles(newFiles);
    setFileValidationResults(newValidationResults);

    if (newFiles.length === 0) {
      setFileError('');
      // 파일 입력 초기화
      const fileInput = document.getElementById(
        'todoFiles',
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const resetFiles = () => {
    setTodoFiles([]);
    setFileValidationResults([]);
    setFileError('');
  };

  return {
    todoFiles,
    setTodoFiles,
    fileValidationResults,
    setFileValidationResults,
    fileError,
    setFileError,
    handleFileChange,
    removeFile,
    resetFiles,
  };
};
