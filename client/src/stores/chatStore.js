import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Chat message interface structure
// {
//   id: string,
//   content: string,
//   isUser: boolean,
//   timestamp: Date,
//   isHtml?: boolean
// }

// Korean error messages for different failure scenarios
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
      // Persisted state
      messages: [],

      // Non-persisted state (will be reset on page reload)
      isLoading: false,
      error: null,
      retryCount: 0,
      lastFailedMessage: null,
      requestInProgress: false,
      lastRequestTime: 0,

      // Actions
      addMessage: (messageData) => {
        const message = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          ...messageData,
        };
        
        set((state) => ({
          messages: [...state.messages, message],
          error: null, // Clear any previous errors when adding a message
          retryCount: 0, // Reset retry count on successful message
          lastFailedMessage: null,
        }));
      },

      setLoading: (loading) => set((state) => ({ 
        isLoading: loading,
        requestInProgress: loading,
        lastRequestTime: loading ? Date.now() : state.lastRequestTime
      })),

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

      // Enhanced error handling with retry functionality
      handleApiError: (error, response = null) => {
        const { retryCount } = get();
        let errorType = 'GENERIC_ERROR';
        let shouldRetry = false;

        // Determine error type based on response status or error properties
        if (response) {
          const status = response.status;
          if (status === 401) {
            errorType = 'AUTH_ERROR';
          } else if (status === 429) {
            errorType = 'RATE_LIMIT';
            shouldRetry = retryCount < 2; // Allow up to 2 retries for rate limiting
          } else if (status >= 500) {
            errorType = 'SERVER_ERROR';
            shouldRetry = retryCount < 1; // Allow 1 retry for server errors
          } else if (status >= 400) {
            errorType = 'API_ERROR';
          }
        } else if (error) {
          // Network or other errors
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorType = 'NETWORK_ERROR';
            shouldRetry = retryCount < 2; // Allow up to 2 retries for network errors
          } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorType = 'TIMEOUT_ERROR';
            shouldRetry = retryCount < 1; // Allow 1 retry for timeout
          }
        }

        // If max retries reached, show exhausted message
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

      // Request throttling
      canSendRequest: () => {
        const { requestInProgress, lastRequestTime } = get();
        const now = Date.now();
        const minInterval = 1000; // Minimum 1 second between requests
        
        return !requestInProgress && (now - lastRequestTime) >= minInterval;
      },

      // Retry functionality
      setRetryMessage: (message) => set({ lastFailedMessage: message }),

      getRetryMessage: () => get().lastFailedMessage,

      incrementRetryCount: () => set((state) => ({ retryCount: state.retryCount + 1 })),

      resetRetryState: () => set({ 
        retryCount: 0, 
        lastFailedMessage: null,
        requestInProgress: false
      }),

      // Helper to get the last few messages for context
      getRecentMessages: (count = 10) => {
        const { messages } = get();
        return messages.slice(-count);
      },
    }),
    {
      name: 'chat-storage', // sessionStorage key name
      storage: createJSONStorage(() => sessionStorage),
      // Only persist messages, not loading states or errors
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);