import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useFileUploadValidator } from '../../hooks/useFileUploadValidator';
import { useFileUploadProgress } from '../../hooks/useFileUploadProgress';
import { useTodoFileHandler } from '../../hooks/useTodoFileHandler';
import FileUploadProgress from '../../components/FileUploadProgress';
import { showErrorAlert, showWarningAlert } from '../../utils/alertUtils';
import { TODO_CONSTANTS } from '../../constants/todoConstants';
import './TodoForm.css';

const TodoForm = ({
  initialValues = { content: '', note: '' },
  onSubmit,
  onCancel,
  submitLabel,
  title,
  children = null, // ExistingAttachments 컴포넌트나 기타 주입된 콘텐츠를 위함
}) => {
  const { formatFileSize, getUploadPolicy, validateFiles } =
    useFileUploadValidator();

  const {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    uploadedFiles,
    resetUploadState,
  } = useFileUploadProgress();

  const [todoContent, setTodoContent] = useState(initialValues.content);
  const [todoNote, setTodoNote] = useState(initialValues.note);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    todoFiles,
    setTodoFiles,
    fileValidationResults,
    setFileValidationResults,
    fileError,
    setFileError,
    handleFileChange,
    removeFile,
    resetFiles,
  } = useTodoFileHandler();

  // initialValues가 변경되면(보통 새로운 폼 인스턴스를 의미하지만 편집 전환 시 안전을 위해) 로컬 상태 초기화
  useEffect(() => {
    setTodoContent(initialValues.content);
    setTodoNote(initialValues.note);
  }, [initialValues.content, initialValues.note]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    switch (name) {
      case TODO_CONSTANTS.INPUT_NAMES.CONTENT:
        setTodoContent(value);
        break;
      case TODO_CONSTANTS.INPUT_NAMES.NOTE:
        setTodoNote(value);
        break;
      case TODO_CONSTANTS.INPUT_NAMES.FILES:
        handleFileChange(e);
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!todoContent.trim()) {
      showWarningAlert('할 일을 입력해주세요.');
      return;
    }

    if (todoFiles.length > 0) {
      const invalidFiles = fileValidationResults.filter(
        ({ isValid }) => !isValid,
      );
      if (invalidFiles.length > 0) {
        showErrorAlert(
          '파일 오류',
          '유효하지 않은 파일이 있습니다. 파일을 다시 선택해주세요.',
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        todoContent,
        todoNote,
        todoFiles,
        resetUploadState, // 부모가 쿼리하거나 처리할 수 있도록 전달
        // 실제로 부모가 보통 API를 호출함.
        // 부모에게 제어를 위임하고 성공 시 초기화할 수 있음.
        // onSubmit이 Promise를 반환한다고 가정함.
      });

      if (result?.success) {
        // "생성" 타입 액션이거나 명시적으로 요청된 경우에만 필드 초기화?
        // 편집(Edit)의 경우 보통 폼을 닫음.
        // 생성(Create)의 경우 필드를 초기화할 수 있음.
        if (result.resetFields) {
          setTodoContent('');
          setTodoNote('');
          resetFiles();
          resetUploadState();
        } else {
          // 필요한 경우 업로드 상태만 초기화
          resetUploadState();
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const policy = getUploadPolicy(TODO_CONSTANTS.UPLOAD_POLICY_KEY);

  let fileInputClass = 'form-control';
  if (fileError) {
    fileInputClass += ' is-invalid';
  } else if (todoFiles.length > 0) {
    fileInputClass += ' is-valid';
  }

  return (
    <div className="todo-form">
      <h3>{title}</h3>
      <form onSubmit={handleSubmit}>
        <label className="mb-1" htmlFor="todoContent">
          할 일
        </label>
        <textarea
          id="todoContent"
          name={TODO_CONSTANTS.INPUT_NAMES.CONTENT}
          className="form-control mb-3"
          placeholder="할 일을 입력해주세요."
          value={todoContent}
          onChange={handleChange}
          maxLength={TODO_CONSTANTS.MAX_CONTENT_LENGTH}
          required
          rows={3}
          style={{ resize: 'vertical' }}
        />
        <label className="mb-1" htmlFor="todoNote">
          비고
        </label>
        <textarea
          id="todoNote"
          name={TODO_CONSTANTS.INPUT_NAMES.NOTE}
          className="form-control mb-3"
          placeholder="필요 시 비고를 입력해주세요."
          value={todoNote}
          onChange={handleChange}
          maxLength={TODO_CONSTANTS.MAX_CONTENT_LENGTH}
          rows={3}
          style={{ resize: 'vertical' }}
        />
        <label className="mb-1" htmlFor="todoFiles">
          첨부파일
        </label>
        <input
          id="todoFiles"
          type="file"
          multiple={true}
          className={fileInputClass}
          onChange={handleChange}
          name={TODO_CONSTANTS.INPUT_NAMES.FILES}
        />
        <small className="form-text text-muted">
          허용 파일: 모든 파일 (단, 일부 실행 파일 제외) | 최대 크기:{' '}
          {formatFileSize(policy?.maxSize || 0)} | 최대 {policy?.maxCount || 0}
          개
        </small>
        {fileError && (
          <div className="text-danger mt-1">
            <small>{fileError}</small>
          </div>
        )}

        {(fileValidationResults.length > 0 || uploadStatus !== 'idle') && (
          <div className="mt-2 mb-3">
            <FileUploadProgress
              files={todoFiles}
              validationResults={fileValidationResults}
              uploadProgress={uploadProgress}
              uploadStatus={uploadStatus}
              uploadErrors={uploadErrors}
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeFile}
              onRetryUpload={async (failedFiles) => {
                const retryValidation = validateFiles(
                  failedFiles,
                  TODO_CONSTANTS.UPLOAD_POLICY_KEY,
                );
                setFileValidationResults(retryValidation);
                setTodoFiles(failedFiles);
                setFileError('');
              }}
              showValidation={true}
              showProgress={true}
              showDetailedStatus={true}
            />
          </div>
        )}

        {children}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="submit"
            className={`btn ${
              submitLabel === '추가'
                ? 'btn-outline-primary'
                : 'btn-outline-success'
            }`}
            disabled={
              isSubmitting ||
              uploadStatus === 'uploading' ||
              uploadStatus === 'validating'
            }
          >
            {isSubmitting ||
            uploadStatus === 'uploading' ||
            uploadStatus === 'validating' ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                {uploadStatus === 'uploading' && '업로드 중...'}
                {uploadStatus === 'validating' && '검증 중...'}
                {uploadStatus !== 'uploading' &&
                  uploadStatus !== 'validating' &&
                  (submitLabel === '추가' ? '추가 중...' : '수정 중...')}
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

TodoForm.propTypes = {
  initialValues: PropTypes.shape({
    content: PropTypes.string,
    note: PropTypes.string,
  }),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitLabel: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default TodoForm;
