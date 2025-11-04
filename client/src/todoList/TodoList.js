import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../authStore/authStore';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import FileUploadProgress from '../components/FileUploadProgress';
import ProfileUpdateForm from '../components/ProfileUpdateForm';
import './todoList.css';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-datepicker/dist/react-datepicker.css';

// 신규 TODO 항목 추가 폼 컴포넌트
function CreateTodoForm(props) {
  const { onAddTodo, onCancel } = props;
  const { 
    validateFiles, 
    formatFileSize, 
    getUploadPolicy
  } = useFileUploadValidator();
  
  const {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    uploadedFiles,
    resetUploadState,
  } = useFileUploadProgress();
  
  const [todoContent, setTodoContent] = useState('');
  const [todoNote, setTodoNote] = useState('');
  const [todoFiles, setTodoFiles] = useState([]);
  const [fileValidationResults, setFileValidationResults] = useState([]);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const thisName = e.target.name;
    switch (thisName) {
      case 'TODO_CONTENT':
        setTodoContent(e.target.value);
        break;
      case 'TODO_NOTE':
        setTodoNote(e.target.value);
        break;
      case 'TODO_FILES':
        handleFileChange(e);
        break;
      default:
        break;
    }
  }

  function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files);
    
    // Clear previous state
    setTodoFiles([]);
    setFileValidationResults([]);
    setFileError('');
    
    if (selectedFiles.length > 0) {
      // Validate files
      const validationResults = validateFiles(selectedFiles, 'todoAttachment');
      setFileValidationResults(validationResults);
      
      // Check if all files are valid
      const invalidFiles = validationResults.filter(result => !result.isValid);
      if (invalidFiles.length > 0) {
        setFileError(`${invalidFiles.length}개 파일에 문제가 있습니다.`);
        // Clear the file input
        e.target.value = '';
      } else {
        setTodoFiles(selectedFiles);
        setFileError('');
      }
    }
  }

  function removeFile(index) {
    const newFiles = todoFiles.filter((_, i) => i !== index);
    const newValidationResults = fileValidationResults.filter((_, i) => i !== index);
    
    setTodoFiles(newFiles);
    setFileValidationResults(newValidationResults);
    
    if (newFiles.length === 0) {
      setFileError('');
      // Clear the file input
      const fileInput = document.getElementById('todoFiles');
      if (fileInput) fileInput.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!todoContent.trim()) {
      Swal.fire('할 일을 입력해주세요.', '', 'warning');
      return;
    }

    // Validate files if any are selected
    if (todoFiles.length > 0) {
      const invalidFiles = fileValidationResults.filter(result => !result.isValid);
      if (invalidFiles.length > 0) {
        Swal.fire('파일 오류', '유효하지 않은 파일이 있습니다. 파일을 다시 선택해주세요.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      // Use the enhanced upload function with progress tracking
      const result = await onAddTodo({ todoContent, todoNote, todoFiles });
      
      if (result && result.success) {
        // Reset form on success
        setTodoContent('');
        setTodoNote('');
        setTodoFiles([]);
        setFileValidationResults([]);
        setFileError('');
        resetUploadState();
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="create-todo-form">
      <h3>새로운 TO-DO 항목추가</h3>
      <form onSubmit={handleSubmit}>
        <label className="mb-1" htmlFor="todoContent">할 일</label>
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
        <label className="mb-1" htmlFor="todoNote">비고</label>
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
        <label className="mb-1" htmlFor="todoFiles">첨부파일</label>
        <input
          id="todoFiles"
          type="file"
          multiple={true}
          className={`form-control ${fileError ? 'is-invalid' : todoFiles.length > 0 ? 'is-valid' : ''}`}
          accept=".xlsx,.pptx,.docx,.pdf,.hwp,.txt"
          onChange={handleChange}
          name="TODO_FILES"
        />
        <small className="form-text text-muted">
          허용 파일: XLSX, PPTX, DOCX, PDF, HWP, TXT | 최대 크기: {formatFileSize(getUploadPolicy('todoAttachment')?.maxSize || 0)} | 최대 {getUploadPolicy('todoAttachment')?.maxCount || 0}개
        </small>
        {fileError && (
          <div className="text-danger mt-1">
            <small>{fileError}</small>
          </div>
        )}
        
        {/* Enhanced file upload progress and validation */}
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
                // Reset validation for retry
                const retryValidation = validateFiles(failedFiles, 'todoAttachment');
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
        
        <button 
          type="submit" 
          className="btn btn-success"
          disabled={isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'validating'}
        >
          {isSubmitting || uploadStatus === 'uploading' ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {uploadStatus === 'uploading' ? '업로드 중...' : 
               uploadStatus === 'validating' ? '검증 중...' : '추가 중...'}
            </>
          ) : (
            '추가'
          )}
        </button>
        <button
          type="button"
          className="btn btn-secondary ms-2"
          onClick={onCancel}
        >
          취소
        </button>
      </form>
    </div>
  );
}

// TODO 항목 목록을 표시하는 컴포넌트
function TodoList(props) {
  const {
    todos,
    onToggleComplete,
    onDeleteTodo,
    onEditTodo,
    togglingTodoSeq,
    openActionMenu,
    setOpenActionMenu,
  } = props;

  const menuRef = useRef(null);

  // 메뉴 외부 클릭 시 닫기 처리
  useEffect(() => {
    function handleClickOutside(event) {
      // menuRef.current가 존재하고, 클릭된 요소가 메뉴나 그 자식 요소가 아닐 때 메뉴를 닫음
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        // 'more-actions-btn' 클래스를 가진 버튼을 클릭한 경우는 제외 (버튼 자체 토글 로직을 따름)
        if (!event.target.closest('.more-actions-btn')) {
          setOpenActionMenu(null);
        }
      }
    }

    // 메뉴가 열려 있을 때만 이벤트 리스너를 추가합니다.
    if (openActionMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // 컴포넌트가 언마운트되거나 openActionMenu가 변경되기 전에 이벤트 리스너를 제거합니다.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionMenu, setOpenActionMenu]);

  return (
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
      <tbody>
        {todos.length > 0 ? (
          todos.map((todo, index) => (
            <tr
              key={todo.todoSeq}
              className={todo.completeDtm ? 'completed' : ''}
            >
              <td className="text-center">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={!!todo.completeDtm}
                  disabled={togglingTodoSeq === todo.todoSeq}
                  onChange={() => onToggleComplete(todo.todoSeq, !!todo.completeDtm)}
                />
              </td>
              <td className="text-center">{index + 1}</td>
              <td className="todo-content">
                <span className="text-truncate" title={todo.todoContent}>{todo.todoContent}</span>
              </td>
              <td className="text-center">{formatDateTime(todo.completeDtm)}</td>
              <td>
                <span className="text-truncate" title={todo.todoNote}>{todo.todoNote}</span>
              </td>
              <td className="todo-actions-cell">
                <button className="more-actions-btn" onClick={() => setOpenActionMenu(openActionMenu === todo.todoSeq ? null : todo.todoSeq)}>
                  <i className="bi bi-three-dots-vertical"></i>
                </button>
                {openActionMenu === todo.todoSeq && (
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
                      onClick={() => onDeleteTodo(todo.todoSeq)}
                      title="삭제"
                    ><i className="bi bi-trash-fill"></i></button>
                  </div>
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6}>할 일이 없습니다.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ToDo 항목 수정을 위한 폼 컴포넌트
function EditTodoForm({ todo, onSave, onCancel }) {
  const { 
    validateFiles, 
    formatFileSize, 
    getUploadPolicy 
  } = useFileUploadValidator();
  
  const {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    uploadedFiles,
    resetUploadState,
  } = useFileUploadProgress();
  
  const [todoContent, setTodoContent] = useState(todo.todoContent);
  const [todoNote, setTodoNote] = useState(todo.todoNote);
  const [todoFiles, setTodoFiles] = useState([]);
  const [fileValidationResults, setFileValidationResults] = useState([]);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const thisName = e.target.name;
    switch (thisName) {
      case 'TODO_CONTENT':
        setTodoContent(e.target.value);
        break;
      case 'TODO_NOTE':
        setTodoNote(e.target.value);
        break;
      case 'TODO_FILES':
        handleFileChange(e);
        break;
      default:
        break;
    }
  }

  function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files);
    
    // Clear previous state
    setTodoFiles([]);
    setFileValidationResults([]);
    setFileError('');
    
    if (selectedFiles.length > 0) {
      // Validate files
      const validationResults = validateFiles(selectedFiles, 'todoAttachment');
      setFileValidationResults(validationResults);
      
      // Check if all files are valid
      const invalidFiles = validationResults.filter(result => !result.isValid);
      if (invalidFiles.length > 0) {
        setFileError(`${invalidFiles.length}개 파일에 문제가 있습니다.`);
        // Clear the file input
        e.target.value = '';
      } else {
        setTodoFiles(selectedFiles);
        setFileError('');
      }
    }
  }

  function removeFile(index) {
    const newFiles = todoFiles.filter((_, i) => i !== index);
    const newValidationResults = fileValidationResults.filter((_, i) => i !== index);
    
    setTodoFiles(newFiles);
    setFileValidationResults(newValidationResults);
    
    if (newFiles.length === 0) {
      setFileError('');
      // Clear the file input
      const fileInput = document.getElementById('todoFiles');
      if (fileInput) fileInput.value = '';
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate files if any are selected
    if (todoFiles.length > 0) {
      const invalidFiles = fileValidationResults.filter(result => !result.isValid);
      if (invalidFiles.length > 0) {
        Swal.fire('파일 오류', '유효하지 않은 파일이 있습니다. 파일을 다시 선택해주세요.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const result = await onSave(todo.todoSeq, { todoContent, todoNote, todoFiles });
      
      if (result && result.success) {
        resetUploadState();
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="edit-todo-form">
      <h3>TO-DO 항목수정</h3>
      <form onSubmit={handleSubmit}>
        <label className="mb-1" htmlFor="todoContent">할 일</label>
        <textarea
          id="todoContent"
          name="TODO_CONTENT"
          className="form-control mb-3"
          value={todoContent}
          onChange={handleChange}
          maxLength={4000}
          required
        />
        <label className="mb-1" htmlFor="todoNote">비고</label>
        <textarea
          id="todoNote"
          name="TODO_NOTE"
          className="form-control mb-3"
          value={todoNote}
          onChange={handleChange}
          maxLength={4000}
        />
        <label className="mb-1" htmlFor="todoFiles">첨부파일</label>
        <input
          id="todoFiles"
          type="file"
          multiple={true}
          className={`form-control ${fileError ? 'is-invalid' : todoFiles.length > 0 ? 'is-valid' : ''}`}
          accept=".xlsx,.pptx,.docx,.pdf,.hwp,.txt"
          onChange={handleChange}
          name="TODO_FILES"
        />
        <small className="form-text text-muted">
          허용 파일: XLSX, PPTX, DOCX, PDF, HWP, TXT | 최대 크기: {formatFileSize(getUploadPolicy('todoAttachment')?.maxSize || 0)} | 최대 {getUploadPolicy('todoAttachment')?.maxCount || 0}개
        </small>
        {fileError && (
          <div className="text-danger mt-1">
            <small>{fileError}</small>
          </div>
        )}
        
        {/* Enhanced file upload progress and validation */}
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
                // Reset validation for retry
                const retryValidation = validateFiles(failedFiles, 'todoAttachment');
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
        
        <button 
          type="submit" 
          className="btn btn-success"
          disabled={isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'validating'}
        >
          {isSubmitting || uploadStatus === 'uploading' ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {uploadStatus === 'uploading' ? '업로드 중...' : 
               uploadStatus === 'validating' ? '검증 중...' : '수정 중...'}
            </>
          ) : (
            '수정'
          )}
        </button>
        <button type="button" className="btn btn-secondary ms-2" onClick={onCancel}>
          취소
        </button>
      </form>
    </div>
  );
}


// 날짜를 YYYY-MM-DD 형식의 문자열로 변환하는 헬퍼 함수
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ISO 날짜 문자열을 'YYYY-MM-DD HH:mm' 형식으로 변환하는 헬퍼 함수
function formatDateTime(isoString) {
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
}

// TODO 리스트 및 폼을 조건부로 렌더링하는 컨테이너 컴포넌트
function TodoContainer() {
  const { user, logout, api, login } = useAuthStore(); // api 함수 가져오기
  const [todos, setTodos] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null); // 수정 중인 ToDo 항목 전체를 저장
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false); // 프로필 수정 상태
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [togglingTodoSeq, setTogglingTodoSeq] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null); // '...' 메뉴 상태

  // 선택된 날짜에 해당하는 ToDo 목록을 서버에서 가져오는 함수
  const fetchTodos = useCallback(async () => {
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await api(`/api/todo?date=${formattedDate}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
      });

      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      } else {
        Swal.fire('오류', '로그아웃되었거나<br>서버와의 통신 중 문제가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('Fetch Todos Error:', error);
      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
    }
  }, [api, selectedDate]);

  // selectedDate가 변경될 때마다 ToDo 목록을 새로고침
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);


  //CreateTodoForm에서 넘어온 Todo 요소 추가
  async function handleAddTodo({ todoContent, todoNote, todoFiles }) {
    try {
      const formattedDate = formatDate(selectedDate);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('todoContent', todoContent);
      formData.append('todoDate', formattedDate);
      formData.append('todoNote', todoNote || '');
      
      // Add files if any
      if (todoFiles && todoFiles.length > 0) {
        todoFiles.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await api(`/api/todo`, {
        method: 'POST',
        credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
        body: formData, // Use FormData instead of JSON
      });

      if (response.ok) {
        const responseData = await response.json();
        Swal.fire({
          title: '성공',
          html: `
            <div class="text-center">
              <p>새로운 할 일이 추가되었습니다.</p>
              ${todoFiles && todoFiles.length > 0 ? `<p>✓ ${todoFiles.length}개 파일이 업로드되었습니다.</p>` : ''}
            </div>
          `,
          icon: 'success'
        });
        setIsCreating(false);
        fetchTodos(); // 목록 새로고침
        return { success: true, data: responseData };
      } else {
        const errorData = await response.json();
        
        // Handle file upload errors specifically
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => 
            `${err.fileName}: ${err.errorMessage}`
          ).join('<br>');
          
          Swal.fire({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error'
          });
        } else {
          Swal.fire('오류', errorData.message || '할 일 추가에 실패했습니다.', 'error');
        }
        return { success: false, errors: errorData.errors || [] };
      }
    } catch (error) {
      console.error('Add Todo Error:', error);
      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
      return { success: false, error: error.message };
    }
  }

  // ToDo 항목의 완료 상태를 토글하는 함수
  const handleToggleComplete = async (todoSeq, isCompleted) => {
    setTogglingTodoSeq(todoSeq);
    try {
      const response = await api(`/api/todo/${todoSeq}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
        body: JSON.stringify({
          completeDtm: isCompleted ? null : new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchTodos();
      } else {
        Swal.fire('오류', '상태 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Toggle Complete Error:', error);
      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
    } finally {
      setTogglingTodoSeq(null);
    }
  };

  // ToDo 항목을 삭제하는 함수
  const handleDeleteTodo = async (todoSeq) => {
    // 사용자에게 삭제 확인을 받습니다.
    const result = await Swal.fire({
      title: '정말로 삭제하시겠습니까?',
      text: "삭제된 데이터는 복구할 수 없습니다.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: '네, 삭제합니다!',
      cancelButtonText: '아니오'
    });

    // 사용자가 '네'를 클릭한 경우에만 삭제를 진행합니다.
    if (result.isConfirmed) {
      try {
        const response = await api(`/api/todo/${todoSeq}`, {
          method: 'DELETE',
          credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
        });

        if (response.ok) {
          Swal.fire('삭제 완료!', '할 일이 성공적으로 삭제되었습니다.', 'success');
          fetchTodos(); // 목록 새로고침
        } else {
          const errorData = await response.json();
          Swal.fire('오류', `삭제에 실패했습니다: ${errorData.message}`, 'error');
        }
      } catch (error) {
        console.error('Delete Todo Error:', error);
        Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
      }
    }
  };

  // ToDo 항목 수정을 시작하는 함수
  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
  };

  // ToDo 항목 수정을 저장하는 함수
  const handleSaveTodo = async (todoSeq, updatedData) => {
    try {
      const { todoContent, todoNote, todoFiles } = updatedData;
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('todoContent', todoContent);
      formData.append('todoNote', todoNote || '');
      
      // Add files if any
      if (todoFiles && todoFiles.length > 0) {
        todoFiles.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await api(`/api/todo/${todoSeq}`, {
        method: 'PATCH',
        credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
        body: formData, // Use FormData instead of JSON
      });

      if (response.ok) {
        const responseData = await response.json();
        Swal.fire({
          title: '성공',
          html: `
            <div class="text-center">
              <p>할 일이 수정되었습니다.</p>
              ${todoFiles && todoFiles.length > 0 ? `<p>✓ ${todoFiles.length}개 파일이 업로드되었습니다.</p>` : ''}
            </div>
          `,
          icon: 'success'
        });
        setEditingTodo(null);
        fetchTodos();
        return { success: true, data: responseData };
      } else {
        const errorData = await response.json();
        
        // Handle file upload errors specifically
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => 
            `${err.fileName}: ${err.errorMessage}`
          ).join('<br>');
          
          Swal.fire({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error'
          });
        } else {
          Swal.fire('오류', errorData.message || '수정에 실패했습니다.', 'error');
        }
        return { success: false, errors: errorData.errors || [] };
      }
    } catch (error) {
      console.error('Save Todo Error:', error);
      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
      return { success: false, error: error.message };
    }
  };

  // 신규 버튼 클릭 여부 처리
  function handleToggleCreate() {
    setIsCreating((prev) => !prev);
    setEditingTodo(null); // 신규 작성 시 수정 상태는 해제
    setIsUpdatingProfile(false); // 신규 작성 시 프로필 수정 상태는 해제
  }

  // 프로필 수정 시작
  function handleUpdateProfile() {
    setIsUpdatingProfile(true);
    setIsCreating(false);
    setEditingTodo(null);
  }

  // 프로필 수정 취소
  function handleCancelProfileUpdate() {
    setIsUpdatingProfile(false);
  }

  // 프로필 수정 저장
  async function handleSaveProfile(profileData) {
    try {
      const response = await api('/api/user/profile', {
        method: 'PATCH',
        credentials: 'include',
        body: profileData.formData, // Use FormData for file upload
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // Update user session data
        login(updatedUser);
        
        Swal.fire({
          title: '프로필 수정 완료!',
          html: `
            <div class="text-center">
              <p><strong>프로필이 성공적으로 수정되었습니다.</strong></p>
              ${profileData.profileImageFile ? `<p>✓ 프로필 이미지가 업데이트되었습니다.</p>` : ''}
            </div>
          `,
          icon: 'success',
          confirmButtonText: '확인'
        }).then(() => {
          setIsUpdatingProfile(false);
        });
      } else {
        // Handle server validation errors
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => 
            `${err.fileName}: ${err.errorMessage}`
          ).join('<br>');
          
          Swal.fire({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error'
          });
        } else {
          Swal.fire('프로필 수정 실패', errorData.message || '서버 오류가 발생했습니다.', 'error');
        }
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
    }
  }


  async function handleLogout() {
    try {
      const response = await api(`/api/user/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
      });

      // 서버 응답이 정상이 아니더라도 클라이언트에서는 로그아웃을 진행합니다.
      // 사용자에게는 실패 사실을 알립니다.
      if (!response.ok) {
        await Swal.fire('로그아웃 실패', '서버와 통신에 실패했지만, 클라이언트에서 로그아웃합니다.', 'error');
      }
    } catch (error) {
      console.error('Logout Error : ', error);
      // 네트워크 오류 등이 발생해도 사용자에게 알린 후 로그아웃을 진행합니다.
      await Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
    } finally {
      // API 요청의 성공/실패 여부와 관계없이 항상 클라이언트의 상태를 로그아웃 처리합니다.
      logout();
    }
  }

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
        onToggleComplete={handleToggleComplete}
        onDeleteTodo={handleDeleteTodo}
        onEditTodo={handleEditTodo}
        togglingTodoSeq={togglingTodoSeq}
        openActionMenu={openActionMenu}
        setOpenActionMenu={setOpenActionMenu}
      />
    );
  };

  return (
    <div className="todo-container">
      {/* 1. 제목을 중앙에 배치하기 위한 헤더 */}
      <div className="todo-title-header">
        <h2>TO-DO 리스트</h2>
      </div>
  
      {/* 2. 사용자 정보를 우측에 배치하기 위한 헤더 */}
      <div className="user-info-header">
        <span>{user.userName}님 환영합니다.</span>
        <button 
          className="btn btn-outline-primary me-2" 
          onClick={handleUpdateProfile}
          disabled={isUpdatingProfile}
        >
          프로필 수정
        </button>
        <button className="btn btn-outline-secondary" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
  
      {/* '신규' 버튼을 오른쪽으로 배치하기 위한 컨테이너 */}
      <div className="todo-actions">
        {!isCreating && !editingTodo && !isUpdatingProfile && (
          <button className="btn btn-primary" onClick={handleToggleCreate}>
            신규
          </button>
        )}
      </div>

      {/* 할 일 목록을 볼 때만 DatePicker를 표시합니다. */}
      {!isCreating && !editingTodo && !isUpdatingProfile && (
        <div className="date-navigator">
          <button onClick={handlePrevDay} className="date-nav-btn">&lt;</button>
          <DatePicker
            locale={ko} // 달력을 한국어로 설정
            selected={selectedDate} // 현재 선택된 날짜
            onChange={(date) => setSelectedDate(date)} // 날짜 선택 시 상태 변경
            dateFormat="yyyy-MM-dd" // 표시 형식
            className="date-display" // CSS 스타일링을 위한 클래스
          />
          <button onClick={handleNextDay} className="date-nav-btn">&gt;</button>
        </div>
      )}
      {/* 할 일 목록 또는 할 일 생성/수정 폼을 보여주는 부분 */}
      {renderContent()}
    </div>
  );
}

export default TodoContainer;
