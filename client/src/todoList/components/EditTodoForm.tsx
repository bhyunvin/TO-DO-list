import PropTypes from 'prop-types';
import ExistingAttachments from '../ExistingAttachments';
import TodoForm from './TodoForm';
import './EditTodoForm.css'; // 필요 시 특정 스타일 재정의를 위해 유지

const EditTodoForm = ({ todo, onSave, onCancel }) => {
  const { todoContent: initialContent, todoNote: initialNote, todoSeq } = todo;

  const handleSave = async (formData) => {
    // 폼 데이터 구조: { todoContent, todoNote, todoFiles }
    const result = await onSave(todoSeq, formData);
    if (result?.success) {
      return { success: true, resetFields: false }; // 수정 성공 시 필드를 초기화하지 않음 (보통 폼이 닫힘)
    }
    return result;
  };

  return (
    <div className="edit-todo-form">
      <TodoForm
        initialValues={{ content: initialContent, note: initialNote }}
        onSubmit={handleSave}
        onCancel={onCancel}
        submitLabel="수정"
        title="TO-DO 항목수정"
      >
        <ExistingAttachments todoSeq={todoSeq} />
      </TodoForm>
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

export default EditTodoForm;
