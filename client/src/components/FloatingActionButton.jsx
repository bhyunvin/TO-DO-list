import './FloatingActionButton.css';

const FloatingActionButton = ({ isOpen, onClick, isFocused }) => {
  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      className={`floating-action-button ${isOpen ? 'open' : ''} ${isFocused ? 'focus' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={isOpen ? '채팅 닫기' : 'AI 어시스턴트 열기'}
      aria-expanded={isOpen}
      type="button"
      tabIndex={0}
    >
      <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-chat-dots'}`}></i>
    </button>
  );
};

export default FloatingActionButton;