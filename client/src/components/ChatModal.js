import React, { useState, useRef, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import ChatMessage from './ChatMessage';
import './ChatModal.css';

const ChatModal = ({ isOpen, onClose, user, messages, onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    const trimmedMessage = inputValue.trim();
    if (trimmedMessage && !isLoading) {
      onSendMessage(trimmedMessage);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      size="lg"
      centered
      className="chat-modal"
      onKeyDown={handleKeyDown}
    >
      <Modal.Header closeButton className="chat-modal-header">
        <Modal.Title>
          <i className="bi bi-robot me-2"></i>
          AI 어시스턴트
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="chat-modal-body">
        <div className="chat-messages" role="log" aria-live="polite" aria-label="채팅 메시지">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <i className="bi bi-chat-heart mb-3"></i>
              <p>안녕하세요! 할 일 관리에 대해 무엇이든 물어보세요.</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isUser={message.isUser}
              />
            ))
          )}
          {isLoading && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">AI가 응답을 준비하고 있습니다...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Modal.Body>
      
      <Modal.Footer className="chat-modal-footer">
        <div className="chat-input-container">
          <div className="input-group">
            <input
              ref={inputRef}
              type="text"
              className="form-control chat-input"
              placeholder="할 일에 대해 질문해보세요..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              aria-label="채팅 메시지 입력"
            />
            <button
              className="btn btn-primary chat-send-button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              aria-label="메시지 보내기"
            >
              <i className="bi bi-send"></i>
            </button>
          </div>
          <small className="text-muted mt-1">
            Enter로 전송, Shift+Enter로 줄바꿈
          </small>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ChatModal;