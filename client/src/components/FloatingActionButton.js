import React from 'react';
import './FloatingActionButton.css';

const FloatingActionButton = ({ isOpen, onClick }) => {
  return (
    <button
      className={`floating-action-button ${isOpen ? 'open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? '채팅 닫기' : 'AI 어시스턴트 열기'}
      aria-expanded={isOpen}
      type="button"
    >
      <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-chat-dots'}`}></i>
    </button>
  );
};

export default FloatingActionButton;