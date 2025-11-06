import React, { useState, useRef, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import ChatMessage from './ChatMessage';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import './ChatModal.css';

const ChatModal = ({ isOpen, onClose, user, messages, onSendMessage, isLoading, error, onRetry, onClearError }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus management when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus the input field after modal animation
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    } else {
      // Restore focus to the previously focused element when modal closes
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        setTimeout(() => {
          previousFocusRef.current.focus();
        }, 100);
      }
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    const trimmedMessage = inputValue.trim();
    if (trimmedMessage && !isLoading) {
      onSendMessage(trimmedMessage);
      setInputValue('');
      
      // Focus back to input after sending (for better UX)
      setTimeout(() => {
        if (inputRef.current && !isLoading) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    
    // Focus trap - keep focus within modal
    if (e.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;
      
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
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
      aria-labelledby="chat-modal-title"
      aria-describedby="chat-modal-description"
      ref={modalRef}
      enforceFocus={false}
      restoreFocus={false}
    >
      <Modal.Header closeButton className="chat-modal-header">
        <Modal.Title id="chat-modal-title">
          <i className="bi bi-robot me-2"></i>
          AI 어시스턴트
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="chat-modal-body">
        <div 
          id="chat-modal-description" 
          className="chat-messages" 
          role="log" 
          aria-live="polite" 
          aria-label="채팅 메시지"
          aria-atomic="false"
        >
          {messages.length === 0 ? (
            <div className="welcome-message" role="status">
              <i className="bi bi-chat-heart mb-3" aria-hidden="true"></i>
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
            <div className="typing-indicator" role="status" aria-live="polite">
              <div className="typing-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">AI가 응답을 준비하고 있습니다...</span>
            </div>
          )}
          {error && (
            <div className="error-message" role="alert" aria-live="assertive">
              <div className="error-content">
                <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                <span className="error-text">{error}</span>
              </div>
              {onRetry && (
                <div className="error-actions mt-2">
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={onRetry}
                    disabled={isLoading}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    다시 시도
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClearError}
                    disabled={isLoading}
                  >
                    닫기
                  </button>
                </div>
              )}
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
              onKeyDown={handleInputKeyDown}
              disabled={isLoading}
              aria-label="채팅 메시지 입력"
              aria-describedby="chat-input-help"
            />
            <button
              className="btn btn-primary chat-send-button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              aria-label={isLoading ? "메시지 전송 중..." : "메시지 보내기"}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-send"></i>
              )}
            </button>
          </div>
          <small id="chat-input-help" className="text-muted mt-1">
            {isLoading ? (
              <span className="text-primary">
                <i className="bi bi-arrow-up-circle me-1"></i>
                메시지를 전송하고 있습니다...
              </span>
            ) : (
              'Enter로 전송, Shift+Enter로 줄바꿈'
            )}
          </small>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ChatModal;