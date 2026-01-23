import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import { FaRobot } from '@react-icons/all-files/fa/FaRobot';
import { BsPersonFill } from '@react-icons/all-files/bs/BsPersonFill';
import './ChatMessage.css';

const ChatMessage = ({ message, isUser }) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) {
      return '방금 전';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const renderContent = () => {
    if (isUser) {
      // 사용자 메시지는 일반 텍스트
      return <div className="message-text">{message.content}</div>;
    }

    // AI 메시지는 HTML을 포함할 수 있으므로 렌더링 전에 새니타이즈
    const sanitizedContent = DOMPurify.sanitize(message.content, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'a',
        'hr',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });

    return (
      <div
        className="message-text"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  };

  return (
    <article
      className={`chat-message ${isUser ? 'user-message' : 'ai-message'}`}
      aria-label={`${isUser ? '사용자' : 'AI 어시스턴트'} 메시지`}
    >
      <div className="message-container">
        {!isUser && (
          <div className="message-avatar" aria-hidden="true">
            <FaRobot />
          </div>
        )}
        <div className="message-bubble">
          {renderContent()}
          <div
            className="message-timestamp"
            aria-label={`전송 시간: ${formatTimestamp(message.timestamp)}`}
          >
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
        {isUser && (
          <div className="message-avatar user-avatar" aria-hidden="true">
            <BsPersonFill />
          </div>
        )}
      </div>
    </article>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]).isRequired,
  }).isRequired,
  isUser: PropTypes.bool.isRequired,
};

export default ChatMessage;
