import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { useAuthStore } from '../authStore/authStore';
import { useChatStore } from '../stores/chatStore';
import todoService from '../api/todoService';
import userService from '../api/userService';
import authService from '../api/authService';
import aiService from '../api/aiService';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import { useTodoFileHandler } from '../hooks/useTodoFileHandler';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import FileUploadProgress from '../components/FileUploadProgress';
import ProfileUpdateForm from '../components/ProfileUpdateForm';
import PasswordChangeForm from '../components/PasswordChangeForm';
import FloatingActionButton from '../components/FloatingActionButton';
import ChatModal from '../components/ChatModal';
import ThemeToggle from '../components/ThemeToggle';
import './todoList.css';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-datepicker/dist/react-datepicker.css';

// 신규 할 일 항목 추가 폼 컴포넌트
const CreateTodoForm = ({ onAddTodo, onCancel }) => {
  const { formatFileSize, getUploadPolicy, validateFiles } =
    useFileUploadValidator();

  const {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    uploadedFiles,
    resetUploadState,
  } = useFileUploadProgress();

  const [todoContent, setTodoContent] = useState('');
  const [todoNote, setTodoNote] = useState('');
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'TODO_CONTENT') {
      setTodoContent(value);
    } else if (name === 'TODO_NOTE') {
      setTodoNote(value);
    } else if (name === 'TODO_FILES') {
      handleFileChange(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!todoContent.trim()) {
      Swal.fire('할 일을 입력해주세요.', '', 'warning');
      return;
    }

    // 파일이 선택된 경우 유효성 검사
    if (todoFiles.length > 0) {
      const invalidFiles = fileValidationResults.filter(
        ({ isValid }) => !isValid,
      );
      if (invalidFiles.length > 0) {
        Swal.fire(
          '파일 오류',
          '유효하지 않은 파일이 있습니다. 파일을 다시 선택해주세요.',
          'error',
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 진행 상황 추적이 포함된 향상된 업로드 함수 사용
      const result = await onAddTodo({ todoContent, todoNote, todoFiles });

      if (result && result.success) {
        // 성공 시 폼 초기화
        setTodoContent('');
        setTodoNote('');
        resetFiles();
        resetUploadState();
        Swal.fire({
          icon: 'success',
          title: '할 일이 추가되었습니다.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const policy = getUploadPolicy('todoAttachment');

  let fileInputClass = 'form-control';
  if (fileError) {
    fileInputClass += ' is-invalid';
  } else if (todoFiles.length > 0) {
    fileInputClass += ' is-valid';
  }

  return (
    <div className="create-todo-form">
      <h3>새로운 TO-DO 항목추가</h3>
      <form onSubmit={handleSubmit}>
        <label className="mb-1" htmlFor="todoContent">
          할 일
        </label>
        <textarea
          id="todoContent"
          type="text"
          className="form-control mb-3"
          placeholder="할 일을 입력해주세요."
          value={todoContent}
          onChange={handleChange}
          name="TODO_CONTENT"
          maxLength={4000}
          required={true}
          rows={3}
          style={{ resize: 'none' }}
        />
        <label className="mb-1" htmlFor="todoNote">
          비고
        </label>
        <textarea
          id="todoNote"
          type="text"
          className="form-control mb-3"
          placeholder="필요 시 비고를 입력해주세요."
          value={todoNote}
          onChange={handleChange}
          name="TODO_NOTE"
          maxLength={4000}
          rows={3}
          style={{ resize: 'none' }}
        />
        <label className="mb-1" htmlFor="todoFiles">
          첨부파일
        </label>
        <input
          id="todoFiles"
          type="file"
          multiple={true}
          className={fileInputClass}
          accept=".xlsx,.pptx,.docx,.pdf,.hwp,.txt"
          onChange={handleChange}
          name="TODO_FILES"
        />
        <small className="form-text text-muted">
          허용 파일: XLSX, PPTX, DOCX, PDF, HWP, TXT | 최대 크기:{' '}
          {formatFileSize(policy?.maxSize || 0)} | 최대 {policy?.maxCount || 0}
          개
        </small>
        {fileError && (
          <div className="text-danger mt-1">
            <small>{fileError}</small>
          </div>
        )}

        {/* 향상된 파일 업로드 진행 상황 및 유효성 검사 */}
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
                // 재시도를 위한 유효성 검사 초기화
                const retryValidation = validateFiles(
                  failedFiles,
                  'todoAttachment',
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

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn btn-outline-primary"
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
                  '추가'}
              </>
            ) : (
              '추가'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

CreateTodoForm.propTypes = {
  onAddTodo: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// 할 일 항목 목록을 표시하는 컴포넌트
const TodoList = ({
  todos,
  isLoadingTodos,
  onToggleComplete,
  onDeleteTodo,
  onEditTodo,
  togglingTodoSeq,
  openActionMenu,
  setOpenActionMenu,
}) => {
  const menuRef = useRef(null);

  // 메뉴 외부 클릭 시 닫기 처리
  useEffect(() => {
    const handleClickOutside = (event) => {
      // menuRef.current가 존재하고, 클릭된 요소가 메뉴나 그 자식 요소가 아닐 때 메뉴를 닫음
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        // 'more-actions-btn' 클래스를 가진 버튼을 클릭한 경우는 제외 (버튼 자체 토글 로직을 따름)
        if (!event.target.closest('.more-actions-btn')) {
          setOpenActionMenu(null);
        }
      }
    };

    // 메뉴가 열려 있을 때만 이벤트 리스너를 추가
    if (openActionMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // 컴포넌트가 언마운트되거나 openActionMenu가 변경되기 전에 이벤트 리스너를 제거
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionMenu, setOpenActionMenu]);

  const renderTableBody = () => {
    if (isLoadingTodos) {
      return (
        <tr>
          <td colSpan={6} className="text-center">
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ padding: '2rem' }}
            >
              <span
                className="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
              ></span>
              <span>불러오는 중...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (todos.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="text-center">
            할 일이 없습니다.
          </td>
        </tr>
      );
    }

    return todos.map((todo, index) => {
      const { todoSeq, completeDtm, todoContent, todoNote } = todo;
      return (
        <tr key={todoSeq} className={completeDtm ? 'completed' : ''}>
          <td
            className="text-center checkbox-cell"
            onClick={() => {
              if (togglingTodoSeq !== todoSeq) {
                onToggleComplete(todoSeq, !!completeDtm);
              }
            }}
            style={{
              cursor: togglingTodoSeq === todoSeq ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              type="checkbox"
              className="form-check-input"
              checked={!!completeDtm}
              disabled={togglingTodoSeq === todoSeq}
              onChange={() => onToggleComplete(todoSeq, !!completeDtm)}
              style={{ pointerEvents: 'none' }}
            />
          </td>
          <td className="text-center">{index + 1}</td>
          <td className="todo-content">
            <span className="text-truncate" title={todoContent}>
              {todoContent}
            </span>
          </td>
          <td className="text-center">{formatDateTime(completeDtm)}</td>
          <td>
            <span className="text-truncate" title={todoNote}>
              {todoNote}
            </span>
          </td>
          <td className="todo-actions-cell">
            <button
              className="more-actions-btn"
              onClick={() =>
                setOpenActionMenu(openActionMenu === todoSeq ? null : todoSeq)
              }
            >
              <i className="bi bi-three-dots-vertical"></i>
            </button>
            {openActionMenu === todoSeq && (
              <div className="action-menu" ref={menuRef}>
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() => {
                    onEditTodo(todo);
                    setOpenActionMenu(null);
                  }}
                  title="수정"
                >
                  <i className="bi bi-pencil-fill"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDeleteTodo(todoSeq)}
                  title="삭제"
                >
                  <i className="bi bi-trash-fill"></i>
                </button>
              </div>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="list-wrapper">
      <div className="table-responsive-container">
        <table className="todo-list">
          <colgroup>
            <col width="5%" />
            <col width="10%" />
            <col width="35%" />
            <col width="15%" />
            <col width="25%" />
            <col width="10%" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-center">완료</th>
              <th className="text-center">번호</th>
              <th>내용</th>
              <th className="text-center">완료일시</th>
              <th>비고</th>
              <th className="text-center"></th>
            </tr>
          </thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>
    </div>
  );
};

TodoList.propTypes = {
  todos: PropTypes.arrayOf(
    PropTypes.shape({
      todoSeq: PropTypes.number.isRequired,
      completeDtm: PropTypes.string,
      todoContent: PropTypes.string.isRequired,
      todoNote: PropTypes.string,
    }),
  ).isRequired,
  isLoadingTodos: PropTypes.bool.isRequired,
  onToggleComplete: PropTypes.func.isRequired,
  onDeleteTodo: PropTypes.func.isRequired,
  onEditTodo: PropTypes.func.isRequired,
  togglingTodoSeq: PropTypes.number,
  openActionMenu: PropTypes.number,
  setOpenActionMenu: PropTypes.func.isRequired,
};

// 할 일 항목 수정을 위한 폼 컴포넌트
const EditTodoForm = ({ todo, onSave, onCancel }) => {
  const { formatFileSize, getUploadPolicy, validateFiles } =
    useFileUploadValidator();

  const {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    uploadedFiles,
    resetUploadState,
  } = useFileUploadProgress();

  const { todoContent: initialContent, todoNote: initialNote } = todo;
  const [todoContent, setTodoContent] = useState(initialContent);
  const [todoNote, setTodoNote] = useState(initialNote);
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
  } = useTodoFileHandler();

  const handleChange = (e) => {
    const { name, value } = e.target;
    switch (name) {
      case 'TODO_CONTENT':
        setTodoContent(value);
        break;
      case 'TODO_NOTE':
        setTodoNote(value);
        break;
      case 'TODO_FILES':
        handleFileChange(e);
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 파일이 선택된 경우 유효성 검사
    if (todoFiles.length > 0) {
      const invalidFiles = fileValidationResults.filter(
        ({ isValid }) => !isValid,
      );
      if (invalidFiles.length > 0) {
        Swal.fire(
          '파일 오류',
          '유효하지 않은 파일이 있습니다. 파일을 다시 선택해주세요.',
          'error',
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { todoSeq } = todo;
      const result = await onSave(todoSeq, {
        todoContent,
        todoNote,
        todoFiles,
      });

      if (result && result.success) {
        resetUploadState();
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const policy = getUploadPolicy('todoAttachment');

  let fileInputClass = 'form-control';
  if (fileError) {
    fileInputClass += ' is-invalid';
  } else if (todoFiles.length > 0) {
    fileInputClass += ' is-valid';
  }

  return (
    <div className="edit-todo-form">
      <h3>TO-DO 항목수정</h3>
      <form onSubmit={handleSubmit}>
        <label className="mb-1" htmlFor="todoContent">
          할 일
        </label>
        <textarea
          id="todoContent"
          name="TODO_CONTENT"
          className="form-control mb-3"
          value={todoContent}
          onChange={handleChange}
          maxLength={4000}
          required
        />
        <label className="mb-1" htmlFor="todoNote">
          비고
        </label>
        <textarea
          id="todoNote"
          name="TODO_NOTE"
          className="form-control mb-3"
          value={todoNote}
          onChange={handleChange}
          maxLength={4000}
        />
        <label className="mb-1" htmlFor="todoFiles">
          첨부파일
        </label>
        <input
          id="todoFiles"
          type="file"
          multiple={true}
          className={fileInputClass}
          accept=".xlsx,.pptx,.docx,.pdf,.hwp,.txt"
          onChange={handleChange}
          name="TODO_FILES"
        />
        <small className="form-text text-muted">
          허용 파일: XLSX, PPTX, DOCX, PDF, HWP, TXT | 최대 크기:{' '}
          {formatFileSize(policy?.maxSize || 0)} | 최대 {policy?.maxCount || 0}
          개
        </small>
        {fileError && (
          <div className="text-danger mt-1">
            <small>{fileError}</small>
          </div>
        )}

        {/* 향상된 파일 업로드 진행 상황 및 유효성 검사 */}
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
                // 재시도를 위한 유효성 검사 초기화
                const retryValidation = validateFiles(
                  failedFiles,
                  'todoAttachment',
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

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-success"
            disabled={
              isSubmitting ||
              uploadStatus === 'uploading' ||
              uploadStatus === 'validating'
            }
          >
            {isSubmitting || uploadStatus === 'uploading' ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                {uploadStatus === 'uploading' && '업로드 중...'}
                {uploadStatus === 'validating' && '검증 중...'}
                {uploadStatus !== 'uploading' &&
                  uploadStatus !== 'validating' &&
                  '수정 중...'}
              </>
            ) : (
              '수정'
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary ms-2"
            onClick={onCancel}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
};

EditTodoForm.propTypes = {
  todo: PropTypes.shape({
    todoSeq: PropTypes.number.isRequired,
    todoContent: PropTypes.string,
    todoNote: PropTypes.string,
    completeDtm: PropTypes.string,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// 날짜를 YYYY-MM-DD 형식의 문자열로 변환하는 헬퍼 함수
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ISO 날짜 문자열을 'YYYY-MM-DD HH:mm' 형식으로 변환하는 헬퍼 함수
const formatDateTime = (isoString) => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 할 일 리스트 및 폼을 조건부로 렌더링하는 컨테이너 컴포넌트
const TodoContainer = () => {
  const { user, logout, login } = useAuthStore();
  const {
    messages,
    isLoading,
    error,
    addMessage,
    addWelcomeMessage,
    setLoading,
    clearError,
    handleApiError,
    setRetryMessage,
    getRetryMessage,
    resetRetryState,
    canSendRequest,
    todoRefreshTrigger,
    triggerTodoRefresh,
  } = useChatStore();

  const [todos, setTodos] = useState([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [togglingTodoSeq, setTogglingTodoSeq] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState(new Map());
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);

  const userMenuRef = useRef(null);

  // 프로필 이미지 에러 상태 관리
  const [imgError, setImgError] = useState(false);

  // user.profileImage가 변경되면 에러 상태 초기화
  useEffect(() => {
    setImgError(false);
  }, [user?.profileImage]);

  // 선택된 날짜에 해당하는 할 일 목록을 서버에서 가져오는 함수
  const fetchTodos = useCallback(async () => {
    setIsLoadingTodos(true);
    try {
      const formattedDate = formatDate(selectedDate);
      const data = await todoService.getTodos(formattedDate);
      setTodos(data);
    } catch (error) {
      console.error('Fetch Todos Error:', error);
      // apiClient에서 에러 처리됨
      // Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
    } finally {
      setIsLoadingTodos(false);
    }
  }, [selectedDate]);

  // selectedDate가 변경될 때마다 할 일 목록을 새로고침
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // AI 채팅에서 할 일 생성/업데이트 시 자동 새로고침
  useEffect(() => {
    if (todoRefreshTrigger > 0) {
      fetchTodos();
    }
  }, [todoRefreshTrigger, fetchTodos]);

  // 사용자 메뉴 외부 클릭 시 닫기 처리
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // CreateTodoForm에서 넘어온 Todo 요소 추가
  const handleAddTodo = async ({ todoContent, todoNote, todoFiles }) => {
    try {
      const formattedDate = formatDate(selectedDate);

      const formData = new FormData();
      formData.append('todoContent', todoContent);
      formData.append('todoDate', formattedDate);
      formData.append('todoNote', todoNote || '');

      // 파일이 있으면 추가
      if (todoFiles && todoFiles.length > 0) {
        todoFiles.forEach((file) => {
          formData.append('files', file);
        });
      }

      // todoService.createTodo 사용
      const responseData = await todoService.createTodo(formData);

      Swal.fire({
        title: '성공',
        html: `
            <div class="text-center">
              <p>새로운 할 일이 추가되었습니다.</p>
              ${todoFiles && todoFiles.length > 0 ? `<p>✓ ${todoFiles.length}개 파일이 업로드되었습니다.</p>` : ''}
            </div>
          `,
        icon: 'success',
      });
      setIsCreating(false);
      fetchTodos();
      return { success: true, data: responseData };
    } catch (error) {
      console.error('Add Todo Error:', error);

      const { response } = error;
      if (response && response.data) {
        const errorData = response.data;
        // 파일 업로드 오류를 구체적으로 처리
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors
            .map(({ fileName, errorMessage }) => `${fileName}: ${errorMessage}`)
            .join('<br>');

          Swal.fire({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error',
          });
          return { success: false, errors: errorData.errors || [] };
        } else {
          Swal.fire(
            '오류',
            errorData.message || '할 일 추가에 실패했습니다.',
            'error',
          );
          return { success: false, error: errorData.message };
        }
      }

      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
      return { success: false, error: error.message };
    }
  };

  // todos 배열을 서버와 동일한 방식으로 정렬하는 헬퍼 함수
  const sortTodos = (todosArray) => {
    return [...todosArray].sort((a, b) => {
      const { completeDtm: aComplete, todoSeq: aSeq } = a;
      const { completeDtm: bComplete, todoSeq: bSeq } = b;

      // completeDtm이 null인 항목(미완료)을 먼저
      if (aComplete === null && bComplete !== null) return -1;
      if (aComplete !== null && bComplete === null) return 1;

      // 둘 다 완료되었거나 둘 다 미완료인 경우, todoSeq 내림차순 (최신 항목이 위로)
      return bSeq - aSeq;
    });
  };

  // 낙관적 업데이트를 위한 헬퍼 함수
  const updateTodoOptimistically = (todoSeq, newCompleteDtm) => {
    setTodos((prevTodos) => {
      const updatedTodos = prevTodos.map((todo) =>
        todo.todoSeq === todoSeq
          ? { ...todo, completeDtm: newCompleteDtm }
          : todo,
      );
      // 업데이트 후 정렬
      return sortTodos(updatedTodos);
    });
  };

  // 롤백을 위한 헬퍼 함수
  const rollbackTodoUpdate = (todoSeq, originalCompleteDtm) => {
    setTodos((prevTodos) => {
      const rolledBackTodos = prevTodos.map((todo) =>
        todo.todoSeq === todoSeq
          ? { ...todo, completeDtm: originalCompleteDtm }
          : todo,
      );
      // 롤백 후 정렬
      return sortTodos(rolledBackTodos);
    });
  };

  // 에러 메시지 생성 헬퍼 함수
  const getErrorMessage = (error, response) => {
    const { name, message } = error;

    if (name === 'AbortError') {
      return '요청 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
    }
    if (name === 'TypeError' && message.includes('fetch')) {
      return '네트워크 연결을 확인해주세요.';
    }
    if (response && response.status >= 500) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    return '상태 변경에 실패했습니다. 다시 시도해주세요.';
  };

  // 할 일 항목의 완료 상태를 토글하는 함수 (낙관적 UI 패턴)
  const handleToggleComplete = async (todoSeq, isCompleted) => {
    // 중복 요청 방지
    if (togglingTodoSeq === todoSeq || optimisticUpdates.has(todoSeq)) {
      return;
    }

    // 원본 할 일 항목 찾기
    const originalTodo = todos.find(({ todoSeq: seq }) => seq === todoSeq);
    if (!originalTodo) {
      return;
    }

    const { completeDtm: originalCompleteDtm } = originalTodo;
    const newCompleteDtm = isCompleted ? null : new Date().toISOString();

    // 낙관적 UI 업데이트
    updateTodoOptimistically(todoSeq, newCompleteDtm);

    setOptimisticUpdates((prev) => {
      const newMap = new Map(prev);
      newMap.set(todoSeq, {
        originalCompleteDtm,
        newCompleteDtm,
        timestamp: Date.now(),
      });
      return newMap;
    });

    setTogglingTodoSeq(todoSeq);

    try {
      await todoService.updateTodo(todoSeq, { completeDtm: newCompleteDtm });

      // 성공 시 처리
      setOptimisticUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(todoSeq);
        return newMap;
      });
    } catch (error) {
      // 에러 발생: 롤백
      rollbackTodoUpdate(todoSeq, originalCompleteDtm);

      setOptimisticUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(todoSeq);
        return newMap;
      });

      // 에러 메시지 처리 및 알림 (헬퍼 함수 활용 가능)
      const errorMessage = getErrorMessage(error, error.response);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: errorMessage,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });

      const { name, message } = error;
      console.error('Todo toggle failed:', {
        todoSeq,
        error: message,
        errorName: name,
        originalState: originalCompleteDtm,
        attemptedState: newCompleteDtm,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTogglingTodoSeq(null);
    }
  };

  // 할 일 항목을 삭제하는 함수
  const handleDeleteTodo = async (todoSeq) => {
    // 사용자에게 삭제 확인을 받음
    // 사용자에게 삭제 확인을 받음
    await Swal.fire({
      title: '정말로 삭제하시겠습니까?',
      text: '삭제된 데이터는 복구할 수 없습니다.',
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true, // 버튼 순서 반전 (취소 | 삭제)
      confirmButtonColor: 'transparent',
      cancelButtonColor: 'transparent',
      customClass: {
        confirmButton: 'btn btn-outline-danger',
        cancelButton: 'btn btn-outline-secondary me-2',
      },
      buttonsStyling: false,
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    }).then(async (result) => {
      // 사용자가 '네'를 클릭한 경우에만 삭제를 진행
      if (result.isConfirmed) {
        try {
          await todoService.deleteTodo(todoSeq);

          Swal.fire(
            '삭제 완료!',
            '할 일이 성공적으로 삭제되었습니다.',
            'success',
          );
          fetchTodos();
        } catch (error) {
          console.error('Delete Todo Error:', error);

          const { response } = error;
          if (response && response.data) {
            Swal.fire(
              '오류',
              `삭제에 실패했습니다: ${response.data.message}`,
              'error',
            );
          } else {
            Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
          }
        }
      }
    });
  };

  // 할 일 항목 수정을 시작하는 함수
  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
  };

  // 할 일 항목 수정을 저장하는 함수
  const handleSaveTodo = async (todoSeq, updatedData) => {
    try {
      const { todoContent, todoNote, todoFiles } = updatedData;

      const formData = new FormData();
      formData.append('todoContent', todoContent);
      formData.append('todoNote', todoNote || '');

      // 파일이 있으면 추가
      if (todoFiles && todoFiles.length > 0) {
        todoFiles.forEach((file) => {
          formData.append('files', file);
        });
      }

      // todoService.updateTodo 사용
      // updateTodo 내부에서 FormData 처리를 이미 구현했음 (기존 todoService.js 참고)
      // 하지만 여기서 formData를 직접 만들어서 넘김.
      // todoService.updateTodo(todoSeq, data) -> data가 FormData면 그걸 쓰고, 객체면 json으로 보냄.
      // 여기서는 FormData를 보내므로 OK.

      const responseData = await todoService.updateTodo(todoSeq, formData);

      Swal.fire({
        title: '성공',
        html: `
            <div class="text-center">
              <p>할 일이 수정되었습니다.</p>
              ${todoFiles && todoFiles.length > 0 ? `<p>✓ ${todoFiles.length}개 파일이 업로드되었습니다.</p>` : ''}
            </div>
          `,
        icon: 'success',
      });
      setEditingTodo(null);
      fetchTodos();
      return { success: true, data: responseData };
    } catch (error) {
      console.error('Save Todo Error:', error);

      const { response } = error;
      if (response && response.data) {
        const errorData = response.data;
        // 파일 업로드 오류를 구체적으로 처리
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors
            .map(({ fileName, errorMessage }) => `${fileName}: ${errorMessage}`)
            .join('<br>');

          Swal.fire({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error',
          });
          return { success: false, errors: errorData.errors || [] };
        } else {
          Swal.fire(
            '오류',
            errorData.message || '수정에 실패했습니다.',
            'error',
          );
          return { success: false, error: errorData.message };
        }
      }

      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
      return { success: false, error: error.message };
    }
  };

  // 신규 버튼 클릭 여부 처리
  const handleToggleCreate = () => {
    setIsCreating((prev) => !prev);
    setEditingTodo(null);
    setIsUpdatingProfile(false);
    setIsChangingPassword(false);
  };

  // 사용자 메뉴 토글
  const handleUserMenuToggle = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  // 프로필 수정 시작
  const handleUpdateProfile = () => {
    setIsUpdatingProfile(true);
    setIsCreating(false);
    setEditingTodo(null);
    setIsChangingPassword(false);
    setIsUserMenuOpen(false);
  };

  // 프로필 수정 취소
  const handleCancelProfileUpdate = () => {
    setIsUpdatingProfile(false);
  };

  // 비밀번호 변경 시작
  const handleChangePassword = () => {
    setIsChangingPassword(true);
    setIsCreating(false);
    setEditingTodo(null);
    setIsUpdatingProfile(false);
    setIsUserMenuOpen(false);
  };

  // 비밀번호 변경 취소
  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
  };

  // 프로필 수정 저장
  const handleSaveProfile = async (profileData) => {
    try {
      const { formData, profileImageFile } = profileData;

      const updatedUser = await userService.updateProfile(formData);

      // 프로필 이미지가 있는 경우, 브라우저 캐시를 우회하기 위해 타임스탬프 추가
      if (updatedUser.profileImage) {
        const timestamp = Date.now();
        // 이미 쿼리 파라미터가 있는지 확인
        const separator = updatedUser.profileImage.includes('?') ? '&' : '?';
        updatedUser.profileImage = `${updatedUser.profileImage}${separator}t=${timestamp}`;
      }

      login(updatedUser);

      Swal.fire({
        title: '프로필 수정 완료!',
        html: `
            <div class="text-center">
              <p><strong>프로필이 성공적으로 수정되었습니다.</strong></p>
              ${profileImageFile ? `<p>✓ 프로필 이미지가 업데이트되었습니다.</p>` : ''}
            </div>
          `,
        icon: 'success',
        confirmButtonText: '확인',
      }).then(() => {
        setIsUpdatingProfile(false);
      });
    } catch (error) {
      console.error('Profile update error:', error);

      const { response } = error;
      if (response && response.data) {
        const errorData = response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors
            .map(({ fileName, errorMessage }) => `${fileName}: ${errorMessage}`)
            .join('<br>');

          Swal.fire({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error',
          });
        } else {
          Swal.fire(
            '프로필 수정 실패',
            errorData.message || '서버 오류가 발생했습니다.',
            'error',
          );
        }
      } else {
        Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
      }
    }
  };

  // 비밀번호 변경 저장
  const handleSavePassword = async (passwordData) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      // userService.changePassword 사용
      await userService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      Swal.fire({
        title: '비밀번호 변경 완료',
        html: `
            <div class="text-center">
              <p><strong>비밀번호가 성공적으로 변경되었습니다.</strong></p>
              <p>보안을 위해 다시 로그인해주세요.</p>
            </div>
          `,
        icon: 'success',
        confirmButtonText: '확인',
      }).then(() => {
        setIsChangingPassword(false);
        // 비밀번호 변경 후 로그아웃 처리
        handleLogout();
      });
    } catch (error) {
      console.error('Password change error:', error);

      const { response } = error;
      if (response && response.data) {
        const errorData = response.data;
        const { message } = errorData;
        let errorMessage = '비밀번호 변경에 실패했습니다.';

        if (message) {
          if (Array.isArray(message)) {
            errorMessage = message.join('\n');
          } else {
            errorMessage = message;
          }
        }

        Swal.fire('비밀번호 변경 실패', errorMessage, 'error');
      } else {
        Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
      }
    }
  };

  const handleLogout = async () => {
    // 로그아웃 확인 다이얼로그 표시
    await Swal.fire({
      title: '로그아웃 하시겠습니까?',
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonColor: 'transparent',
      cancelButtonColor: 'transparent',
      customClass: {
        confirmButton: 'btn btn-outline-primary',
        cancelButton: 'btn btn-outline-secondary me-2',
      },
      buttonsStyling: false,
      confirmButtonText: '로그아웃',
      cancelButtonText: '취소',
    }).then((result) => {
      // 사용자가 취소를 선택한 경우 로그아웃을 중단
      if (!result.isConfirmed) {
        return;
      }

      return (async () => {
        setIsUserMenuOpen(false);
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout Error : ', error);
          // 네트워크 오류 등이 발생해도 사용자에게 알린 후 로그아웃을 진행
          Swal.fire(
            '오류 발생',
            '서버와의 연결에 문제가 발생했습니다.',
            'error',
          );
        } finally {
          logout();
        }
      })();
    });
  };

  // 이전/다음 날짜로 변경하는 핸들러 함수
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // 채팅 관련 핸들러
  const handleChatToggle = () => {
    const willOpen = !isChatOpen;
    setIsChatOpen(willOpen);

    // 채팅을 열 때 환영 메시지 추가 (메시지가 이미 있어도 최신 상태 반영을 위해 호출)
    if (willOpen) {
      addWelcomeMessage();
    }

    if (error) {
      clearError();
    }
  };

  const prepareChatHistory = (messages) => {
    // 환영 메시지를 제외하고 최근 10개의 메시지만 컨텍스트로 전송
    const recentMessages = messages
      .filter((msg) => !msg.id.startsWith('welcome-'))
      .slice(-10);

    // Gemini API 형식으로 변환
    return recentMessages.map((msg) => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [
        {
          text: msg.isHtml
            ? msg.content.replaceAll(/<[^>]*>/g, '')
            : msg.content,
        },
      ],
    }));
  };

  const handleSendMessage = async (messageContent, isRetry = false) => {
    // 요청 전송 가능 여부 확인 (쓰로틀링)
    if (!isRetry && !canSendRequest()) {
      return;
    }

    // 재시도를 위해 메시지 저장
    if (!isRetry) {
      setRetryMessage(messageContent);
      addMessage({
        content: messageContent,
        isUser: true,
      });
    }

    setLoading(true);
    clearError();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const history = prepareChatHistory(messages);

      const data = await aiService.chat(
        {
          prompt: messageContent,
          history,
        },
        controller.signal,
      );

      clearTimeout(timeoutId);

      const { success, response: apiResponse, error: apiError } = data;

      if (success) {
        addMessage({
          content: apiResponse,
          isUser: false,
          isHtml: true,
        });

        resetRetryState();
        triggerTodoRefresh();
      } else {
        const { shouldRetry } = handleApiError(
          new Error(apiError || 'API Error'),
          { status: 200 },
        );

        if (!shouldRetry) {
          addMessage({
            content: apiError || '죄송합니다. 일시적인 문제가 발생했습니다.',
            isUser: false,
          });
        }
      }
    } catch (error) {
      console.error('Chat API Error:', error);
      handleChatError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatError = (error) => {
    const { shouldRetry } = handleApiError(error, error.response);

    if (!shouldRetry) {
      const { name, message } = error;
      let errorMessage = '문제가 발생했습니다. 다시 시도해주세요.';

      if (name === 'AbortError' || error.code === 'ECONNABORTED') {
        errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
      } else if (name === 'TypeError' && message.includes('fetch')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (error.message === 'Network Error') {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }

      addMessage({
        content: errorMessage,
        isUser: false,
      });
    }
  };

  // 재시도 핸들러
  const handleRetry = () => {
    const lastMessage = getRetryMessage();
    if (lastMessage) {
      handleSendMessage(lastMessage, true);
    }
  };

  // 오류 초기화 핸들러
  const handleClearError = () => {
    clearError();
    resetRetryState();
  };

  // Excel 내보내기를 위한 날짜 범위 선택 모달 표시
  const showDateRangeModal = async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result = await Swal.fire({
      title: 'Excel 내보내기',
      html: `
        <div style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
          <div>
            <label for="startDate" style="display: block; margin-bottom: 5px; font-weight: 500;">시작일</label>
            <input 
              type="date" 
              id="startDate" 
              class="swal2-input" 
              value="${formatDate(firstDay)}"
              style="width: 100%; margin: 0; padding: 10px;"
            />
          </div>
          <div>
            <label for="endDate" style="display: block; margin-bottom: 5px; font-weight: 500;">종료일</label>
            <input 
              type="date" 
              id="endDate" 
              class="swal2-input" 
              value="${formatDate(lastDay)}"
              style="width: 100%; margin: 0; padding: 10px;"
            />
          </div>
        </div>
      `,
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: '확인',
      cancelButtonText: '취소',
      confirmButtonColor: 'transparent',
      cancelButtonColor: 'transparent',
      customClass: {
        confirmButton: 'btn btn-outline-primary',
        cancelButton: 'btn btn-outline-secondary me-2',
      },
      buttonsStyling: false,
      focusConfirm: false,
      preConfirm: () => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
          Swal.showValidationMessage('날짜를 선택해주세요');
          return false;
        }

        if (startDate > endDate) {
          Swal.showValidationMessage('시작일은 종료일보다 이전이어야 합니다');
          return false;
        }

        return { startDate, endDate };
      },
    });

    return result;
  };

  // 날짜 범위 선택, API 호출 및 파일 다운로드를 통한 Excel 내보내기 처리
  const handleExcelExport = async () => {
    const result = await showDateRangeModal();

    if (!result.isConfirmed) {
      return;
    }

    const { startDate, endDate } = result.value;

    try {
      const blob = await todoService.downloadExcel(startDate, endDate);

      // apiClient에서 에러가 없으면 성공으로 간주 (에러시 catch로 이동)
      const url = globalThis.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `todos_${startDate}_to_${endDate}.xlsx`;

      document.body.appendChild(a);
      a.click();

      globalThis.URL.revokeObjectURL(url);
      a.remove();

      Swal.fire('성공', 'Excel 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
      console.error('Excel Export Error:', error);

      const { response } = error;
      let errorMessage = 'Excel 내보내기에 실패했습니다.';

      if (response) {
        if (response.status === 400) {
          // response.data가 blob일 수 있으므로 텍스트로 변환 시도 필요할 수 있음
          const errorData = response.data;
          errorMessage = errorData?.message || errorMessage;
        }
      }

      Swal.fire('오류', errorMessage, 'error');
    }
  };

  const renderContent = () => {
    if (isUpdatingProfile) {
      return (
        <ProfileUpdateForm
          user={user}
          onSave={handleSaveProfile}
          onCancel={handleCancelProfileUpdate}
        />
      );
    }
    if (isChangingPassword) {
      return (
        <PasswordChangeForm
          onSave={handleSavePassword}
          onCancel={handleCancelPasswordChange}
        />
      );
    }
    if (editingTodo) {
      return (
        <EditTodoForm
          todo={editingTodo}
          onSave={handleSaveTodo}
          onCancel={() => setEditingTodo(null)}
        />
      );
    }
    if (isCreating) {
      return (
        <CreateTodoForm
          onAddTodo={handleAddTodo}
          onCancel={handleToggleCreate}
        />
      );
    }
    return (
      <TodoList
        todos={todos}
        isLoadingTodos={isLoadingTodos}
        onToggleComplete={handleToggleComplete}
        onDeleteTodo={handleDeleteTodo}
        onEditTodo={handleEditTodo}
        togglingTodoSeq={togglingTodoSeq}
        openActionMenu={openActionMenu}
        setOpenActionMenu={setOpenActionMenu}
      />
    );
  };

  const { userName } = user;

  return (
    <div className="todo-container">
      {/* 1. 제목을 중앙에 배치하기 위한 헤더 */}
      <div className="todo-title-header">
        <h2>TO-DO 리스트</h2>
      </div>

      {/* 2. 사용자 정보를 우측에 배치하기 위한 헤더 */}
      <div className="user-info-header">
        <span>{userName}님 환영합니다.</span>
        <div className="user-menu-container" ref={userMenuRef}>
          <button
            className="user-menu-icon"
            onClick={handleUserMenuToggle}
            aria-label="사용자 메뉴"
          >
            {user?.profileImage && !imgError ? (
              <img
                src={user.profileImage}
                alt="프로필"
                onError={() => setImgError(true)}
                loading="lazy"
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <i className="bi bi-person-circle"></i>
            )}
          </button>
          {isUserMenuOpen && (
            <div className="user-dropdown-menu">
              <button
                className="dropdown-item"
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile || isChangingPassword}
              >
                프로필 수정
              </button>
              <button
                className="dropdown-item"
                onClick={handleChangePassword}
                disabled={isUpdatingProfile || isChangingPassword}
              >
                비밀번호 변경
              </button>
              <div className="dropdown-divider"></div>
              <ThemeToggle />
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      {/* '신규' 버튼을 오른쪽으로 배치하기 위한 컨테이너 */}
      <div className="todo-actions">
        {!isCreating &&
          !editingTodo &&
          !isUpdatingProfile &&
          !isChangingPassword && (
            <>
              <button
                className="btn btn-outline-success"
                onClick={handleExcelExport}
                aria-label="Excel 내보내기"
              >
                <i className="bi bi-file-earmark-spreadsheet"></i>
              </button>
              <button
                className="btn btn-outline-light"
                onClick={handleToggleCreate}
              >
                신규
              </button>
            </>
          )}
      </div>

      {/* 할 일 목록을 볼 때만 DatePicker를 표시 */}
      {!isCreating &&
        !editingTodo &&
        !isUpdatingProfile &&
        !isChangingPassword && (
          <div className="date-navigator">
            <button
              onClick={handlePrevDay}
              className="date-nav-btn"
              aria-label="이전 날짜"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <DatePicker
              locale={ko}
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="yyyy-MM-dd"
              className="date-display"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              withPortal
            />
            <button
              onClick={handleNextDay}
              className="date-nav-btn"
              aria-label="다음 날짜"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
            <button onClick={handleToday} className="date-today-btn">
              오늘
            </button>
          </div>
        )}
      {/* 할 일 목록 또는 할 일 생성/수정 폼을 보여주는 부분 */}
      {renderContent()}

      {/* 채팅 인터페이스 */}
      <FloatingActionButton
        isOpen={isChatOpen}
        onClick={handleChatToggle}
        isFocused={isChatInputFocused}
      />

      <ChatModal
        isOpen={isChatOpen}
        onClose={handleChatToggle}
        user={user}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        onClearError={handleClearError}
        onInputFocus={() => setIsChatInputFocused(true)}
        onInputBlur={() => setIsChatInputFocused(false)}
      />
    </div>
  );
};

export default TodoContainer;
