import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  lazy,
} from 'react';

// 라이브러리
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { BsFileEarmarkSpreadsheet } from '@react-icons/all-files/bs/BsFileEarmarkSpreadsheet';
import { BsPeopleCircle } from '@react-icons/all-files/bs/BsPeopleCircle';
import { BsChevronLeft } from '@react-icons/all-files/bs/BsChevronLeft';
import { BsChevronRight } from '@react-icons/all-files/bs/BsChevronRight';
import { BsSearch } from '@react-icons/all-files/bs/BsSearch';

// 스토어
import { useAuthStore } from '../authStore/authStore';
import { useChatStore } from '../stores/chatStore';

// API 및 서비스
import todoService from '../api/todoService';
import userService from '../api/userService';
import authService from '../api/authService';
import aiService from '../api/aiService';
import { API_URL } from '../api/client';

// 훅
import useDailyDateReset from '../hooks/useDailyDateReset';

// 유틸리티
import {
  showNavigationConfirmAlert,
  showErrorAlert,
  showToast,
  showAlert,
  showConfirmAlert,
  showSuccessAlert,
  showDateRangePrompt,
} from '../utils/alertUtils';

// 컴포넌트
import ProfileUpdateForm from '../components/ProfileUpdateForm';
import PasswordChangeForm from '../components/PasswordChangeForm';
import ContactDeveloperModal from '../components/ContactDeveloperModal';
import WaterTrackerModal from '../components/WaterTrackerModal';
import FloatingActionButton from '../components/FloatingActionButton';
import ChatModal from '../components/ChatModal';
import ThemeToggle from '../components/ThemeToggle';
import CreateTodoForm from './components/CreateTodoForm';
import EditTodoForm from './components/EditTodoForm';
import TodoTable from './components/TodoTable';
import SearchModal from './components/SearchModal';

// 스타일
import './todoList.css';

