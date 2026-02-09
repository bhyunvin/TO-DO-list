import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { FaRobot } from '@react-icons/all-files/fa/FaRobot';
import { BsFillExclamationTriangleFill } from '@react-icons/all-files/bs/BsFillExclamationTriangleFill';
import { BsArrowClockwise } from '@react-icons/all-files/bs/BsArrowClockwise';
import { MdSend } from '@react-icons/all-files/md/MdSend';
import { FiArrowUpCircle } from '@react-icons/all-files/fi/FiArrowUpCircle';
import ChatMessage from './ChatMessage';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import './ChatModal.css';

const ChatModal = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading,
  error,
  onRetry,
  onClearError,
  onInputFocus,
  onInputBlur,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // 모달이 열려있을 때 body 스크롤 잠금
  useBodyScrollLock(isOpen);

  // 새 메시지가 추가되면 자동으로 하단으로 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 모달이 열릴 때 즉시 스크롤 시도 (화면이 그려지기 전)
  useLayoutEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [isOpen]);

  // 모달이 열리거나 닫힐 때 포커스 관리 및 안전장치 스크롤
  useEffect(() => {
    if (isOpen) {
      // 이전에 포커스된 요소 저장
      previousFocusRef.current = document.activeElement;

      // 모달 애니메이션 후 입력 필드에 포커스 및 부드러운 스크롤 (안전장치)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else if (
      previousFocusRef.current &&
      typeof previousFocusRef.current.focus === 'function'
    ) {
      setTimeout(() => {
        previousFocusRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    const trimmedMessage = inputValue.trim();
    if (trimmedMessage && !isLoading) {
      onSendMessage(trimmedMessage);
      setInputValue('');

      // 전송 후 입력 필드로 포커스 복귀 (더 나은 UX를 위해)
      setTimeout(() => {
        if (inputRef.current) {
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

    // 포커스 트랩 - 모달 내에서 포커스 유지
    if (e.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      const [firstElement] = focusableElements;
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab 처리
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
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
          <FaRobot className="me-2" aria-hidden="true" /> AI 어시스턴트
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
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isUser={message.isUser}
            />
          ))}
          {isLoading && (
            <output className="typing-indicator" aria-live="polite">
              <div className="typing-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">
                AI가 응답을 준비하고 있습니다...
              </span>
            </output>
          )}
          {error && (
            <div className="error-message" role="alert" aria-live="assertive">
              <div className="error-content">
                <BsFillExclamationTriangleFill
                  className="me-2"
                  aria-hidden="true"
                />
                <span className="error-text">{error}</span>
              </div>
              {onRetry && (
                <div className="error-actions mt-2">
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={onRetry}
                    disabled={isLoading}
                  >
                    <BsArrowClockwise className="me-1" /> 다시 시도
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
            <textarea
              ref={inputRef}
              className="form-control chat-input"
              placeholder="할 일에 대해 질문해보세요..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              disabled={isLoading}
              rows={1}
              aria-label="채팅 메시지 입력"
              aria-describedby="chat-input-help"
            />
            <button
              className="btn btn-primary chat-send-button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              aria-label={isLoading ? '메시지 전송 중...' : '메시지 보내기'}
            >
              {isLoading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  aria-hidden="true"
                ></span>
              ) : (
                <MdSend />
              )}
            </button>
          </div>
          <small id="chat-input-help" className="text-muted mt-1">
            {isLoading ? (
              <span className="text-primary">
                <FiArrowUpCircle className="me-1" /> 메시지를 전송하고
                있습니다...
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

ChatModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      isUser: PropTypes.bool.isRequired,
      content: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onSendMessage: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  onClearError: PropTypes.func.isRequired,
  onInputFocus: PropTypes.func,
  onInputBlur: PropTypes.func,
  user: PropTypes.shape({
    userName: PropTypes.string,
    profileImage: PropTypes.string,
  }),
};

export default ChatModal;
