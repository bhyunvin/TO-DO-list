import apiClient from './apiClient';

const todoService = {
  /**
   * 할 일 목록 조회
   * @param {string} date - 'YYYY-MM-DD' 형식
   * @returns {Promise<Array>}
   */
  async getTodos(date) {
    const response = await apiClient.get(`/todo?date=${date}`);
    return response.data;
  },

  /**
   * 할 일 생성
   * @param {object|FormData} data - 일반 객체 또는 파일 포함 시 FormData
   * @returns {Promise<object>}
   */
  async createTodo(data) {
    const isFormData = data instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};

    const response = await apiClient.post('/todo', data, config);
    return response.data;
  },

  /**
   * 할 일 수정
   * @param {number|string} todoSeq
   * @param {object|FormData} data
   * @returns {Promise<object>}
   */
  async updateTodo(todoSeq, data) {
    const isFormData = data instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};

    const response = await apiClient.patch(`/todo/${todoSeq}`, data, config);
    return response.data;
  },

  /**
   * 할 일 삭제
   * @param {number|string} todoSeq
   * @returns {Promise<object>}
   */
  async deleteTodo(todoSeq) {
    const response = await apiClient.delete(`/todo/${todoSeq}`);
    return response.data;
  },

  /**
   * 엑셀 다운로드
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<Blob>}
   */
  async downloadExcel(startDate, endDate) {
    const response = await apiClient.get(
      `/todo/excel?startDate=${startDate}&endDate=${endDate}`,
      {
        responseType: 'blob',
      },
    );
    return response.data;
  },
};

export default todoService;
