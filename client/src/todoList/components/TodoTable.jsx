import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { BsThreeDotsVertical } from '@react-icons/all-files/bs/BsThreeDotsVertical';
import { BsPencilSquare } from '@react-icons/all-files/bs/BsPencilSquare';
import { BsFillTrashFill } from '@react-icons/all-files/bs/BsFillTrashFill';
import { formatDateTime } from '../../utils/dateUtils';
import './TodoTable.css';

const TodoTable = ({
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
              aria-label="할 일 완료 토글"
            />
          </td>
          <td className="text-center">{index + 1}</td>
          <td className="todo-content">
            <span className="text-truncate">{todoContent}</span>
          </td>
          <td className="text-center">{formatDateTime(completeDtm)}</td>
          <td>
            <span className="text-truncate">{todoNote}</span>
          </td>
          <td className="todo-actions-cell">
            <button
              className="more-actions-btn"
              onClick={() =>
                setOpenActionMenu(openActionMenu === todoSeq ? null : todoSeq)
              }
              aria-label="추가 옵션"
            >
              <BsThreeDotsVertical />
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
                  aria-label="수정"
                >
                  <BsPencilSquare />
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDeleteTodo(todoSeq)}
                  title="삭제"
                  aria-label="삭제"
                >
                  <BsFillTrashFill />
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

TodoTable.propTypes = {
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

export default TodoTable;
