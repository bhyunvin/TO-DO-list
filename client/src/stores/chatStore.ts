import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from '../authStore/authStore';

// 채팅 메시지 인터페이스
interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isHtml?: boolean;
  type?: string;
}

interface MessageData {
  content: string;
  isUser: boolean;
  isHtml?: boolean;
}

// API 에러 인터페이스
interface ApiError {
  name?: string;
  message?: string;
  code?: string;
}

interface ApiResponse {
  status: number;
}

// ChatStore 인터페이스 정의
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  lastFailedMessage: string | null;
  requestInProgress: boolean;
  lastRequestTime: number;
  todoRefreshTrigger: number;

  hasApiKey: () => boolean;
  addMessage: (messageData: MessageData) => void;
  addWelcomeMessage: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null, errorType?: string) => void;
  clearMessages: () => void;
  clearError: () => void;
  handleApiError: (
    error: ApiError | Error,
    response?: ApiResponse | null,
  ) => { shouldRetry: boolean; errorType: string };
  canSendRequest: () => boolean;
  setRetryMessage: (message: string | null) => void;
  getRetryMessage: () => string | null;
  incrementRetryCount: () => void;
  resetRetryState: () => void;
  getRecentMessages: (count?: number) => ChatMessage[];
  triggerTodoRefresh: () => void;
}

// 다양한 실패 시나리오에 대한 한국어 오류 메시지
const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  API_ERROR: 'AI 서비스에 일시적인 문제가 발생했습니다.',
  AUTH_ERROR: '로그인이 필요합니다.',
  RATE_LIMIT: 'AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  SERVER_ERROR:
    'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  GENERIC_ERROR: '문제가 발생했습니다. 다시 시도해주세요.',
  RETRY_EXHAUSTED:
    '여러 번 시도했지만 실패했습니다. 잠시 후 다시 시도해주세요.',
};