// 지연 로딩
const DatePicker = lazy(() => import('react-datepicker'));

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isDatePickerLoaded, setIsDatePickerLoaded] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showWaterTrackerModal, setShowWaterTrackerModal] = useState(false);
  const [waterTrackerModalKey, setWaterTrackerModalKey] = useState(0);

  const userMenuRef = useRef(null);

  const [imgError, setImgError] = useState(false);

  // 오늘 날짜로 이동하는 함수
  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // 1일 1회 '오늘' 체크 및 리셋 훅
  useDailyDateReset(selectedDate, handleToday);

  useEffect(() => {
    setImgError(false);
  }, [user?.profileImage]);

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

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    if (todoRefreshTrigger > 0) {
      fetchTodos();
    }
  }, [todoRefreshTrigger, fetchTodos]);

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

  const handleAddTodo = async ({ todoContent, todoNote, todoFiles }) => {
    try {
      const formattedDate = formatDate(selectedDate);

      let responseData;

      // 파일이 있는 경우 FormData 사용 (multipart/form-data)
      if (todoFiles && todoFiles.length > 0) {
        const formData = new FormData();
        formData.append('todoContent', todoContent);
        formData.append('todoDate', formattedDate);
        formData.append('todoNote', todoNote || '');

        todoFiles.forEach((file) => {
          formData.append('files', file);
        });

        responseData = await todoService.createTodo(formData);
      } else {
        // 파일이 없는 경우 일반 JSON 객체 전송
        responseData = await todoService.createTodo({
          todoContent,
          todoDate: formattedDate,
          todoNote: todoNote || '',
        });
      }

      showAlert({
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

      // 성공 결과 반환
      return { success: true, ...responseData };
    } catch (error) {
      console.error('Add Todo Error:', error);

      showErrorAlert('오류', '할 일 추가 중 문제가 발생했습니다.');
      return { success: false, error };
    }
  };

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

  const updateTodoOptimistically = (todoSeq, newCompleteDtm) => {
    setTodos((prevTodos) => {
      const updatedTodos = prevTodos.map((todo) =>
        todo.todoSeq === todoSeq
          ? { ...todo, completeDtm: newCompleteDtm }
          : todo,
      );

      return sortTodos(updatedTodos);
    });
  };

  const rollbackTodoUpdate = (todoSeq, originalCompleteDtm) => {
    setTodos((prevTodos) => {
      const rolledBackTodos = prevTodos.map((todo) =>
        todo.todoSeq === todoSeq
          ? { ...todo, completeDtm: originalCompleteDtm }
          : todo,
      );

      return sortTodos(rolledBackTodos);
    });
  };

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

      showToast({
        title: errorMessage,
        icon: 'error',
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

  const handleDeleteTodo = async (todoSeq) => {
    // 사용자에게 삭제 확인을 받음

    await showConfirmAlert({
      title: '정말로 삭제하시겠습니까?',
      text: '삭제된 데이터는 복구할 수 없습니다.',
      confirmButtonText: '삭제',
    }).then(async (result) => {
      // 사용자가 '네'를 클릭한 경우에만 삭제를 진행
      if (result.isConfirmed) {
        try {
          await todoService.deleteTodo(todoSeq);

          showToast({
            title: '삭제 완료!',
            icon: 'success',
          });
          fetchTodos();
        } catch (error) {
          console.error('Delete Todo Error:', error);

          const { response } = error;
          if (response?.data) {
            showErrorAlert(
              '오류',
              `삭제에 실패했습니다: ${response.data.message}`,
            );
          } else {
            showErrorAlert('오류', '서버와의 통신 중 문제가 발생했습니다.');
          }
        }
      }
    });
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
  };

  const handleSaveTodo = async (todoSeq, updatedData) => {
    try {
      const { todoContent, todoNote, todoFiles } = updatedData;

      let responseData;

      // 파일이 있는 경우 FormData 사용
      if (todoFiles && todoFiles.length > 0) {
        const formData = new FormData();
        formData.append('todoContent', todoContent);
        formData.append('todoNote', todoNote || '');

        todoFiles.forEach((file) => {
          formData.append('files', file);
        });

        responseData = await todoService.updateTodo(todoSeq, formData);
      } else {
        // 파일이 없는 경우 일반 JSON 객체 전송
        responseData = await todoService.updateTodo(todoSeq, {
          todoContent,
          todoNote: todoNote || '',
        });
      }

      showToast({
        title: '할 일이 수정되었습니다.',
        icon: 'success',
      });
      setEditingTodo(null);
      fetchTodos();
      return { success: true, data: responseData };
    } catch (error) {
      console.error('Save Todo Error:', error);

      const { response } = error;
      if (response?.data) {
        const errorData = response.data;
        // 파일 업로드 오류를 구체적으로 처리
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors
            .map(({ fileName, errorMessage }) => `${fileName}: ${errorMessage}`)
            .join('<br>');

          showAlert({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error',
          });
          return { success: false, errors: errorData.errors || [] };
        } else {
          showErrorAlert('오류', errorData.message || '수정에 실패했습니다.');
          return { success: false, error: errorData.message };
        }
      }

      showErrorAlert('오류', '서버와의 통신 중 문제가 발생했습니다.');
      return { success: false, error: error.message };
    }
  };

  const handleToggleCreate = () => {
    setIsCreating((prev) => !prev);
    setEditingTodo(null);
    setIsUpdatingProfile(false);
    setIsChangingPassword(false);
  };

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  // 폼 변경 상태 업데이트 핸들러
  const handleDirtyChange = (isDirty) => {
    setIsFormDirty(isDirty);
  };

  const handleUpdateProfile = () => {
    if (isFormDirty) {
      showNavigationConfirmAlert().then((result) => {
        if (result.isConfirmed) {
          setIsUpdatingProfile(true);
          setIsCreating(false);
          setEditingTodo(null);
          setIsChangingPassword(false);
          setIsUserMenuOpen(false);
          setIsFormDirty(false);
        }
      });
      return;
    }

    setIsUpdatingProfile(true);
    setIsCreating(false);
    setEditingTodo(null);
    setIsChangingPassword(false);
    setIsUserMenuOpen(false);
  };

  const handleCancelProfileUpdate = () => {
    setIsUpdatingProfile(false);
    setIsFormDirty(false);
  };

  const handleChangePassword = () => {
    if (isFormDirty) {
      showNavigationConfirmAlert().then((result) => {
        if (result.isConfirmed) {
          setIsChangingPassword(true);
          setIsCreating(false);
          setEditingTodo(null);
          setIsUpdatingProfile(false);
          setIsUserMenuOpen(false);
          setIsFormDirty(false);
        }
      });
      return;
    }

    setIsChangingPassword(true);
    setIsCreating(false);
    setEditingTodo(null);
    setIsUpdatingProfile(false);
    setIsUserMenuOpen(false);
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setIsFormDirty(false);
  };

  const handleSaveProfile = async (profileData) => {
    try {
      const { formData } = profileData;

      const updatedUser = await userService.updateProfile(formData);

      // 프로필 이미지가 있는 경우, 브라우저 캐시를 우회하기 위해 타임스탬프 추가
      if (updatedUser.profileImage) {
        const timestamp = Date.now();
        // 이미 쿼리 파라미터가 있는지 확인
        const separator = updatedUser.profileImage.includes('?') ? '&' : '?';
        updatedUser.profileImage = `${updatedUser.profileImage}${separator}t=${timestamp}`;
      }

      login(updatedUser);

      showToast({
        title: '프로필이 수정되었습니다.',
        icon: 'success',
      }).then(() => {
        setIsUpdatingProfile(false);
        setIsFormDirty(false);
      });
    } catch (error) {
      console.error('Profile update error:', error);

      const { response } = error;
      if (response?.data) {
        const errorData = response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors
            .map(({ fileName, errorMessage }) => `${fileName}: ${errorMessage}`)
            .join('<br>');

          showAlert({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error',
          });
        } else {
          showErrorAlert(
            '프로필 수정 실패',
            errorData.message || '서버 오류가 발생했습니다.',
          );
        }
      } else {
        showErrorAlert('오류 발생', '서버와의 연결에 문제가 발생했습니다.');
      }
    }
  };

  const handleSavePassword = async (passwordData) => {
    try {
      const { currentPassword, newPassword } = passwordData;

      await userService.changePassword(currentPassword, newPassword);

      showToast({
        title: '비밀번호가 변경되었습니다.',
        icon: 'success',
      })
        .then(() => {})
        .then(() => {
          setIsChangingPassword(false);
          setIsFormDirty(false);
          // 비밀번호 변경 후 로그아웃 처리
          handleLogout();
        });
    } catch (error) {
      console.error('Password change error:', error);

      const { response } = error;
      if (response?.data) {
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

        showErrorAlert('비밀번호 변경 실패', errorMessage);
      } else {
        showErrorAlert('오류 발생', '서버와의 연결에 문제가 발생했습니다.');
      }
    }
  };

  const handleLogout = async () => {
    await showConfirmAlert({
      title: '로그아웃 하시겠습니까?',
      confirmButtonText: '로그아웃',
      cancelButtonText: '취소',
      customClass: {
        confirmButton: 'btn btn-outline-primary',
        cancelButton: 'btn btn-outline-adaptive me-2',
      },
      text: '로그아웃 하시겠습니까?', // text 속성 추가
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
          showErrorAlert('오류 발생', '서버와의 연결에 문제가 발생했습니다.');
        } finally {
          logout();
        }
      })();
    });
  };

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

  const handleRetry = () => {
    const lastMessage = getRetryMessage();
    if (lastMessage) {
      handleSendMessage(lastMessage, true);
    }
  };

  const handleClearError = () => {
    clearError();
    resetRetryState();
  };

  const handleExcelExport = async () => {
    const result = await showDateRangePrompt();

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

      showSuccessAlert('성공', 'Excel 파일이 다운로드되었습니다.');
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

      showErrorAlert('오류', errorMessage);
    }
  };

  const renderContent = () => {
    if (isUpdatingProfile) {
      return (
        <ProfileUpdateForm
          user={user}
          onSave={handleSaveProfile}
          onCancel={handleCancelProfileUpdate}
          onDirtyChange={handleDirtyChange}
        />
      );
    }
    if (isChangingPassword) {
      return (
        <PasswordChangeForm
          onSave={handleSavePassword}
          onCancel={handleCancelPasswordChange}
          onDirtyChange={handleDirtyChange}
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
      <TodoTable
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
      <div className="todo-title-header">
        <h2>TO-DO 리스트</h2>
      </div>

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
                src={
                  user.profileImage?.startsWith('http')
                    ? user.profileImage
                    : `${API_URL}${user.profileImage?.replace(/^\/api/, '')}`
                }
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
              <BsPeopleCircle />
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
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowContactModal(true);
                  setIsUserMenuOpen(false);
                }}
              >
                개발자에게 문의하기
              </button>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowWaterTrackerModal(true);
                  setIsUserMenuOpen(false);
                }}
              >
                💧 수분 섭취 기록
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

      <div className="todo-actions">
        {!isCreating &&
          !editingTodo &&
          !isUpdatingProfile &&
          !isChangingPassword && (
            <>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setShowSearchModal(true)}
                aria-label="상세 검색"
              >
                <BsSearch />
              </button>
              <button
                className="btn btn-outline-success"
                onClick={handleExcelExport}
                aria-label="Excel 내보내기"
              >
                <BsFileEarmarkSpreadsheet />
              </button>
              <button
                className="btn btn-outline-adaptive"
                onClick={handleToggleCreate}
              >
                신규
              </button>
            </>
          )}
      </div>

      {!isCreating &&
        !editingTodo &&
        !isUpdatingProfile &&
        !isChangingPassword && (
          <div className="date-navigator">
            <div className="date-controls">
              <button
                onClick={handlePrevDay}
                className="date-nav-btn"
                aria-label="이전 날짜"
              >
                <BsChevronLeft />
              </button>
              {isDatePickerLoaded ? (
                <Suspense
                  fallback={
                    <button className="date-display">
                      {formatDate(selectedDate)}
                    </button>
                  }
                >
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
                </Suspense>
              ) : (
                <button
                  className="date-display"
                  onClick={() => setIsDatePickerLoaded(true)}
                >
                  {formatDate(selectedDate)}
                </button>
              )}
              <button
                onClick={handleNextDay}
                className="date-nav-btn"
                aria-label="다음 날짜"
              >
                <BsChevronRight />
              </button>
              <button onClick={handleToday} className="date-today-btn ms-2">
                오늘
              </button>
            </div>
          </div>
        )}

      {renderContent()}

      {/* 개발자에게 문의하기 모달 */}
      <ContactDeveloperModal
        show={showContactModal}
        onHide={() => setShowContactModal(false)}
      />

      {/* 수분 섭취 트래커 모달 */}
      <WaterTrackerModal
        key={waterTrackerModalKey}
        show={showWaterTrackerModal}
        onHide={() => {
          setShowWaterTrackerModal(false);
          // 모달이 닫힐 때 key를 변경하여 다음번 열릴 때 컴포넌트 리마운트
          setWaterTrackerModalKey((prev) => prev + 1);
        }}
      />

      <SearchModal
        show={showSearchModal}
        onHide={() => setShowSearchModal(false)}
        onMoveToDate={(date) => {
          const newDate = new Date(date);
          if (Number.isNaN(newDate.getTime())) {
            console.error('Invalid date received from SearchModal:', date);
          } else {
            setSelectedDate(newDate);
          }
        }}
      />

      <FloatingActionButton
        isOpen={isChatOpen}
        onClick={handleChatToggle}
        isFocused={isChatInputFocused}
      />

      <ChatModal
        isOpen={isChatOpen}
        onClose={handleChatToggle}
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
