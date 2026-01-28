import { api, ApiError } from './client';

// Eden Treaty 타입 추론 우회
const assistantApi = api.assistance;

const aiService = {
  /**
   * AI 비서에게 채팅 메시지 전송
   */
  chat: async (
    data: { prompt: string; history?: any[] },
    signal?: AbortSignal,
  ) => {
    // Treaty의 fetch 옵션을 통해 AbortSignal 전달
    // Eden Treaty 문서 참조: treaty(url).route.get({ ...query }, { fetch: { signal } })

    const { data: response, error } = await assistantApi.chat.post(data, {
      fetch: {
        signal,
      },
    });

    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : 'AI 채팅 실패',
        Number(error.status),
        error.value,
      );
    }
    return response;
  },
};

export default aiService;
