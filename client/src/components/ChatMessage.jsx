import DOMPurify from 'dompurify';
import './ChatMessage.css';

const ChatMessage = ({ message, isUser }) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

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
      ],
      ALLOWED_ATTR: [],
    });

    return (
      <div
        className="message-text"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  };

  return (
    <div
      className={`chat-message ${isUser ? 'user-message' : 'ai-message'}`}
      role="article"
      aria-label={`${isUser ? '사용자' : 'AI 어시스턴트'} 메시지`}
    >
      <div className="message-container">
        {!isUser && (
          <div className="message-avatar" aria-hidden="true">
            <i className="bi bi-robot"></i>
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
            <i className="bi bi-person-fill"></i>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
