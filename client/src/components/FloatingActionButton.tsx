import PropTypes from 'prop-types';
import { BsX } from '@react-icons/all-files/bs/BsX';
import { BsChatDots } from '@react-icons/all-files/bs/BsChatDots';
import './FloatingActionButton.css';

const FloatingActionButton = ({ isOpen, onClick, isFocused }) => {
  const handleKeyDown = (e) => {
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
      {isOpen ? <BsX /> : <BsChatDots />}
    </button>
  );
};

FloatingActionButton.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  isFocused: PropTypes.bool,
};

export default FloatingActionButton;
