import apiClient from './apiClient';

const aiService = {
  /**
   * AI 비서에게 채팅 메시지 전송
   * @param {Object} data - { prompt, history }
   * @param {AbortSignal} [signal] - 선택적 abort signal
   * @returns {Promise<Object>} 응답 데이터
   */
  chat: async (data, signal) => {
    const response = await apiClient.post('/assistance/chat', data, {
      signal,
    });
    return response.data;
  },
};

export default aiService;
