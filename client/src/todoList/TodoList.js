import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../authStore/authStore';
import './todoList.css';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// 신규 TODO 항목 추가 폼 컴포넌트
function CreateTodoForm(props) {
  const { onAddTodo, onCancel } = props;
  const [todoContent, setTodoContent] = useState('');
  const [todoNote, setTodoNote] = useState('');
  const [todoFiles, setTodoFiles] = useState([]);

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
        const selectedFiles = Array.from(e.target.files);
        setTodoFiles(selectedFiles);
        break;
      default:
        break;
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (todoContent.trim()) {
      onAddTodo({ todoContent, todoNote });
      setTodoContent('');
      setTodoNote('');
    } else {
      Swal.fire('할 일을 입력해주세요.', '', 'warning');
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
          className="form-control mb-3"
          placeholder="필요 시 파일을 업로드해주세요."
          value={todoFiles}
          onChange={handleChange}
          name="TODO_FILES"
          maxLength={4000}
        />
        <button type="submit" className="btn btn-success">
          추가
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
  const { todos, onToggleComplete, onDeleteTodo, onEditTodo, togglingTodoSeq } = props;

  return (
    <table className="todo-list">
      <colgroup>
        <col width="5%" />
        <col width="10%" />
        <col width="35%" />
        <col width="15%" />
        <col width="20%" />
        <col width="15%" />
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
              <td className="text-center">
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => onEditTodo(todo)}
                >
                  수정
                </button>
                <button
                  className="btn btn-sm btn-danger ms-2"
                  onClick={() => onDeleteTodo(todo.todoSeq)}
                >
                  삭제
                </button>
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
  const [todoContent, setTodoContent] = useState(todo.todoContent);
  const [todoNote, setTodoNote] = useState(todo.todoNote);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(todo.todoSeq, { todoContent, todoNote });
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
          onChange={(e) => setTodoContent(e.target.value)}
          required
        />
        <label className="mb-1" htmlFor="todoNote">비고</label>
        <textarea
          id="todoNote"
          name="TODO_NOTE"
          className="form-control mb-3"
          value={todoNote}
          onChange={(e) => setTodoNote(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          저장
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
  const { user, logout, api } = useAuthStore(); // api 함수 가져오기
  const [todos, setTodos] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null); // 수정 중인 ToDo 항목 전체를 저장
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [togglingTodoSeq, setTogglingTodoSeq] = useState(null);

  // 선택된 날짜에 해당하는 ToDo 목록을 서버에서 가져오는 함수
  const fetchTodos = useCallback(async () => {
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await api(`/api/todo?date=${formattedDate}`, { // fetch -> api
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
  async function handleAddTodo({ todoContent, todoNote }) {
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await api(`/api/todo`, { // fetch -> api
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
        body: JSON.stringify({
          todoContent,
          todoDate: formattedDate,
          todoNote: todoNote,
        }),
      });

      if (response.ok) {
        Swal.fire('성공', '새로운 할 일이 추가되었습니다.', 'success');
        setIsCreating(false);
        fetchTodos(); // 목록 새로고침
      } else {
        Swal.fire('오류', '할 일 추가에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Add Todo Error:', error);
      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
    }
  }

  // ToDo 항목의 완료 상태를 토글하는 함수
  const handleToggleComplete = async (todoSeq, isCompleted) => {
    setTogglingTodoSeq(todoSeq);
    try {
      const response = await api(`/api/todo/${todoSeq}`, { // fetch -> api
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
        const response = await api(`/api/todo`, { // fetch -> api
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
          body: JSON.stringify({ todoIds: [todoSeq] }),
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
      const response = await api(`/api/todo/${todoSeq}`, { // fetch -> api
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 다른 도메인으로 쿠키를 전송하기 위한 설정
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        Swal.fire('성공', '할 일이 수정되었습니다.', 'success');
        setEditingTodo(null);
        fetchTodos();
      } else {
        Swal.fire('오류', '수정에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Save Todo Error:', error);
      Swal.fire('오류', '서버와의 통신 중 문제가 발생했습니다.', 'error');
    }
  };

  // 신규 버튼 클릭 여부 처리
  function handleToggleCreate() {
    setIsCreating((prev) => !prev);
    setEditingTodo(null); // 신규 작성 시 수정 상태는 해제
  }


  async function handleLogout() {
    try {
      const response = await api(`/api/user/logout`, { // fetch -> api
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
        <button className="btn btn-outline-secondary" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
  
      {/* '신규' 버튼을 오른쪽으로 배치하기 위한 컨테이너 */}
      <div className="todo-actions">
        <button
          className={isCreating || editingTodo ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={isCreating || editingTodo ? () => { setIsCreating(false); setEditingTodo(null); } : handleToggleCreate}
        >
          {isCreating || editingTodo ? '취소' : '신규'}
        </button>
      </div>

      {/* 할 일 목록을 볼 때만 DatePicker를 표시합니다. */}
      {!isCreating && !editingTodo && (
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
