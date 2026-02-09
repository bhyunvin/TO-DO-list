import PropTypes from 'prop-types';
import { showToast } from '../../utils/alertUtils';
import TodoForm from './TodoForm';
import './CreateTodoForm.css'; // 필요 시 특정 스타일 재정의를 위해 유지 (현재는 비어있음)

const CreateTodoForm = ({ onAddTodo, onCancel }) => {
  const handleAddTodo = async (formData) => {
    // 폼 데이터 구조: { todoContent, todoNote, todoFiles }
    const result = await onAddTodo(formData);

    if (result?.success) {
      showToast({
        icon: 'success',
        title: '할 일이 추가되었습니다.',
        timer: 1500,
      });
      return { success: true, resetFields: true };
    }
    return result;
  };

  return (
    <div className="create-todo-form">
      <TodoForm
        onSubmit={handleAddTodo}
        onCancel={onCancel}
        submitLabel="추가"
        title="새로운 TO-DO 항목추가"
      />
    </div>
  );
};

CreateTodoForm.propTypes = {
  onAddTodo: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CreateTodoForm;
