import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../authStore/authStore';
import './todoList.css';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";

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
      onAddTodo(todoContent);
      setTodoContent('');
    } else {
      Swal.fire('할 일을 입력해주세요.', '', 'warning');
    }
  }

  return (
    <div className="create-todo-form">
      <h3>새로운 TODO 추가</h3>
      <form onSubmit={handleSubmit}>
        <label className="mb-1">할 일</label>
        <textarea
          type="text"
          className="form-control mb-3"
          placeholder="할 일을 입력해주세요."
          value={todoContent}
          onChange={handleChange}
          name="TODO_CONTENT"
          maxLength={4000}
          required="true"
          rows={3}
          style={{ resize: 'none' }}
        />
        <label className="mb-1">비고</label>
        <textarea
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
        <label className="mb-1">첨부파일</label>
        <input
          type="file"
          multiple="true"
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
          className="btn btn-secondary ml-2"
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
  const { todos } = props;

  function handleWholeCheckbox(e) {
    const isChecked = e.target.checked;
    Array.from(document.getElementsByClassName('todo-checkbox')).forEach(
      function (todoCheckboxElement) {
        todoCheckboxElement.checked = isChecked;
      },
    );
  }

  return (
    <table className="todo-list">
      <colgroup>
        <col width={30}></col>
        <col width={30}></col>
        <col width={200}></col>
        <col width={50}></col>
        <col width={200}></col>
        <col width={200}></col>
      </colgroup>
      <thead>
        <th>
          <input
            type="checkbox"
            className="form-check-input"
            onClick={handleWholeCheckbox}
          ></input>
        </th>
        <th>번호</th>
        <th>내용</th>
        <th>완료일시</th>
        <th>비고</th>
        <th>파일</th>
      </thead>
      <tbody>
        {todos.length > 0 ? (
          todos.map(function (todo, index) {
            return (
              <tr id={todo.TODO_SEQ} key={todo.TODO_SEQ}>
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input todo-checkbox"
                    checked=""
                  ></input>
                </td>
                <td>{index + 1}</td>
                <td>{todo.TODO_COMMENT}</td>
                <td>{todo.COMPLETE_DTM}</td>
                <td>{todo.TODO_NOTE}</td>
                <td>파일 작업필요</td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={6}>할 일이 없습니다.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// TODO 리스트 및 폼을 조건부로 렌더링하는 컨테이너 컴포넌트
function TodoContainer() {
  const { user, logout } = useAuthStore();
  const [todos, setTodos] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [/*checkedTodoIdArray,*/ setCheckedTodoIdArray] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  //CreateTodoForm에서 넘어온 Todo 요소 추가
  function handleAddTodo(todo) {
    setTodos(function (prevTodos) {
      return [...prevTodos, todo];
    });
    setIsCreating(false);
  }

  // 신규 버튼 클릭 여부 처리
  function handleToggleCreate() {
    setIsCreating(function (prevIsCreating) {
      return !prevIsCreating;
    });
  }

  // 수정 버튼 클릭 이벤트 - 수정 form 그리기
  function handleModifyTodo() {
    // 0개 선택되어있으면 alert
    // 1개 초과하여 선택되어있으면 alert
    const todoCheckboxElements = Array.from(
      document.getElementsByClassName('todo-checkbox'),
    )
      .filter(function (todoCheckbox) {
        return todoCheckbox.checked;
      })
      .map(function (checkedElement) {
        return checkedElement.id;
      });
    const todoCheckboxElementsLength = todoCheckboxElements.length;

    if (todoCheckboxElementsLength === 0) {
      Swal.fire('선택된 할 일이 없습니다.', '', 'warning');
      return;
    } else if (todoCheckboxElementsLength > 1) {
      Swal.fire('수정할 할 일을 하나만 선택해주세요.', '', 'warning');
      return;
    }

    setIsEditing(true);
    setCheckedTodoIdArray(todoCheckboxElements);
  }

  // 삭제 버튼 클릭 이벤트
  function handleDeleteTodo() {
    // 0개 선택되어있으면 alert
    const todoCheckboxElements = Array.from(
      document.getElementsByClassName('todo-checkbox'),
    )
      .filter(function (todoCheckbox) {
        return todoCheckbox.checked;
      })
      .map(function (checkedElement) {
        return checkedElement.id;
      });

    if (todoCheckboxElements.length === 0) {
      Swal.fire('선택된 할 일이 없습니다.', '', 'warning');
      return;
    }

    // 서버에 id 목록 던져서 삭제 + 확인 alert + 삭제한 당일 리스트로 조회
  }

  async function handleLogout() {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/user/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        logout(); // user 상태 null로 변경
      } else {
        Swal.fire('로그아웃 실패', '서버 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('Logout Error : ', error);
      Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
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
  
      {/* '신규', '수정', '삭제' 버튼을 오른쪽으로 배치하기 위한 컨테이너 */}
      <div className="todo-actions">
        {/* '신규' 버튼은 '취소' 버튼으로 토글됩니다. */}
        <button
          className={
            isCreating || isEditing
              ? 'btn btn-secondary'
              : 'btn btn-primary'
          }
          onClick={handleToggleCreate}
        >
          {isCreating || isEditing ? '취소' : '신규'}
        </button>
  
        {/* 수정과 삭제 버튼은 isCreating, isEditing 상태가 아닐 때만 보입니다. */}
        {!isCreating && !isEditing && (
          <>
            <button
              className="btn btn-secondary"
              onClick={handleModifyTodo}
            >
              수정
            </button>
            <button className="btn btn-danger" onClick={handleDeleteTodo}>
              삭제
            </button>
          </>
        )}
      </div>

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
  
      {/* 할 일 목록 또는 할 일 생성 폼을 보여주는 부분 */}
      {isCreating ? (
        <CreateTodoForm
          onAddTodo={handleAddTodo}
          onCancel={handleToggleCreate}
        />
      ) : (
        <TodoList todos={todos} />
      )}
    </div>
  );
}

export default TodoContainer;
