import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 채팅 메시지 인터페이스 구조
// {
//   id: string,
//   content: string,
//   isUser: boolean,
//   timestamp: Date,
//   isHtml?: boolean
// }

// 다양한 실패 시나리오에 대한 한국어 오류 메시지
const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  API_ERROR: 'AI 서비스에 일시적인 문제가 발생했습니다.',
  AUTH_ERROR: '로그인이 필요합니다.',
  RATE_LIMIT: 'AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  SERVER_ERROR: 'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  GENERIC_ERROR: '문제가 발생했습니다. 다시 시도해주세요.',
  RETRY_EXHAUSTED: '여러 번 시도했지만 실패했습니다. 잠시 후 다시 시도해주세요.'
};

export const useChatStore = create(
  persist(
    (set, get) => ({
      // 영구 저장되는 상태
      messages: [],

      // 영구 저장되지 않는 상태 (페이지 새로고침 시 초기화됨)
      isLoading: false,
      error: null,
      retryCount: 0,
      lastFailedMessage: null,
      requestInProgress: false,
      lastRequestTime: 0,

      // 액션
      addMessage: (messageData) => {
        const message = {
          id: `${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          ...messageData,
        };
        
        set((state) => ({
          messages: [...state.messages, message],
          error: null, // 메시지 추가 시 이전 오류 지우기
          retryCount: 0, // 성공적인 메시지 전송 시 재시도 횟수 초기화
          lastFailedMessage: null,
        }));
      },

      setLoading: (loading) => {
        const lastRequestTime = loading ? Date.now() : undefined;
        set((state) => ({ 
          isLoading: loading,
          requestInProgress: loading,
          lastRequestTime: lastRequestTime !== undefined ? lastRequestTime : state.lastRequestTime
        }));
      },

      setError: (error, errorType = 'GENERIC_ERROR') => {
        const errorMessage = ERROR_MESSAGES[errorType] || error || ERROR_MESSAGES.GENERIC_ERROR;
        set({ 
          error: errorMessage, 
          isLoading: false 
        });
      },

      clearMessages: () => set({ 
        messages: [], 
        error: null, 
        retryCount: 0, 
        lastFailedMessage: null,
        requestInProgress: false,
        lastRequestTime: 0
      }),

      clearError: () => set({ error: null }),

      // 재시도 기능이 포함된 향상된 오류 처리
      handleApiError: (error, response = null) => {
        const { retryCount } = get();
        let errorType = 'GENERIC_ERROR';
        let shouldRetry = false;

        // 응답 상태 또는 오류 속성을 기반으로 오류 유형 결정
        if (response) {
          const { status } = response;
          if (status === 401) {
            errorType = 'AUTH_ERROR';
          } else if (status === 429) {
            errorType = 'RATE_LIMIT';
            shouldRetry = retryCount < 2; // 속도 제한의 경우 최대 2회 재시도 허용
          } else if (status >= 500) {
            errorType = 'SERVER_ERROR';
            shouldRetry = retryCount < 1; // 서버 오류의 경우 1회 재시도 허용
          } else if (status >= 400) {
            errorType = 'API_ERROR';
          }
        } else if (error) {
          // 네트워크 또는 기타 오류
          const { name, message } = error;
          if (name === 'TypeError' && message.includes('fetch')) {
            errorType = 'NETWORK_ERROR';
            shouldRetry = retryCount < 2; // 네트워크 오류의 경우 최대 2회 재시도 허용
          } else if (name === 'AbortError' || message.includes('timeout')) {
            errorType = 'TIMEOUT_ERROR';
            shouldRetry = retryCount < 1; // 타임아웃의 경우 1회 재시도 허용
          }
        }

        // 최대 재시도 횟수에 도달한 경우, 소진 메시지 표시
        if (retryCount >= 2) {
          errorType = 'RETRY_EXHAUSTED';
          shouldRetry = false;
        }

        set((state) => ({
          error: ERROR_MESSAGES[errorType],
          isLoading: false,
          retryCount: shouldRetry ? state.retryCount + 1 : 0,
        }));

        return { shouldRetry, errorType };
      },

      // 요청 제한
      canSendRequest: () => {
        const { requestInProgress, lastRequestTime } = get();
        const now = Date.now();
        const minInterval = 1000; // 요청 간 최소 1초 간격
        
        return !requestInProgress && (now - lastRequestTime) >= minInterval;
      },

      // 재시도 기능
      setRetryMessage: (message) => set({ lastFailedMessage: message }),

      getRetryMessage: () => {
        const { lastFailedMessage } = get();
        return lastFailedMessage;
      },

      incrementRetryCount: () => set((state) => ({ retryCount: state.retryCount + 1 })),

      resetRetryState: () => set({ 
        retryCount: 0, 
        lastFailedMessage: null,
        requestInProgress: false
      }),

      // 컨텍스트를 위한 최근 메시지 가져오기 헬퍼
      getRecentMessages: (count = 10) => {
        const { messages } = get();
        return messages.slice(-count);
      },

      // Todo 목록 새로고침 트리거
      todoRefreshTrigger: 0,
      triggerTodoRefresh: () => set((state) => ({ 
        todoRefreshTrigger: state.todoRefreshTrigger + 1 
      })),
    }),
    {
      name: 'chat-storage', // sessionStorage 키 이름
      storage: createJSONStorage(() => sessionStorage),
      // 로딩 상태나 오류가 아닌 메시지만 영구 저장
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);