export const useChatStore = create<ChatStore>()(
  persist<
    ChatStore,
    [],
    [],
    Pick<ChatStore, 'messages' | 'todoRefreshTrigger'>
  >(
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

      // API Key 확인 헬퍼
      hasApiKey: () => {
        try {
          const user = useAuthStore.getState().user;
          return !!user?.hasAiApiKey;
        } catch (e) {
          console.error('Failed to check auth store', e);
          return false;
        }
      },

      // 액션
      addMessage: (messageData) => {
        // 사용자 메시지인 경우 API Key 확인
        if (messageData.isUser) {
          const hasApiKey = get().hasApiKey();

          if (!hasApiKey) {
            // API Key가 없으면 에러 메시지 설정하고 메시지 추가 안 함 (또는 시스템 메시지로 경고)
            // 여기서는 에러 상태로 설정하여 UI에서 처리하도록 유도하거나, 경고 메시지 추가
            set((state) => ({
              messages: [
                ...state.messages,
                {
                  id: `${Date.now()}-system-warning`,
                  content:
                    'API Key가 설정되지 않았습니다. 프로필에서 API Key를 등록해주세요.',
                  isUser: false,
                  timestamp: new Date(),
                  isHtml: false,
                },
              ],
              isLoading: false,
            }));
            return;
          }
        }

        const message: ChatMessage = {
          id: `${Date.now()}${Math.random().toString(36).substring(2, 11)}`,
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

      // 환영 메시지 추가 (채팅 세션 시작 시)
      addWelcomeMessage: () => {
        const { messages, hasApiKey } = get();
        const hasKey = hasApiKey();

        // 메시지 생성 헬퍼 함수
        const createWelcomeMessage = (type) => {
          let content = '';
          if (type === 'warning') {
            content = `<p>안녕하세요! 🤖 AI 비서입니다.</p>
<p>AI 서비스를 이용하시려면 <strong>API Key 설정</strong>이 필요합니다.</p>
<hr>
<h2>🔑 API Key 발급 및 등록 방법</h2>
<ol>
<li><a href="https://aistudio.google.com/app/api-keys" target="_blank" rel="noopener noreferrer">Google AI Studio</a>에 접속하여 API Key를 발급받으세요.</li>
<li>우측 상단 <strong>프로필 > 프로필 수정</strong> 메뉴로 이동하세요.</li>
<li><strong>AI API Key</strong> 필드에 키를 입력하고 저장해주세요.</li>
</ol>
<p>키를 등록하시면 바로 채팅을 시작할 수 있습니다!</p>`;
          } else {
            content = `<p>안녕하세요! 🤖 AI 비서입니다.</p>
<p>무엇을 도와드릴까요?</p>
<p>편하게 말씀만 하시면 제가 할 일 관리를 도와드릴게요.</p>
<hr>
<h2>💡 이렇게 말씀해보세요!</h2>
<p><strong>✅ 할 일 추가하기</strong></p>
<ul>
<li>"내일 10시까지 '기획안 작성' 추가해 줘."</li>
<li>"'우유 사기'라고 메모해 줘."</li>
</ul>
<p><strong>📋 할 일 확인하기</strong></p>
<ul>
<li>"오늘 내 할 일 목록 보여줘."</li>
<li>"이번 주 일정이 어떻게 되지?"</li>
</ul>
<p><strong>🔄 할 일 수정/완료하기</strong></p>
<ul>
<li>"'기획안 작성' 완료했어."</li>
<li>"'팀 회식' 시간을 저녁 7시로 변경해 줘."</li>
</ul>
<hr>
<p>언제든지 편하게 요청해주세요!</p>`;
          }

          return {
            id: `welcome-${Date.now()}`,
            content,
            isUser: false,
            timestamp: new Date(),
            isHtml: true,
            type,
          };
        };

        // 이미 메시지가 있는 경우 확인
        if (messages.length > 0) {
          const firstMessage = messages[0];

          // 첫 번째 메시지가 환영/경고 메시지인지 확인
          if (
            firstMessage.type === 'welcome' ||
            firstMessage.type === 'warning'
          ) {
            const currentType = hasKey ? 'welcome' : 'warning';

            // 상태가 변경되었으면 메시지 교체 (예: 경고 -> 환영)
            if (firstMessage.type !== currentType) {
              // 메시지가 딱 하나뿐이거나(환영메시지만 있음), 사용자가 아직 대화를 시작하지 않았다고 판단될 때 교체
              // 여기서는 첫번째 메시지만 교체하는 전략 사용
              const newWelcomeMessage = createWelcomeMessage(currentType);

              // ID는 유지하거나 새로 생성할 수 있음. 여기서는 새로 생성하여 리렌더링 유도
              const newMessages = [...messages];
              newMessages[0] = newWelcomeMessage;

              set({ messages: newMessages });
            }
          }
          return;
        }

        // 메시지가 없는 경우 새 메시지 추가
        const type = hasKey ? 'welcome' : 'warning';
        set(() => ({
          messages: [createWelcomeMessage(type)],
        }));
      },

      setLoading: (loading) => {
        const lastRequestTime = loading ? Date.now() : undefined;
        set((state) => ({
          isLoading: loading,
          requestInProgress: loading,
          lastRequestTime: lastRequestTime ?? state.lastRequestTime,
        }));
      },

      setError: (error, errorType = 'GENERIC_ERROR') => {
        const errorMessage =
          ERROR_MESSAGES[errorType] || error || ERROR_MESSAGES.GENERIC_ERROR;
        set({
          error: errorMessage,
          isLoading: false,
        });
      },

      clearMessages: () => {
        set({
          messages: [],
          error: null,
          retryCount: 0,
          lastFailedMessage: null,
          requestInProgress: false,
          lastRequestTime: 0,
        });

        // 메시지를 지운 후 환영 메시지 다시 추가
        const { addWelcomeMessage } = get();
        addWelcomeMessage();
      },

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
          // 네트워크 또는 기타 오류 - 타입 안전하게 처리
          const errorObj = error as ApiError;
          const name = errorObj.name || '';
          const message = errorObj.message || '';
          const code = errorObj.code || '';

          if (
            (name === 'TypeError' && message.includes('fetch')) ||
            message === 'Network Error' ||
            code === 'ERR_NETWORK'
          ) {
            errorType = 'NETWORK_ERROR';
            shouldRetry = retryCount < 2; // 네트워크 오류의 경우 최대 2회 재시도 허용
          } else if (
            name === 'AbortError' ||
            message.includes('timeout') ||
            code === 'ECONNABORTED'
          ) {
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

        return !requestInProgress && now - lastRequestTime >= minInterval;
      },

      // 재시도 기능
      setRetryMessage: (message) => set({ lastFailedMessage: message }),

      getRetryMessage: () => {
        const { lastFailedMessage } = get();
        return lastFailedMessage;
      },

      incrementRetryCount: () =>
        set((state) => ({ retryCount: state.retryCount + 1 })),

      resetRetryState: () =>
        set({
          retryCount: 0,
          lastFailedMessage: null,
          requestInProgress: false,
        }),

      // 컨텍스트를 위한 최근 메시지 가져오기 헬퍼
      getRecentMessages: (count = 10) => {
        const { messages } = get();
        return messages.slice(-count);
      },

      // 할 일 목록 새로고침 트리거
      todoRefreshTrigger: 0,
      triggerTodoRefresh: () =>
        set((state) => ({
          todoRefreshTrigger: state.todoRefreshTrigger + 1,
        })),
    }),
    {
      name: 'chat-storage', // sessionStorage 키 이름
      storage: createJSONStorage(() => sessionStorage),
      // 로딩 상태나 오류가 아닌 메시지만 영구 저장
      partialize: (state) => ({
        messages: state.messages,
        todoRefreshTrigger: state.todoRefreshTrigger,
      }),
    },
  ),
);
